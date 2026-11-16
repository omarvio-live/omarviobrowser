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
import android.webkit.WebStorage
import android.webkit.WebView
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.graphics.vector.ImageVector
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
import androidx.compose.ui.window.Dialog
import androidx.webkit.WebSettingsCompat
import androidx.webkit.WebViewFeature
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

private const val CLOUDFLARE_HOME_URL = "https://omarvio-browser.pages.dev/?androidShell=1"
private const val CLOUDFLARE_SETTINGS_URL = "https://omarvio-browser.pages.dev/?androidShell=1&openSettings=1"
private const val APK_STATUS_API_URL = "https://omarvio-browser.pages.dev/api/apk-status"
private const val PREFS_NAME = "omarvio_browser_prefs"

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
    val subtitle: String,
    val badge: String,
    val badgeColor: Color,
    val searchBase: String
)

private data class BrowserTabState(
    val id: String,
    val title: String = "New Tab",
    val url: String = "",
    val isIncognito: Boolean = false,
    val isDesktopMode: Boolean = false
)

private data class SavedEntry(
    val title: String,
    val url: String
)

private data class AppUpdateInfo(
    val version: String,
    val downloadUrl: String
)

private class OmarvioJsBridge(
    private val appVersion: String,
    private val onOpenExternalUrl: (String, Boolean) -> Unit,
    private val onSetEngine: (String) -> Unit,
    private val onSetDesktop: (Boolean) -> Unit,
    private val onClearData: () -> Unit,
    private val onSetAdBlock: (Boolean) -> Unit,
    private val onSetBlockCookies: (Boolean) -> Unit,
    private val onOpenSettingsModal: () -> Unit
) {
    @JavascriptInterface
    fun openUrl(url: String) {
        if (url.isNotBlank()) onOpenExternalUrl(url, false)
    }

    @JavascriptInterface
    fun openUrl(url: String, isIncognito: Boolean) {
        if (url.isNotBlank()) onOpenExternalUrl(url, isIncognito)
    }

    @JavascriptInterface
    fun setSearchEngine(engineId: String) {
        if (engineId.isNotBlank()) onSetEngine(engineId)
    }

    @JavascriptInterface
    fun setDesktopMode(enabled: Boolean) {
        onSetDesktop(enabled)
    }

    @JavascriptInterface
    fun setAdBlockEnabled(enabled: Boolean) {
        onSetAdBlock(enabled)
    }

    @JavascriptInterface
    fun setBlockThirdPartyCookies(blocked: Boolean) {
        onSetBlockCookies(blocked)
    }

    @JavascriptInterface
    fun openNativeSettings() {
        onOpenSettingsModal()
    }

    @JavascriptInterface
    fun clearAllData() {
        onClearData()
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
        val topBarColor = AndroidColor.parseColor("#18191C")
        val bottomBarColor = AndroidColor.parseColor("#0B1329")
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(topBarColor),
            navigationBarStyle = SystemBarStyle.dark(bottomBarColor)
        )
        super.onCreate(savedInstanceState)

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
    val prefs = remember { context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE) }

    val installedVersion = remember {
        try {
            @Suppress("DEPRECATION")
            context.packageManager.getPackageInfo(context.packageName, 0).versionName ?: "2.0.0"
        } catch (_: Exception) {
            "2.0.0"
        }
    }

    val engines = remember {
        listOf(
            NativeSearchEngine("brave", "Brave", "ট্র্যাকারমুক্ত গোপনীয় সার্চ", "Privacy Default", Color(0xFFFB542B), "https://search.brave.com/search?q="),
            NativeSearchEngine("google", "Google", "দ্রুত গতির রেজাল্ট", "Popular", Color(0xFF4285F4), "https://www.google.com/search?q="),
            NativeSearchEngine("duckduckgo", "DuckDuckGo", "ট্র্যাকারমুক্ত গোপনীয় সার্চ", "Zero Tracking", Color(0xFFDE5833), "https://duckduckgo.com/?q="),
            NativeSearchEngine("firefox", "Firefox", "ট্র্যাকারমুক্ত গোপনীয় সার্চ", "Mozilla", Color(0xFFFF7139), "https://duckduckgo.com/?t=ffab&q="),
            NativeSearchEngine("bing", "Bing", "দ্রুত গতির রেজাল্ট", "Microsoft", Color(0xFF008373), "https://www.bing.com/search?q="),
            NativeSearchEngine("startpage", "Startpage", "ট্র্যাকারমুক্ত গোপনীয় সার্চ", "Private Google", Color(0xFF2563EB), "https://www.startpage.com/sp/search?q="),
            NativeSearchEngine("ecosia", "Ecosia", "পরিবেশবান্ধব গ্রিন সার্চ", "Trees", Color(0xFF10B981), "https://www.ecosia.org/search?q=")
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

    // Multi-Tab State
    val tabs = remember {
        mutableStateListOf(
            BrowserTabState(
                id = "tab-1",
                url = externalLaunchUrl ?: "",
                title = if (externalLaunchUrl != null) externalLaunchUrl else "New Tab"
            )
        )
    }
    var activeTabIndex by remember { mutableIntStateOf(0) }
    val activeTab = tabs.getOrNull(activeTabIndex) ?: tabs.first()

    var isHomeVisible by remember { mutableStateOf(externalLaunchUrl == null) }
    var currentUrl by remember { mutableStateOf(externalLaunchUrl ?: "") }
    var inputUrl by remember { mutableStateOf(externalLaunchUrl ?: "") }
    var homeSearchText by remember { mutableStateOf("") }
    var pageTitle by remember { mutableStateOf("OMARVIO BROWSER") }
    var isLoading by remember { mutableStateOf(false) }
    var canGoBack by remember { mutableStateOf(false) }
    var canGoForward by remember { mutableStateOf(false) }
    var isDesktopMode by remember { mutableStateOf(false) }
    var selectedEngineId by remember {
        mutableStateOf(prefs.getString("selected_engine", "google") ?: "google")
    }
    var adBlockEnabled by remember { mutableStateOf(prefs.getBoolean("ad_block_enabled", true)) }
    var blockThirdPartyCookies by remember { mutableStateOf(prefs.getBoolean("block_third_party_cookies", true)) }
    var doNotTrackEnabled by remember { mutableStateOf(prefs.getBoolean("do_not_track_enabled", true)) }
    var httpsOnlyMode by remember { mutableStateOf(prefs.getBoolean("https_only_enabled", false)) }
    var isJsEnabled by remember { mutableStateOf(prefs.getBoolean("javascript_enabled", true)) }
    var forceDarkWeb by remember { mutableStateOf(prefs.getBoolean("force_dark_web", false)) }
    var saveHistory by remember { mutableStateOf(prefs.getBoolean("save_history_enabled", true)) }
    var textZoomPercent by remember { mutableIntStateOf(prefs.getInt("text_zoom_percent", 100)) }

    val blockedCount by AdBlockEngine.blockedCountFlow.collectAsState()
    var internalWebView: WebView? by remember { mutableStateOf(null) }

    fun syncPrivacyAndWebSettings() {
        AdBlockEngine.adBlockEnabled = adBlockEnabled
        AdBlockEngine.stripTrackingParamsEnabled = adBlockEnabled
        AdBlockEngine.httpsOnlyEnabled = httpsOnlyMode
        AdBlockEngine.doNotTrackEnabled = doNotTrackEnabled
        internalWebView?.let { wv ->
            wv.settings.javaScriptEnabled = isJsEnabled
            wv.settings.textZoom = textZoomPercent
            if (WebViewFeature.isFeatureSupported(WebViewFeature.ALGORITHMIC_DARKENING)) {
                WebSettingsCompat.setAlgorithmicDarkeningAllowed(wv.settings, forceDarkWeb)
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                @Suppress("DEPRECATION")
                wv.settings.forceDark = if (forceDarkWeb) WebSettings.FORCE_DARK_ON else WebSettings.FORCE_DARK_OFF
            }
            CookieManager.getInstance().setAcceptThirdPartyCookies(wv, !blockThirdPartyCookies)
        }
    }

    LaunchedEffect(
        adBlockEnabled,
        blockThirdPartyCookies,
        doNotTrackEnabled,
        httpsOnlyMode,
        isJsEnabled,
        forceDarkWeb,
        textZoomPercent
    ) {
        syncPrivacyAndWebSettings()
    }

    // Persisted Bookmarks & History
    val bookmarks = remember {
        mutableStateListOf<SavedEntry>().apply {
            val raw = prefs.getString("bookmarks_json", "[]") ?: "[]"
            try {
                val arr = JSONArray(raw)
                for (i in 0 until arr.length()) {
                    val obj = arr.getJSONObject(i)
                    add(SavedEntry(obj.optString("title"), obj.optString("url")))
                }
            } catch (_: Exception) {}
        }
    }
    val historyList = remember {
        mutableStateListOf<SavedEntry>().apply {
            val raw = prefs.getString("history_json", "[]") ?: "[]"
            try {
                val arr = JSONArray(raw)
                for (i in 0 until arr.length()) {
                    val obj = arr.getJSONObject(i)
                    add(SavedEntry(obj.optString("title"), obj.optString("url")))
                }
            } catch (_: Exception) {}
        }
    }

    fun persistBookmarks() {
        val arr = JSONArray()
        bookmarks.forEach { b ->
            arr.put(JSONObject().apply { put("title", b.title); put("url", b.url) })
        }
        prefs.edit().putString("bookmarks_json", arr.toString()).apply()
    }

    fun persistHistory() {
        val arr = JSONArray()
        historyList.take(80).forEach { h ->
            arr.put(JSONObject().apply { put("title", h.title); put("url", h.url) })
        }
        prefs.edit().putString("history_json", arr.toString()).apply()
    }

    fun addHistoryEntry(title: String, url: String) {
        if (!saveHistory || activeTab.isIncognito || url.isBlank() || url.startsWith("https://omarvio-browser.pages.dev")) return
        historyList.removeAll { it.url == url }
        historyList.add(0, SavedEntry(title.ifBlank { url }, url))
        if (historyList.size > 80) historyList.removeAt(historyList.lastIndex)
        persistHistory()
    }

    // Chrome-style Modals & Overlays when browsing
    var showChromeMenu by remember { mutableStateOf(false) }
    var showEngineModal by remember { mutableStateOf(false) }
    var showTabsModal by remember { mutableStateOf(false) }
    var showBookmarksModal by remember { mutableStateOf(false) }
    var showHistoryModal by remember { mutableStateOf(false) }
    var showFindBar by remember { mutableStateOf(false) }
    var findQuery by remember { mutableStateOf("") }
    var showNativeSettingsModal by remember { mutableStateOf(false) }
    var showReaderModal by remember { mutableStateOf(false) }
    var readerTitle by remember { mutableStateOf("") }
    var readerContent by remember { mutableStateOf("") }
    var readerTheme by remember { mutableIntStateOf(0) } // 0 = Dark, 1 = Sepia, 2 = Light
    var readerFontSize by remember { mutableIntStateOf(16) }

    // Synced Web Home UI + Auto-Update
    var homeWebView: WebView? by remember { mutableStateOf(null) }
    var homeTargetUrl by remember { mutableStateOf(CLOUDFLARE_HOME_URL) }
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

    fun selectSearchEngine(engineId: String) {
        selectedEngineId = engineId
        prefs.edit().putString("selected_engine", engineId).apply()
        homeWebView?.evaluateJavascript(
            "try{localStorage.setItem('omarvio_search_engine','$engineId');}catch(e){}",
            null
        )
    }

    fun navigateToUrl(rawInput: String, incognitoOverride: Boolean? = null) {
        val trimmed = rawInput.trim()
        if (trimmed.isEmpty()) return

        var target = if (
            trimmed.startsWith("http://") ||
            trimmed.startsWith("https://") ||
            (trimmed.contains(".") && !trimmed.contains(" "))
        ) {
            if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) trimmed else "https://$trimmed"
        } else {
            val activeEngine = engines.firstOrNull { it.id == selectedEngineId } ?: engines.first()
            "${activeEngine.searchBase}${Uri.encode(trimmed)}"
        }

        if (httpsOnlyMode && target.startsWith("http://")) {
            target = "https://" + target.removePrefix("http://")
        }
        target = AdBlockEngine.stripTrackingParameters(target)

        val currentIdx = activeTabIndex.coerceIn(0, tabs.lastIndex)
        val cur = tabs[currentIdx]
        val finalIncognito = incognitoOverride ?: cur.isIncognito
        tabs[currentIdx] = cur.copy(url = target, title = target, isIncognito = finalIncognito)

        isHomeVisible = false
        onHomeVisibilityChanged(false)
        currentUrl = target
        inputUrl = target
        homeSearchText = ""
        showReaderModal = false
        internalWebView?.let { wv ->
            if (doNotTrackEnabled) {
                wv.loadUrl(target, mapOf("DNT" to "1", "Sec-GPC" to "1"))
            } else {
                wv.loadUrl(target)
            }
        }
    }

    fun openReadingMode() {
        val wv = internalWebView
        if (wv == null || isHomeVisible) return
        val readerScript = """
            (function() {
                try {
                    var clone = document.body ? document.body.cloneNode(true) : null;
                    if (!clone) return JSON.stringify({ title: document.title || '', content: '' });
                    var kill = clone.querySelectorAll('script, style, noscript, iframe, nav, aside, header, footer, form, [class*="sidebar"], [id*="sidebar"], [class*="ad-"], [id*="ad-"], [class*="cookie"], [class*="consent"], [class*="comment"]');
                    for (var i = 0; i < kill.length; i++) kill[i].remove();
                    var root = clone.querySelector('article') || clone.querySelector('main') || clone;
                    var els = root.querySelectorAll('h1, h2, h3, p, blockquote, li');
                    var seen = {};
                    var out = [];
                    for (var j = 0; j < els.length; j++) {
                        var t = (els[j].innerText || '').replace(/\s+/g, ' ').trim();
                        if (!t) continue;
                        var tag = els[j].tagName;
                        if ((tag === 'P' || tag === 'LI') && t.length < 25) continue;
                        if (seen[t]) continue;
                        seen[t] = true;
                        out.push(t);
                    }
                    var bodyText = out.length > 0 ? out.join('\n\n') : (root.innerText || '').trim();
                    return JSON.stringify({ title: document.title || '', content: bodyText.slice(0, 12000) });
                } catch (e) {
                    return JSON.stringify({ title: document.title || '', content: '' });
                }
            })();
        """.trimIndent()
        wv.evaluateJavascript(readerScript) { rawJson ->
            try {
                val parsedText = if (rawJson != null && rawJson.startsWith("\"")) {
                    JSONObject("{\"v\":$rawJson}").optString("v", "{}")
                } else {
                    rawJson ?: "{}"
                }
                val obj = JSONObject(parsedText)
                val t = obj.optString("title", pageTitle).ifBlank { pageTitle }
                val c = obj.optString("content", "").trim()
                if (c.isNotEmpty()) {
                    readerTitle = t
                    readerContent = c
                    showReaderModal = true
                } else {
                    Toast.makeText(context, "এই পৃষ্ঠায় পড়ার মতো টেক্সট পাওয়া যায়নি", Toast.LENGTH_SHORT).show()
                }
            } catch (_: Exception) {
                Toast.makeText(context, "রিডার মোড চালু করা যায়নি", Toast.LENGTH_SHORT).show()
            }
        }
    }

    fun goToHome(homeUrl: String = CLOUDFLARE_HOME_URL) {
        homeTargetUrl = homeUrl
        val currentIdx = activeTabIndex.coerceIn(0, tabs.lastIndex)
        tabs[currentIdx] = tabs[currentIdx].copy(url = "", title = "New Tab")
        isHomeVisible = true
        onHomeVisibilityChanged(true)
        inputUrl = ""
        currentUrl = ""
        showFindBar = false
    }

    fun createNewTab(incognito: Boolean = false) {
        val newTab = BrowserTabState(
            id = "tab-${System.currentTimeMillis()}",
            title = if (incognito) "Incognito Tab" else "New Tab",
            url = "",
            isIncognito = incognito,
            isDesktopMode = isDesktopMode
        )
        tabs.add(newTab)
        activeTabIndex = tabs.lastIndex
        goToHome()
    }

    fun switchToTab(idx: Int) {
        if (idx !in tabs.indices) return
        activeTabIndex = idx
        val target = tabs[idx]
        isDesktopMode = target.isDesktopMode
        if (target.url.isBlank()) {
            isHomeVisible = true
            onHomeVisibilityChanged(true)
            currentUrl = ""
            inputUrl = ""
        } else {
            isHomeVisible = false
            onHomeVisibilityChanged(false)
            currentUrl = target.url
            inputUrl = target.url
            internalWebView?.settings?.userAgentString =
                if (target.isDesktopMode) DESKTOP_USER_AGENT else MOBILE_USER_AGENT
            internalWebView?.loadUrl(target.url)
        }
    }

    fun closeTabAt(idx: Int) {
        if (tabs.size <= 1) {
            tabs[0] = BrowserTabState(id = "tab-${System.currentTimeMillis()}")
            activeTabIndex = 0
            goToHome()
            return
        }
        tabs.removeAt(idx)
        val nextIdx = idx.coerceAtMost(tabs.lastIndex)
        switchToTab(nextIdx)
    }

    fun toggleDesktopMode(forceState: Boolean? = null) {
        val next = forceState ?: !isDesktopMode
        isDesktopMode = next
        val currentIdx = activeTabIndex.coerceIn(0, tabs.lastIndex)
        tabs[currentIdx] = tabs[currentIdx].copy(isDesktopMode = next)
        internalWebView?.let { wv ->
            wv.settings.userAgentString = if (next) DESKTOP_USER_AGENT else MOBILE_USER_AGENT
            wv.settings.useWideViewPort = true
            wv.settings.loadWithOverviewMode = true
            if (!isHomeVisible) wv.reload()
        }
    }

    fun clearAllBrowserData() {
        historyList.clear()
        persistHistory()
        try {
            internalWebView?.clearCache(true)
            internalWebView?.clearHistory()
            internalWebView?.clearFormData()
            CookieManager.getInstance().removeAllCookies(null)
            CookieManager.getInstance().flush()
            WebStorage.getInstance().deleteAllData()
        } catch (_: Exception) {}
        Toast.makeText(context, "🗑️ ব্রাউজিং হিস্ট্রি, কুকি ও ক্যাশ মুছে ফেলা হয়েছে", Toast.LENGTH_SHORT).show()
    }

    fun toggleBookmarkCurrent() {
        val targetUrl = currentUrl.trim()
        if (targetUrl.isBlank()) return
        val existingIdx = bookmarks.indexOfFirst { it.url == targetUrl }
        if (existingIdx >= 0) {
            bookmarks.removeAt(existingIdx)
            Toast.makeText(context, "বুকমার্ক সরানো হয়েছে", Toast.LENGTH_SHORT).show()
        } else {
            bookmarks.add(0, SavedEntry(pageTitle.ifBlank { targetUrl }, targetUrl))
            Toast.makeText(context, "★ বুকমার্ক সেভ করা হয়েছে", Toast.LENGTH_SHORT).show()
        }
        persistBookmarks()
    }

    LaunchedEffect(Unit) {
        onRegisterReturnHome { goToHome() }

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

    BackHandler(enabled = showChromeMenu || showEngineModal || showTabsModal || showBookmarksModal || showHistoryModal || showFindBar || showNativeSettingsModal || showReaderModal || !isHomeVisible || fullscreenView != null) {
        when {
            fullscreenView != null -> {
                fullscreenCallback?.onCustomViewHidden()
                fullscreenView = null
                fullscreenCallback = null
            }
            showReaderModal -> showReaderModal = false
            showNativeSettingsModal -> showNativeSettingsModal = false
            showChromeMenu -> showChromeMenu = false
            showEngineModal -> showEngineModal = false
            showTabsModal -> showTabsModal = false
            showBookmarksModal -> showBookmarksModal = false
            showHistoryModal -> showHistoryModal = false
            showFindBar -> {
                showFindBar = false
                internalWebView?.clearMatches()
            }
            else -> {
                val wv = internalWebView
                if (wv != null && WebBackNavigationManager.navigateBack(wv)) {
                    canGoBack = WebBackNavigationManager.canNavigateBack(wv)
                    canGoForward = WebBackNavigationManager.canNavigateForward(wv)
                } else {
                    goToHome()
                }
            }
        }
    }

    val isCurrentBookmarked = bookmarks.any { it.url == currentUrl }
    val activeEngine = engines.firstOrNull { it.id == selectedEngineId } ?: engines.first()

    Box(modifier = Modifier.fillMaxSize().background(Color(0xFF060913))) {
        Column(modifier = Modifier.fillMaxSize().imePadding()) {
            // Top Area: When live synced Home WebView is active, provide clean statusBarsPadding spacer ONLY (zero duplicate header!)
            // When browsing a webpage OR using offline fallback, render the clean Chrome Android Top Omnibox Bar!
            if (isHomeVisible && !homeWebFailed) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFF18191C))
                        .statusBarsPadding()
                )
            } else {
                Surface(color = Color(0xFF18191C), modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .statusBarsPadding()
                            .padding(horizontal = 8.dp, vertical = 8.dp)
                            .height(44.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
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

                        // Rounded Omnibox with SSL / Incognito indicator + Search Engine badge + Clear + Reload
                        Row(
                            modifier = Modifier
                                .weight(1f)
                                .height(40.dp)
                                .clip(RoundedCornerShape(20.dp))
                                .background(if (activeTab.isIncognito) Color(0xFF231936) else Color(0xFF28292C))
                                .border(
                                    1.dp,
                                    if (activeTab.isIncognito) Color(0xFF7E22CE).copy(alpha = 0.6f) else Color(0xFF3C4043),
                                    RoundedCornerShape(20.dp)
                                )
                                .padding(horizontal = 10.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = when {
                                    activeTab.isIncognito -> Icons.Default.VisibilityOff
                                    !isHomeVisible && currentUrl.startsWith("https") -> Icons.Default.Lock
                                    else -> Icons.Default.Search
                                },
                                contentDescription = "Status",
                                tint = when {
                                    activeTab.isIncognito -> Color(0xFFC084FC)
                                    !isHomeVisible && currentUrl.startsWith("https") -> Color(0xFF10B981)
                                    else -> Color(0xFF9AA0A6)
                                },
                                modifier = Modifier
                                    .size(16.dp)
                                    .clickable { showEngineModal = true }
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
                                            text = "${activeEngine.label}-এ সার্চ বা URL লিখুন...",
                                            color = Color(0xFF9AA0A6),
                                            fontSize = 13.sp,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
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
                                        tint = Color(0xFF9AA0A6),
                                        modifier = Modifier.size(15.dp)
                                    )
                                }
                            }
                            if (!isHomeVisible) {
                                IconButton(
                                    onClick = { internalWebView?.reload() },
                                    modifier = Modifier.size(28.dp)
                                ) {
                                    Icon(
                                        Icons.Default.Refresh,
                                        contentDescription = "Reload",
                                        tint = if (isLoading) Color(0xFF22D3EE) else Color(0xFFE3E3E3),
                                        modifier = Modifier.size(16.dp)
                                    )
                                }
                            }
                        }

                        // AdBlock & Privacy Shield Counter Badge (Brave/Chrome style)
                        Row(
                            modifier = Modifier
                                .height(34.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .background(if (adBlockEnabled) Color(0xFF082F49) else Color(0xFF28292C))
                                .border(
                                    1.dp,
                                    if (adBlockEnabled) Color(0xFF0EA5E9).copy(alpha = 0.5f) else Color(0xFF5F6368),
                                    RoundedCornerShape(10.dp)
                                )
                                .clickable { showNativeSettingsModal = true }
                                .padding(horizontal = 7.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(3.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Shield,
                                contentDescription = "Privacy Shields",
                                tint = if (adBlockEnabled) Color(0xFF38BDF8) else Color(0xFF9AA0A6),
                                modifier = Modifier.size(14.dp)
                            )
                            if (blockedCount > 0) {
                                Text(
                                    text = "$blockedCount",
                                    color = Color(0xFFBAE6FD),
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }

                        // Tab Switcher Counter [N]
                        Box(
                            modifier = Modifier
                                .size(34.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(Color(0xFF28292C))
                                .border(1.5.dp, Color(0xFF5F6368), RoundedCornerShape(8.dp))
                                .clickable { showTabsModal = true },
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "${tabs.size}",
                                color = Color(0xFFE3E3E3),
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }

                        // Chrome-style 3-Dot Overflow Menu
                        IconButton(
                            onClick = { showChromeMenu = true },
                            modifier = Modifier.size(38.dp)
                        ) {
                            Icon(
                                Icons.Default.MoreVert,
                                contentDescription = "More Options",
                                tint = Color(0xFFE3E3E3),
                                modifier = Modifier.size(22.dp)
                            )
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

            // Find in Page Bar (when triggered from 3-dot menu)
            AnimatedVisibility(visible = showFindBar && !isHomeVisible) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFF202124))
                        .padding(horizontal = 12.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Icon(Icons.Default.Search, contentDescription = null, tint = Color(0xFF9AA0A6), modifier = Modifier.size(18.dp))
                    BasicTextField(
                        value = findQuery,
                        onValueChange = {
                            findQuery = it
                            internalWebView?.findAllAsync(it)
                        },
                        singleLine = true,
                        textStyle = TextStyle(color = Color.White, fontSize = 13.sp),
                        cursorBrush = SolidColor(Color(0xFF22D3EE)),
                        modifier = Modifier.weight(1f),
                        decorationBox = { inner ->
                            if (findQuery.isEmpty()) Text("পৃষ্ঠার ভেতর খুঁজুন...", color = Color(0xFF9AA0A6), fontSize = 13.sp)
                            inner()
                        }
                    )
                    IconButton(onClick = { internalWebView?.findNext(false) }, modifier = Modifier.size(32.dp)) {
                        Icon(Icons.Default.KeyboardArrowUp, contentDescription = "Prev", tint = Color.White)
                    }
                    IconButton(onClick = { internalWebView?.findNext(true) }, modifier = Modifier.size(32.dp)) {
                        Icon(Icons.Default.KeyboardArrowDown, contentDescription = "Next", tint = Color.White)
                    }
                    IconButton(onClick = {
                        showFindBar = false
                        findQuery = ""
                        internalWebView?.clearMatches()
                    }, modifier = Modifier.size(32.dp)) {
                        Icon(Icons.Default.Close, contentDescription = "Close", tint = Color(0xFF9AA0A6))
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

            // Main Content Area: Native Chromium WebView + Synced Cloudflare Home UI (with Offline Fallback)
            Box(modifier = Modifier.weight(1f).fillMaxWidth()) {
                // 1. Native Chromium WebView for ALL websites
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

                                javaScriptEnabled = isJsEnabled
                                domStorageEnabled = true
                                databaseEnabled = true
                                javaScriptCanOpenWindowsAutomatically = true
                                mediaPlaybackRequiresUserGesture = false
                                mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
                                textZoom = textZoomPercent

                                if (WebViewFeature.isFeatureSupported(WebViewFeature.ALGORITHMIC_DARKENING)) {
                                    WebSettingsCompat.setAlgorithmicDarkeningAllowed(this, forceDarkWeb)
                                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                                    @Suppress("DEPRECATION")
                                    forceDark = if (forceDarkWeb) WebSettings.FORCE_DARK_ON else WebSettings.FORCE_DARK_OFF
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
                                setAcceptThirdPartyCookies(browserWebView, !blockThirdPartyCookies)
                            }

                            webChromeClient = OmarVioWebChromeClient(
                                onProgressChanged = { progress -> isLoading = progress < 100 },
                                onTitleReceived = { title ->
                                    if (title.isNotEmpty()) {
                                        pageTitle = title
                                        val idx = activeTabIndex.coerceIn(0, tabs.lastIndex)
                                        tabs[idx] = tabs[idx].copy(title = title)
                                    }
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
                                    if (!isHomeVisible) {
                                        inputUrl = url
                                        val idx = activeTabIndex.coerceIn(0, tabs.lastIndex)
                                        tabs[idx] = tabs[idx].copy(url = url)
                                        addHistoryEntry(pageTitle, url)
                                    }
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

                // 2. Synced Cloudflare Web Home Shell (exact 1:1 Website UI, Menus, Search Engine Modal, Settings)
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
                                            OmarvioJsBridge(
                                                appVersion = installedVersion,
                                                onOpenExternalUrl = { targetUrl, incog ->
                                                    post { navigateToUrl(targetUrl, incog) }
                                                },
                                                onSetEngine = { engId ->
                                                    post {
                                                        selectedEngineId = engId
                                                        prefs.edit().putString("selected_engine", engId).apply()
                                                    }
                                                },
                                                onSetDesktop = { enabled ->
                                                    post { toggleDesktopMode(enabled) }
                                                },
                                                onClearData = {
                                                    post { clearAllBrowserData() }
                                                },
                                                onSetAdBlock = { enabled ->
                                                    post {
                                                        adBlockEnabled = enabled
                                                        prefs.edit().putBoolean("ad_block_enabled", enabled).apply()
                                                    }
                                                },
                                                onSetBlockCookies = { blocked ->
                                                    post {
                                                        blockThirdPartyCookies = blocked
                                                        prefs.edit().putBoolean("block_third_party_cookies", blocked).apply()
                                                    }
                                                },
                                                onOpenSettingsModal = {
                                                    post { showNativeSettingsModal = true }
                                                }
                                            ),
                                            "OmarvioAndroid"
                                        )

                                        webViewClient = object : android.webkit.WebViewClient() {
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
                                        loadUrl(homeTargetUrl)
                                    }
                                },
                                update = { wv ->
                                    homeWebView = wv
                                    if (wv.url != null && wv.url != homeTargetUrl && homeTargetUrl.contains("openSettings")) {
                                        wv.loadUrl(homeTargetUrl)
                                    }
                                }
                            )
                        }

                        // Offline Native Fallback (only if offline on first launch before Cloudflare cache exists)
                        if (homeWebFailed) {
                            Column(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .background(Brush.verticalGradient(listOf(Color(0xFF0A0F1F), Color(0xFF070B16), Color(0xFF050811))))
                                    .verticalScroll(rememberScrollState())
                                    .padding(horizontal = 20.dp, vertical = 24.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Image(
                                    painter = painterResource(id = R.drawable.omarvio_logo),
                                    contentDescription = "OMARVIO BROWSER Logo",
                                    contentScale = ContentScale.Fit,
                                    modifier = Modifier.size(76.dp).clip(RoundedCornerShape(18.dp)).background(Color.Black)
                                )
                                Spacer(modifier = Modifier.height(12.dp))
                                Text("OMARVIO BROWSER", fontSize = 24.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFF38BDF8))
                                Text("\"আমার ফোন, আমার ডেটা – কাউকে দেব না!\"", fontSize = 12.sp, color = Color(0xFF94A3B8))
                                Spacer(modifier = Modifier.height(18.dp))

                                // White Pill Search Box with Engine Dropdown
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(52.dp)
                                        .clip(RoundedCornerShape(26.dp))
                                        .background(Color.White)
                                        .padding(horizontal = 10.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = "${activeEngine.label} ▾",
                                        color = Color(0xFF0284C7),
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 12.sp,
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(14.dp))
                                            .background(Color(0xFFE0F2FE))
                                            .clickable { showEngineModal = true }
                                            .padding(horizontal = 10.dp, vertical = 6.dp)
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    BasicTextField(
                                        value = homeSearchText,
                                        onValueChange = { homeSearchText = it },
                                        singleLine = true,
                                        textStyle = TextStyle(color = Color(0xFF0F172A), fontSize = 14.sp),
                                        cursorBrush = SolidColor(Color(0xFF0284C7)),
                                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                                        keyboardActions = KeyboardActions(onSearch = { navigateToUrl(homeSearchText) }),
                                        modifier = Modifier.weight(1f),
                                        decorationBox = { inner ->
                                            if (homeSearchText.isEmpty()) Text("সার্চ বা ওয়েব ঠিকানা লিখুন...", color = Color(0xFF94A3B8), fontSize = 13.sp)
                                            inner()
                                        }
                                    )
                                    Box(
                                        modifier = Modifier.size(38.dp).clip(CircleShape).background(Color(0xFF2563EB)).clickable { navigateToUrl(homeSearchText) },
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = "Go", tint = Color.White, modifier = Modifier.size(18.dp))
                                    }
                                }

                                Spacer(modifier = Modifier.height(22.dp))
                                for (rowIndex in 0..1) {
                                    Row(modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp), horizontalArrangement = Arrangement.SpaceEvenly) {
                                        for (colIndex in 0..3) {
                                            val item = shortcuts[rowIndex * 4 + colIndex]
                                            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.width(72.dp).clickable { navigateToUrl(item.url) }) {
                                                Box(
                                                    modifier = Modifier.size(50.dp).clip(CircleShape).background(Color(0xFF151E32)).border(1.dp, Color(0xFF26324B), CircleShape),
                                                    contentAlignment = Alignment.Center
                                                ) {
                                                    Box(modifier = Modifier.size(36.dp).clip(CircleShape).background(item.bgColor), contentAlignment = Alignment.Center) {
                                                        Text(item.badge, color = item.textColor, fontWeight = FontWeight.Black, fontSize = 14.sp)
                                                    }
                                                }
                                                Spacer(modifier = Modifier.height(6.dp))
                                                Text(item.name, fontSize = 11.sp, color = Color(0xFFE2E8F0), maxLines = 1, overflow = TextOverflow.Ellipsis)
                                            }
                                        }
                                    }
                                }

                                Text(
                                    text = "ওয়েবসাইট UI পুনরায় সিঙ্ক করুন",
                                    color = Color(0xFF38BDF8),
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(10.dp))
                                        .background(Color(0xFF131B2E))
                                        .clickable {
                                            homeWebFailed = false
                                            homeTargetUrl = CLOUDFLARE_HOME_URL
                                            homeWebView?.loadUrl(CLOUDFLARE_HOME_URL)
                                        }
                                        .padding(horizontal = 14.dp, vertical = 8.dp)
                                )
                            }
                        }
                    }
                }
            }

            // Bottom Navigation Toolbar during active website browsing (plus clean nav bar padding on Home)
            if (!isHomeVisible) {
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
                                val wv = internalWebView
                                if (wv != null && WebBackNavigationManager.navigateBack(wv)) {
                                    canGoBack = WebBackNavigationManager.canNavigateBack(wv)
                                    canGoForward = WebBackNavigationManager.canNavigateForward(wv)
                                } else {
                                    goToHome()
                                }
                            }
                        ) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = Color.White)
                        }

                        IconButton(
                            onClick = {
                                val wv = internalWebView
                                if (wv != null && WebBackNavigationManager.navigateForward(wv)) {
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

                        IconButton(onClick = { internalWebView?.reload() }) {
                            Icon(Icons.Default.Refresh, contentDescription = "Reload", tint = Color.White)
                        }

                        IconButton(onClick = {
                            val shareTarget = if (currentUrl.isBlank()) "https://omarvio-browser.pages.dev" else currentUrl
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
            } else {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFF060913))
                        .navigationBarsPadding()
                )
            }
        }

        // =========================================================================
        // CHROME ANDROID 3-DOT OVERFLOW MENU SHEET (Matches Website Screenshot #6)
        // =========================================================================
        if (showChromeMenu) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.45f))
                    .clickable { showChromeMenu = false },
                contentAlignment = Alignment.TopEnd
            ) {
                Column(
                    modifier = Modifier
                        .statusBarsPadding()
                        .padding(top = 8.dp, end = 10.dp)
                        .width(290.dp)
                        .heightIn(max = 600.dp)
                        .clip(RoundedCornerShape(18.dp))
                        .background(Color(0xFF28292C))
                        .border(1.dp, Color(0xFF3C4043), RoundedCornerShape(18.dp))
                        .clickable(enabled = false) {}
                        .verticalScroll(rememberScrollState())
                        .padding(vertical = 6.dp)
                ) {
                    // Quick Top Icon Bar (← → ★ ↓ ↻)
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 8.dp, vertical = 6.dp),
                        horizontalArrangement = Arrangement.SpaceEvenly,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        IconButton(onClick = {
                            showChromeMenu = false
                            if (canGoBack) internalWebView?.goBack() else goToHome()
                        }) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = Color(0xFFE3E3E3))
                        }
                        IconButton(onClick = {
                            showChromeMenu = false
                            internalWebView?.goForward()
                        }, enabled = canGoForward) {
                            Icon(
                                Icons.AutoMirrored.Filled.ArrowForward,
                                contentDescription = "Forward",
                                tint = if (canGoForward) Color(0xFFE3E3E3) else Color(0xFF5F6368)
                            )
                        }
                        IconButton(onClick = {
                            toggleBookmarkCurrent()
                            showChromeMenu = false
                        }) {
                            Icon(
                                if (isCurrentBookmarked) Icons.Default.Star else Icons.Default.StarBorder,
                                contentDescription = "Bookmark",
                                tint = if (isCurrentBookmarked) Color(0xFFFACC15) else Color(0xFFE3E3E3)
                            )
                        }
                        IconButton(onClick = {
                            showChromeMenu = false
                            try {
                                context.startActivity(Intent(DownloadManager.ACTION_VIEW_DOWNLOADS))
                            } catch (_: Exception) {}
                        }) {
                            Icon(Icons.Default.Download, contentDescription = "Downloads", tint = Color(0xFFE3E3E3))
                        }
                        IconButton(onClick = {
                            showChromeMenu = false
                            internalWebView?.reload()
                        }) {
                            Icon(Icons.Default.Refresh, contentDescription = "Reload", tint = Color(0xFFE3E3E3))
                        }
                    }

                    HorizontalDivider(color = Color(0xFF3C4043))

                    ChromeMenuRow(Icons.Default.Add, "New tab") {
                        showChromeMenu = false
                        createNewTab(incognito = false)
                    }
                    ChromeMenuRow(Icons.Default.VisibilityOff, "New Incognito tab") {
                        showChromeMenu = false
                        createNewTab(incognito = true)
                    }

                    HorizontalDivider(color = Color(0xFF3C4043))

                    ChromeMenuRow(Icons.Default.History, "History") {
                        showChromeMenu = false
                        showHistoryModal = true
                    }
                    ChromeMenuRow(Icons.Default.Delete, "Delete browsing data") {
                        showChromeMenu = false
                        clearAllBrowserData()
                    }
                    ChromeMenuRow(Icons.Default.Download, "Downloads") {
                        showChromeMenu = false
                        try {
                            context.startActivity(Intent(DownloadManager.ACTION_VIEW_DOWNLOADS))
                        } catch (_: Exception) {}
                    }
                    ChromeMenuRow(Icons.Default.Bookmark, "Bookmarks") {
                        showChromeMenu = false
                        showBookmarksModal = true
                    }
                    ChromeMenuRow(Icons.Default.Layers, "Tabs (${tabs.size})") {
                        showChromeMenu = false
                        showTabsModal = true
                    }

                    HorizontalDivider(color = Color(0xFF3C4043))

                    ChromeMenuRow(Icons.Default.Search, "Search engine (${activeEngine.label})") {
                        showChromeMenu = false
                        showEngineModal = true
                    }
                    if (!isHomeVisible) {
                        ChromeMenuRow(
                            icon = Icons.Default.MenuBook,
                            label = if (showReaderModal) "Exit Reading mode" else "Show Reading mode"
                        ) {
                            showChromeMenu = false
                            if (showReaderModal) showReaderModal = false else openReadingMode()
                        }
                    }
                    ChromeMenuRow(Icons.Default.FindInPage, "Find in page") {
                        showChromeMenu = false
                        showFindBar = true
                    }
                    ChromeMenuRow(
                        icon = Icons.Default.Laptop,
                        label = if (isDesktopMode) "Desktop site  ✓" else "Desktop site"
                    ) {
                        showChromeMenu = false
                        toggleDesktopMode()
                    }
                    ChromeMenuRow(
                        icon = Icons.Default.Shield,
                        label = if (adBlockEnabled) "Privacy Shields ($blockedCount blocked)" else "Privacy Shields (Paused)"
                    ) {
                        showChromeMenu = false
                        showNativeSettingsModal = true
                    }

                    HorizontalDivider(color = Color(0xFF3C4043))

                    ChromeMenuRow(Icons.Default.Settings, "Browser Settings (Chrome / Shields)") {
                        showChromeMenu = false
                        showNativeSettingsModal = true
                    }
                    ChromeMenuRow(Icons.Default.Tune, "Customize Home (Web UI)") {
                        showChromeMenu = false
                        goToHome(CLOUDFLARE_SETTINGS_URL)
                    }
                }
            }
        }

        // =========================================================================
        // SEARCH ENGINE SELECTOR MODAL (Matches Website Screenshot #1)
        // =========================================================================
        if (showEngineModal) {
            Dialog(onDismissRequest = { showEngineModal = false }) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(24.dp))
                        .background(Color(0xFF202124))
                        .border(1.dp, Color(0xFF3C4043), RoundedCornerShape(24.dp))
                        .padding(16.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconButton(onClick = { showEngineModal = false }, modifier = Modifier.size(34.dp)) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = Color.White)
                        }
                        Spacer(modifier = Modifier.width(6.dp))
                        Column {
                            Text("Search engine", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 17.sp)
                            Text("ডিফল্ট সার্চ ইঞ্জিন ও প্রাইভেসির উৎস বেছে নিন", color = Color(0xFF9AA0A6), fontSize = 11.sp)
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    LazyColumn(modifier = Modifier.heightIn(max = 380.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(engines) { eng ->
                            val selected = eng.id == selectedEngineId
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(16.dp))
                                    .background(if (selected) Color(0xFF1E3A5F) else Color(0xFF292A2D))
                                    .border(
                                        1.dp,
                                        if (selected) Color(0xFF38BDF8) else Color(0xFF3C4043),
                                        RoundedCornerShape(16.dp)
                                    )
                                    .clickable { selectSearchEngine(eng.id) }
                                    .padding(horizontal = 14.dp, vertical = 12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                                    Box(
                                        modifier = Modifier.size(36.dp).clip(CircleShape).background(eng.badgeColor),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(eng.label.take(1), color = Color.White, fontWeight = FontWeight.ExtraBold, fontSize = 15.sp)
                                    }
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Column {
                                        Text("${eng.label} · ${eng.badge}", color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                                        Text(eng.subtitle, color = Color(0xFF9AA0A6), fontSize = 11.sp)
                                    }
                                }
                                Icon(
                                    imageVector = if (selected) Icons.Default.CheckCircle else Icons.Default.RadioButtonUnchecked,
                                    contentDescription = null,
                                    tint = if (selected) Color(0xFF38BDF8) else Color(0xFF5F6368)
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                        Button(
                            onClick = { showEngineModal = false },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF3C4043))
                        ) {
                            Text("ঠিক আছে", color = Color.White, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }

        // =========================================================================
        // TAB SWITCHER MODAL
        // =========================================================================
        if (showTabsModal) {
            Dialog(onDismissRequest = { showTabsModal = false }) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(22.dp))
                        .background(Color(0xFF18191C))
                        .border(1.dp, Color(0xFF3C4043), RoundedCornerShape(22.dp))
                        .padding(16.dp)
                ) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text("ওপেন ট্যাব (${tabs.size})", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(
                                "+ New",
                                color = Color(0xFF04101E),
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp,
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(Color(0xFF38BDF8))
                                    .clickable { showTabsModal = false; createNewTab(false) }
                                    .padding(horizontal = 10.dp, vertical = 6.dp)
                            )
                            Text(
                                "🕵️ Incognito",
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp,
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(Color(0xFF581C87))
                                    .clickable { showTabsModal = false; createNewTab(true) }
                                    .padding(horizontal = 10.dp, vertical = 6.dp)
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                    LazyColumn(modifier = Modifier.heightIn(max = 340.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(tabs.size) { idx ->
                            val tab = tabs[idx]
                            val isActive = idx == activeTabIndex
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(if (isActive) Color(0xFF1E3A5F) else Color(0xFF28292C))
                                    .clickable { showTabsModal = false; switchToTab(idx) }
                                    .padding(horizontal = 12.dp, vertical = 10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Column(modifier = Modifier.weight(1f).padding(end = 8.dp)) {
                                    Text(
                                        text = (if (tab.isIncognito) "🕵️ " else "") + tab.title,
                                        color = Color.White,
                                        fontWeight = FontWeight.SemiBold,
                                        fontSize = 13.sp,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    if (tab.url.isNotBlank()) {
                                        Text(tab.url, color = Color(0xFF9AA0A6), fontSize = 11.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                    }
                                }
                                IconButton(onClick = { closeTabAt(idx) }, modifier = Modifier.size(30.dp)) {
                                    Icon(Icons.Default.Close, contentDescription = "Close Tab", tint = Color(0xFF9AA0A6), modifier = Modifier.size(18.dp))
                                }
                            }
                        }
                    }
                }
            }
        }

        // =========================================================================
        // BOOKMARKS MODAL
        // =========================================================================
        if (showBookmarksModal) {
            SavedListDialog(
                title = "বুকমার্কস (${bookmarks.size})",
                entries = bookmarks,
                emptyText = "এখনো কোনো বুকমার্ক সেভ করা হয়নি",
                onDismiss = { showBookmarksModal = false },
                onSelect = { showBookmarksModal = false; navigateToUrl(it.url) },
                onClearAll = null
            )
        }

        // =========================================================================
        // HISTORY MODAL
        // =========================================================================
        if (showHistoryModal) {
            SavedListDialog(
                title = "ব্রাউজিং হিস্ট্রি (${historyList.size})",
                entries = historyList,
                emptyText = "হিস্ট্রি সম্পূর্ণ খালি",
                onDismiss = { showHistoryModal = false },
                onSelect = { showHistoryModal = false; navigateToUrl(it.url) },
                onClearAll = {
                    historyList.clear()
                    persistHistory()
                    showHistoryModal = false
                }
            )
        }

        // =========================================================================
        // CHROME / FIREFOX / BRAVE NATIVE BROWSER SETTINGS MODAL
        // =========================================================================
        if (showNativeSettingsModal) {
            Dialog(onDismissRequest = { showNativeSettingsModal = false }) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 620.dp)
                        .clip(RoundedCornerShape(24.dp))
                        .background(Color(0xFF18191C))
                        .border(1.dp, Color(0xFF3C4043), RoundedCornerShape(24.dp))
                ) {
                    // Header
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Color(0xFF202124))
                            .padding(horizontal = 14.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Settings, contentDescription = null, tint = Color(0xFF38BDF8), modifier = Modifier.size(22.dp))
                            Spacer(modifier = Modifier.width(10.dp))
                            Column {
                                Text("OMARVIO Settings", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                                Text("Chrome · Firefox · Brave Controls · v$installedVersion", color = Color(0xFF9AA0A6), fontSize = 11.sp)
                            }
                        }
                        IconButton(onClick = { showNativeSettingsModal = false }, modifier = Modifier.size(34.dp)) {
                            Icon(Icons.Default.Close, contentDescription = "Close", tint = Color(0xFF9AA0A6))
                        }
                    }

                    Column(
                        modifier = Modifier
                            .weight(1f, fill = false)
                            .verticalScroll(rememberScrollState())
                            .padding(horizontal = 14.dp, vertical = 12.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Text("PRIVACY & AD-BLOCK SHIELDS", color = Color(0xFF38BDF8), fontSize = 11.sp, fontWeight = FontWeight.Bold)

                        NativeSettingToggleRow(
                            icon = Icons.Default.Shield,
                            title = "Ad & Tracker Blocker",
                            subtitle = "বিজ্ঞাপন, পপ-আপ ও ট্র্যাকিং স্ক্রিপ্ট বন্ধ করুন ($blockedCount blocked)",
                            checked = adBlockEnabled,
                            onCheckedChange = {
                                adBlockEnabled = it
                                prefs.edit().putBoolean("ad_block_enabled", it).apply()
                            }
                        )

                        NativeSettingToggleRow(
                            icon = Icons.Default.Cookie,
                            title = "Block Third-Party Cookies",
                            subtitle = "অন্যান্য সাইটের ক্রস-সাইট ট্র্যাকিং কুকি বন্ধ রাখুন",
                            checked = blockThirdPartyCookies,
                            onCheckedChange = {
                                blockThirdPartyCookies = it
                                prefs.edit().putBoolean("block_third_party_cookies", it).apply()
                            }
                        )

                        NativeSettingToggleRow(
                            icon = Icons.Default.PrivacyTip,
                            title = "Send 'Do Not Track' & GPC",
                            subtitle = "ওয়েবসাইটগুলোতে DNT: 1 ও Sec-GPC প্রাইভেসি সিগন্যাল পাঠান",
                            checked = doNotTrackEnabled,
                            onCheckedChange = {
                                doNotTrackEnabled = it
                                prefs.edit().putBoolean("do_not_track_enabled", it).apply()
                            }
                        )

                        NativeSettingToggleRow(
                            icon = Icons.Default.Lock,
                            title = "HTTPS-Only Mode",
                            subtitle = "সকল ওয়েবসাইট এনক্রিপ্টেড HTTPS সংযোগে আপগ্রেড করুন",
                            checked = httpsOnlyMode,
                            onCheckedChange = {
                                httpsOnlyMode = it
                                prefs.edit().putBoolean("https_only_enabled", it).apply()
                            }
                        )

                        NativeSettingToggleRow(
                            icon = Icons.Default.History,
                            title = "Save Browsing History",
                            subtitle = "ভিজিট করা সাইটের লোকাল হিস্ট্রি সংরক্ষণ করুন",
                            checked = saveHistory,
                            onCheckedChange = {
                                saveHistory = it
                                prefs.edit().putBoolean("save_history_enabled", it).apply()
                            }
                        )

                        HorizontalDivider(color = Color(0xFF2D2F34))
                        Text("SEARCH & SITE SETTINGS", color = Color(0xFF38BDF8), fontSize = 11.sp, fontWeight = FontWeight.Bold)

                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(14.dp))
                                .background(Color(0xFF24262B))
                                .clickable {
                                    showNativeSettingsModal = false
                                    showEngineModal = true
                                }
                                .padding(horizontal = 12.dp, vertical = 12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                                Icon(Icons.Default.Search, contentDescription = null, tint = Color(0xFF38BDF8), modifier = Modifier.size(20.dp))
                                Spacer(modifier = Modifier.width(12.dp))
                                Column {
                                    Text("Search Engine", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                                    Text("বর্তমান: ${activeEngine.label} (${activeEngine.badge})", color = Color(0xFF9AA0A6), fontSize = 11.sp)
                                }
                            }
                            Icon(Icons.Default.ChevronRight, contentDescription = null, tint = Color(0xFF9AA0A6))
                        }

                        NativeSettingToggleRow(
                            icon = Icons.Default.Laptop,
                            title = "Desktop Site",
                            subtitle = "ওয়েবসাইটগুলো কম্পিউটার ভার্সনে লোড করুন",
                            checked = isDesktopMode,
                            onCheckedChange = { toggleDesktopMode(it) }
                        )

                        NativeSettingToggleRow(
                            icon = Icons.Default.Code,
                            title = "JavaScript",
                            subtitle = "সাইটের ডাইনামিক ফিচার ও প্লেয়ার চালু রাখুন",
                            checked = isJsEnabled,
                            onCheckedChange = {
                                isJsEnabled = it
                                prefs.edit().putBoolean("javascript_enabled", it).apply()
                                if (!isHomeVisible) internalWebView?.reload()
                            }
                        )

                        HorizontalDivider(color = Color(0xFF2D2F34))
                        Text("APPEARANCE & TEXT SCALING", color = Color(0xFF38BDF8), fontSize = 11.sp, fontWeight = FontWeight.Bold)

                        NativeSettingToggleRow(
                            icon = Icons.Default.DarkMode,
                            title = "Force Dark Mode on Webpages",
                            subtitle = "সাদা ব্যাকগ্রাউন্ডের ওয়েবসাইটগুলো ডার্ক থিমে দেখুন",
                            checked = forceDarkWeb,
                            onCheckedChange = {
                                forceDarkWeb = it
                                prefs.edit().putBoolean("force_dark_web", it).apply()
                            }
                        )

                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(14.dp))
                                .background(Color(0xFF24262B))
                                .padding(horizontal = 12.dp, vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.TextFields, contentDescription = null, tint = Color(0xFF38BDF8), modifier = Modifier.size(20.dp))
                                Spacer(modifier = Modifier.width(12.dp))
                                Column {
                                    Text("Text Size", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                                    Text("পৃষ্ঠার ফন্ট জুম: $textZoomPercent%", color = Color(0xFF9AA0A6), fontSize = 11.sp)
                                }
                            }
                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(32.dp)
                                        .clip(CircleShape)
                                        .background(Color(0xFF35373D))
                                        .clickable {
                                            textZoomPercent = (textZoomPercent - 10).coerceAtLeast(75)
                                            prefs.edit().putInt("text_zoom_percent", textZoomPercent).apply()
                                        },
                                    contentAlignment = Alignment.Center
                                ) { Text("−", color = Color.White, fontWeight = FontWeight.Bold) }
                                Box(
                                    modifier = Modifier
                                        .size(32.dp)
                                        .clip(CircleShape)
                                        .background(Color(0xFF35373D))
                                        .clickable {
                                            textZoomPercent = (textZoomPercent + 10).coerceAtMost(150)
                                            prefs.edit().putInt("text_zoom_percent", textZoomPercent).apply()
                                        },
                                    contentAlignment = Alignment.Center
                                ) { Text("+", color = Color.White, fontWeight = FontWeight.Bold) }
                            }
                        }

                        HorizontalDivider(color = Color(0xFF2D2F34))
                        Text("DATA & STORAGE", color = Color(0xFF38BDF8), fontSize = 11.sp, fontWeight = FontWeight.Bold)

                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(14.dp))
                                .background(Color(0xFF3B1219))
                                .border(1.dp, Color(0xFFFB7185).copy(alpha = 0.35f), RoundedCornerShape(14.dp))
                                .clickable {
                                    clearAllBrowserData()
                                    showNativeSettingsModal = false
                                }
                                .padding(horizontal = 12.dp, vertical = 12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.Delete, contentDescription = null, tint = Color(0xFFFB7185), modifier = Modifier.size(20.dp))
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text("Clear Browsing Data", color = Color(0xFFFECDD3), fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                                Text("হিস্ট্রি, কুকি, ক্যাশ ও সাইট ডেটা মুছে ফেলুন", color = Color(0xFFFDA4AF), fontSize = 11.sp)
                            }
                        }
                    }
                }
            }
        }

        // =========================================================================
        // SIMPLIFIED READING MODE OVERLAY (Distraction-Free Text Reader)
        // =========================================================================
        if (showReaderModal) {
            val readerBg = when (readerTheme) {
                1 -> Color(0xFFF6EFDE)
                2 -> Color(0xFFFAFAFA)
                else -> Color(0xFF0B0F19)
            }
            val readerFg = when (readerTheme) {
                1 -> Color(0xFF3D3122)
                2 -> Color(0xFF1E293B)
                else -> Color(0xFFE2E8F0)
            }
            Dialog(onDismissRequest = { showReaderModal = false }) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .fillMaxHeight(0.9f)
                        .clip(RoundedCornerShape(22.dp))
                        .background(readerBg)
                        .border(1.dp, Color(0xFF334155), RoundedCornerShape(22.dp))
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Color(0xFF18191C))
                            .padding(horizontal = 12.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Icon(Icons.Default.MenuBook, contentDescription = null, tint = Color(0xFF38BDF8), modifier = Modifier.size(18.dp))
                            Text("Reading Mode", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        }
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            listOf(0 to Color(0xFF0F172A), 1 to Color(0xFFF6EFDE), 2 to Color.White).forEach { (id, swatch) ->
                                Box(
                                    modifier = Modifier
                                        .size(20.dp)
                                        .clip(CircleShape)
                                        .background(swatch)
                                        .border(if (readerTheme == id) 2.dp else 1.dp, if (readerTheme == id) Color(0xFF38BDF8) else Color.Gray, CircleShape)
                                        .clickable { readerTheme = id }
                                )
                            }
                            Text(
                                "A−",
                                color = Color.White,
                                fontSize = 12.sp,
                                modifier = Modifier.clickable { readerFontSize = (readerFontSize - 2).coerceAtLeast(13) }.padding(4.dp)
                            )
                            Text(
                                "A+",
                                color = Color.White,
                                fontSize = 12.sp,
                                modifier = Modifier.clickable { readerFontSize = (readerFontSize + 2).coerceAtMost(24) }.padding(4.dp)
                            )
                            IconButton(onClick = { showReaderModal = false }, modifier = Modifier.size(30.dp)) {
                                Icon(Icons.Default.Close, contentDescription = "Close", tint = Color(0xFF9AA0A6), modifier = Modifier.size(18.dp))
                            }
                        }
                    }

                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .verticalScroll(rememberScrollState())
                            .padding(18.dp)
                    ) {
                        Text(
                            text = readerTitle,
                            color = readerFg,
                            fontSize = (readerFontSize + 4).sp,
                            fontWeight = FontWeight.Bold,
                            lineHeight = (readerFontSize + 10).sp
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        HorizontalDivider(color = readerFg.copy(alpha = 0.18f))
                        Spacer(modifier = Modifier.height(14.dp))
                        Text(
                            text = readerContent,
                            color = readerFg.copy(alpha = 0.92f),
                            fontSize = readerFontSize.sp,
                            lineHeight = (readerFontSize + 9).sp
                        )
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

@Composable
private fun NativeSettingToggleRow(
    icon: ImageVector,
    title: String,
    subtitle: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(Color(0xFF24262B))
            .clickable { onCheckedChange(!checked) }
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f).padding(end = 8.dp)) {
            Icon(icon, contentDescription = null, tint = Color(0xFF38BDF8), modifier = Modifier.size(20.dp))
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(title, color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                Text(subtitle, color = Color(0xFF9AA0A6), fontSize = 11.sp, lineHeight = 14.sp)
            }
        }
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange,
            colors = SwitchDefaults.colors(
                checkedThumbColor = Color(0xFF04101E),
                checkedTrackColor = Color(0xFF38BDF8),
                uncheckedThumbColor = Color(0xFF9AA0A6),
                uncheckedTrackColor = Color(0xFF3C4043)
            )
        )
    }
}

@Composable
private fun ChromeMenuRow(
    icon: ImageVector,
    label: String,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 13.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, contentDescription = null, tint = Color(0xFFC4C7C5), modifier = Modifier.size(20.dp))
        Spacer(modifier = Modifier.width(16.dp))
        Text(label, color = Color(0xFFE3E3E3), fontSize = 14.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

@Composable
private fun SavedListDialog(
    title: String,
    entries: List<SavedEntry>,
    emptyText: String,
    onDismiss: () -> Unit,
    onSelect: (SavedEntry) -> Unit,
    onClearAll: (() -> Unit)?
) {
    Dialog(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(22.dp))
                .background(Color(0xFF18191C))
                .border(1.dp, Color(0xFF3C4043), RoundedCornerShape(22.dp))
                .padding(16.dp)
        ) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text(title, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                if (onClearAll != null && entries.isNotEmpty()) {
                    Text(
                        "মুছে ফেলুন",
                        color = Color(0xFFFB7185),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.clickable(onClick = onClearAll).padding(4.dp)
                    )
                }
            }
            Spacer(modifier = Modifier.height(12.dp))
            if (entries.isEmpty()) {
                Text(emptyText, color = Color(0xFF9AA0A6), fontSize = 13.sp, modifier = Modifier.padding(vertical = 20.dp))
            } else {
                LazyColumn(modifier = Modifier.heightIn(max = 340.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(entries) { entry ->
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(12.dp))
                                .background(Color(0xFF28292C))
                                .clickable { onSelect(entry) }
                                .padding(horizontal = 12.dp, vertical = 10.dp)
                        ) {
                            Text(entry.title, color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Medium, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            Text(entry.url, color = Color(0xFF9AA0A6), fontSize = 11.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        }
                    }
                }
            }
            Spacer(modifier = Modifier.height(10.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                TextButton(onClick = onDismiss) { Text("বন্ধ করুন", color = Color(0xFF38BDF8)) }
            }
        }
    }
}
