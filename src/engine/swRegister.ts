/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OMARVIO BROWSER - Service Worker Registration & Persistent Cache Controller
 * Copyright (c) OMARVIO GLOBAL LTD.
 * Slogan: "My Phone, My Data – Why Surrender It To Others!"
 * 
 * Milestone 30: Persistent Service Worker Cache Strategies for Static Assets & Vendor Libraries
 * - Minimizes network roundtrips across browsing sessions
 * - Cache-First strategy for immutable vendor libraries (React, Lucide, Tailwind, Fonts)
 * - Stale-While-Revalidate strategy for static assets (Manifest, Icons, App Shell)
 * - Auto-persistence locking with navigator.storage.persist() to prevent mobile eviction
 */

type TrackerCallback = (stats: { url: string; savedBytes: number }) => void;

let trackerListeners: TrackerCallback[] = [];

/**
 * Cache Name Constants for Multi-Tier Storage Architecture
 */
export const CACHE_NAMES = {
  SHELL: 'omarvio-shell-v7',
  STATIC: 'omarvio-static-v7',
  VENDOR: 'omarvio-vendor-v7',
  ASSET: 'omarvio-asset-cache-v7',
  NAV: 'omarvio-nav-cache-v3',
} as const;

/**
 * Common Vendor Libraries and immutable CDN assets to permanently cache
 */
export const COMMON_VENDOR_LIBRARIES: string[] = [
  'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
  'https://fonts.gstatic.com',
  '/manifest.json',
];

/**
 * Static application assets for instant offline / multi-session load
 */
export const APP_STATIC_ASSETS: string[] = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/omarvio-logo-256.webp',
  '/assets/omarvio-icon-192.png',
];

/**
 * Frequently visited domains to prewarm in Service Worker persistent cache
 */
export const DEFAULT_FREQUENT_SITES = [
  'https://m.youtube.com',
  'https://m.facebook.com',
  'https://bn.m.wikipedia.org',
  'https://bdnews24.com',
];

/**
 * Requests device persistent storage (prevents automatic cache eviction on mobile devices)
 */
export const enablePersistentStorage = async (): Promise<boolean> => {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persisted();
      if (!isPersisted) {
        return await navigator.storage.persist();
      }
      return isPersisted;
    } catch {
      return false;
    }
  }
  return false;
};

/**
 * Cache-First Strategy for Immutable Vendor Libraries
 * Populates and validates vendor library persistent cache
 */
export const cacheVendorLibraries = async (
  libraries: string[] = COMMON_VENDOR_LIBRARIES
): Promise<number> => {
  if (typeof window === 'undefined' || !('caches' in window)) return 0;

  let cachedCount = 0;
  try {
    const cache = await caches.open(CACHE_NAMES.VENDOR);
    for (const libUrl of libraries) {
      try {
        const existing = await cache.match(libUrl);
        if (!existing) {
          const res = await fetch(libUrl, {
            mode: libUrl.startsWith('http') ? 'cors' : 'same-origin',
            cache: 'force-cache',
            priority: 'low',
          });
          if (res && (res.status === 200 || res.type === 'opaque')) {
            await cache.put(libUrl, res.clone());
            cachedCount++;
          }
        } else {
          cachedCount++;
        }
      } catch {
        // Continue caching remaining assets gracefully
      }
    }
  } catch {
    // Graceful fallback
  }
  return cachedCount;
};

/**
 * Stale-While-Revalidate Strategy for Static Application Assets
 * Serves cached version immediately while refreshing in background
 */
export const cacheStaticAssets = async (
  assets: string[] = APP_STATIC_ASSETS
): Promise<number> => {
  if (typeof window === 'undefined' || !('caches' in window)) return 0;

  let cachedCount = 0;
  try {
    const cache = await caches.open(CACHE_NAMES.STATIC);
    for (const assetUrl of assets) {
      try {
        const match = await cache.match(assetUrl);
        if (match) cachedCount++;

        // Refresh in background
        fetch(assetUrl, { cache: 'no-cache', priority: 'low' })
          .then((res) => {
            if (res && res.status === 200) {
              cache.put(assetUrl, res.clone());
            }
          })
          .catch(() => {});
      } catch {
        // Continue
      }
    }
  } catch {}
  return cachedCount;
};

/**
 * Purges old or deprecated cache versions to keep memory consumption low
 */
export const purgeExpiredCaches = async (): Promise<void> => {
  if (typeof window === 'undefined' || !('caches' in window)) return;

  const validCaches = new Set(Object.values(CACHE_NAMES));
  try {
    const allKeys = await caches.keys();
    for (const key of allKeys) {
      if (!validCaches.has(key as any) && key.startsWith('omarvio-')) {
        await caches.delete(key);
      }
    }
  } catch {}
};

/**
 * Returns cache storage quota and usage metrics
 */
export const getCacheStorageStatistics = async (): Promise<{
  quotaBytes: number;
  usageBytes: number;
  percentage: number;
  vendorCached: boolean;
}> => {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const quota = estimate.quota || 1;
      const usage = estimate.usage || 0;
      const hasVendor = typeof window !== 'undefined' && 'caches' in window
        ? await caches.has(CACHE_NAMES.VENDOR)
        : false;

      return {
        quotaBytes: quota,
        usageBytes: usage,
        percentage: Math.min(100, Math.round((usage / quota) * 100)),
        vendorCached: hasVendor,
      };
    } catch {}
  }
  return { quotaBytes: 0, usageBytes: 0, percentage: 0, vendorCached: false };
};

/**
 * Pre-warms Service Worker persistent cache for frequently visited sites (YouTube, Facebook, etc.)
 */
export const prewarmFrequentSitesCache = async (
  sites: string[] = DEFAULT_FREQUENT_SITES
): Promise<void> => {
  if (typeof window === 'undefined' || !('caches' in window)) return;

  try {
    const cache = await caches.open(CACHE_NAMES.NAV);
    for (const site of sites) {
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(site)}`;
      const existing = await cache.match(proxyUrl);
      if (!existing) {
        fetch(proxyUrl, { priority: 'low' })
          .then((res) => {
            if (res && res.status === 200) {
              cache.put(proxyUrl, res.clone());
            }
          })
          .catch(() => {});
      }
    }
  } catch {}
};

/**
 * Checks if a specific target URL exists in the Service Worker Cache
 */
export const checkIsUrlCached = async (targetUrl: string): Promise<boolean> => {
  if (typeof window === 'undefined' || !('caches' in window) || !targetUrl) return false;

  try {
    const proxyUrl = `/api/proxy?url=${encodeURIComponent(targetUrl)}`;
    const cache = await caches.open(CACHE_NAMES.NAV);
    const matched = await cache.match(proxyUrl);
    return Boolean(matched);
  } catch {
    return false;
  }
};

/**
 * Initializes all persistent cache strategies in idle periods
 */
export const initPersistentCacheStrategies = () => {
  if (typeof window === 'undefined') return;

  const runWarmup = async () => {
    await enablePersistentStorage();
    await purgeExpiredCaches();
    await cacheStaticAssets();
  };

  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(runWarmup);
  } else {
    setTimeout(runWarmup, 1500);
  }
};

/**
 * Registers the Service Worker and binds tracker block event listeners.
 * Returns a Promise<boolean> resolving once initial registration settles so startup UI can track readiness.
 */
export const registerServiceWorker = (): Promise<boolean> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (!settled) {
        settled = true;
        resolve(ok);
      }
    };

    const startRegistration = () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => {
          initPersistentCacheStrategies();
          finish(true);
        })
        .catch(() => {
          // Sandboxed dev or unsupported
          finish(false);
        });

      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'TRACKER_BLOCKED') {
          trackerListeners.forEach((fn) =>
            fn({
              url: event.data.url,
              savedBytes: event.data.estimatedSavedBytes || 12000,
            })
          );
        } else if (event.data?.type === 'TRACKERS_BLOCKED_BATCH') {
          const count = event.data.count || 1;
          const savedBytes = event.data.estimatedSavedBytes || count * 16500;
          trackerListeners.forEach((fn) =>
            fn({
              url: event.data.recentUrls?.[0] || 'blocked-tracker',
              savedBytes,
            })
          );
        }
      });
    };

    if (document.readyState === 'complete') {
      startRegistration();
    } else {
      window.addEventListener('load', startRegistration, { once: true });
    }

    // Safety ceiling so startup splash never blocks if browser delays load event
    setTimeout(() => finish(false), 750);
  });
};

export const onTrackerBlocked = (callback: TrackerCallback) => {
  trackerListeners.push(callback);
  return () => {
    trackerListeners = trackerListeners.filter((cb) => cb !== callback);
  };
};
