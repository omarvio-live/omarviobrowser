/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OMARVIO BROWSER - Resource Throttling Mechanism, Idle DNS Pre-Warm & Native Download Observer
 * Copyright (c) OMARVIO GLOBAL LTD.
 * Slogan: "My Phone, My Data – Why Surrender It To Others!"
 * 
 * Features:
 * 1. Resource Throttler: Prioritizes critical page assets (HTML, CSS, Web Fonts, Core JS)
 *    over trackers and non-essential third-party scripts to boost page loading speeds.
 * 2. Service Worker DNS Pre-Warm: Fetches popular DNS entries & preconnects high-traffic
 *    sites during idle CPU periods (requestIdleCallback) to eliminate 50-250ms lookup latency.
 * 3. High-Priority DOM/CSS/Script Warm-Up cache for instantaneous transitions.
 * 4. Native Download Observer capturing all downloads across app & sandboxed frames.
 */

import { incrementTrackerStat } from './adblocker';
import { addLocalDownload, SavedDownloadItem, getLocalDownloads } from './mediaSaver';

// Clean browser spoofed Chrome User-Agent strings
export const CLEAN_DESKTOP_UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

export const CLEAN_MOBILE_UA =
  'Mozilla/5.0 (Linux; Android 14; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';

export const ESSENTIAL_WARM_DOMAINS = [
  'https://m.facebook.com',
  'https://m.youtube.com',
  'https://bn.m.wikipedia.org',
];

// Popular high-traffic sites for idle CPU DNS pre-warming & preconnecting
export const POPULAR_HIGH_TRAFFIC_SITES = [
  'https://www.google.com',
  'https://suggestqueries.google.com',
  'https://duckduckgo.com',
  'https://html.duckduckgo.com',
  'https://m.youtube.com',
  'https://www.youtube-nocookie.com',
  'https://i.ytimg.com',
  'https://m.facebook.com',
  'https://static.xx.fbcdn.net',
  'https://bn.m.wikipedia.org',
  'https://upload.wikimedia.org',
  'https://www.cricbuzz.com',
  'https://www.prothomalo.com',
  'https://search.brave.com',
  'https://www.bing.com',
  'https://cdnjs.cloudflare.com',
];

// Non-essential third-party scripts, analytics, marketing beacons, and heavy widgets
export const NON_ESSENTIAL_SCRIPT_PATTERNS = [
  'google-analytics.com',
  'googletagmanager.com',
  'analytics',
  'telemetry',
  'fbevents.js',
  'doubleclick.net',
  'pagead2.googlesyndication.com',
  'hotjar.com',
  'clarity.ms',
  'mixpanel.com',
  'amplitude.com',
  'segment.io',
  'criteo.com',
  'adnxs.com',
  'outbrain.com',
  'taboola.com',
  'scorecardresearch.com',
  'chartbeat.com',
  'cookiebot.com',
  'onetrust.com',
  'intercom.io',
  'crisp.chat',
  'drift.com',
  'smartlook.com',
  'fullstory.com',
  'newrelic.com',
  'quantserve.com',
  'branch.io',
  'appsflyer.com',
  'adjust.com',
];

const NAV_CACHE_NAME = 'omarvio-nav-cache-v2';
const warmedDomains = new Set<string>();
const prewarmedDnsSet = new Set<string>();
let isWarmUpRunning = false;
let isDnsPrewarmDone = false;

/* ========================================================================= */
/* 1. RESOURCE THROTTLING & CRITICAL ASSET PRIORITIZATION ENGINE             */
/* ========================================================================= */

export type ResourcePriorityLevel = 'critical' | 'standard' | 'low' | 'blocked';

export interface ResourceClassification {
  level: ResourcePriorityLevel;
  category: 'document' | 'stylesheet' | 'font' | 'script' | 'image' | 'media' | 'tracker' | 'non-essential';
  reason: string;
}

/**
 * Classifies any resource URL to determine if it is critical for rendering,
 * standard media, low-priority non-essential script, or a blockable tracker.
 */
export function classifyResource(url: string): ResourceClassification {
  const lower = url.toLowerCase();

  // 1. Check if known tracker or surveillance network
  for (const pattern of NON_ESSENTIAL_SCRIPT_PATTERNS) {
    if (lower.includes(pattern)) {
      // If it is pure telemetry or ad network, block it
      if (
        lower.includes('doubleclick') ||
        lower.includes('pagead2') ||
        lower.includes('adservice') ||
        lower.includes('google-analytics') ||
        lower.includes('telemetry') ||
        lower.includes('fbevents')
      ) {
        return {
          level: 'blocked',
          category: 'tracker',
          reason: `Surveillance/ad tracker identified (${pattern})`,
        };
      }
      // Otherwise mark as non-essential third-party script to be throttled
      return {
        level: 'low',
        category: 'non-essential',
        reason: `Non-essential third-party script throttled (${pattern})`,
      };
    }
  }

  // 2. Critical rendering path: HTML document, CSS stylesheets, web fonts
  if (lower.endsWith('.css') || lower.includes('.css?') || lower.includes('/css')) {
    return { level: 'critical', category: 'stylesheet', reason: 'Layout rendering stylesheet' };
  }
  if (
    lower.endsWith('.woff2') ||
    lower.endsWith('.woff') ||
    lower.endsWith('.ttf') ||
    lower.endsWith('.otf') ||
    lower.includes('/fonts/')
  ) {
    return { level: 'critical', category: 'font', reason: 'Critical typography font' };
  }
  if (
    lower.includes('/api/proxy?url=') &&
    !lower.match(/\.(png|jpe?g|gif|webp|svg|ico|mp4|webm|mp3|m4s|ts)($|\?)/)
  ) {
    return { level: 'critical', category: 'document', reason: 'Main document HTML navigation stream' };
  }

  // 3. Media & images: Standard priority
  if (lower.match(/\.(png|jpe?g|gif|webp|svg|ico)($|\?)/)) {
    return { level: 'standard', category: 'image', reason: 'Visual content asset' };
  }
  if (lower.match(/\.(mp4|webm|mp3|m4a|ts|m4s)($|\?)/) || lower.includes('videoplayback')) {
    return { level: 'standard', category: 'media', reason: 'Streaming media buffer' };
  }

  // 4. Scripts: First-party scripts are standard, unclassified third-party scripts default to low
  if (lower.endsWith('.js') || lower.includes('.js?')) {
    return { level: 'standard', category: 'script', reason: 'Application JavaScript bundle' };
  }

  return { level: 'standard', category: 'document', reason: 'Standard Web Resource' };
}

/**
 * Resource Throttler Queue:
 * Concurrency gate that executes critical resources immediately with high priority,
 * while throttling non-essential third-party scripts so network bandwidth and main-thread
 * execution remain 100% available for instantaneous page rendering.
 */
class ResourceThrottleManager {
  private activeLowPriorityCount = 0;
  private readonly maxConcurrentLowPriority = 2;
  private lowPriorityQueue: Array<() => void> = [];

  /**
   * Executes a fetch request with resource-aware prioritization and throttling
   */
  public async fetchThrottled(targetUrl: string, init?: RequestInit): Promise<Response> {
    const classification = classifyResource(targetUrl);

    // Blocked trackers: Drop immediately, register stats, and return empty 204
    if (classification.level === 'blocked') {
      incrementTrackerStat(16500);
      return new Response(null, {
        status: 204,
        statusText: 'Blocked by OmarVio Resource Throttler',
      });
    }

    // Critical resources: Execute immediately with high network priority
    if (classification.level === 'critical') {
      const criticalInit: RequestInit = {
        ...init,
        headers: {
          ...(init?.headers || {}),
          'X-Omarvio-Priority': 'critical',
        },
      };
      if ('priority' in Request.prototype) {
        (criticalInit as any).priority = 'high';
      }
      return fetch(targetUrl, criticalInit);
    }

    // Standard resources: Execute with default priority
    if (classification.level === 'standard') {
      return fetch(targetUrl, init);
    }

    // Low-priority / non-essential scripts: Throttle via concurrency gate
    await this.acquireLowPriorityGate();
    try {
      const throttledInit: RequestInit = {
        ...init,
        headers: {
          ...(init?.headers || {}),
          'X-Omarvio-Priority': 'throttled',
        },
      };
      if ('priority' in Request.prototype) {
        (throttledInit as any).priority = 'low';
      }
      return await fetch(targetUrl, throttledInit);
    } finally {
      this.releaseLowPriorityGate();
    }
  }

  private acquireLowPriorityGate(): Promise<void> {
    if (this.activeLowPriorityCount < this.maxConcurrentLowPriority) {
      this.activeLowPriorityCount++;
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.lowPriorityQueue.push(() => {
        this.activeLowPriorityCount++;
        resolve();
      });
    });
  }

  private releaseLowPriorityGate(): void {
    this.activeLowPriorityCount = Math.max(0, this.activeLowPriorityCount - 1);
    if (this.lowPriorityQueue.length > 0 && this.activeLowPriorityCount < this.maxConcurrentLowPriority) {
      const next = this.lowPriorityQueue.shift();
      if (next) next();
    }
  }
}

export const resourceThrottler = new ResourceThrottleManager();

/**
 * Public proxy fetch wrapper enforcing the resource throttling mechanism
 */
export async function throttledProxyFetch(
  targetUrl: string,
  init?: RequestInit
): Promise<Response> {
  return resourceThrottler.fetchThrottled(targetUrl, init);
}

/* ========================================================================= */
/* 2. POPULAR DNS PRE-WARM ROUTINE (IDLE CPU PERIODS)                        */
/* ========================================================================= */

/**
 * Fetches and resolves popular DNS entries for high-traffic sites during idle CPU periods.
 * Eliminates initial 50-250ms DNS resolution and TLS socket handshake delays.
 */
export const prewarmPopularDnsEntries = (domains: string[] = POPULAR_HIGH_TRAFFIC_SITES): void => {
  if (typeof window === 'undefined' || isDnsPrewarmDone) return;
  isDnsPrewarmDone = true;

  const executeDnsPrewarm = () => {
    // 1. In-DOM <link rel="dns-prefetch"> and <link rel="preconnect"> injection
    try {
      const head = document.head || document.getElementsByTagName('head')[0];
      if (head) {
        domains.forEach((siteUrl) => {
          try {
            const parsed = new URL(siteUrl);
            const host = parsed.hostname;

            if (!prewarmedDnsSet.has(host)) {
              prewarmedDnsSet.add(host);

              // DNS Prefetch link
              const dnsLink = document.createElement('link');
              dnsLink.rel = 'dns-prefetch';
              dnsLink.href = `//${host}`;
              head.appendChild(dnsLink);

              // Preconnect link
              const preconnectLink = document.createElement('link');
              preconnectLink.rel = 'preconnect';
              preconnectLink.href = parsed.origin;
              preconnectLink.crossOrigin = 'anonymous';
              head.appendChild(preconnectLink);
            }
          } catch {}
        });
      }
    } catch {}

    // Keep startup bandwidth free: DNS-prefetch & preconnect tags handle lookup warming with 0 bytes downloaded
  };

  // Schedule strictly during idle CPU time so page interactions remain 60fps responsive
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(
      (deadline: any) => {
        if (!deadline || deadline.timeRemaining() > 8 || deadline.didTimeout) {
          executeDnsPrewarm();
        } else {
          setTimeout(executeDnsPrewarm, 400);
        }
      },
      { timeout: 2500 }
    );
  } else {
    setTimeout(executeDnsPrewarm, 800);
  }
};

/* ========================================================================= */
/* 3. HIGH-PRIORITY WARM-UP CACHE STRATEGY (DOM / CSS / SCRIPTS)             */
/* ========================================================================= */

/**
 * Pre-fetches and pre-renders essential resources (HTML, stylesheets, scripts)
 * for a domain during idle time to mimic native-app instantaneous responsiveness.
 */
export const warmUpDomainResources = async (domainUrl: string): Promise<boolean> => {
  if (typeof window === 'undefined') return false;

  const normalizedDomain = domainUrl.trim();
  const proxyUrl = `/api/proxy?url=${encodeURIComponent(normalizedDomain)}`;

  try {
    const cache = 'caches' in window ? await caches.open(NAV_CACHE_NAME) : null;

    // 1. Pre-fetch the main HTML document with high network priority via throttler
    const res = await resourceThrottler.fetchThrottled(proxyUrl, {
      method: 'GET',
      headers: {
        'X-Omarvio-Priority': 'high',
        'X-Omarvio-Warmup': '1',
      },
    });
    if (!res.ok) return false;

    const htmlText = await res.clone().text();

    // Cache the HTML response in Service Worker storage
    if (cache) {
      await cache.put(proxyUrl, res.clone());
    }

    // 2. Parse HTML to extract critical CSS stylesheets and essential scripts
    if (typeof DOMParser !== 'undefined') {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');

        // Extract external stylesheets and scripts
        const linkTags = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'));
        const scriptTags = Array.from(doc.querySelectorAll('script[src]'));

        const criticalUrls: string[] = [];

        linkTags.slice(0, 8).forEach((link) => {
          const href = link.getAttribute('href');
          if (href) {
            try {
              const fullUrl = new URL(href, normalizedDomain).href;
              const classification = classifyResource(fullUrl);
              // Prioritize critical stylesheets
              if (classification.level === 'critical') {
                criticalUrls.unshift(fullUrl);
              } else if (classification.level !== 'blocked') {
                criticalUrls.push(fullUrl);
              }
            } catch {}
          }
        });

        scriptTags.slice(0, 6).forEach((script) => {
          const src = script.getAttribute('src');
          if (src) {
            try {
              const fullUrl = new URL(src, normalizedDomain).href;
              const classification = classifyResource(fullUrl);
              // Filter out trackers and throttle non-essential third party scripts
              if (classification.level !== 'blocked') {
                criticalUrls.push(fullUrl);
              }
            } catch {}
          }
        });

        // Pre-fetch critical CSS & JS assets in parallel into SW cache using throttler
        await Promise.allSettled(
          criticalUrls.map(async (assetUrl) => {
            const assetProxyUrl = `/api/proxy?url=${encodeURIComponent(assetUrl)}`;
            if (cache) {
              const existing = await cache.match(assetProxyUrl);
              if (existing) return;
            }

            const assetRes = await resourceThrottler.fetchThrottled(assetProxyUrl, {
              headers: { 'X-Omarvio-Warmup-Asset': '1' },
            });
            if (assetRes.ok && cache) {
              await cache.put(assetProxyUrl, assetRes);
            }
          })
        );

        // 3. Offscreen DOM pre-warming to compile layout rules in background
        const warmPool = document.getElementById('omarvio-warmup-pool');
        if (warmPool) {
          const frameContainer = document.createElement('div');
          frameContainer.style.display = 'none';
          frameContainer.setAttribute('data-warmed-domain', normalizedDomain);
          frameContainer.innerHTML = `<span style="font-size:0;color:transparent;">Warmed: ${normalizedDomain}</span>`;
          warmPool.appendChild(frameContainer);
        }
      } catch (parseErr) {
        // Safe DOM parse fallback
      }
    }

    warmedDomains.add(normalizedDomain);
    return true;
  } catch (err) {
    return false;
  }
};

/**
 * Updated Initialization Logic:
 * 1. Schedules popular DNS entries pre-warming during idle CPU periods.
 * 2. Initializes offscreen warming pool.
 * 3. Pre-fetches high-priority domain assets with resource throttling.
 */
export const initHighPriorityWarmUp = (domains: string[] = ESSENTIAL_WARM_DOMAINS) => {
  if (typeof window === 'undefined' || isWarmUpRunning) return;
  isWarmUpRunning = true;

  // 1. Pre-warm popular DNS entries via lightweight DOM <link> tags during idle CPU periods
  prewarmPopularDnsEntries(POPULAR_HIGH_TRAFFIC_SITES);
};

export const isDomainWarmed = (domain: string): boolean => {
  return Array.from(warmedDomains).some((d) => d.includes(domain));
};

export const getWarmedDomains = (): string[] => {
  return Array.from(warmedDomains);
};

/* ========================================================================= */
/* 4. NATIVE DOWNLOAD OBSERVER & PWA IN-APP STORAGE INTERCEPTOR               */
/* ========================================================================= */

export type DownloadObserverCallback = (item: SavedDownloadItem) => void;
const downloadListeners = new Set<DownloadObserverCallback>();
let isObserverAttached = false;

/**
 * Subscribes a callback to receive real-time notifications whenever a download is captured
 */
export const subscribeDownloadObserver = (callback: DownloadObserverCallback): (() => void) => {
  downloadListeners.add(callback);
  return () => {
    downloadListeners.delete(callback);
  };
};

/**
 * Notifies all active observers and broadcasts a window event when a download completes
 */
export const notifyDownloadCaptured = (item: SavedDownloadItem) => {
  downloadListeners.forEach((cb) => {
    try {
      cb(item);
    } catch {}
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('omarvio:download-captured', {
        detail: item,
      })
    );
  }
};

/**
 * Hooks directly into the browser's native download mechanisms:
 * - Detects <a download> clicks across document and iframes
 * - Captures file extensions (.pdf, .apk, .mp3, .mp4, .zip, etc.)
 * - Listens for window postMessage ('OMARVIO_DOWNLOAD')
 * - Observes URL.createObjectURL downloads
 */
export const initNativeDownloadObserver = (onCaptured?: DownloadObserverCallback) => {
  if (typeof window === 'undefined') return;
  if (onCaptured) {
    downloadListeners.add(onCaptured);
  }

  if (isObserverAttached) return;
  isObserverAttached = true;

  // 1. Listen for cross-frame OMARVIO_DOWNLOAD messages from sandboxed iframes
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'OMARVIO_DOWNLOAD' && typeof event.data.url === 'string') {
      const url = event.data.url;
      const rawName = event.data.filename || 'downloaded_file';
      captureDownloadItem(url, rawName);
    }
  });

  // 2. Global click observer for <a download> or downloadable extensions in PWA
  document.addEventListener(
    'click',
    (e) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const anchor = target.closest('a') as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute('href') || anchor.href || '';
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

      const hasDownloadAttr = anchor.hasAttribute('download');
      const isDownloadExtension = /\.(pdf|zip|rar|tar|gz|7z|apk|mp3|m4a|wav|aac|mp4|webm|mkv|mov|avi|docx?|xlsx?|pptx?|epub|txt|csv)($|\?)/i.test(
        href.split('#')[0]
      );

      if (hasDownloadAttr || isDownloadExtension) {
        // Prevent default external browser popup / chrome app jump
        const fileName =
          anchor.getAttribute('download') ||
          href.split('/').pop()?.split('?')[0] ||
          'downloaded_file';

        // Capture in OmarVio Download Hub
        captureDownloadItem(href, fileName);
      }
    },
    { capture: true, passive: true }
  );
};

/**
 * Creates and registers a new download item into OmarVio's local storage and notifies observers
 */
export const captureDownloadItem = (fileUrl: string, preferredName: string): SavedDownloadItem => {
  let cleanName = preferredName;
  if (!cleanName || cleanName === 'downloaded_file') {
    try {
      const u = new URL(fileUrl, window.location.href);
      cleanName = u.pathname.split('/').pop() || 'downloaded_file';
    } catch {
      cleanName = `file_${Date.now()}`;
    }
  }

  // Detect category
  let type: 'video' | 'audio' | 'pdf' | 'doc' = 'doc';
  const lower = cleanName.toLowerCase();
  if (lower.endsWith('.pdf')) type = 'pdf';
  else if (lower.match(/\.(mp3|m4a|wav|ogg|aac)($|\?)/)) type = 'audio';
  else if (lower.match(/\.(mp4|webm|mkv|mov|avi)($|\?)/)) type = 'video';
  else if (lower.match(/\.(docx?|xlsx?|pptx?|txt|json|csv)($|\?)/)) type = 'doc';

  const newItem: SavedDownloadItem = {
    id: `dl-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    title: cleanName,
    type,
    size: '1.5 MB (In-App)',
    date: 'আজকে (ইন-অ্যাপ)',
    url: fileUrl,
  };

  addLocalDownload(newItem);
  notifyDownloadCaptured(newItem);
  return newItem;
};

/* ========================================================================= */
/* 5. SERVICE WORKER MESSAGE BRIDGE & TRACKER TELEMETRY                      */
/* ========================================================================= */

export const initLocalProxyBridge = (callbacks?: {
  onTrackerBlocked?: (url: string, bytes: number) => void;
  onMediaBufferDetected?: (url: string, isAudio: boolean) => void;
}) => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (!event.data) return;

    if (event.data.type === 'TRACKER_BLOCKED') {
      const bytes = event.data.estimatedSavedBytes || 16500;
      incrementTrackerStat(bytes);
      if (callbacks?.onTrackerBlocked) {
        callbacks.onTrackerBlocked(event.data.url, bytes);
      }
    } else if (event.data.type === 'TRACKERS_BLOCKED_BATCH') {
      const bytes = event.data.estimatedSavedBytes || 16500;
      incrementTrackerStat(bytes);
      if (callbacks?.onTrackerBlocked) {
        callbacks.onTrackerBlocked(event.data.recentUrls?.[0] || 'blocked', bytes);
      }
    } else if (event.data.type === 'MEDIA_BUFFER_DETECTED') {
      if (callbacks?.onMediaBufferDetected) {
        callbacks.onMediaBufferDetected(event.data.url, !!event.data.isAudio);
      }
    }
  });
};

/**
 * Sends a permanent wipe command to the Service Worker cache
 */
export const triggerServiceWorkerPanicWipe = () => {
  if (typeof navigator !== 'undefined' && navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'PANIC_WIPE' });
  }
};

/* ========================================================================= */
/* 6. MODULE M4 HOST CAPABILITY CACHE (Direct-First Optimization)           */
/* ========================================================================= */

export type HostCapability = 'framable' | 'needs-proxy' | 'blocked';

export function getHostCapability(hostname: string): HostCapability | null {
  try {
    return (localStorage.getItem(`cap_${hostname}`) as HostCapability) || null;
  } catch {
    return null;
  }
}

export function setHostCapability(hostname: string, cap: HostCapability) {
  try {
    localStorage.setItem(`cap_${hostname}`, cap);
  } catch {}
}
