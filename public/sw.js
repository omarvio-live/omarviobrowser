/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OMARVIO BROWSER - Zero-Server In-Browser Proxy, Security & Navigation Cache Service Worker (v5)
 * Copyright (c) OMARVIO GLOBAL LTD.
 * Slogan: "My Phone, My Data – Why Surrender It To Others!"
 */

const SHELL_CACHE = 'omarvio-shell-v7';
const ASSET_CACHE = 'omarvio-asset-cache-v7';
const VENDOR_CACHE = 'omarvio-vendor-v7';
const STATIC_CACHE = 'omarvio-static-v7';
const NAV_CACHE = 'omarvio-nav-cache-v3';
const MAX_ASSET_CACHE_ENTRIES = 120;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/omarvio-logo-256.webp',
  '/assets/omarvio-icon-192.png'
];

// Blocklist of trackers, analytics, telemetry, and banner ad networks
const AD_TRACKER_DOMAINS_LIST = [
  'google-analytics.com',
  'googletagmanager.com',
  'doubleclick.net',
  'pagead2.googlesyndication.com',
  'googlesyndication.com',
  'googleadservices.com',
  'adservice.google.com',
  'connect.facebook.net',
  'analytics.facebook.com',
  'pixel.advertising.com',
  'criteo.com',
  'criteo.net',
  'adnxs.com',
  'hotjar.com',
  'taboola.com',
  'outbrain.com',
  'scorecardresearch.com',
  'quantserve.com',
  'branch.io',
  'appsflyer.com',
  'adjust.com',
  'amplitude.com',
  'mixpanel.com',
  'segment.io',
  'clarity.ms',
  'chartbeat.com',
  'mc.yandex.ru',
  'an.yandex.ru',
  'popads.net',
  'popcash.net',
  'exoclick.com',
  'adcash.com',
  'propellerads.com',
  'smartadserver.com',
  'zemanta.com',
  'pubmatic.com',
  'demdex.net',
  'krxd.net'
];

// O(1) Fast lookup Set
const AD_TRACKER_SET = new Set(AD_TRACKER_DOMAINS_LIST);

// Batching buffer for blocked tracker notifications (Module M5: flushes every 1.5s)
let blockedBatch = {
  count: 0,
  bytes: 0,
  urls: [],
};
let batchTimer = null;

function flushBlockedBatch() {
  if (blockedBatch.count === 0) return;
  const payload = {
    type: 'TRACKERS_BLOCKED_BATCH',
    count: blockedBatch.count,
    estimatedSavedBytes: blockedBatch.bytes,
    recentUrls: blockedBatch.urls.slice(-5),
  };
  blockedBatch = { count: 0, bytes: 0, urls: [] };
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => client.postMessage(payload));
  });
}

function queueBlockedTracker(url) {
  blockedBatch.count += 1;
  blockedBatch.bytes += 16500;
  if (blockedBatch.urls.length < 20) {
    blockedBatch.urls.push(url);
  }
  if (!batchTimer) {
    batchTimer = setTimeout(() => {
      batchTimer = null;
      flushBlockedBatch();
    }, 1500);
  }
}

/**
 * Prunes the cache to keep memory consumption low on user's device
 */
async function pruneCache(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
      const excess = keys.length - maxItems;
      for (let i = 0; i < excess; i++) {
        await cache.delete(keys[i]);
      }
    }
  } catch (err) {}
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Module M6: Enable Navigation Preload
      if (self.registration.navigationPreload) {
        try {
          await self.registration.navigationPreload.enable();
        } catch (e) {}
      }
      const validCaches = new Set([SHELL_CACHE, ASSET_CACHE, VENDOR_CACHE, STATIC_CACHE, NAV_CACHE]);
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (!validCaches.has(key)) {
            return caches.delete(key);
          }
        })
      );
    })()
  );
  self.clients.claim();
});

function isTrackerUrl(reqUrl) {
  try {
    const parsed = new URL(reqUrl);
    const host = parsed.hostname.toLowerCase();
    // Strict domain or subdomain matching prevents breaking legitimate site paths
    for (const d of AD_TRACKER_SET) {
      if (host === d || host.endsWith('.' + d)) return true;
    }
    if (host.endsWith('facebook.com') && parsed.pathname.startsWith('/tr')) return true;
    if (/(analytics\.js|gtag\/js|fbevents\.js)$/i.test(parsed.pathname)) return true;
  } catch {
    return false;
  }
  return false;
}

self.addEventListener('fetch', (event) => {
  const reqUrl = event.request.url;

  // Never serve stale SW cache for APK release metadata or crawler manifests
  if (reqUrl.includes('/apk-release.json') || reqUrl.includes('/api/apk-status') || reqUrl.endsWith('/robots.txt') || reqUrl.endsWith('/sitemap.xml')) {
    return;
  }

  // 1. Fast block check for ads, surveillance pixels, and trackers (zero false positives on genuine sites)
  if (isTrackerUrl(reqUrl)) {
    queueBlockedTracker(reqUrl);
    event.respondWith(new Response(null, { status: 204, statusText: 'Blocked By Omarvio Shield' }));
    return;
  }

  // 2. Media Stream Sniffer: detect running audio/video buffer chunks
  const isMediaStream = 
    reqUrl.includes('videoplayback') ||
    reqUrl.includes('.m4s') ||
    reqUrl.includes('.mp4') ||
    reqUrl.includes('.webm') ||
    reqUrl.includes('.ts') ||
    reqUrl.includes('audio/webm') ||
    reqUrl.includes('mime=audio') ||
    reqUrl.includes('mime=video');

  if (isMediaStream) {
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: 'MEDIA_BUFFER_DETECTED',
          url: reqUrl,
          isAudio: reqUrl.includes('audio') || reqUrl.includes('mime=audio')
        });
      });
    });
  }

  // 3. Main Navigation HTML Shell (Zero white flash)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        // Use navigation preload response if available
        try {
          const preloadRes = await event.preloadResponse;
          if (preloadRes) return preloadRes;
        } catch (e) {}

        const cache = await caches.open(SHELL_CACHE);
        const cached = (await cache.match('/index.html')) || (await cache.match('/'));
        const fetchPromise = fetch(event.request)
          .then((res) => {
            if (res && res.status === 200) {
              cache.put(event.request, res.clone());
            }
            return res;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })()
    );
    return;
  }

  // 4. Proxy requests: DO NOT cache third-party HTML!
  // Only cache static subresources (.css, .js, .png, .jpg, .woff2) with stale-while-revalidate
  if (reqUrl.includes('/api/proxy?url=')) {
    const isStaticSubresource = /\.(css|js|png|jpg|jpeg|webp|svg|woff2?|ttf|ico)($|\?)/i.test(reqUrl);

    if (isStaticSubresource) {
      event.respondWith(
        (async () => {
          const cache = await caches.open(ASSET_CACHE);
          const cachedRes = await cache.match(event.request);
          const fetchPromise = fetch(event.request)
            .then((networkRes) => {
              if (networkRes && networkRes.status === 200) {
                cache.put(event.request, networkRes.clone());
                pruneCache(ASSET_CACHE, MAX_ASSET_CACHE_ENTRIES);
              }
              return networkRes;
            })
            .catch(() => cachedRes);
          return cachedRes || fetchPromise;
        })()
      );
      return;
    }

    // For HTML and dynamic endpoints, fetch directly through network
    event.respondWith(fetch(event.request));
    return;
  }

  // 5. App Shell Static Assets (JS, CSS, images, icons, fonts)
  if (
    reqUrl.endsWith('.js') ||
    reqUrl.endsWith('.css') ||
    reqUrl.endsWith('.png') ||
    reqUrl.endsWith('.webp') ||
    reqUrl.endsWith('.jpg') ||
    reqUrl.endsWith('.svg') ||
    reqUrl.endsWith('.json')
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((res) => {
          if (res && res.status === 200) {
            const resClone = res.clone();
            caches.open(SHELL_CACHE).then((c) => c.put(event.request, resClone));
          }
          return res;
        });
      })
    );
    return;
  }

  // Default network fetch with cache fallback
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// Message listener from client
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'PANIC_WIPE') {
    caches.keys().then((keys) => {
      return Promise.all(keys.map((k) => caches.delete(k)));
    }).then(() => {
      if (event.source) {
        event.source.postMessage({ type: 'PANIC_WIPE_COMPLETE' });
      }
    });
  }

  // Pre-warm popular DNS entries & TLS socket handshakes in background
  if (event.data.type === 'PREWARM_DNS_ENTRIES') {
    const domains = event.data.domains || [];
    domains.forEach((d) => {
      try {
        fetch(d, { mode: 'no-cors', cache: 'no-store' }).catch(() => {});
      } catch (err) {}
    });
  }

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
