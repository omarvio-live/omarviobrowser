package com.omarvio.browser

import android.net.Uri
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.io.ByteArrayInputStream
import java.util.concurrent.atomic.AtomicInteger

/**
 * OMARVIO BROWSER - Native High-Speed Ad & Tracker Blocking Engine
 * Network-layer request interceptor that blocks ads, trackers, pixels,
 * and surveillance query tokens in 0ms!
 */
object AdBlockEngine {

    @Volatile
    var adBlockEnabled: Boolean = true

    @Volatile
    var stripTrackingParamsEnabled: Boolean = true

    @Volatile
    var httpsOnlyEnabled: Boolean = false

    @Volatile
    var doNotTrackEnabled: Boolean = true

    val blockedCount = AtomicInteger(0)
    private val _blockedCountFlow = MutableStateFlow(0)
    val blockedCountFlow: StateFlow<Int> = _blockedCountFlow.asStateFlow()

    // Fast O(1) in-memory blocklist of known tracker, telemetry & advertisement domains
    private val AD_HOSTS = hashSetOf(
        "doubleclick.net",
        "googlesyndication.com",
        "googleadservices.com",
        "adservice.google.com",
        "adservice.google.com.bd",
        "google-analytics.com",
        "googletagmanager.com",
        "googletagservices.com",
        "adsystem.com",
        "pagead2.googlesyndication.com",
        "adnxs.com",
        "adsrvr.org",
        "connect.facebook.net",
        "criteo.com",
        "criteo.net",
        "taboola.com",
        "outbrain.com",
        "popads.net",
        "propellerads.com",
        "adsterra.com",
        "effectivegatecpm.com",
        "monetag.com",
        "onclickads.net",
        "hilltopads.net",
        "mgid.com",
        "exoclick.com",
        "juicyads.com",
        "trafficjunky.net",
        "admob.com",
        "unityads.unity3d.com",
        "vungle.com",
        "applovin.com",
        "appsflyer.com",
        "adjust.com",
        "branch.io",
        "scorecardresearch.com",
        "quantserve.com",
        "pubmatic.com",
        "rubiconproject.com",
        "smartadserver.com",
        "openx.net",
        "casalemedia.com",
        "bidswitch.net",
        "moatads.com",
        "2mdn.net",
        "hotjar.com",
        "clarity.ms",
        "mixpanel.com",
        "segment.io",
        "segment.com",
        "amplitude.com",
        "chartbeat.com",
        "omtrdc.net",
        "exponential.com",
        "advertising.com",
        "zedo.com",
        "revcontent.com",
        "adroll.com",
        "teads.tv",
        "sharethrough.com",
        "media.net",
        "adcolony.com",
        "inmobi.com",
        "an.yandex.ru",
        "mc.yandex.ru"
    )

    // Fast keyword blacklist inside URL paths
    private val AD_PATH_KEYWORDS = arrayOf(
        "/ads/",
        "/adserver/",
        "/popunder/",
        "/pagead/",
        "google_ad_",
        "ad_type=",
        "track_event=",
        "analytics.js",
        "gtag/js",
        "fbevents.js",
        "/tr/?"
    )

    private val TRACKING_PARAMS = hashSetOf(
        "fbclid", "gclid", "gbraid", "wbraid", "si", "igshid",
        "yclid", "mc_eid", "_hsenc", "_hsmi", "mkt_tok",
        "ttclid", "twclid", "msclkid", "wa_click_id"
    )

    /**
     * Inspects a requested URL and decides whether to block it before network execution
     */
    fun isAdOrTracker(urlStr: String?): Boolean {
        if (!adBlockEnabled || urlStr.isNullOrBlank()) return false

        try {
            val uri = Uri.parse(urlStr)
            val host = uri.host?.lowercase() ?: return false

            // 1. Direct host or parent domain check
            for (blockedHost in AD_HOSTS) {
                if (host == blockedHost || host.endsWith(".$blockedHost")) {
                    _blockedCountFlow.value = blockedCount.incrementAndGet()
                    return true
                }
            }

            // Facebook pixel endpoint check
            if (host.endsWith("facebook.com") && uri.path?.startsWith("/tr") == true) {
                _blockedCountFlow.value = blockedCount.incrementAndGet()
                return true
            }

            // 2. Path keyword scan
            val fullUrl = urlStr.lowercase()
            for (kw in AD_PATH_KEYWORDS) {
                if (fullUrl.contains(kw)) {
                    _blockedCountFlow.value = blockedCount.incrementAndGet()
                    return true
                }
            }
        } catch (_: Exception) {
            // Safe fallback
        }

        return false
    }

    /**
     * Strips surveillance query tokens (utm_*, fbclid, gclid, etc.) from URLs
     */
    fun stripTrackingParameters(rawUrl: String): String {
        if (!stripTrackingParamsEnabled) return rawUrl
        return try {
            val uri = Uri.parse(rawUrl)
            val names = uri.queryParameterNames
            if (names.isEmpty()) return rawUrl
            val builder = uri.buildUpon().clearQuery()
            var stripped = false
            for (param in names) {
                val pLower = param.lowercase()
                if (pLower.startsWith("utm_") || TRACKING_PARAMS.contains(pLower)) {
                    stripped = true
                    continue
                }
                for (valItem in uri.getQueryParameters(param)) {
                    builder.appendQueryParameter(param, valItem)
                }
            }
            if (stripped) builder.build().toString() else rawUrl
        } catch (_: Exception) {
            rawUrl
        }
    }

    /**
     * Generates a 0-byte MIME-matched dummy response to suppress blocked ads/scripts cleanly
     */
    fun createEmptyResponse(urlStr: String? = null): android.webkit.WebResourceResponse {
        val lower = (urlStr ?: "").lowercase().substringBefore("?")
        val (mime, body) = when {
            lower.endsWith(".js") -> "application/javascript" to "/* blocked */"
            lower.endsWith(".css") -> "text/css" to "/* blocked */"
            else -> "text/plain" to ""
        }
        return android.webkit.WebResourceResponse(
            mime,
            "UTF-8",
            200,
            "OK",
            mapOf("Access-Control-Allow-Origin" to "*"),
            ByteArrayInputStream(body.toByteArray(Charsets.UTF_8))
        )
    }
}
