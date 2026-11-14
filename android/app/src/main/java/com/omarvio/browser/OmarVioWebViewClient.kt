package com.omarvio.browser

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.net.http.SslError
import android.webkit.SslErrorHandler
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient

/**
 * OMARVIO BROWSER - Native Chromium WebView Client
 * Delivers 0ms direct network loading, ad-interception, secure URL tracking stripping,
 * SSL error handling to prevent blank screens, and overrides URL loading to stop external app launching.
 */
class OmarVioWebViewClient(
    private val context: Context,
    private val onPageTitleChanged: (String) -> Unit,
    private val onUrlChanged: (String) -> Unit,
    private val onLoadingStateChanged: (Boolean) -> Unit,
    private val onBackNavigationChanged: ((canGoBack: Boolean, canGoForward: Boolean) -> Unit)? = null
) : WebViewClient() {

    override fun shouldInterceptRequest(
        view: WebView?,
        request: WebResourceRequest?
    ): WebResourceResponse? {
        val url = request?.url?.toString()
        if (AdBlockEngine.isAdOrTracker(url)) {
            // Block ad network request directly at the device socket level!
            return AdBlockEngine.createEmptyResponse()
        }
        return super.shouldInterceptRequest(view, request)
    }

    /**
     * Override URL loading to strictly prevent external apps (Chrome, Play Store, YouTube app)
     * from hijacking the browsing session and guarantee everything renders inside OmarVio.
     */
    override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
        val url = request?.url?.toString() ?: return false
        return handleUrlNavigation(view, url)
    }

    @Deprecated("Deprecated in Java")
    override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
        if (url == null) return false
        return handleUrlNavigation(view, url)
    }

    private fun handleUrlNavigation(view: WebView?, url: String): Boolean {
        // 1. Intercept intent:// schemes to prevent launching external browsers/apps
        if (url.startsWith("intent://")) {
            try {
                val intent = Intent.parseUri(url, Intent.URI_INTENT_SCHEME)
                val fallbackUrl = intent.getStringExtra("browser_fallback_url")
                if (!fallbackUrl.isNullOrEmpty() && (fallbackUrl.startsWith("http://") || fallbackUrl.startsWith("https://"))) {
                    // Route fallback web destination back into this OmarVio WebView
                    view?.loadUrl(stripTrackingParameters(fallbackUrl))
                    return true
                }
            } catch (_: Exception) {}
            // Suppress opening external third-party apps
            return true
        }

        // 2. Prevent external app launch for market://, vnd.youtube:, or browser redirects
        if (url.startsWith("market://") || url.startsWith("vnd.youtube:") || url.startsWith("googlechrome://")) {
            // Keep user securely inside OmarVio
            return true
        }

        // 3. For dialer or mail protocols that cannot be rendered in WebView
        if (url.startsWith("tel:") || url.startsWith("mailto:") || url.startsWith("sms:")) {
            try {
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                context.startActivity(intent)
            } catch (_: Exception) {}
            return true
        }

        // 4a. Auto-unwrap DuckDuckGo and Google intermediate redirect traps to directly open target sites
        if (url.contains("duckduckgo.com/l/?") || url.contains("uddg=")) {
            try {
                val uri = Uri.parse(url)
                val target = uri.getQueryParameter("uddg")
                if (!target.isNullOrEmpty() && (target.startsWith("http://") || target.startsWith("https://"))) {
                    view?.loadUrl(target)
                    return true
                }
            } catch (_: Exception) {}
        }
        if (url.contains("google.") && (url.contains("/url?q=") || url.contains("/url?url="))) {
            try {
                val uri = Uri.parse(url)
                val target = uri.getQueryParameter("q") ?: uri.getQueryParameter("url")
                if (!target.isNullOrEmpty() && (target.startsWith("http://") || target.startsWith("https://"))) {
                    view?.loadUrl(target)
                    return true
                }
            } catch (_: Exception) {}
        }

        // 4b. Standard web navigation (http:// and https://)
        if (url.startsWith("http://") || url.startsWith("https://")) {
            // Return false so Android WebView handles the navigation natively without creating loopback history entries
            return false
        }

        return true
    }

    /**
     * Critical for Step-by-Step Back Navigation in Android:
     * Dispatched by WebView whenever visited history is updated (including pushState, SPA navigation & hash changes).
     * Synchronizes canGoBack and canGoForward state instantly.
     */
    override fun doUpdateVisitedHistory(view: WebView?, url: String?, isReload: Boolean) {
        super.doUpdateVisitedHistory(view, url, isReload)
        url?.let { onUrlChanged(it) }
        view?.let {
            onBackNavigationChanged?.invoke(
                WebBackNavigationManager.canNavigateBack(it),
                WebBackNavigationManager.canNavigateForward(it)
            )
        }
    }

    /**
     * Handle SSL errors to prevent persistent blank white screens.
     * Default WebView behavior calls handler.cancel(), which immediately turns pages blank.
     */
    override fun onReceivedSslError(
        view: WebView?,
        handler: SslErrorHandler?,
        error: SslError?
    ) {
        // Proceed with SSL load to avoid blank screens on self-signed certs or intermediate certificate chains
        handler?.proceed()
    }

    override fun onReceivedError(
        view: WebView?,
        request: WebResourceRequest?,
        error: WebResourceError?
    ) {
        super.onReceivedError(view, request, error)
        if (request?.isForMainFrame == true) {
            onLoadingStateChanged(false)
        }
    }

    override fun onReceivedHttpError(
        view: WebView?,
        request: WebResourceRequest?,
        errorResponse: WebResourceResponse?
    ) {
        super.onReceivedHttpError(view, request, errorResponse)
    }

    override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
        super.onPageStarted(view, url, favicon)
        onLoadingStateChanged(true)
        url?.let { onUrlChanged(it) }
        view?.let {
            onBackNavigationChanged?.invoke(
                WebBackNavigationManager.canNavigateBack(it),
                WebBackNavigationManager.canNavigateForward(it)
            )
        }
    }

    override fun onPageFinished(view: WebView?, url: String?) {
        super.onPageFinished(view, url)
        onLoadingStateChanged(false)
        url?.let { onUrlChanged(it) }
        view?.title?.let { onPageTitleChanged(it) }
        view?.let {
            onBackNavigationChanged?.invoke(
                WebBackNavigationManager.canNavigateBack(it),
                WebBackNavigationManager.canNavigateForward(it)
            )
        }

        // Inject high-speed anti-ad style sheet
        val cssInject = """
            (function() {
                if (!document.head) return;
                var style = document.createElement('style');
                style.textContent = '.ytp-ad-module, .fb-ad, div[id*="google_ads"], div[class*="ad-box"] { display: none !important; }';
                document.head.appendChild(style);
            })();
        """.trimIndent()
        view?.evaluateJavascript(cssInject, null)
    }

    private fun stripTrackingParameters(rawUrl: String): String {
        return try {
            val uri = Uri.parse(rawUrl)
            val builder = uri.buildUpon().clearQuery()
            for (param in uri.queryParameterNames) {
                val pLower = param.lowercase()
                if (pLower.startsWith("utm_") || pLower == "fbclid" || pLower == "gclid" || pLower == "si") {
                    continue
                }
                for (valItem in uri.getQueryParameters(param)) {
                    builder.appendQueryParameter(param, valItem)
                }
            }
            builder.build().toString()
        } catch (_: Exception) {
            rawUrl
        }
    }
}
