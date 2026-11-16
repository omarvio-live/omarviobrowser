package com.omarvio.browser

import android.Manifest
import android.annotation.SuppressLint
import android.app.DownloadManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.os.Environment
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
import org.json.JSONObject
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

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = android.graphics.Color.rgb(24, 25, 28)
        window.navigationBarColor = android.graphics.Color.rgb(6, 9, 19)

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
            startDownload(url, userAgent, disposition, mimeType)
        })

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (fullscreenView != null) exitFullscreen()
                else if (webView.canGoBack()) webView.goBack()
                else webView.evaluateJavascript("window.dispatchEvent(new PopStateEvent('popstate'))", null)
            }
        })

        val incomingUrl = intent?.dataString?.takeIf { it.startsWith("https://") || it.startsWith("http://") }
        webView.loadUrl(incomingUrl ?: "https://omarvio-browser.pages.dev/?androidShell=1")
        checkForApkUpdate()
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

    private fun startDownload(url: String, userAgent: String?, disposition: String?, mimeType: String?) {
        runCatching {
            val fileName = URLUtil.guessFileName(url, disposition, mimeType)
            val request = DownloadManager.Request(Uri.parse(url)).apply {
                setTitle(fileName)
                setDescription("OMARVIO Browser download")
                setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName)
                mimeType?.let(::setMimeType)
                userAgent?.let { addRequestHeader("User-Agent", it) }
            }
            (getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager).enqueue(request)
            Toast.makeText(this, "ডাউনলোড শুরু হয়েছে: $fileName", Toast.LENGTH_SHORT).show()
        }.onFailure {
            Toast.makeText(this, "ডাউনলোড শুরু করা যায়নি", Toast.LENGTH_SHORT).show()
        }
    }

    private fun checkForApkUpdate() {
        val localVersion = runCatching {
            @Suppress("DEPRECATION")
            packageManager.getPackageInfo(packageName, 0).versionName ?: "0"
        }.getOrDefault("0")
        Executors.newSingleThreadExecutor().execute {
            val update = runCatching {
                val connection = (URL("https://omarvio-browser.pages.dev/api/apk-status").openConnection() as HttpURLConnection).apply {
                    connectTimeout = 5000
                    readTimeout = 5000
                }
                if (connection.responseCode != 200) return@runCatching null
                val data = JSONObject(connection.inputStream.bufferedReader().use { it.readText() })
                val remoteVersion = data.optString("version").trim()
                val apkUrl = data.optString("directApkUrl").trim()
                val apkUri = Uri.parse(apkUrl)
                if (remoteVersion.isBlank() || !isNewer(remoteVersion, localVersion) || apkUri.scheme != "https" || apkUri.host != "github.com") null
                else remoteVersion to apkUrl
            }.getOrNull()
            if (update != null) runOnUiThread {
                if (!isFinishing) android.app.AlertDialog.Builder(this)
                    .setTitle("OMARVIO আপডেট পাওয়া গেছে")
                    .setMessage("নতুন সংস্করণ ${update.first} ডাউনলোড করতে চান?")
                    .setNegativeButton("পরে", null)
                    .setPositiveButton("ডাউনলোড") { _, _ -> startDownload(update.second, null, "attachment; filename=omarvio-browser.apk", "application/vnd.android.package-archive") }
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
        intent.dataString?.takeIf { it.startsWith("https://") || it.startsWith("http://") }?.let(webView::loadUrl)
    }

    override fun onDestroy() {
        fileChooserCallback?.onReceiveValue(null)
        pendingWebPermission?.deny()
        webView.stopLoading()
        webView.destroy()
        super.onDestroy()
    }
}
