package com.omarvio.browser

import android.Manifest
import android.annotation.SuppressLint
import android.app.DownloadManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.Settings
import android.view.View
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.DownloadListener
import android.webkit.PermissionRequest
import android.webkit.SslErrorHandler
import android.webkit.URLUtil
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

/** Hosts the same React browser UI as the Cloudflare Pages site. */
class UnifiedBrowserActivity : ComponentActivity() {
    private lateinit var root: FrameLayout
    private lateinit var webView: WebView
    private var fileChooserCallback: ValueCallback<Array<Uri>>? = null
    private var pendingWebPermission: PermissionRequest? = null
    private var fullscreenView: View? = null
    private var fullscreenCallback: WebChromeClient.CustomViewCallback? = null

    @Volatile
    private var pendingApkDownloadId: Long = -1L
    private var pendingApkLocalFile: File? = null
    private var pendingInstallTarget: Pair<Long, File?>? = null

    private val filePicker = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        val callback = fileChooserCallback
        fileChooserCallback = null
        if (callback == null) return@registerForActivityResult
        val data = result.data
        val uris = if (result.resultCode == RESULT_OK && data != null) {
            data.clipData?.let { clip -> Array(clip.itemCount) { index -> clip.getItemAt(index).uri } }
                ?: data.data?.let { arrayOf(it) }
        } else null
        callback.onReceiveValue(uris)
    }

    private val unknownSourcesLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) {
        val target = pendingInstallTarget ?: return@registerForActivityResult
        pendingInstallTarget = null
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O || packageManager.canRequestPackageInstalls()) {
            installApk(target.first, target.second)
        }
    }

    private val mediaPermissionLauncher = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { result ->
        val request = pendingWebPermission
        pendingWebPermission = null
        if (request == null) return@registerForActivityResult
        val allowed = request.resources.filter { resource ->
            when (resource) {
                PermissionRequest.RESOURCE_AUDIO_CAPTURE -> result[Manifest.permission.RECORD_AUDIO] == true || ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
                PermissionRequest.RESOURCE_VIDEO_CAPTURE -> result[Manifest.permission.CAMERA] == true || ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
                else -> false
            }
        }
        if (allowed.isNotEmpty() && !isFinishing) request.grant(allowed.toTypedArray()) else request.deny()
    }

    private val downloadCompleteReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            val id = intent?.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1L) ?: -1L
            if (id != -1L && id == pendingApkDownloadId) {
                pendingApkDownloadId = -1L
                installApk(id, pendingApkLocalFile)
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = android.graphics.Color.rgb(24, 25, 28)
        window.navigationBarColor = android.graphics.Color.rgb(6, 9, 19)

        ContextCompat.registerReceiver(
            this,
            downloadCompleteReceiver,
            IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE),
            ContextCompat.RECEIVER_NOT_EXPORTED
        )

        root = FrameLayout(this)
        webView = WebView(this)
        root.addView(webView, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        setContentView(root)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            javaScriptCanOpenWindowsAutomatically = false
            setSupportMultipleWindows(false)
            mediaPlaybackRequiresUserGesture = true
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            allowFileAccess = false
            allowContentAccess = true
            loadsImagesAutomatically = true
            useWideViewPort = true
            loadWithOverviewMode = true
            builtInZoomControls = true
            displayZoomControls = false
            cacheMode = WebSettings.LOAD_DEFAULT
            safeBrowsingEnabled = true
        }
        CookieManager.getInstance().apply {
            setAcceptCookie(true)
            setAcceptThirdPartyCookies(webView, false)
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val uri = request?.url ?: return false
                return when (uri.scheme?.lowercase()) {
                    "http", "https" -> false
                    "mailto", "tel", "sms" -> {
                        runCatching { startActivity(Intent(Intent.ACTION_VIEW, uri)) }
                        true
                    }
                    else -> true
                }
            }

            override fun onReceivedSslError(view: WebView?, handler: SslErrorHandler?, error: android.net.http.SslError?) {
                handler?.cancel()
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(view: WebView?, callback: ValueCallback<Array<Uri>>?, params: FileChooserParams?): Boolean {
                fileChooserCallback?.onReceiveValue(null)
                fileChooserCallback = callback
                return try {
                    filePicker.launch(params?.createIntent() ?: Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                        addCategory(Intent.CATEGORY_OPENABLE)
                        type = "*/*"
                    })
                    true
                } catch (_: Exception) {
                    fileChooserCallback = null
                    callback?.onReceiveValue(null)
                    false
                }
            }

            override fun onPermissionRequest(request: PermissionRequest?) {
                if (request == null) return
                val host = runCatching { Uri.parse(request.origin.toString()).host }.getOrNull()
                if (host != "omarvio-browser.pages.dev") {
                    request.deny()
                    return
                }
                val needed = buildList {
                    if (PermissionRequest.RESOURCE_AUDIO_CAPTURE in request.resources) add(Manifest.permission.RECORD_AUDIO)
                    if (PermissionRequest.RESOURCE_VIDEO_CAPTURE in request.resources) add(Manifest.permission.CAMERA)
                }.distinct()
                if (needed.isEmpty()) {
                    request.deny()
                    return
                }
                val missing = needed.filter { ContextCompat.checkSelfPermission(this@UnifiedBrowserActivity, it) != PackageManager.PERMISSION_GRANTED }
                if (missing.isEmpty()) {
                    request.grant(request.resources.filter { it == PermissionRequest.RESOURCE_AUDIO_CAPTURE || it == PermissionRequest.RESOURCE_VIDEO_CAPTURE }.toTypedArray())
                } else {
                    pendingWebPermission = request
                    mediaPermissionLauncher.launch(missing.toTypedArray())
                }
            }

            override fun onShowCustomView(view: View?, callback: CustomViewCallback?) {
                if (view == null || callback == null || fullscreenView != null) {
                    callback?.onCustomViewHidden()
                    return
                }
                fullscreenView = view
                fullscreenCallback = callback
                root.addView(view, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
                webView.visibility = View.GONE
                window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_FULLSCREEN or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            }

            override fun onHideCustomView() = exitFullscreen()
        }

        webView.setDownloadListener(DownloadListener { url, userAgent, disposition, mimeType, _ ->
            startDownload(url, userAgent, disposition, mimeType, isApkUpdate = url.endsWith(".apk", true))
        })

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (fullscreenView != null) exitFullscreen()
                else if (webView.canGoBack()) webView.goBack()
                else webView.evaluateJavascript("window.dispatchEvent(new PopStateEvent('popstate'))", null)
            }
        })

        val incomingUrl = extractIncomingUrl(intent)
        webView.loadUrl(incomingUrl ?: "https://omarvio-browser.pages.dev/?androidShell=1")
        checkForApkUpdate()
    }

    private fun extractIncomingUrl(intent: Intent?): String? {
        if (intent == null) return null
        val candidates = listOfNotNull(
            intent.dataString,
            intent.getStringExtra(Intent.EXTRA_TEXT)
        )
        val regex = Regex("https?://[^\\s<>\"')\\]]+")
        for (raw in candidates) {
            val trimmed = raw.trim()
            val normalized = if (trimmed.startsWith("web+omarvio://")) {
                "https://" + trimmed.removePrefix("web+omarvio://")
            } else {
                regex.find(trimmed)?.value
            }
            if (!normalized.isNullOrBlank()) {
                return AdBlockEngine.unwrapRedirectUrl(normalized)
            }
        }
        return null
    }

    private fun exitFullscreen() {
        val view = fullscreenView ?: return
        (view.parent as? ViewGroup)?.removeView(view)
        fullscreenView = null
        fullscreenCallback?.onCustomViewHidden()
        fullscreenCallback = null
        webView.visibility = View.VISIBLE
        window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_VISIBLE
    }

    private fun startDownload(
        url: String,
        userAgent: String?,
        disposition: String?,
        mimeType: String?,
        isApkUpdate: Boolean = false
    ) {
        runCatching {
            val fileName = URLUtil.guessFileName(url, disposition, mimeType)
            val isApk = isApkUpdate || fileName.endsWith(".apk", true) || mimeType == "application/vnd.android.package-archive"
            var localApkFile: File? = null
            val request = DownloadManager.Request(Uri.parse(url)).apply {
                setTitle(fileName)
                setDescription("OMARVIO Browser download")
                setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                if (isApk) {
                    val dir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS)
                    if (dir != null) {
                        dir.mkdirs()
                        localApkFile = File(dir, fileName)
                        if (localApkFile?.exists() == true) localApkFile?.delete()
                        setDestinationInExternalFilesDir(this@UnifiedBrowserActivity, Environment.DIRECTORY_DOWNLOADS, fileName)
                    } else {
                        setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName)
                    }
                    setMimeType("application/vnd.android.package-archive")
                } else {
                    setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName)
                    mimeType?.let(::setMimeType)
                }
                userAgent?.let { addRequestHeader("User-Agent", it) }
            }
            val dm = getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
            val downloadId = dm.enqueue(request)
            if (isApk) {
                pendingApkDownloadId = downloadId
                pendingApkLocalFile = localApkFile
            }
            Toast.makeText(this, "ডাউনলোড শুরু হয়েছে: $fileName", Toast.LENGTH_SHORT).show()
        }.onFailure {
            Toast.makeText(this, "ডাউনলোড শুরু করা যায়নি", Toast.LENGTH_SHORT).show()
        }
    }

    private fun installApk(downloadId: Long, localFile: File?) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !packageManager.canRequestPackageInstalls()) {
            pendingInstallTarget = downloadId to localFile
            Toast.makeText(this, "অ্যাপ আপডেট ইনস্টল করতে অনুমতি দিন", Toast.LENGTH_LONG).show()
            runCatching {
                unknownSourcesLauncher.launch(
                    Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:$packageName"))
                )
            }
            return
        }
        val uri = when {
            localFile != null && localFile.exists() ->
                FileProvider.getUriForFile(this, "$packageName.fileprovider", localFile)
            else ->
                (getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager).getUriForDownloadedFile(downloadId)
        } ?: return

        val installIntent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/vnd.android.package-archive")
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        runCatching { startActivity(installIntent) }.onFailure {
            Toast.makeText(this, "APK ইনস্টলার খোলা যায়নি", Toast.LENGTH_SHORT).show()
        }
    }

    private fun checkForApkUpdate() {
        val pkgInfo = runCatching { packageManager.getPackageInfo(packageName, 0) }.getOrNull()
        val localVersion = pkgInfo?.versionName ?: "0"
        val localVersionCode = if (pkgInfo == null) 0 else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            pkgInfo.longVersionCode.toInt()
        } else {
            @Suppress("DEPRECATION")
            pkgInfo.versionCode
        }
        Executors.newSingleThreadExecutor().execute {
            val update = runCatching {
                val connection = (URL("https://omarvio-browser.pages.dev/api/apk-status?t=${System.currentTimeMillis()}").openConnection() as HttpURLConnection).apply {
                    connectTimeout = 5000
                    readTimeout = 5000
                    useCaches = false
                    setRequestProperty("Cache-Control", "no-cache")
                }
                if (connection.responseCode != 200) return@runCatching null
                val data = JSONObject(connection.inputStream.bufferedReader().use { it.readText() })
                val remoteVersion = data.optString("version").trim()
                val remoteCode = data.optInt("versionCode", 0)
                val apkUrl = data.optString("directApkUrl").trim()
                val apkUri = Uri.parse(apkUrl)
                val hasNewer = (remoteCode > localVersionCode) || isNewer(remoteVersion, localVersion)
                if (remoteVersion.isBlank() || !hasNewer || apkUri.scheme != "https") null
                else remoteVersion to apkUrl
            }.getOrNull()
            if (update != null) runOnUiThread {
                if (!isFinishing) android.app.AlertDialog.Builder(this)
                    .setTitle("OMARVIO আপডেট পাওয়া গেছে (v${update.first})")
                    .setMessage("নতুন সংস্করণ ${update.first} ডাউনলোড করে সরাসরি ইনস্টল করতে চান?")
                    .setNegativeButton("পরে", null)
                    .setPositiveButton("আপডেট ও ইনস্টল") { _, _ ->
                        startDownload(update.second, null, "attachment; filename=omarvio-browser-v${update.first}.apk", "application/vnd.android.package-archive", isApkUpdate = true)
                    }
                    .show()
            }
        }
    }

    private fun isNewer(remote: String, local: String): Boolean {
        val remoteParts = remote.split(Regex("[^0-9]+")).filter(String::isNotEmpty).mapNotNull(String::toIntOrNull)
        val localParts = local.split(Regex("[^0-9]+")).filter(String::isNotEmpty).mapNotNull(String::toIntOrNull)
        for (index in 0 until maxOf(remoteParts.size, localParts.size)) {
            val comparison = remoteParts.getOrElse(index) { 0 }.compareTo(localParts.getOrElse(index) { 0 })
            if (comparison != 0) return comparison > 0
        }
        return false
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        extractIncomingUrl(intent)?.let(webView::loadUrl)
    }

    override fun onDestroy() {
        runCatching { unregisterReceiver(downloadCompleteReceiver) }
        fileChooserCallback?.onReceiveValue(null)
        pendingWebPermission?.deny()
        webView.stopLoading()
        webView.destroy()
        super.onDestroy()
    }
}
