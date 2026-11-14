/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OMARVIO BROWSER - Zero-Flicker Link Interception & Navigation Engine
 * Copyright (c) OMARVIO GLOBAL LTD.
 * Slogan: "My Phone, My Data – Why Surrender It To Others!"
 * 
 * Implements passive event listeners, speculative pre-touch unwrap,
 * and immediate 0ms state transitions to eliminate blank/white screen flicker.
 */

import { cleanTrackingParameters } from './adblocker';

export interface CleanedExternalLinkResult {
  originalUrl: string;
  cleanedUrl: string;
  sourceApp: 'whatsapp' | 'messenger' | 'facebook' | 'telegram' | 'sms' | 'generic';
  unwrapped: boolean;
  trackersRemoved: string[];
}

export interface LinkInterceptorOptions {
  onImmediateTransition?: (url: string, rawUrl: string) => void;
  onTrackerCleaned?: (cleanUrl: string, removedCount: number) => void;
  enableSpeculativePreload?: boolean;
}

/**
 * Surveillance and tracking query parameters appended by social and ad networks
 */
export const MESSENGER_TRACKING_KEYS = [
  'fbclid',
  'gclid',
  'wbraid',
  'gbraid',
  'igshid',
  'si',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'wa_click_id',
  'source',
  'ref',
  'ref_src',
  '__twitter_impression',
  'ttclid',
  'twclid',
  'msclkid',
  'mc_eid',
  'ncid',
  'ocid',
  'cmpid',
];

/**
 * Detects device operating system and brand for tailored default browser instructions
 */
export const detectPlatform = (): {
  os: 'android' | 'ios' | 'windows' | 'mac' | 'linux' | 'other';
  brand: 'samsung' | 'xiaomi' | 'pixel' | 'oneplus' | 'oppo_vivo' | 'apple' | 'generic';
  name: string;
} => {
  if (typeof navigator === 'undefined') {
    return { os: 'other', brand: 'generic', name: 'Unknown' };
  }

  const ua = navigator.userAgent.toLowerCase();

  // Check OS
  if (/android/.test(ua)) {
    let brand: 'samsung' | 'xiaomi' | 'pixel' | 'oneplus' | 'oppo_vivo' | 'generic' = 'generic';
    let name = 'Android Device';

    if (/samsung|sm-[a-z0-9]+/i.test(ua)) {
      brand = 'samsung';
      name = 'Samsung Galaxy';
    } else if (/redmi|xiaomi|poco|miui|hyperos/i.test(ua)) {
      brand = 'xiaomi';
      name = 'Xiaomi / Redmi / Poco';
    } else if (/pixel/i.test(ua)) {
      brand = 'pixel';
      name = 'Google Pixel';
    } else if (/oneplus/i.test(ua)) {
      brand = 'oneplus';
      name = 'OnePlus';
    } else if (/oppo|vivo|realme/i.test(ua)) {
      brand = 'oppo_vivo';
      name = 'Realme / Oppo / Vivo';
    }

    return { os: 'android', brand, name };
  }

  if (/iphone|ipad|ipod/.test(ua)) {
    return { os: 'ios', brand: 'apple', name: 'Apple iOS (iPhone/iPad)' };
  }

  if (/windows/.test(ua)) {
    return { os: 'windows', brand: 'generic', name: 'Windows PC' };
  }

  if (/macintosh|mac os x/.test(ua)) {
    return { os: 'mac', brand: 'apple', name: 'Apple Mac' };
  }

  if (/linux/.test(ua)) {
    return { os: 'linux', brand: 'generic', name: 'Linux' };
  }

  return { os: 'other', brand: 'generic', name: 'Web Browser' };
};

/**
 * Detects if a URL came through a redirect bridge like l.facebook.com or google.com/url
 * and unwraps the true target destination while stripping secret surveillance tokens.
 */
export const unwrapAndSanitizeExternalUrl = (rawInput: string): CleanedExternalLinkResult => {
  let target = (rawInput || '').trim();
  let sourceApp: CleanedExternalLinkResult['sourceApp'] = 'generic';
  let unwrapped = false;
  const removedTrackers: string[] = [];

  if (!target) {
    return {
      originalUrl: '',
      cleanedUrl: '',
      sourceApp: 'generic',
      unwrapped: false,
      trackersRemoved: [],
    };
  }

  // If input contains text + url mixed (typical WhatsApp/Messenger copy paste), extract first URL
  const urlMatch = target.match(/https?:\/\/[^\s]+/i);
  if (urlMatch) {
    target = urlMatch[0];
  } else if (!target.startsWith('http://') && !target.startsWith('https://') && !target.startsWith('search:')) {
    target = `https://${target}`;
  }

  try {
    const parsed = new URL(target);

    // 1. Unpack Facebook / Messenger redirect bridges (l.facebook.com / lm.facebook.com)
    if (parsed.hostname.includes('facebook.com') && (parsed.pathname.includes('/l.php') || parsed.pathname.includes('/si/ajax/l/'))) {
      sourceApp = 'messenger';
      const uParam = parsed.searchParams.get('u');
      if (uParam) {
        target = decodeURIComponent(uParam);
        unwrapped = true;
      }
    }
    // 2. Unpack Instagram redirect bridge (l.instagram.com)
    else if (parsed.hostname.includes('instagram.com') && parsed.searchParams.has('u')) {
      sourceApp = 'messenger';
      const uParam = parsed.searchParams.get('u');
      if (uParam) {
        target = decodeURIComponent(uParam);
        unwrapped = true;
      }
    }
    // 3. Unpack Google redirect bridge (google.com/url?q=... or google.com/url?url=...)
    else if (parsed.hostname.includes('google.') && parsed.pathname === '/url') {
      sourceApp = 'generic';
      const qParam = parsed.searchParams.get('q') || parsed.searchParams.get('url');
      if (qParam) {
        target = decodeURIComponent(qParam);
        unwrapped = true;
      }
    }
    // 4. Unpack YouTube redirect bridge (youtube.com/redirect?q=...)
    else if (parsed.hostname.includes('youtube.com') && parsed.pathname === '/redirect') {
      sourceApp = 'generic';
      const qParam = parsed.searchParams.get('q');
      if (qParam) {
        target = decodeURIComponent(qParam);
        unwrapped = true;
      }
    }
    // 5. Unpack DuckDuckGo redirect bridge (duckduckgo.com/l/?uddg=...)
    else if (parsed.hostname.includes('duckduckgo.com') && parsed.pathname.startsWith('/l/')) {
      sourceApp = 'generic';
      const uddg = parsed.searchParams.get('uddg');
      if (uddg) {
        target = decodeURIComponent(uddg);
        unwrapped = true;
      }
    }

    // Now clean tracking tokens from the destination URL
    const destUrl = new URL(target);
    MESSENGER_TRACKING_KEYS.forEach((key) => {
      if (destUrl.searchParams.has(key)) {
        destUrl.searchParams.delete(key);
        removedTrackers.push(key);
      }
    });

    // Detect likely source app if query had specific hints
    if (rawInput.includes('fbclid') || rawInput.includes('messenger')) {
      sourceApp = 'messenger';
    } else if (rawInput.includes('wa_click_id') || rawInput.includes('whatsapp') || rawInput.includes('si=')) {
      sourceApp = 'whatsapp';
    }

    const finalUrl = cleanTrackingParameters(destUrl.toString());

    return {
      originalUrl: rawInput,
      cleanedUrl: finalUrl,
      sourceApp,
      unwrapped,
      trackersRemoved: removedTrackers,
    };
  } catch {
    return {
      originalUrl: rawInput,
      cleanedUrl: target,
      sourceApp: 'generic',
      unwrapped: false,
      trackersRemoved: [],
    };
  }
};

/**
 * Locates the nearest actionable URL from a click/touch target
 */
export const findActionableAnchor = (target: EventTarget | null): HTMLAnchorElement | null => {
  if (!target || !(target instanceof Element)) return null;
  const anchor = target.closest('a[href]') as HTMLAnchorElement | null;
  return anchor;
};

/**
 * Global passive link interceptor engine.
 * Attaches passive touch/pointer listeners for zero-latency URL unwrap,
 * and high-priority click capture for immediate state transition without white/blank flicker.
 */
export const attachPassiveLinkInterceptor = (
  container: EventTarget = window,
  options: LinkInterceptorOptions = {}
): (() => void) => {
  const { onImmediateTransition, onTrackerCleaned } = options;

  let speculativeCleanUrl: string | null = null;
  let speculativeRawUrl: string | null = null;

  // 1. Passive touchstart/pointerdown listener:
  // Pre-resolves destination on the physical finger-down event (~80-120ms before click fires)
  const handlePassivePointerDown = (e: Event) => {
    try {
      const anchor = findActionableAnchor(e.target);
      if (!anchor) return;

      const rawHref = anchor.getAttribute('href') || anchor.href || '';
      if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('javascript:')) {
        speculativeCleanUrl = null;
        speculativeRawUrl = null;
        return;
      }

      // Neutralize target="_blank" on touch immediately to prevent opening external tabs
      if (anchor.target && anchor.target !== '_self') {
        anchor.target = '_self';
        anchor.setAttribute('target', '_self');
      }

      // Resolve absolute destination URL
      const resolved = new URL(rawHref, document.baseURI || window.location.href).href;
      const unwrapResult = unwrapAndSanitizeExternalUrl(resolved);

      speculativeRawUrl = resolved;
      speculativeCleanUrl = unwrapResult.cleanedUrl;
    } catch {
      speculativeCleanUrl = null;
      speculativeRawUrl = null;
    }
  };

  // 2. High-priority click interceptor:
  // Prevents native page tear-down flicker and executes immediate state transition
  const handleClickCapture = (e: MouseEvent) => {
    try {
      const anchor = findActionableAnchor(e.target);
      if (!anchor) return;

      const rawHref = anchor.getAttribute('href') || anchor.href || '';
      if (!rawHref) return;

      // Allow pure in-page hash anchors (e.g., #section-2) without reloading
      if (rawHref.startsWith('#')) return;
      if (rawHref.startsWith('javascript:')) return;

      // Neutralize target="_blank"
      anchor.target = '_self';
      anchor.setAttribute('target', '_self');

      // Stop native navigation to eliminate the white/blank screen flicker
      e.preventDefault();
      e.stopPropagation();

      let targetUrl = speculativeCleanUrl;
      const rawTargetUrl = speculativeRawUrl || rawHref;

      if (!targetUrl) {
        const resolved = new URL(rawHref, document.baseURI || window.location.href).href;
        const unwrapResult = unwrapAndSanitizeExternalUrl(resolved);
        targetUrl = unwrapResult.cleanedUrl;

        if (unwrapResult.trackersRemoved.length > 0 && onTrackerCleaned) {
          onTrackerCleaned(targetUrl, unwrapResult.trackersRemoved.length);
        }
      }

      speculativeCleanUrl = null;
      speculativeRawUrl = null;

      if (targetUrl && onImmediateTransition) {
        // Immediate 0ms state transition callback
        onImmediateTransition(targetUrl, rawTargetUrl);
      }
    } catch {
      // Fallback
      speculativeCleanUrl = null;
      speculativeRawUrl = null;
    }
  };

  // Attach passive touch and pointer listeners for maximum responsiveness
  container.addEventListener('touchstart', handlePassivePointerDown, { passive: true, capture: true });
  container.addEventListener('pointerdown', handlePassivePointerDown, { passive: true, capture: true });
  container.addEventListener('click', handleClickCapture as EventListener, { capture: true, passive: false });

  // Return teardown function
  return () => {
    container.removeEventListener('touchstart', handlePassivePointerDown, { capture: true });
    container.removeEventListener('pointerdown', handlePassivePointerDown, { capture: true });
    container.removeEventListener('click', handleClickCapture as EventListener, { capture: true });
  };
};

/**
 * Returns an injection script string for the Edge Proxy (Cloudflare / Express).
 * Runs inside proxied iframes to guarantee 0ms in-tab navigation without white flash.
 */
export const getInjectedLinkInterceptorScript = (): string => {
  return `
    (function() {
      var realParent = window.parent;
      var speculativeUrl = null;

      // 1. Passive speculative resolver
      document.addEventListener('touchstart', function(e) {
        try {
          var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
          if (a) {
            var raw = a.getAttribute('href') || a.href || '';
            if (raw && !raw.startsWith('#') && !raw.startsWith('javascript:')) {
              a.target = '_self';
              a.setAttribute('target', '_self');
              speculativeUrl = new URL(raw, document.baseURI || window.location.href).href;
            }
          }
        } catch(err) {}
      }, { passive: true, capture: true });

      // 2. Active click capture: sends instant OMARVIO_NAVIGATE message before page unload
      document.addEventListener('click', function(e) {
        var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
        if (a) {
          var rawHref = a.getAttribute('href') || a.href || '';
          if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('javascript:')) return;

          a.target = '_self';
          a.setAttribute('target', '_self');
          e.preventDefault();
          e.stopPropagation();

          var finalTarget = speculativeUrl;
          if (!finalTarget) {
            try {
              finalTarget = new URL(rawHref, document.baseURI || window.location.href).href;
            } catch(err) {
              finalTarget = a.href || rawHref;
            }
          }
          speculativeUrl = null;

          // Notify OmarVio parent window INSTANTLY
          try {
            if (realParent && realParent !== window) {
              realParent.postMessage({ type: 'OMARVIO_NAVIGATE', url: finalTarget }, '*');
            }
          } catch(pe) {}

          // Navigate in current frame via proxy
          window.location.href = '/api/proxy?url=' + encodeURIComponent(finalTarget);
        }
      }, true);

      // 3. Intercept window.open
      try {
        window.open = function(url) {
          if (url && typeof url === 'string' && !url.startsWith('javascript:')) {
            try {
              var abs = new URL(url, document.baseURI || window.location.href).href;
              if (realParent && realParent !== window) {
                realParent.postMessage({ type: 'OMARVIO_NAVIGATE', url: abs }, '*');
              }
              window.location.href = '/api/proxy?url=' + encodeURIComponent(abs);
            } catch(e) {}
          }
          return null;
        };
        window.alert = function() {};
        window.confirm = function() { return true; };
      } catch(e) {}
    })();
  `;
};

/**
 * Registers OmarVio Browser as the system web protocol handler
 * so clicks on web+omarvio or standard links can summon OmarVio
 */
export const registerProtocolHandler = async (): Promise<{ success: boolean; error?: string }> => {
  if (typeof navigator === 'undefined' || !('registerProtocolHandler' in navigator)) {
    return { success: false, error: 'Protocol handler API is not supported in this environment' };
  }

  try {
    const handlerUrl = `${window.location.origin}/?url=%s`;
    navigator.registerProtocolHandler('web+omarvio', handlerUrl);
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error)?.message || 'Protocol registration rejected' };
  }
};

/**
 * Triggers Android System Default Apps Settings intent
 */
export const launchAndroidDefaultAppsIntent = (): void => {
  const intentUri = 'intent:#Intent;action=android.settings.MANAGE_DEFAULT_APPS_SETTINGS;end';
  try {
    window.location.href = intentUri;
  } catch {
    window.location.href = 'intent:#Intent;action=android.settings.SETTINGS;end';
  }
};
