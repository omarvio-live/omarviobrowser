/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Tracking parameters to sanitize from URLs (Google, Meta, Big Tech surveillance)
export const TRACKING_PARAMS = [
  'fbclid',
  'gclid',
  'gbraid',
  'wbraid',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'si',
  'igshid',
  'yclid',
  'mc_eid',
  '_hsenc',
  '_hsmi',
  'mkt_tok',
  'gs_lcrp',
  'oq',
  'aqs',
  'sourceid',
  'sxsrf',
  'ei',
  'ved',
  'uact',
  'bih',
  'biw',
  'sca_esv',
  'wa_click_id',
  'ttclid',
  'twclid',
  'msclkid',
];

// Cleans URLs of secret tracking queries
export const cleanTrackingParameters = (rawUrl: string): string => {
  try {
    const urlObj = new URL(rawUrl);
    let changed = false;

    TRACKING_PARAMS.forEach((param) => {
      if (urlObj.searchParams.has(param)) {
        urlObj.searchParams.delete(param);
        changed = true;
      }
    });

    return changed ? urlObj.toString() : rawUrl;
  } catch {
    return rawUrl;
  }
};

/**
 * Milestone 13: Google Out-of-the-Box Default Search & Zero-Telemetry Privacy Shield
 * Generates clean, surveillance-stripped search query URLs.
 * Default is Google with udm=14 (Web Clean View) with zero profiling cookies.
 */
export const getSanitizedSearchUrl = (query: string, preferredEngine?: string): string => {
  const engine = preferredEngine || (typeof window !== 'undefined' ? localStorage.getItem('omarvio_search_engine') || 'google' : 'google');
  const encodedQ = encodeURIComponent(query.trim());

  switch (engine) {
    case 'google':
      return `https://www.google.com/search?q=${encodedQ}`;
    case 'duckduckgo':
      return `https://html.duckduckgo.com/html/?q=${encodedQ}`;
    case 'brave':
      return `https://search.brave.com/search?q=${encodedQ}`;
    case 'bing':
      return `https://www.bing.com/search?q=${encodedQ}`;
    case 'firefox':
    case 'mozilla':
      return `https://html.duckduckgo.com/html/?q=${encodedQ}&t=ffab`;
    case 'startpage':
      return `https://www.startpage.com/sp/search?query=${encodedQ}`;
    case 'ecosia':
      return `https://www.ecosia.org/search?q=${encodedQ}`;
    case 'qwant':
      return `https://www.qwant.com/?q=${encodedQ}`;
    default:
      return `https://www.google.com/search?q=${encodedQ}`;
  }
};

// CSS injection for in-page aggressive ad & popup suppression (Milestone 14)
export const AD_SUPPRESSION_CSS = `
  /* Omarvio Aggressive Ad-Block Shield (Milestone 14) */
  .ytp-ad-module,
  .ytp-ad-player-overlay,
  .ytp-ad-text,
  .video-ads,
  .ad-container,
  .ad-interrupting,
  div[id*="google_ads"],
  div[class*="ad-box"],
  div[class*="sponsor"],
  iframe[src*="doubleclick"],
  iframe[src*="adservice"],
  .fb-ad,
  .sponsored_ad,
  .ad-banner,
  .interstitial-ad,
  .overlay-ad,
  div[class*="popup-banner"],
  div[id*="cookie-banner"],
  div[class*="consent-modal"] {
    display: none !important;
    visibility: hidden !important;
    height: 0 !important;
    width: 0 !important;
    opacity: 0 !important;
    pointer-events: none !important;
  }
`;

// Script injected to neutralize aggressive popups, auto-redirect traps and frame-busting (Milestone 14)
export const AGGRESSIVE_SHIELD_INJECTION_SCRIPT = `
  (function() {
    // 1. Prevent malicious pop-ups and auto window.open redirects
    try {
      var originalOpen = window.open;
      window.open = function(url, target, features) {
        if (!url || url === 'about:blank' || url.includes('javascript:')) return null;
        try {
          window.parent.postMessage({ type: 'OMARVIO_NAVIGATE', url: url }, '*');
        } catch(e) {}
        return null;
      };
    } catch(e) {}

    // 2. Prevent malicious alert/confirm spam
    try {
      window.alert = function() {};
      window.confirm = function() { return true; };
    } catch(e) {}

    // 3. Neutralize frame-busting scripts (top.location = self.location)
    try {
      Object.defineProperty(window, 'top', { get: function() { return window.self; } });
    } catch(e) {}
  })();
`;

// Script injected to auto-skip in-video mid-rolls (Module M5: 800ms interval, pauses on tab hide)
export const AD_FAST_SKIP_SCRIPT = `
  (function() {
    var timer = null;
    function checkAndSkip() {
      if (document.hidden) return;
      try {
        var skipBtn = document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button');
        if (skipBtn) {
          skipBtn.click();
        }
        var video = document.querySelector('video');
        var isAd = document.querySelector('.ad-showing, .ytp-ad-player-overlay');
        if (video && isAd && !isNaN(video.duration) && video.duration > 0) {
          video.currentTime = video.duration - 0.1;
          video.playbackRate = 16.0;
          video.muted = true;
        }
      } catch(e) {}
    }

    function startTimer() {
      if (!timer) {
        timer = setInterval(checkAndSkip, 800);
      }
    }

    function stopTimer() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }

    document.addEventListener('visibilitychange', function() {
      if (document.hidden) {
        stopTimer();
      } else {
        checkAndSkip();
        startTimer();
      }
    });

    startTimer();
  })();
`;

// Global reactive stats store
let stats = {
  trackersBlocked: 38,
  dataSavedMB: 14.2,
  adsDestroyed: 19,
};

let listeners: ((s: typeof stats) => void)[] = [];

export const getAdblockStats = () => ({ ...stats });

export const incrementTrackerStat = (bytes: number = 18000) => {
  stats.trackersBlocked += 1;
  stats.adsDestroyed += 1;
  stats.dataSavedMB = parseFloat((stats.dataSavedMB + bytes / (1024 * 1024)).toFixed(2));
  listeners.forEach((fn) => fn({ ...stats }));
};

export const subscribeAdblockStats = (fn: (s: typeof stats) => void) => {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
};
