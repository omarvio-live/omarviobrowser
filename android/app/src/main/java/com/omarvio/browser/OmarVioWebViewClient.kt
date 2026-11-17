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
    private val onHttpsOnlyWarning: ((httpUrl: String, httpsUrl: String, reason: String) -> Unit)? = null,
    private val isDesktopModeProvider: () -> Boolean = { false }
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
            injectViewportAndScaling(it, isDesktopModeProvider())
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

    private fun injectViewportAndScaling(view: WebView?, isDesktop: Boolean) {
        if (view == null) return
        val viewportScript = if (isDesktop) {
            """
            (function() {
                try {
                    var targetW = 1280;
                    var sw = Math.min(window.screen.width || 390, window.innerWidth || 390);
                    var scale = Math.max(0.25, Math.min(1.0, (sw > 0 ? sw : 390) / targetW)).toFixed(3);
                    var content = 'width=' + targetW + ', initial-scale=' + scale + ', minimum-scale=0.2, maximum-scale=5.0, user-scalable=yes';
                    window.__omarvioExpectedViewport = content;
                    function applyViewport() {
                        var metas = document.querySelectorAll('meta[name="viewport"], meta[name="VIEWPORT"]');
                        if (metas.length > 0) {
                            for (var i = 0; i < metas.length; i++) {
                                if (i > 0) {
                                    metas[i].parentNode && metas[i].parentNode.removeChild(metas[i]);
                                } else if (metas[i].getAttribute('content') !== window.__omarvioExpectedViewport) {
                                    metas[i].setAttribute('content', window.__omarvioExpectedViewport);
                                }
                            }
                        } else {
                            var head = document.head || document.getElementsByTagName('head')[0] || document.documentElement;
                            if (head) {
                                var m = document.createElement('meta');
                                m.setAttribute('name', 'viewport');
                                m.setAttribute('content', window.__omarvioExpectedViewport);
                                head.insertBefore(m, head.firstChild);
                            }
                        }
                    }
                    applyViewport();
                    if (!window.__omarvioViewportObserverInstalled && document.documentElement && typeof MutationObserver !== 'undefined') {
                        window.__omarvioViewportObserverInstalled = true;
                        new MutationObserver(function() { applyViewport(); }).observe(document.documentElement, {
                            childList: true,
                            subtree: true,
                            attributes: true,
                            attributeFilter: ['content', 'name']
                        });
                    }
                    var cssHost = document.head || document.documentElement;
                    if (cssHost) {
                        var st = document.getElementById('omarvio-viewport-css');
                        if (!st) {
                            st = document.createElement('style');
                            st.id = 'omarvio-viewport-css';
                            cssHost.appendChild(st);
                        }
                        st.textContent = 'html, body { min-width: 1280px !important; -webkit-text-size-adjust: 100% !important; text-size-adjust: 100% !important; }';
                    }
                } catch(e) {}
            })();
            """.trimIndent()
        } else {
            """
            (function() {
                try {
                    var content = 'width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover';
                    window.__omarvioExpectedViewport = content;
                    function applyViewport() {
                        var metas = document.querySelectorAll('meta[name="viewport"], meta[name="VIEWPORT"]');
                        if (metas.length > 0) {
                            for (var i = 0; i < metas.length; i++) {
                                if (i > 0) {
                                    metas[i].parentNode && metas[i].parentNode.removeChild(metas[i]);
                                } else if (metas[i].getAttribute('content') !== window.__omarvioExpectedViewport) {
                                    metas[i].setAttribute('content', window.__omarvioExpectedViewport);
                                }
                            }
                        } else {
                            var head = document.head || document.getElementsByTagName('head')[0] || document.documentElement;
                            if (head) {
                                var m = document.createElement('meta');
                                m.setAttribute('name', 'viewport');
                                m.setAttribute('content', window.__omarvioExpectedViewport);
                                head.insertBefore(m, head.firstChild);
                            }
                        }
                    }
                    applyViewport();
                    if (!window.__omarvioViewportObserverInstalled && document.documentElement && typeof MutationObserver !== 'undefined') {
                        window.__omarvioViewportObserverInstalled = true;
                        new MutationObserver(function() { applyViewport(); }).observe(document.documentElement, {
                            childList: true,
                            subtree: true,
                            attributes: true,
                            attributeFilter: ['content', 'name']
                        });
                    }
                    var cssHost = document.head || document.documentElement;
                    if (cssHost) {
                        var st = document.getElementById('omarvio-viewport-css');
                        if (!st) {
                            st = document.createElement('style');
                            st.id = 'omarvio-viewport-css';
                            cssHost.appendChild(st);
                        }
                        st.textContent = 'html, body { width: 100% !important; max-width: 100vw !important; overflow-x: hidden !important; -webkit-text-size-adjust: 100% !important; text-size-adjust: 100% !important; } img, video, iframe, canvas, svg, table { max-width: 100%; }';
                    }
                } catch(e) {}
            })();
            """.trimIndent()
        }
        view.evaluateJavascript(viewportScript, null)
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
        injectViewportAndScaling(view, isDesktopModeProvider())
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

        injectViewportAndScaling(view, isDesktopModeProvider())

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
