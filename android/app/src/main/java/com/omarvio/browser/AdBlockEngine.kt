package com.omarvio.browser

import android.content.SharedPreferences
import android.net.Uri
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import org.json.JSONObject
import java.io.ByteArrayInputStream
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicInteger

/**
 * OMARVIO BROWSER - Native High-Speed Granular Ad & Tracker Blocking Engine
 * Mirrors the Web middleware's 6 toggleable block-lists, HTTPS-Only mode,
 * session HTTP bypass allow-list, and WhatsApp/Messenger redirect unwrapping.
 */
object AdBlockEngine {

    @Volatile
    var adBlockEnabled: Boolean = true

    @Volatile
    var easyListEnabled: Boolean = true

    @Volatile
    var easyPrivacyEnabled: Boolean = true

    @Volatile
    var privacyBadgerEnabled: Boolean = true

    @Volatile
    var peterLoweEnabled: Boolean = true

    @Volatile
    var malwarePhishingEnabled: Boolean = true

    @Volatile
    var annoyancesEnabled: Boolean = true

    @Volatile
    var stripTrackingParamsEnabled: Boolean = true

    @Volatile
    var httpsOnlyEnabled: Boolean = true

    @Volatile
    var doNotTrackEnabled: Boolean = true

    private val allowedHttpHosts = ConcurrentHashMap.newKeySet<String>()

    val blockedCount = AtomicInteger(0)
    private val _blockedCountFlow = MutableStateFlow(0)
    val blockedCountFlow: StateFlow<Int> = _blockedCountFlow.asStateFlow()

    fun loadFromPrefs(prefs: SharedPreferences) {
        adBlockEnabled = prefs.getBoolean("ad_block_enabled", true)
        easyListEnabled = prefs.getBoolean("list_easylist", true)
        easyPrivacyEnabled = prefs.getBoolean("list_easyprivacy", true)
        privacyBadgerEnabled = prefs.getBoolean("list_privacy_badger", true)
        peterLoweEnabled = prefs.getBoolean("list_peter_lowe", true)
        malwarePhishingEnabled = prefs.getBoolean("list_malware_phishing", true)
        annoyancesEnabled = prefs.getBoolean("list_annoyances", true)
        httpsOnlyEnabled = prefs.getBoolean("https_only_enabled", true)
        doNotTrackEnabled = prefs.getBoolean("do_not_track_enabled", true)
        stripTrackingParamsEnabled = privacyBadgerEnabled || easyPrivacyEnabled || adBlockEnabled
    }

    fun saveToPrefs(prefs: SharedPreferences) {
        prefs.edit()
            .putBoolean("ad_block_enabled", adBlockEnabled)
            .putBoolean("list_easylist", easyListEnabled)
            .putBoolean("list_easyprivacy", easyPrivacyEnabled)
            .putBoolean("list_privacy_badger", privacyBadgerEnabled)
            .putBoolean("list_peter_lowe", peterLoweEnabled)
            .putBoolean("list_malware_phishing", malwarePhishingEnabled)
            .putBoolean("list_annoyances", annoyancesEnabled)
            .putBoolean("https_only_enabled", httpsOnlyEnabled)
            .putBoolean("do_not_track_enabled", doNotTrackEnabled)
            .apply()
    }

    fun applyJsonConfig(jsonStr: String, prefs: SharedPreferences? = null) {
        try {
            val obj = JSONObject(jsonStr)
            val trackerBlocking = obj.optBoolean("aggressiveTrackerBlocking", true)
            val adsFilter = obj.optBoolean("adsFiltering", true)
            if (obj.has("httpsOnlyMode")) {
                httpsOnlyEnabled = obj.optBoolean("httpsOnlyMode", httpsOnlyEnabled)
            }
            val lists = obj.optJSONObject("enabledLists")
            if (lists != null) {
                easyListEnabled = lists.optBoolean("easylist", easyListEnabled)
                easyPrivacyEnabled = lists.optBoolean("easyprivacy", easyPrivacyEnabled)
                privacyBadgerEnabled = lists.optBoolean("privacyBadger", privacyBadgerEnabled)
                peterLoweEnabled = lists.optBoolean("peterLowe", peterLoweEnabled)
                malwarePhishingEnabled = lists.optBoolean("malwarePhishing", malwarePhishingEnabled)
                annoyancesEnabled = lists.optBoolean("annoyances", annoyancesEnabled)
            }
            adBlockEnabled = trackerBlocking || adsFilter
            stripTrackingParamsEnabled = trackerBlocking || privacyBadgerEnabled
            if (prefs != null) saveToPrefs(prefs)
        } catch (_: Exception) {
        }
    }

    fun allowHttpHostOnce(urlOrHost: String) {
        val h = extractHost(urlOrHost)
        if (h.isNotEmpty()) allowedHttpHosts.add(h)
    }

    fun isHttpAllowedForHost(urlOrHost: String): Boolean {
        val h = extractHost(urlOrHost)
        return h.isNotEmpty() && allowedHttpHosts.contains(h)
    }

    private fun extractHost(urlOrHost: String): String {
        return try {
            if (urlOrHost.contains("://")) {
                Uri.parse(urlOrHost).host?.lowercase()?.trim().orEmpty()
            } else {
                urlOrHost.lowercase().trim()
            }
        } catch (_: Exception) {
            ""
        }
    }

    // 1. EasyList Core Ad Networks
    private val EASYLIST_AD_HOSTS = hashSetOf(
        "doubleclick.net",
        "googlesyndication.com",
        "googleadservices.com",
        "adservice.google.com",
        "adservice.google.com.bd",
        "pagead2.googlesyndication.com",
        "adsystem.com",
        "adnxs.com",
        "adsrvr.org",
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
        "pubmatic.com",
        "rubiconproject.com",
        "smartadserver.com",
        "openx.net",
        "casalemedia.com",
        "bidswitch.net",
        "moatads.com",
        "2mdn.net",
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
        "an.yandex.ru"
    )

    // 2. EasyPrivacy Telemetry & Analytics
    private val EASYPRIVACY_HOSTS = hashSetOf(
        "google-analytics.com",
        "googletagmanager.com",
        "googletagservices.com",
        "hotjar.com",
        "clarity.ms",
        "mixpanel.com",
        "segment.io",
        "segment.com",
        "amplitude.com",
        "chartbeat.com",
        "omtrdc.net",
        "scorecardresearch.com",
        "quantserve.com",
        "mc.yandex.ru",
        "appsflyer.com",
        "adjust.com",
        "branch.io"
    )

    // 3. Privacy Badger Behavioral & Cross-Site Fingerprinting Trackers
    private val PRIVACY_BADGER_HOSTS = hashSetOf(
        "connect.facebook.net",
        "pixel.facebook.com",
        "analytics.tiktok.com",
        "bat.bing.com",
        "px.ads.linkedin.com",
        "ads-twitter.com",
        "analytics.twitter.com",
        "fpjs.io",
        "fingerprintjs.com",
        "fullstory.com",
        "mouseflow.com",
        "crazyegg.com"
    )

    // 4. Peter Lowe's Fast Ad & Tracking Hosts
    private val PETER_LOWE_HOSTS = hashSetOf(
        "adform.net",
        "serving-sys.com",
        "mathtag.com",
        "turn.com",
        "rlcdn.com",
        "bluekai.com",
        "krxd.net",
        "demdex.net",
        "doubleverify.com",
        "adsafeprotected.com"
    )

    // 5. Malware, Crypto-Drainer & Phishing Hosts
    private val MALWARE_HOSTS = hashSetOf(
        "coinhive.com",
        "coin-hive.com",
        "jsecoin.com",
        "cryptoloot.pro",
        "minero.cc",
        "authedmine.com",
        "webminepool.com",
        "phishing-test.omarvio.invalid"
    )

    private val AD_PATH_KEYWORDS = arrayOf(
        "/ads/",
        "/adserver/",
        "/popunder/",
        "/pagead/",
        "google_ad_",
        "ad_type="
    )

    private val TRACKER_PATH_KEYWORDS = arrayOf(
        "track_event=",
        "analytics.js",
        "gtag/js",
        "fbevents.js",
        "/tr/?"
    )

    private val TRACKING_PARAMS = hashSetOf(
        "fbclid", "gclid", "gbraid", "wbraid", "si", "igshid",
        "yclid", "mc_eid", "_hsenc", "_hsmi", "mkt_tok",
        "ttclid", "twclid", "msclkid", "wa_click_id", "mibextid",
        "ref_src", "ref_url"
    )

    private fun hostMatchesSet(host: String, set: HashSet<String>): Boolean {
        if (set.contains(host)) return true
        for (item in set) {
            if (host.endsWith(".$item")) return true
        }
        return false
    }

    fun isMalwareUrl(urlStr: String?): Boolean {
        if (!malwarePhishingEnabled || urlStr.isNullOrBlank()) return false
        return try {
            val host = Uri.parse(urlStr).host?.lowercase() ?: return false
            hostMatchesSet(host, MALWARE_HOSTS)
        } catch (_: Exception) {
            false
        }
    }

    /**
     * Inspects a requested URL against all enabled granular block-lists before network execution
     */
    fun isAdOrTracker(urlStr: String?): Boolean {
        if (!adBlockEnabled || urlStr.isNullOrBlank()) return false

        try {
            val uri = Uri.parse(urlStr)
            val host = uri.host?.lowercase() ?: return false

            if (malwarePhishingEnabled && hostMatchesSet(host, MALWARE_HOSTS)) {
                _blockedCountFlow.value = blockedCount.incrementAndGet()
                return true
            }
            if (easyListEnabled && hostMatchesSet(host, EASYLIST_AD_HOSTS)) {
                _blockedCountFlow.value = blockedCount.incrementAndGet()
                return true
            }
            if (easyPrivacyEnabled && hostMatchesSet(host, EASYPRIVACY_HOSTS)) {
                _blockedCountFlow.value = blockedCount.incrementAndGet()
                return true
            }
            if (privacyBadgerEnabled && hostMatchesSet(host, PRIVACY_BADGER_HOSTS)) {
                _blockedCountFlow.value = blockedCount.incrementAndGet()
                return true
            }
            if (peterLoweEnabled && hostMatchesSet(host, PETER_LOWE_HOSTS)) {
                _blockedCountFlow.value = blockedCount.incrementAndGet()
                return true
            }

            // Facebook pixel endpoint check
            if ((easyPrivacyEnabled || privacyBadgerEnabled) &&
                host.endsWith("facebook.com") &&
                uri.path?.startsWith("/tr") == true
            ) {
                _blockedCountFlow.value = blockedCount.incrementAndGet()
                return true
            }

            val fullUrl = urlStr.lowercase()
            if (easyListEnabled) {
                for (kw in AD_PATH_KEYWORDS) {
                    if (fullUrl.contains(kw)) {
                        _blockedCountFlow.value = blockedCount.incrementAndGet()
                        return true
                    }
                }
            }
            if (easyPrivacyEnabled || privacyBadgerEnabled) {
                for (kw in TRACKER_PATH_KEYWORDS) {
                    if (fullUrl.contains(kw)) {
                        _blockedCountFlow.value = blockedCount.incrementAndGet()
                        return true
                    }
                }
            }
        } catch (_: Exception) {
        }

        return false
    }

    /**
     * Unwraps social/search redirect wrappers (l.facebook.com, lm.facebook.com, google /url, DuckDuckGo)
     * and strips surveillance tracking parameters.
     */
    fun unwrapRedirectUrl(rawUrl: String): String {
        var current = rawUrl.trim()
        if (current.isEmpty()) return current
        try {
            val uri = Uri.parse(current)
            val host = uri.host?.lowercase().orEmpty()
            val path = uri.path.orEmpty()
            val candidate: String? = when {
                (host == "l.facebook.com" || host == "lm.facebook.com" || host == "l.instagram.com") ->
                    uri.getQueryParameter("u")
                host.endsWith("facebook.com") && path.contains("/flx/warn/") ->
                    uri.getQueryParameter("u")
                host.endsWith("duckduckgo.com") && path.startsWith("/l/") ->
                    uri.getQueryParameter("uddg")
                host.contains("google.") && path == "/url" ->
                    uri.getQueryParameter("q") ?: uri.getQueryParameter("url")
                host.endsWith("youtube.com") && path == "/redirect" ->
                    uri.getQueryParameter("q")
                else -> null
            }
            if (!candidate.isNullOrBlank() && (candidate.startsWith("http://") || candidate.startsWith("https://"))) {
                current = candidate
            }
        } catch (_: Exception) {
        }
        return stripTrackingParameters(current)
    }

    /**
     * Strips surveillance query tokens (utm_*, fbclid, gclid, wa_click_id, etc.) from URLs
     */
    fun stripTrackingParameters(rawUrl: String): String {
        if (!stripTrackingParamsEnabled && !privacyBadgerEnabled) return rawUrl
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

    fun cosmeticSuppressionCss(): String {
        if (!adBlockEnabled) return ""
        val sb = StringBuilder()
        if (easyListEnabled || peterLoweEnabled) {
            sb.append(
                ".ytp-ad-module, .ytp-ad-player-overlay, .ytp-ad-text, .video-ads, .ad-container, .ad-interrupting, .fb-ad, .sponsored_ad, .ad-banner, .interstitial-ad, .overlay-ad, ins.adsbygoogle, div[id*=\"google_ads\"], div[id*=\"taboola\"], div[id*=\"outbrain\"], div[class*=\"ad-box\"], div[class*=\"ad-slot\"], div[class*=\"ad-wrapper\"], div[class*=\"popup-banner\"] { display: none !important; visibility: hidden !important; height: 0 !important; width: 0 !important; opacity: 0 !important; pointer-events: none !important; } "
            )
        }
        if (annoyancesEnabled) {
            sb.append(
                "div[id*=\"cookie-banner\"], div[class*=\"consent-modal\"], div[id*=\"onetrust-consent-sdk\"], div[class*=\"cookie-consent\"], div[id*=\"sp_message_container\"] { display: none !important; visibility: hidden !important; height: 0 !important; pointer-events: none !important; }"
            )
        }
        return sb.toString()
    }

    /**
     * Generates a 0-byte MIME-matched dummy response to suppress blocked ads/scripts cleanly
     */
    fun createEmptyResponse(urlStr: String? = null): android.webkit.WebResourceResponse {
        val lower = (urlStr ?: "").lowercase().substringBefore("?")
        val (mime, body) = when {
            lower.endsWith(".js") -> "application/javascript" to "/* blocked by OMARVIO */"
            lower.endsWith(".css") -> "text/css" to "/* blocked by OMARVIO */"
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
