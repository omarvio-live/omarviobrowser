package com.omarvio.browser

import android.net.Uri
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.io.ByteArrayInputStream
import java.util.concurrent.atomic.AtomicInteger

/**
 * OMARVIO BROWSER - Native High-Speed Ad & Tracker Blocking Engine
 * Network-layer request interceptor that blocks ads and spyware in 0ms!
 */
object AdBlockEngine {

    val blockedCount = AtomicInteger(0)
    private val _blockedCountFlow = MutableStateFlow(0)
    val blockedCountFlow: StateFlow<Int> = _blockedCountFlow.asStateFlow()

    // Fast O(1) in-memory blocklist of known tracker & advertisement domains
    private val AD_HOSTS = hashSetOf(
        "doubleclick.net",
        "googlesyndication.com",
        "googleadservices.com",
        "adservice.google.com",
        "adservice.google.com.bd",
        "adsystem.com",
        "pagead2.googlesyndication.com",
        "adnxs.com",
        "adsrvr.org",
        "facebook.com/tr",
        "connect.facebook.net",
        "criteo.com",
        "taboola.com",
        "outbrain.com",
        "popads.net",
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
        "exponential.com",
        "advertising.com",
        "zedo.com",
        "revcontent.com",
        "adroll.com",
        "yandex.ru/ads",
        "an.yandex.ru"
    )

    // Fast keyword blacklist inside URL paths
    private val AD_PATH_KEYWORDS = arrayOf(
        "/ads/",
        "/adserver/",
        "/banner/",
        "/popunder/",
        "google_ad_",
        "ad_type=",
        "track_event=",
        "analytics.js",
        "gtag/js"
    )

    /**
     * Inspects a requested URL and decides whether to block it before network execution
     */
    fun isAdOrTracker(urlStr: String?): Boolean {
        if (urlStr.isNullOrBlank()) return false

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
     * Generates a 0-byte dummy response to suppress the blocked ad resource cleanly
     */
    fun createEmptyResponse(): android.webkit.WebResourceResponse {
        return android.webkit.WebResourceResponse(
            "text/plain",
            "UTF-8",
            200,
            "OK",
            mapOf("Access-Control-Allow-Origin" to "*"),
            ByteArrayInputStream(ByteArray(0))
        )
    }
}
