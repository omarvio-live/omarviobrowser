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
 * Delivers 0ms direct network loading, granular ad & tracker interception,
 * HTTPS-Only upgrade + explicit TLS warning screen, redirect unwrapping,
 * cosmetic ad suppression, and in-app navigation containment.
 */
class OmarVioWebViewClient(
    private val context: Context,
    private val onPageTitleChanged: (String) -> Unit,
    private val onUrlChanged: (String) -> Unit,
    private val onLoadingStateChanged: (Boolean) -> Unit,
    private val onBackNavigationChanged: ((canGoBack: Boolean, canGoForward: Boolean) -> Unit)? = null,
    private val onHttpsOnlyWarning: ((httpUrl: String, httpsUrl: String, reason: String) -> Unit)? = null
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
                    val unwrapped = AdBlockEngine.unwrapRedirectUrl(fallbackUrl)
                    view?.loadUrl(unwrapped)
                    return true
                }
            } catch (_: Exception) {
            }
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
            } catch (_: Exception) {
            }
            return true
        }

        // 4. Unwrap Facebook / WhatsApp / Google / DuckDuckGo / YouTube tracking redirect traps
        val unwrapped = AdBlockEngine.unwrapRedirectUrl(url)
        if (AdBlockEngine.isMalwareUrl(unwrapped)) {
            return true
        }

        if (unwrapped != url && (unwrapped.startsWith("http://") || unwrapped.startsWith("https://"))) {
            val finalUrl = maybeUpgradeHttps(unwrapped)
            view?.loadUrl(finalUrl)
            return true
        }

        // 5. HTTPS-Only Mode upgrade for insecure http:// links (unless explicitly allowed for this host)
        if (url.startsWith("http://") && AdBlockEngine.httpsOnlyEnabled && !AdBlockEngine.isHttpAllowedForHost(url)) {
            val upgraded = "https://" + url.removePrefix("http://")
            view?.loadUrl(upgraded)
            return true
        }

        if (url.startsWith("http://") || url.startsWith("https://")) {
            return false
        }

        return true
    }

    private fun maybeUpgradeHttps(target: String): String {
        return if (
            target.startsWith("http://") &&
            AdBlockEngine.httpsOnlyEnabled &&
            !AdBlockEngine.isHttpAllowedForHost(target)
        ) {
            "https://" + target.removePrefix("http://")
        } else {
            target
        }
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
        handler?.cancel()
        val failedUrl = error?.url ?: view?.url ?: return
        onLoadingStateChanged(false)
        val httpsUrl = if (failedUrl.startsWith("https://")) failedUrl else "https://" + failedUrl.removePrefix("http://")
        val httpUrl = "http://" + httpsUrl.removePrefix("https://")
        view?.post {
            view.stopLoading()
            onHttpsOnlyWarning?.invoke(
                httpUrl,
                httpsUrl,
                "এই ওয়েবসাইটের SSL/TLS সার্টিফিকেট যাচাই করা যায়নি বা এনক্রিপশন নিরাপদ নয়।"
            )
        }
    }

    override fun onReceivedError(
        view: WebView?,
        request: WebResourceRequest?,
        error: WebResourceError?
    ) {
        super.onReceivedError(view, request, error)
        if (request?.isForMainFrame == true) {
            onLoadingStateChanged(false)
            val failedUrl = request.url?.toString() ?: return
            val code = error?.errorCode ?: 0
            val isTlsOrConnFailure = code == ERROR_FAILED_SSL_HANDSHAKE ||
                code == ERROR_CONNECT ||
                code == ERROR_TIMEOUT
            if (AdBlockEngine.httpsOnlyEnabled &&
                failedUrl.startsWith("https://") &&
                isTlsOrConnFailure &&
                !AdBlockEngine.isHttpAllowedForHost(failedUrl)
            ) {
                val httpUrl = "http://" + failedUrl.removePrefix("https://")
                view?.post {
                    onHttpsOnlyWarning?.invoke(
                        httpUrl,
                        failedUrl,
                        "HTTPS সংযোগ ব্যর্থ হয়েছে (${error?.description ?: "TLS Unavailable"})। সাইটটি নিরাপদ HTTPS সমর্থন নাও করতে পারে।"
                    )
                }
            }
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

        val css = AdBlockEngine.cosmeticSuppressionCss()
        if (AdBlockEngine.adBlockEnabled && css.isNotEmpty()) {
            val escapedCss = css.replace("'", "\\'")
            val autoSkipBlock = if (AdBlockEngine.easyListEnabled) {
                """
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
                """.trimIndent()
            } else ""

            val shieldInject = """
                (function() {
                    try {
                        if (document.head) {
                            var existing = document.getElementById('omarvio-adblock-css');
                            if (!existing) {
                                existing = document.createElement('style');
                                existing.id = 'omarvio-adblock-css';
                                document.head.appendChild(existing);
                            }
                            existing.textContent = '$escapedCss';
                        }
                        $autoSkipBlock
                    } catch(e) {}
                })();
            """.trimIndent()
            view?.evaluateJavascript(shieldInject, null)
        }
    }
}
