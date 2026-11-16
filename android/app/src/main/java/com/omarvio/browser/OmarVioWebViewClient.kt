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
 * Delivers 0ms direct network loading, ad & tracker interception, HTTPS-Only upgrades,
 * tracking parameter stripping, cosmetic ad suppression, and in-app navigation containment.
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
            return AdBlockEngine.createEmptyResponse(url)
        }
        return super.shouldInterceptRequest(view, request)
    }

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
                    view?.loadUrl(AdBlockEngine.stripTrackingParameters(fallbackUrl))
                    return true
                }
            } catch (_: Exception) {}
            return true
        }

        // 2. Prevent external app hijack for market://, vnd.youtube:, or googlechrome://
        if (url.startsWith("market://") || url.startsWith("vnd.youtube:") || url.startsWith("googlechrome://")) {
            return true
        }

        // 3. Dialer or mail protocols
        if (url.startsWith("tel:") || url.startsWith("mailto:") || url.startsWith("sms:")) {
            try {
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                context.startActivity(intent)
            } catch (_: Exception) {}
            return true
        }

        // 4a. Auto-unwrap DuckDuckGo and Google intermediate redirect traps
        if (url.contains("duckduckgo.com/l/?") || url.contains("uddg=")) {
            try {
                val uri = Uri.parse(url)
                val target = uri.getQueryParameter("uddg")
                if (!target.isNullOrEmpty() && (target.startsWith("http://") || target.startsWith("https://"))) {
                    view?.loadUrl(AdBlockEngine.stripTrackingParameters(target))
                    return true
                }
            } catch (_: Exception) {}
        }
        if (url.contains("google.") && (url.contains("/url?q=") || url.contains("/url?url="))) {
            try {
                val uri = Uri.parse(url)
                val target = uri.getQueryParameter("q") ?: uri.getQueryParameter("url")
                if (!target.isNullOrEmpty() && (target.startsWith("http://") || target.startsWith("https://"))) {
                    view?.loadUrl(AdBlockEngine.stripTrackingParameters(target))
                    return true
                }
            } catch (_: Exception) {}
        }

        // 4b. HTTPS-Only upgrade & tracking query parameter sanitization
        if (url.startsWith("http://") && AdBlockEngine.httpsOnlyEnabled) {
            val upgraded = "https://" + AdBlockEngine.stripTrackingParameters(url).removePrefix("http://")
            view?.loadUrl(upgraded)
            return true
        }

        if (url.startsWith("http://") || url.startsWith("https://")) {
            val stripped = AdBlockEngine.stripTrackingParameters(url)
            if (stripped != url) {
                view?.loadUrl(stripped)
                return true
            }
            return false
        }

        return true
    }

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

    override fun onReceivedSslError(
        view: WebView?,
        handler: SslErrorHandler?,
        error: SslError?
    ) {
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

        if (AdBlockEngine.adBlockEnabled) {
            val shieldInject = """
                (function() {
                    try {
                        if (document.head && !document.getElementById('omarvio-adblock-css')) {
                            var style = document.createElement('style');
                            style.id = 'omarvio-adblock-css';
                            style.textContent = '.ytp-ad-module, .ytp-ad-player-overlay, .ytp-ad-text, .video-ads, .ad-container, .ad-interrupting, .fb-ad, .sponsored_ad, .ad-banner, .interstitial-ad, .overlay-ad, ins.adsbygoogle, div[id*="google_ads"], div[id*="taboola"], div[id*="outbrain"], div[class*="ad-box"], div[class*="ad-slot"], div[class*="ad-wrapper"], div[class*="popup-banner"], div[id*="cookie-banner"], div[class*="consent-modal"], div[id*="onetrust-consent-sdk"] { display: none !important; visibility: hidden !important; height: 0 !important; width: 0 !important; opacity: 0 !important; pointer-events: none !important; }';
                            document.head.appendChild(style);
                        }
                        if (!window.__omarvioAdSkipInstalled) {
                            window.__omarvioAdSkipInstalled = true;
                            setInterval(function() {
                                if (document.hidden) return;
                                try {
                                    var skip = document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button');
                                    if (skip) skip.click();
                                    var v = document.querySelector('video');
                                    var isAd = document.querySelector('.ad-showing, .ytp-ad-player-overlay');
                                    if (v && isAd && !isNaN(v.duration) && v.duration > 0) {
                                        v.currentTime = v.duration - 0.1;
                                        v.playbackRate = 16.0;
                                        v.muted = true;
                                    }
                                } catch(e) {}
                            }, 800);
                        }
                    } catch(e) {}
                })();
            """.trimIndent()
            view?.evaluateJavascript(shieldInject, null)
        }
    }
}
