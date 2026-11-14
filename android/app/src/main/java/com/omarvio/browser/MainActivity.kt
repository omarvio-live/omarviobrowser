package com.omarvio.browser

import android.annotation.SuppressLint
import android.app.Activity
import android.app.DownloadManager
import android.content.Context
import android.content.Intent
import android.graphics.Color as AndroidColor
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.view.KeyEvent
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.CookieManager
import android.webkit.JavascriptInterface
import android.webkit.URLUtil
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.webkit.WebSettingsCompat
import androidx.webkit.WebViewFeature
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

private const val CLOUDFLARE_HOME_URL = "https://omarvio-browser.pages.dev/?androidShell=1"
private const val APK_STATUS_API_URL = "https://omarvio-browser.pages.dev/api/apk-status"

private const val MOBILE_USER_AGENT =
    "Mozilla/5.0 (Linux; Android 15; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
private const val DESKTOP_USER_AGENT =
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

private data class NativeShortcut(
    val name: String,
    val url: String,
    val badge: String,
    val bgColor: Color,
    val textColor: Color = Color.White
)

private data class NativeSearchEngine(
    val id: String,
    val label: String,
    val searchBase: String
)

private data class AppUpdateInfo(
    val version: String,
    val downloadUrl: String
)

private class OmarvioJsBridge(
    private val appVersion: String,
    private val onOpenExternalUrl: (String) -> Unit
) {
    @JavascriptInterface
    fun openUrl(url: String) {
        if (url.isNotBlank()) {
            onOpenExternalUrl(url)
        }
    }

    @JavascriptInterface
    fun getAppVersion(): String = appVersion

    @JavascriptInterface
    fun getBlockedCount(): Int = AdBlockEngine.blockedCount.get()
}

private fun isNewerVersion(remote: String, local: String): Boolean {
    val rParts = remote.split(Regex("[^0-9]+")).filter { it.isNotEmpty() }.mapNotNull { it.toIntOrNull() }
    val lParts = local.split(Regex("[^0-9]+")).filter { it.isNotEmpty() }.mapNotNull { it.toIntOrNull() }
    val maxLen = maxOf(rParts.size, lParts.size)
    for (i in 0 until maxLen) {
        val r = rParts.getOrElse(i) { 0 }
        val l = lParts.getOrElse(i) { 0 }
        if (r > l) return true
        if (r < l) return false
    }
    return false
}

class MainActivity : ComponentActivity() {
    private var webView: WebView? = null
    private var isCurrentlyHome: Boolean = true
    private var backToHomeCallback: (() -> Unit)? = null
    private var externalIntentUrlState = mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        val navBarDarkColor = AndroidColor.parseColor("#0B1329")
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(navBarDarkColor),
            navigationBarStyle = SystemBarStyle.dark(navBarDarkColor)
        )
        super.onCreate(savedInstanceState)

        // Explicitly enable hardware acceleration on Window level for 60fps PWA & Chromium rendering
        window.setFlags(
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED
        )

        val launchUrl = extractIntentUrl(intent)
        if (launchUrl != null) {
            externalIntentUrlState.value = launchUrl
            isCurrentlyHome = false
        }

        setContent {
            val externalUrl by externalIntentUrlState
            OmarVioBrowserApp(
                externalLaunchUrl = externalUrl,
                onExternalUrlConsumed = { externalIntentUrlState.value = null },
                onHomeVisibilityChanged = { homeVisible -> isCurrentlyHome = homeVisible },
                onRegisterReturnHome = { cb -> backToHomeCallback = cb },
                onInitWebView = { wv -> webView = wv },
                onDownloadFile = { url, _, contentDisposition, mimeType ->
                    handleDownload(url, contentDisposition, mimeType)
                }
            )
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        val url = extractIntentUrl(intent)
        if (url != null) {
            externalIntentUrlState.value = url
        }
    }

    private fun extractIntentUrl(intent: Intent?): String? {
        if (intent == null) return null
        val dataUrl = intent.dataString
        if (!dataUrl.isNullOrBlank() && (dataUrl.startsWith("http://") || dataUrl.startsWith("https://"))) {
            return dataUrl
        }
        val extraText = intent.getStringExtra(Intent.EXTRA_TEXT)
        if (!extraText.isNullOrBlank() && (extraText.startsWith("http://") || extraText.startsWith("https://"))) {
            return extraText
        }
        return null
    }

    /**
     * Intercept physical back key events at the Activity level when not handled by Compose BackHandler,
     * triggering WebBackForwardList history navigation step-by-step instead of exiting prematurely.
     */
    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_BACK && event?.repeatCount == 0 && !isCurrentlyHome) {
            onBackPressedDispatcher.onBackPressed()
            return true
        }
        return super.onKeyDown(keyCode, event)
    }

    private fun handleDownload(url: String, contentDisposition: String?, mimeType: String?) {
        try {
            val fileName = URLUtil.guessFileName(url, contentDisposition, mimeType)
            val request = DownloadManager.Request(Uri.parse(url)).apply {
                setMimeType(mimeType)
                addRequestHeader("User-Agent", MOBILE_USER_AGENT)
                setDescription("ওমারভিও সিকিউর ডাউনলোড")
                setTitle(fileName)
                setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName)
            }
            val dm = getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
            dm.enqueue(request)
            Toast.makeText(this, "ডাউনলোড শুরু হয়েছে: $fileName", Toast.LENGTH_SHORT).show()
        } catch (e: Exception) {
            Toast.makeText(this, "ডাউনলোড ব্যর্থ: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun OmarVioBrowserApp(
    externalLaunchUrl: String?,
    onExternalUrlConsumed: () -> Unit,
    onHomeVisibilityChanged: (Boolean) -> Unit,
    onRegisterReturnHome: (() -> Unit) -> Unit,
    onInitWebView: (WebView) -> Unit,
    onDownloadFile: (String, String, String?, String?) -> Unit
) {
    val context = LocalContext.current
    val installedVersion = remember {
        try {
            @Suppress("DEPRECATION")
            context.packageManager.getPackageInfo(context.packageName, 0).versionName ?: "2.0.0"
        } catch (_: Exception) {
            "2.0.0"
        }
    }

    var isHomeVisible by remember { mutableStateOf(externalLaunchUrl == null) }
    var currentUrl by remember { mutableStateOf(externalLaunchUrl ?: "") }
    var inputUrl by remember { mutableStateOf(externalLaunchUrl ?: "") }
    var homeSearchText by remember { mutableStateOf("") }
    var pageTitle by remember { mutableStateOf("OMARVIO BROWSER") }
    var isLoading by remember { mutableStateOf(false) }
    var canGoBack by remember { mutableStateOf(false) }
    var canGoForward by remember { mutableStateOf(false) }
    var isDesktopMode by remember { mutableStateOf(false) }
    var selectedEngineId by remember { mutableStateOf("google") }
    val blockedCount by AdBlockEngine.blockedCountFlow.collectAsState()
    var internalWebView: WebView? by remember { mutableStateOf(null) }

    // Synced Web Home UI state + Auto-Update state
    var homeWebView: WebView? by remember { mutableStateOf(null) }
    var homeWebFailed by remember { mutableStateOf(false) }
    var availableUpdate by remember { mutableStateOf<AppUpdateInfo?>(null) }

    // Fullscreen HTML5 video state
    var fullscreenView by remember { mutableStateOf<View?>(null) }
    var fullscreenCallback by remember { mutableStateOf<WebChromeClient.CustomViewCallback?>(null) }

    // File upload chooser state
    var pendingFileCallback by remember { mutableStateOf<ValueCallback<Array<Uri>>?>(null) }
    val fileChooserLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val callback = pendingFileCallback
        pendingFileCallback = null
        if (callback == null) return@rememberLauncherForActivityResult

        val uris: Array<Uri>? = if (result.resultCode == Activity.RESULT_OK && result.data != null) {
            val clipData = result.data?.clipData
            val dataUri = result.data?.data
            when {
                clipData != null && clipData.itemCount > 0 -> {
                    Array(clipData.itemCount) { i -> clipData.getItemAt(i).uri }
                }
                dataUri != null -> arrayOf(dataUri)
                else -> null
            }
        } else {
            null
        }
        callback.onReceiveValue(uris)
    }

    val engines = remember {
        listOf(
            NativeSearchEngine("google", "Google", "https://www.google.com/search?q="),
            NativeSearchEngine("duckduckgo", "DuckDuckGo", "https://duckduckgo.com/?q="),
            NativeSearchEngine("bing", "Bing", "https://www.bing.com/search?q="),
            NativeSearchEngine("brave", "Brave", "https://search.brave.com/search?q="),
            NativeSearchEngine("wiki", "Wikipedia", "https://bn.m.wikipedia.org/wiki/Special:Search?search=")
        )
    }

    val shortcuts = remember {
        listOf(
            NativeShortcut("Google", "https://www.google.com", "G", Color.White, Color(0xFF4285F4)),
            NativeShortcut("YouTube", "https://m.youtube.com", "▶", Color(0xFFFF0000)),
            NativeShortcut("Facebook", "https://m.facebook.com", "f", Color(0xFF1877F2)),
            NativeShortcut("Wikipedia", "https://bn.m.wikipedia.org", "W", Color.White, Color(0xFF0F172A)),
            NativeShortcut("DuckDuckGo", "https://duckduckgo.com", "D", Color(0xFFDE5833)),
            NativeShortcut("Bing", "https://www.bing.com", "B", Color.White, Color(0xFF008373)),
            NativeShortcut("Firefox", "https://www.mozilla.org", "🦊", Color(0xFFFF7139)),
            NativeShortcut("প্রথম আলো", "https://www.prothomalo.com", "PA", Color(0xFF0A192F), Color(0xFFFB7185))
        )
    }

    fun navigateToUrl(rawInput: String) {
        val trimmed = rawInput.trim()
        if (trimmed.isEmpty()) return

        val target = if (
            trimmed.startsWith("http://") ||
            trimmed.startsWith("https://") ||
            (trimmed.contains(".") && !trimmed.contains(" "))
        ) {
            if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) trimmed else "https://$trimmed"
        } else {
            val activeEngine = engines.firstOrNull { it.id == selectedEngineId } ?: engines.first()
            "${activeEngine.searchBase}${Uri.encode(trimmed)}"
        }

        isHomeVisible = false
        onHomeVisibilityChanged(false)
        currentUrl = target
        inputUrl = target
        homeSearchText = ""
        internalWebView?.loadUrl(target)
    }

    fun goToHome() {
        isHomeVisible = true
        onHomeVisibilityChanged(true)
        inputUrl = ""
    }

    fun toggleDesktopMode() {
        isDesktopMode = !isDesktopMode
        internalWebView?.let { wv ->
            wv.settings.userAgentString = if (isDesktopMode) DESKTOP_USER_AGENT else MOBILE_USER_AGENT
            wv.settings.useWideViewPort = true
            wv.settings.loadWithOverviewMode = true
            if (!isHomeVisible) wv.reload()
        }
    }

    LaunchedEffect(Unit) {
        onRegisterReturnHome { goToHome() }

        // Background APK Auto-Update Check against Cloudflare /api/apk-status
        val foundUpdate = withContext(Dispatchers.IO) {
            try {
                val conn = (URL(APK_STATUS_API_URL).openConnection() as HttpURLConnection).apply {
                    connectTimeout = 5000
                    readTimeout = 5000
                    requestMethod = "GET"
                }
                if (conn.responseCode == 200) {
                    val body = conn.inputStream.bufferedReader().use { it.readText() }
                    val json = JSONObject(body)
                    val remoteVer = json.optString("version", "").trim()
                    val apkUrl = json.optString("directApkUrl", "").trim()
                    if (remoteVer.isNotEmpty() && apkUrl.isNotEmpty() && isNewerVersion(remoteVer, installedVersion)) {
                        AppUpdateInfo(remoteVer, apkUrl)
                    } else null
                } else null
            } catch (_: Exception) {
                null
            }
        }
        if (foundUpdate != null) {
            availableUpdate = foundUpdate
        }
    }

    LaunchedEffect(isHomeVisible) {
        onHomeVisibilityChanged(isHomeVisible)
    }

    LaunchedEffect(externalLaunchUrl) {
        if (!externalLaunchUrl.isNullOrBlank()) {
            navigateToUrl(externalLaunchUrl)
            onExternalUrlConsumed()
        }
    }

    // Step-by-step Back Navigation Handler in Compose
    BackHandler(enabled = !isHomeVisible || fullscreenView != null) {
        if (fullscreenView != null) {
            fullscreenCallback?.onCustomViewHidden()
            fullscreenView = null
            fullscreenCallback = null
            return@BackHandler
        }

        val wv = internalWebView
        if (wv != null && WebBackNavigationManager.navigateBack(wv)) {
            canGoBack = WebBackNavigationManager.canNavigateBack(wv)
            canGoForward = WebBackNavigationManager.canNavigateForward(wv)
        } else {
            goToHome()
        }
    }

    Box(modifier = Modifier.fillMaxSize().background(Color(0xFF070913))) {
        Column(modifier = Modifier.fillMaxSize().imePadding()) {
            // Top Chrome-style Slim Header with explicit statusBarsPadding so Android status bar never overlaps
            Surface(color = Color(0xFF0B1329), modifier = Modifier.fillMaxWidth()) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .statusBarsPadding()
                        .padding(horizontal = 12.dp, vertical = 8.dp)
                ) {
                    if (isHomeVisible) {
                        // Clean single-row home header
                        Row(
                            modifier = Modifier.fillMaxWidth().height(40.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Image(
                                    painter = painterResource(id = R.drawable.omarvio_logo),
                                    contentDescription = "OMARVIO BROWSER",
                                    contentScale = ContentScale.Fit,
                                    modifier = Modifier
                                        .size(30.dp)
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(Color.Black)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "OMARVIO BROWSER",
                                    color = Color(0xFFF1F5F9),
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp,
                                    maxLines = 1
                                )
                            }

                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(Color(0xFF131B2E))
                                        .clickable { toggleDesktopMode() }
                                        .padding(horizontal = 10.dp, vertical = 6.dp)
                                ) {
                                    Icon(
                                        imageVector = if (isDesktopMode) Icons.Default.Laptop else Icons.Default.Smartphone,
                                        contentDescription = "Mode",
                                        tint = if (isDesktopMode) Color(0xFF38BDF8) else Color(0xFF94A3B8),
                                        modifier = Modifier.size(14.dp)
                                    )
                                    Spacer(modifier = Modifier.width(5.dp))
                                    Text(
                                        text = if (isDesktopMode) "Desktop" else "Mobile",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = if (isDesktopMode) Color(0xFF38BDF8) else Color(0xFFCBD5E1)
                                    )
                                }

                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        Icons.Default.Shield,
                                        contentDescription = "AdBlock",
                                        tint = Color(0xFF10B981),
                                        modifier = Modifier.size(15.dp)
                                    )
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text(
                                        text = "$blockedCount ব্লকড",
                                        color = Color(0xFF34D399),
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                }
                            }
                        }
                    } else {
                        // Active Webpage 1-Row Slim Omnibox Bar
                        Row(
                            modifier = Modifier.fillMaxWidth().height(44.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            IconButton(
                                onClick = { goToHome() },
                                modifier = Modifier.size(38.dp)
                            ) {
                                Icon(
                                    Icons.Default.Home,
                                    contentDescription = "Home",
                                    tint = Color(0xFF38BDF8),
                                    modifier = Modifier.size(20.dp)
                                )
                            }

                            Row(
                                modifier = Modifier
                                    .weight(1f)
                                    .height(40.dp)
                                    .clip(RoundedCornerShape(20.dp))
                                    .background(Color(0xFF131B2E))
                                    .border(1.dp, Color(0xFF1E293B), RoundedCornerShape(20.dp))
                                    .padding(horizontal = 12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    if (currentUrl.startsWith("https")) Icons.Default.Lock else Icons.Default.Search,
                                    contentDescription = "Security",
                                    tint = if (currentUrl.startsWith("https")) Color(0xFF10B981) else Color(0xFF94A3B8),
                                    modifier = Modifier.size(15.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                BasicTextField(
                                    value = inputUrl,
                                    onValueChange = { inputUrl = it },
                                    singleLine = true,
                                    textStyle = TextStyle(color = Color.White, fontSize = 13.sp),
                                    cursorBrush = SolidColor(Color(0xFF22D3EE)),
                                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Go),
                                    keyboardActions = KeyboardActions(onGo = { navigateToUrl(inputUrl) }),
                                    modifier = Modifier.weight(1f),
                                    decorationBox = { innerTextField ->
                                        if (inputUrl.isEmpty()) {
                                            Text(
                                                "সার্চ বা ওয়েব ঠিকানা লিখুন...",
                                                color = Color(0xFF64748B),
                                                fontSize = 13.sp,
                                                maxLines = 1
                                            )
                                        }
                                        innerTextField()
                                    }
                                )
                                if (inputUrl.isNotEmpty()) {
                                    IconButton(
                                        onClick = { inputUrl = "" },
                                        modifier = Modifier.size(28.dp)
                                    ) {
                                        Icon(
                                            Icons.Default.Close,
                                            contentDescription = "Clear",
                                            tint = Color(0xFF94A3B8),
                                            modifier = Modifier.size(14.dp)
                                        )
                                    }
                                }
                                IconButton(
                                    onClick = { internalWebView?.reload() },
                                    modifier = Modifier.size(28.dp)
                                ) {
                                    Icon(
                                        Icons.Default.Refresh,
                                        contentDescription = "Reload",
                                        tint = if (isLoading) Color(0xFF22D3EE) else Color(0xFFCBD5E1),
                                        modifier = Modifier.size(16.dp)
                                    )
                                }
                            }

                            IconButton(
                                onClick = { toggleDesktopMode() },
                                modifier = Modifier.size(36.dp)
                            ) {
                                Icon(
                                    imageVector = if (isDesktopMode) Icons.Default.Laptop else Icons.Default.Smartphone,
                                    contentDescription = "Toggle Desktop Mode",
                                    tint = if (isDesktopMode) Color(0xFF38BDF8) else Color(0xFF94A3B8),
                                    modifier = Modifier.size(19.dp)
                                )
                            }
                        }
                    }
                }
            }

            // Dismissible In-App Auto-Update Banner whenever Cloudflare reports a newer APK
            AnimatedVisibility(visible = availableUpdate != null) {
                availableUpdate?.let { update ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Color(0xFF064E3B))
                            .padding(horizontal = 12.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column(modifier = Modifier.weight(1f).padding(end = 8.dp)) {
                            Text(
                                text = "নতুন আপডেট পাওয়া গেছে (v${update.version})",
                                color = Color(0xFFECFDF5),
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Text(
                                text = "১ ক্লিকে নতুন APK ডাউনলোড করে আপডেট করুন",
                                color = Color(0xFFA7F3D0),
                                fontSize = 11.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Text(
                                text = "আপডেট",
                                color = Color(0xFF022C22),
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp,
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(Color(0xFF34D399))
                                    .clickable {
                                        onDownloadFile(
                                            update.downloadUrl,
                                            MOBILE_USER_AGENT,
                                            "attachment; filename=\"omarvio-browser-v${update.version}.apk\"",
                                            "application/vnd.android.package-archive"
                                        )
                                        availableUpdate = null
                                    }
                                    .padding(horizontal = 12.dp, vertical = 6.dp)
                            )
                            IconButton(
                                onClick = { availableUpdate = null },
                                modifier = Modifier.size(28.dp)
                            ) {
                                Icon(
                                    Icons.Default.Close,
                                    contentDescription = "Dismiss",
                                    tint = Color(0xFFA7F3D0),
                                    modifier = Modifier.size(16.dp)
                                )
                            }
                        }
                    }
                }
            }

            AnimatedVisibility(visible = isLoading && !isHomeVisible) {
                LinearProgressIndicator(
                    modifier = Modifier.fillMaxWidth().height(2.dp),
                    color = Color(0xFF06B6D4),
                    trackColor = Color(0xFF070913)
                )
            }

            // Main Content Area: Native Chromium WebView + Synced Cloudflare Home Shell (with Offline Fallback)
            Box(modifier = Modifier.weight(1f).fillMaxWidth()) {
                // 1. Dedicated Native Chromium WebView for real external websites
                AndroidView(
                    modifier = Modifier.fillMaxSize(),
                    factory = { ctx ->
                        WebView(ctx).apply {
                            layoutParams = ViewGroup.LayoutParams(
                                ViewGroup.LayoutParams.MATCH_PARENT,
                                ViewGroup.LayoutParams.MATCH_PARENT
                            )
                            setBackgroundColor(AndroidColor.parseColor("#070913"))
                            setLayerType(View.LAYER_TYPE_HARDWARE, null)
                            scrollBarStyle = View.SCROLLBARS_INSIDE_OVERLAY
                            overScrollMode = View.OVER_SCROLL_IF_CONTENT_SCROLLS

                            settings.apply {
                                offscreenPreRaster = true
                                @Suppress("DEPRECATION")
                                setRenderPriority(WebSettings.RenderPriority.HIGH)

                                javaScriptEnabled = true
                                domStorageEnabled = true
                                databaseEnabled = true
                                javaScriptCanOpenWindowsAutomatically = true
                                mediaPlaybackRequiresUserGesture = false
                                mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE

                                if (WebViewFeature.isFeatureSupported(WebViewFeature.ALGORITHMIC_DARKENING)) {
                                    WebSettingsCompat.setAlgorithmicDarkeningAllowed(this, false)
                                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                                    @Suppress("DEPRECATION")
                                    forceDark = WebSettings.FORCE_DARK_OFF
                                }

                                setSupportMultipleWindows(false)
                                allowFileAccess = false
                                loadsImagesAutomatically = true
                                useWideViewPort = true
                                loadWithOverviewMode = true
                                setSupportZoom(true)
                                builtInZoomControls = true
                                displayZoomControls = false
                                cacheMode = WebSettings.LOAD_DEFAULT
                                userAgentString = MOBILE_USER_AGENT
                            }

                            val browserWebView = this
                            CookieManager.getInstance().apply {
                                setAcceptCookie(true)
                                setAcceptThirdPartyCookies(browserWebView, true)
                            }

                            webChromeClient = OmarVioWebChromeClient(
                                onProgressChanged = { progress ->
                                    isLoading = progress < 100
                                },
                                onTitleReceived = { title ->
                                    if (title.isNotEmpty()) pageTitle = title
                                },
                                onShowFilePicker = { fileCallback, params ->
                                    pendingFileCallback?.onReceiveValue(null)
                                    pendingFileCallback = fileCallback
                                    try {
                                        val intent = params?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                                            addCategory(Intent.CATEGORY_OPENABLE)
                                            type = "*/*"
                                        }
                                        fileChooserLauncher.launch(intent)
                                        true
                                    } catch (_: Exception) {
                                        pendingFileCallback = null
                                        false
                                    }
                                },
                                onEnterFullscreen = { view, callback ->
                                    fullscreenView = view
                                    fullscreenCallback = callback
                                },
                                onExitFullscreen = {
                                    fullscreenView = null
                                    fullscreenCallback = null
                                }
                            )

                            webViewClient = OmarVioWebViewClient(
                                context = ctx,
                                onPageTitleChanged = { title -> pageTitle = title },
                                onUrlChanged = { url ->
                                    currentUrl = url
                                    if (!isHomeVisible) inputUrl = url
                                    canGoBack = WebBackNavigationManager.canNavigateBack(browserWebView)
                                    canGoForward = WebBackNavigationManager.canNavigateForward(browserWebView)
                                },
                                onLoadingStateChanged = { loading -> isLoading = loading },
                                onBackNavigationChanged = { backAvailable, forwardAvailable ->
                                    canGoBack = backAvailable
                                    canGoForward = forwardAvailable
                                }
                            )

                            setDownloadListener { url, userAgent, contentDisposition, mimetype, _ ->
                                onDownloadFile(url, userAgent, contentDisposition, mimetype)
                            }

                            internalWebView = this
                            onInitWebView(this)
                            if (currentUrl.isNotBlank()) {
                                loadUrl(currentUrl)
                            }
                        }
                    },
                    update = { wv ->
                        wv.setLayerType(View.LAYER_TYPE_HARDWARE, null)
                        internalWebView = wv
                    }
                )

                // 2. Synced Web Home UI Container (stays live-synced with Cloudflare Pages; shows offline fallback if offline on cold start)
                if (isHomeVisible) {
                    Box(modifier = Modifier.fillMaxSize().background(Color(0xFF060913))) {
                        if (!homeWebFailed) {
                            AndroidView(
                                modifier = Modifier.fillMaxSize(),
                                factory = { ctx ->
                                    WebView(ctx).apply {
                                        layoutParams = ViewGroup.LayoutParams(
                                            ViewGroup.LayoutParams.MATCH_PARENT,
                                            ViewGroup.LayoutParams.MATCH_PARENT
                                        )
                                        setBackgroundColor(AndroidColor.parseColor("#060913"))
                                        setLayerType(View.LAYER_TYPE_HARDWARE, null)

                                        settings.apply {
                                            javaScriptEnabled = true
                                            domStorageEnabled = true
                                            databaseEnabled = true
                                            loadsImagesAutomatically = true
                                            useWideViewPort = true
                                            loadWithOverviewMode = true
                                            cacheMode = WebSettings.LOAD_DEFAULT
                                            userAgentString = MOBILE_USER_AGENT
                                        }

                                        addJavascriptInterface(
                                            OmarvioJsBridge(installedVersion) { targetUrl ->
                                                post { navigateToUrl(targetUrl) }
                                            },
                                            "OmarvioAndroid"
                                        )

                                        webViewClient = object : WebViewClient() {
                                            override fun shouldOverrideUrlLoading(
                                                view: WebView?,
                                                request: WebResourceRequest?
                                            ): Boolean {
                                                val reqUrl = request?.url?.toString() ?: return false
                                                if (reqUrl.startsWith("https://omarvio-browser.pages.dev")) {
                                                    return false
                                                }
                                                navigateToUrl(reqUrl)
                                                return true
                                            }

                                            override fun onReceivedError(
                                                view: WebView?,
                                                request: WebResourceRequest?,
                                                error: WebResourceError?
                                            ) {
                                                if (request?.isForMainFrame == true) {
                                                    homeWebFailed = true
                                                }
                                            }
                                        }

                                        homeWebView = this
                                        loadUrl(CLOUDFLARE_HOME_URL)
                                    }
                                },
                                update = { wv ->
                                    homeWebView = wv
                                }
                            )
                        }

                        // Native Compose Home Fallback (only visible if offline before first Cloudflare cache)
                        if (homeWebFailed) {
                            Column(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .background(
                                        Brush.verticalGradient(
                                            listOf(Color(0xFF0A0F1F), Color(0xFF070B16), Color(0xFF050811))
                                        )
                                    )
                                    .verticalScroll(rememberScrollState())
                                    .padding(horizontal = 20.dp, vertical = 28.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Spacer(modifier = Modifier.height(8.dp))

                                Image(
                                    painter = painterResource(id = R.drawable.omarvio_logo),
                                    contentDescription = "OMARVIO BROWSER Logo",
                                    contentScale = ContentScale.Fit,
                                    modifier = Modifier
                                        .size(82.dp)
                                        .clip(RoundedCornerShape(18.dp))
                                        .background(Color.Black)
                                )

                                Spacer(modifier = Modifier.height(14.dp))

                                Text(
                                    text = "OMARVIO BROWSER",
                                    fontSize = 24.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = Color(0xFF38BDF8),
                                    letterSpacing = 0.6.sp,
                                    textAlign = TextAlign.Center
                                )

                                Spacer(modifier = Modifier.height(4.dp))

                                Text(
                                    text = "\"আমার ফোন, আমার ডেটা – কাউকে দেব না!\"",
                                    fontSize = 12.sp,
                                    color = Color(0xFF94A3B8),
                                    textAlign = TextAlign.Center
                                )

                                Spacer(modifier = Modifier.height(22.dp))

                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(52.dp)
                                        .clip(RoundedCornerShape(26.dp))
                                        .background(Color.White)
                                        .padding(start = 16.dp, end = 6.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(
                                        Icons.Default.Search,
                                        contentDescription = "Search",
                                        tint = Color(0xFF475569),
                                        modifier = Modifier.size(20.dp)
                                    )
                                    Spacer(modifier = Modifier.width(10.dp))
                                    BasicTextField(
                                        value = homeSearchText,
                                        onValueChange = { homeSearchText = it },
                                        singleLine = true,
                                        textStyle = TextStyle(
                                            color = Color(0xFF0F172A),
                                            fontSize = 14.sp,
                                            fontWeight = FontWeight.Medium
                                        ),
                                        cursorBrush = SolidColor(Color(0xFF0284C7)),
                                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                                        keyboardActions = KeyboardActions(onSearch = { navigateToUrl(homeSearchText) }),
                                        modifier = Modifier.weight(1f),
                                        decorationBox = { innerTextField ->
                                            if (homeSearchText.isEmpty()) {
                                                Text(
                                                    text = "সার্চ বা ওয়েব ঠিকানা লিখুন...",
                                                    color = Color(0xFF94A3B8),
                                                    fontSize = 14.sp,
                                                    maxLines = 1
                                                )
                                            }
                                            innerTextField()
                                        }
                                    )
                                    if (homeSearchText.isNotEmpty()) {
                                        IconButton(
                                            onClick = { homeSearchText = "" },
                                            modifier = Modifier.size(34.dp)
                                        ) {
                                            Icon(
                                                Icons.Default.Close,
                                                contentDescription = "Clear",
                                                tint = Color(0xFF64748B),
                                                modifier = Modifier.size(16.dp)
                                            )
                                        }
                                    }
                                    Box(
                                        modifier = Modifier
                                            .size(40.dp)
                                            .clip(CircleShape)
                                            .background(Color(0xFF0284C7))
                                            .clickable { navigateToUrl(homeSearchText) },
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(
                                            Icons.AutoMirrored.Filled.ArrowForward,
                                            contentDescription = "Go",
                                            tint = Color.White,
                                            modifier = Modifier.size(19.dp)
                                        )
                                    }
                                }

                                Spacer(modifier = Modifier.height(14.dp))

                                Row(
                                    modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    engines.forEach { eng ->
                                        val active = eng.id == selectedEngineId
                                        Text(
                                            text = eng.label,
                                            fontSize = 12.sp,
                                            fontWeight = if (active) FontWeight.Bold else FontWeight.Medium,
                                            color = if (active) Color(0xFF040817) else Color(0xFFCBD5E1),
                                            modifier = Modifier
                                                .clip(RoundedCornerShape(10.dp))
                                                .background(if (active) Color(0xFF22D3EE) else Color(0xFF131B2E))
                                                .clickable { selectedEngineId = eng.id }
                                                .padding(horizontal = 13.dp, vertical = 8.dp)
                                        )
                                    }
                                }

                                Spacer(modifier = Modifier.height(26.dp))

                                Text(
                                    text = "জনপ্রিয় ওয়েবসাইট",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = Color(0xFF94A3B8),
                                    modifier = Modifier.fillMaxWidth()
                                )
                                Spacer(modifier = Modifier.height(14.dp))

                                for (rowIndex in 0..1) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth().padding(bottom = 18.dp),
                                        horizontalArrangement = Arrangement.SpaceEvenly
                                    ) {
                                        for (colIndex in 0..3) {
                                            val item = shortcuts[rowIndex * 4 + colIndex]
                                            Column(
                                                horizontalAlignment = Alignment.CenterHorizontally,
                                                modifier = Modifier
                                                    .width(72.dp)
                                                    .clickable { navigateToUrl(item.url) }
                                            ) {
                                                Box(
                                                    modifier = Modifier
                                                        .size(52.dp)
                                                        .clip(CircleShape)
                                                        .background(Color(0xFF151E32))
                                                        .border(1.dp, Color(0xFF26324B), CircleShape),
                                                    contentAlignment = Alignment.Center
                                                ) {
                                                    Box(
                                                        modifier = Modifier
                                                            .size(38.dp)
                                                            .clip(CircleShape)
                                                            .background(item.bgColor),
                                                        contentAlignment = Alignment.Center
                                                    ) {
                                                        Text(
                                                            text = item.badge,
                                                            color = item.textColor,
                                                            fontWeight = FontWeight.Black,
                                                            fontSize = 15.sp
                                                        )
                                                    }
                                                }
                                                Spacer(modifier = Modifier.height(6.dp))
                                                Text(
                                                    text = item.name,
                                                    fontSize = 11.sp,
                                                    color = Color(0xFFE2E8F0),
                                                    maxLines = 1,
                                                    overflow = TextOverflow.Ellipsis,
                                                    textAlign = TextAlign.Center
                                                )
                                            }
                                        }
                                    }
                                }

                                Spacer(modifier = Modifier.height(8.dp))

                                Text(
                                    text = "ক্লাউড UI সিঙ্ক রিফ্রেশ করুন",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = Color(0xFF38BDF8),
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(10.dp))
                                        .background(Color(0xFF131B2E))
                                        .clickable {
                                            homeWebFailed = false
                                            homeWebView?.loadUrl(CLOUDFLARE_HOME_URL)
                                        }
                                        .padding(horizontal = 14.dp, vertical = 8.dp)
                                )
                            }
                        }
                    }
                }
            }

            // Bottom Navigation Toolbar with navigationBarsPadding so system keys never cover buttons
            Surface(color = Color(0xFF0B1329), modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .navigationBarsPadding()
                        .height(50.dp)
                        .padding(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(
                        onClick = {
                            if (isHomeVisible) return@IconButton
                            val wv = internalWebView
                            if (wv != null && WebBackNavigationManager.navigateBack(wv)) {
                                canGoBack = WebBackNavigationManager.canNavigateBack(wv)
                                canGoForward = WebBackNavigationManager.canNavigateForward(wv)
                            } else {
                                goToHome()
                            }
                        },
                        enabled = !isHomeVisible
                    ) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = if (!isHomeVisible) Color.White else Color(0xFF475569)
                        )
                    }

                    IconButton(
                        onClick = {
                            val wv = internalWebView
                            if (wv != null && WebBackNavigationManager.navigateForward(wv)) {
                                isHomeVisible = false
                                canGoBack = WebBackNavigationManager.canNavigateBack(wv)
                                canGoForward = WebBackNavigationManager.canNavigateForward(wv)
                            }
                        },
                        enabled = canGoForward
                    ) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowForward,
                            contentDescription = "Forward",
                            tint = if (canGoForward) Color.White else Color(0xFF475569)
                        )
                    }

                    IconButton(onClick = { goToHome() }) {
                        Icon(Icons.Default.Home, contentDescription = "Home", tint = Color(0xFF06B6D4))
                    }

                    IconButton(onClick = {
                        if (isHomeVisible) {
                            homeWebFailed = false
                            homeWebView?.loadUrl(CLOUDFLARE_HOME_URL)
                        } else {
                            internalWebView?.reload()
                        }
                    }) {
                        Icon(
                            Icons.Default.Refresh,
                            contentDescription = "Reload",
                            tint = Color.White
                        )
                    }

                    IconButton(onClick = {
                        val shareTarget =
                            if (isHomeVisible || currentUrl.isBlank()) "https://omarvio-browser.pages.dev" else currentUrl
                        val shareIntent = Intent(Intent.ACTION_SEND).apply {
                            type = "text/plain"
                            putExtra(Intent.EXTRA_TEXT, shareTarget)
                        }
                        context.startActivity(Intent.createChooser(shareIntent, "Share URL"))
                    }) {
                        Icon(Icons.Default.Share, contentDescription = "Share", tint = Color.White)
                    }
                }
            }
        }

        // Fullscreen Video Container Overlay
        fullscreenView?.let { customView ->
            AndroidView(
                modifier = Modifier.fillMaxSize().background(Color.Black),
                factory = { ctx ->
                    FrameLayout(ctx).apply {
                        addView(
                            customView,
                            ViewGroup.LayoutParams(
                                ViewGroup.LayoutParams.MATCH_PARENT,
                                ViewGroup.LayoutParams.MATCH_PARENT
                            )
                        )
                    }
                }
            )
        }
    }
}
