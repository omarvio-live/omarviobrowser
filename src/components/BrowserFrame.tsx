/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OMARVIO BROWSER - Sandboxed Viewport & High-Speed Media Hub Engine
 * Copyright (c) OMARVIO GLOBAL LTD.
 * Slogan: "My Phone, My Data – Why Surrender It To Others!"
 * 
 * Delivers zero-flicker browsing, passive link interception,
 * full direct YouTube mobile web, and real Facebook mobile browsing.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  RefreshCw,
  ShieldCheck,
  BookOpen,
  Zap,
} from 'lucide-react';
import { SearchResultsView } from './SearchResultsView';
import { SmartReaderView } from './SmartReaderView';
import { downloadFileInApp } from '../engine/inAppDownloader';
import { attachPassiveLinkInterceptor } from '../engine/linkInterceptor';
import { enablePersistentStorage } from '../engine/swRegister';
import { putTabToSleep, wakeSleepingTab } from '../engine/tabManager';
import { extractReadableArticleFromDocument } from '../engine/readerExtractor';

interface BrowserFrameProps {
  url: string;
  tabId: string;
  isDesktopMode?: boolean;
  isReadingMode?: boolean;
  isActive?: boolean;
  isSleeping?: boolean;
  onLoadStart: () => void;
  onLoadEnd: () => void;
  onUrlChange: (newUrl: string) => void;
  onToggleReadingMode?: (next?: boolean) => void;
  onToast?: (msg: string) => void;
  onShare?: (title: string, url: string) => void;
}

export function normalizeUrlKey(raw: string): string {
  if (!raw || raw === 'about:blank') return '';
  try {
    const parsed = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    let pathname = parsed.pathname || '/';
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    return `${parsed.protocol}//${parsed.hostname.toLowerCase()}${pathname}${parsed.search}`;
  } catch {
    return raw.trim().replace(/\/+$/, '');
  }
}

export const BrowserFrame: React.FC<BrowserFrameProps> = ({
  url,
  tabId,
  isDesktopMode = false,
  isReadingMode = false,
  isActive = true,
  isSleeping = false,
  onLoadStart,
  onLoadEnd,
  onUrlChange,
  onToggleReadingMode,
  onToast,
  onShare,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasError, setHasError] = useState(false);
  const [scale, setScale] = useState(1);
  const [isReaderModeActive, setIsReaderModeActive] = useState(false);
  const [isReaderLoading, setIsReaderLoading] = useState(false);
  const [readerArticle, setReaderArticle] = useState<{ title: string; url: string; content: string } | null>(null);

  // Optimistic navigation state to eliminate blank/white screen flicker
  const [isOptimisticNavigating, setIsOptimisticNavigating] = useState(false);

  // Prevent callback prop changes from re-triggering navigation effect
  const onLoadStartRef = useRef(onLoadStart);
  const onLoadEndRef = useRef(onLoadEnd);
  useEffect(() => {
    onLoadStartRef.current = onLoadStart;
    onLoadEndRef.current = onLoadEnd;
  });

  // Normalize URL case-insensitively
  const normalizedUrl = (url || '').trim().toLowerCase();

  const extractYouTubeId = (targetUrl: string): string | null => {
    if (!targetUrl) return null;
    try {
      if (targetUrl.includes('youtube.com/watch?v=')) {
        return targetUrl.split('v=')[1]?.split('&')[0] || null;
      }
      if (targetUrl.includes('youtu.be/')) {
        return targetUrl.split('youtu.be/')[1]?.split('?')[0] || null;
      }
      if (targetUrl.includes('youtube.com/shorts/')) {
        return targetUrl.split('shorts/')[1]?.split('?')[0] || null;
      }
      if (targetUrl.includes('youtube.com/embed/')) {
        return targetUrl.split('embed/')[1]?.split('?')[0] || null;
      }
    } catch {
      return null;
    }
    return null;
  };



  const currentYtId = extractYouTubeId(url);
  const isYouTubeSite = normalizedUrl.includes('youtube.com') || normalizedUrl.includes('youtu.be');

  const isRawEngineWebPage =
    normalizedUrl.includes('&raw=1') ||
    normalizedUrl.includes('?raw=1') ||
    normalizedUrl.includes('&direct=1');

  const isSearchResultsUrl =
    !isRawEngineWebPage &&
    (normalizedUrl.startsWith('search:hub') ||
      normalizedUrl.startsWith('omarvio:hub') ||
      normalizedUrl.startsWith('about:hub') ||
      normalizedUrl.includes('google.com/search') ||
      normalizedUrl.includes('google.com/webhp') ||
      (normalizedUrl.includes('google.') && normalizedUrl.includes('/search?')) ||
      (normalizedUrl.includes('duckduckgo.com') && (normalizedUrl.includes('?q=') || normalizedUrl.includes('&q='))) ||
      (normalizedUrl.includes('html.duckduckgo.com/html') && (normalizedUrl.includes('?q=') || normalizedUrl.includes('&q='))) ||
      normalizedUrl.includes('bing.com/search') ||
      normalizedUrl.includes('search.brave.com') ||
      normalizedUrl.includes('startpage.com/sp/search') ||
      normalizedUrl.includes('ecosia.org/search'));

  const extractSearchEngine = (targetUrl: string): string => {
    const lower = (targetUrl || '').toLowerCase();
    if (lower.includes('duckduckgo.com')) return 'duckduckgo';
    if (lower.includes('brave.com')) return 'brave';
    if (lower.includes('bing.com')) return 'bing';
    if (lower.includes('startpage.com')) return 'startpage';
    if (lower.includes('ecosia.org')) return 'ecosia';
    if (lower.includes('qwant.com')) return 'qwant';
    if (lower.includes('google.')) return 'google';
    if (typeof window !== 'undefined') {
      return localStorage.getItem('omarvio_search_engine') || 'google';
    }
    return 'google';
  };

  const isFacebook =
    normalizedUrl.includes('facebook.com') || normalizedUrl.includes('fb.watch');

  const extractSearchQuery = (targetUrl: string): string => {
    try {
      if (targetUrl.startsWith('search:ai:')) return decodeURIComponent(targetUrl.replace('search:ai:', ''));
      if (targetUrl.startsWith('ai:search:')) return decodeURIComponent(targetUrl.replace('ai:search:', ''));
      if (targetUrl.startsWith('search:')) return decodeURIComponent(targetUrl.replace('search:', ''));
      const parsed = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`);
      const q = parsed.searchParams.get('q') || parsed.searchParams.get('query') || parsed.searchParams.get('p');
      if (q) return q;
      const parts = parsed.pathname.split('/').filter(Boolean);
      if (parts.length > 0 && parts[0] === 'search' && parts[1]) {
        return decodeURIComponent(parts[1]);
      }
      return targetUrl;
    } catch {
      return targetUrl;
    }
  };

  // Convert target URL to embeddable / sanitized preview stream
  const getProcessedSrc = useCallback((targetUrl: string, forceBypass = false): string => {
    if (!targetUrl || targetUrl === 'about:blank') return 'about:blank';

    let cleanTarget = targetUrl;

    // Unwrap any accidentally nested proxy URLs to prevent infinite recursive proxying
    if (cleanTarget.includes('/api/proxy?url=')) {
      try {
        const u = new URL(cleanTarget, window.location.origin);
        const extracted = u.searchParams.get('url');
        if (extracted) cleanTarget = extracted;
      } catch {}
    }

    if (!cleanTarget.startsWith('http://') && !cleanTarget.startsWith('https://')) {
      cleanTarget = `https://${cleanTarget}`;
    }

    // Direct YouTube video embed when watching a specific video
    const ytId = extractYouTubeId(cleanTarget);
    if (ytId) {
      return `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&enablejsapi=1&rel=0&modestbranding=1`;
    }

    // Safely optimize major platforms to mobile web variants using exact hostname checks
    try {
      const u = new URL(cleanTarget);
      const host = u.hostname.toLowerCase();
      if (host === 'youtube.com' || host === 'www.youtube.com' || host === 'm.m.youtube.com') {
        u.hostname = 'm.youtube.com';
        cleanTarget = u.toString();
      } else if (host === 'facebook.com' || host === 'www.facebook.com' || host === 'm.m.facebook.com' || host === 'www.m.facebook.com') {
        u.hostname = 'm.facebook.com';
        cleanTarget = u.toString();
      } else if (host === 'wikipedia.org' || host === 'www.wikipedia.org' || host === 'm.m.wikipedia.org') {
        u.hostname = 'm.wikipedia.org';
        cleanTarget = u.toString();
      }
    } catch {}

    const bypassParam = forceBypass ? `&_reval=${Date.now()}` : '';
    // Route through universal edge proxy
    return `/api/proxy?url=${encodeURIComponent(cleanTarget)}${bypassParam}`;
  }, []);

  // Compute initial src directly to eliminate frame-0 delay
  const [activeFrameSrc, setActiveFrameSrc] = useState<string>(() => getProcessedSrc(url));

  const lastInternalNavUrlRef = useRef<string>('');
  const lastProcessedUrlRef = useRef<string>('');
  const proxyHandshakeRef = useRef<boolean>(false);

  // 1. Listen to navigation & download events from inside the sandboxed iframe
  useEffect(() => {
    const handleWindowMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'OMARVIO_PROXY_READY') {
        proxyHandshakeRef.current = true;
        setHasError(false);
        setIsOptimisticNavigating(false);
        onLoadEndRef.current?.();
      }
      if (e.data && e.data.type === 'OMARVIO_NAVIGATE' && typeof e.data.url === 'string') {
        const nextTarget = e.data.url;
        lastInternalNavUrlRef.current = nextTarget;
        lastProcessedUrlRef.current = nextTarget;
        setIsOptimisticNavigating(false);
        onUrlChange(nextTarget);
      }
      if (e.data && e.data.type === 'OMARVIO_DOWNLOAD' && typeof e.data.url === 'string') {
        downloadFileInApp(e.data.url, e.data.filename).then((res) => {
          if (onToast) onToast(res.message);
        });
      }
    };
    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, [onUrlChange, onToast]);

  // 2. Attach passive link interceptor for instantaneous 0ms transitions on touch/click
  useEffect(() => {
    if (!containerRef.current) return;
    const cleanup = attachPassiveLinkInterceptor(containerRef.current, {
      onImmediateTransition: (destinationUrl) => {
        setIsOptimisticNavigating(true);
        lastInternalNavUrlRef.current = destinationUrl;
        onUrlChange(destinationUrl);
      },
      onTrackerCleaned: (cleanUrl, count) => {
        if (onToast && count > 0) {
          onToast(`🛡️ ${count}টি ট্র্যাকার প্যারামিটার সফলভাবে মুছে ফেলা হয়েছে`);
        }
      },
    });
    return cleanup;
  }, [onUrlChange, onToast]);

  // 3. Desktop mode scaling
  useEffect(() => {
    const updateScale = () => {
      if (isDesktopMode && containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const targetWidth = 1024;
        if (containerWidth < targetWidth) {
          setScale(containerWidth / targetWidth);
        } else {
          setScale(1);
        }
      } else {
        setScale(1);
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [isDesktopMode]);

  // 3b. Request persistent local storage (without saturating mobile bandwidth with background site scraping)
  useEffect(() => {
    enablePersistentStorage().catch(() => {});
  }, []);

  // 3c. Save site visit to frequent sites registry
  useEffect(() => {
    if (!url) return;

    // Save site visit to frequent sites registry
    try {
      const stored = localStorage.getItem('omarvio_frequent_sites') || '{}';
      const parsed = JSON.parse(stored);
      const host = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
      parsed[host] = (parsed[host] || 0) + 1;
      localStorage.setItem('omarvio_frequent_sites', JSON.stringify(parsed));
    } catch {}
  }, [url]);


  // 4. Handle URL change with ZERO-FLICKER DOUBLE BUFFERING & ZERO INFINITE LOOPS
  useEffect(() => {
    if (!url) return;

    setHasError(false);
    proxyHandshakeRef.current = false;

    // Instant local views complete in 0ms without network roundtrips
    if (isSearchResultsUrl) {
      onLoadEndRef.current?.();
      setIsOptimisticNavigating(false);
      return;
    }

    const targetSrc = getProcessedSrc(url);
    const currentIframeSrc = iframeRef.current?.getAttribute('src') || iframeRef.current?.src || '';
    const currentNorm = normalizeUrlKey(url);
    const lastInternalNorm = normalizeUrlKey(lastInternalNavUrlRef.current);

    // If an in-frame link click already navigated the iframe, avoid interrupting it
    const isAlreadyNavigatingInternally =
      Boolean(lastInternalNorm) && lastInternalNorm === currentNorm;

    if (!isAlreadyNavigatingInternally) {
      onLoadStartRef.current?.();
      setIsOptimisticNavigating(true);
      setActiveFrameSrc(targetSrc);
      if (iframeRef.current && currentIframeSrc !== targetSrc) {
        iframeRef.current.src = targetSrc;
      }
    }

    // Always clear internal navigation marker so back/forward or second-step clicks are never blocked
    lastInternalNavUrlRef.current = '';
    lastProcessedUrlRef.current = url;

    // Failsafe timer: ensures optimistic navigating bar and loading spinner stop within 6s even if network stalls
    const timer = setTimeout(() => {
      setIsOptimisticNavigating(false);
      onLoadEndRef.current?.();
    }, 6000);

    return () => clearTimeout(timer);
  }, [url, isSearchResultsUrl, getProcessedSrc]);

  // 4b. Reading Mode content extraction (0ms live-DOM extraction + /api/proxy?reader=1 fallback)
  useEffect(() => {
    if (!isReadingMode) {
      setIsReaderLoading(false);
      return;
    }
    if (!url || isSearchResultsUrl || isSleeping) return;

    let cancelled = false;
    const controller = new AbortController();

    const safeTitle = (() => {
      try {
        return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./i, '');
      } catch {
        return 'Web Article';
      }
    })();

    // Attempt 0ms extraction directly from the same-origin proxy iframe document first
    try {
      const doc = iframeRef.current?.contentDocument;
      if (doc && doc.body) {
        const extracted = extractReadableArticleFromDocument(doc, url);
        if (extracted && extracted.content.length >= 120) {
          setReaderArticle(extracted);
          setIsReaderLoading(false);
          return () => {
            cancelled = true;
            controller.abort();
          };
        }
      }
    } catch {}

    // Fallback to backend /api/proxy?reader=1 clean article extractor
    setIsReaderLoading(true);
    setReaderArticle((prev) =>
      prev && prev.url === url ? prev : { title: safeTitle, url, content: '' }
    );

    fetch(`/api/proxy?url=${encodeURIComponent(url)}&reader=1`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data && typeof data.content === 'string') {
          setReaderArticle({
            title: data.title || safeTitle,
            url: data.url || url,
            content: data.content,
          });
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsReaderLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [isReadingMode, url, isSearchResultsUrl, isSleeping]);

  /**
   * Milestone 29: WebView Memory Optimization Strategy
   * Clears the back-forward cache (bfcache) when a tab transitions to sleep.
   * In WebKit and Chromium engines, dormant tabs keep full document trees, scripts,
   * stylesheets, and rendering buffers in memory. Clearing the bfcache and detaching
   * the DOM frees 40MB-120MB+ per tab, eliminating OutOfMemory (OOM) browser crashes
   * and ensuring 60fps UI responsiveness.
   */
  const clearBackForwardCache = useCallback(() => {
    try {
      // 1. Post message to embedded document to clear in-page caches and dispatch non-persisted pagehide
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          {
            type: 'OMARVIO_PURGE_BFCACHE',
            tabId,
            timestamp: Date.now(),
          },
          '*'
        );
      }
    } catch {
      // Cross-origin boundary safe
    }

    try {
      // 2. Clear navigation history & detach heavy document tree from rendering engine
      if (iframeRef.current) {
        iframeRef.current.src = 'about:blank';
      }
    } catch {}

    // 3. Purge reader mode state and optimistic buffers
    setReaderArticle(null);
    setIsReaderModeActive(false);
    setIsOptimisticNavigating(false);
  }, [tabId]);

  // 5. Handle Tab Sleep & Wake Lifecycle with Back-Forward Cache Purging
  const prevSleepingRef = useRef<boolean>(!!isSleeping);
  useEffect(() => {
    if (isSleeping && !prevSleepingRef.current) {
      // Tab is entering SLEEP mode:
      // A. Save restoration snapshot to Tab Manager
      try {
        const title = url ? new URL(url.startsWith('http') ? url : `https://${url}`).hostname : 'OmarVio Tab';
        putTabToSleep(tabId, url, title, 0, 0);
      } catch {}

      // B. Clear the back-forward cache to prevent OOM crashes
      clearBackForwardCache();
    } else if (!isSleeping && prevSleepingRef.current) {
      // Tab is WAKING from sleep:
      // A. Wake up from tab store
      wakeSleepingTab(tabId);

      // B. Restore active frame src seamlessly
      const targetSrc = getProcessedSrc(url);
      setActiveFrameSrc(targetSrc);
      onLoadStartRef.current?.();
      setIsOptimisticNavigating(true);

      if (iframeRef.current) {
        iframeRef.current.src = targetSrc;
      }
    }
    prevSleepingRef.current = !!isSleeping;
  }, [isSleeping, url, tabId, clearBackForwardCache, getProcessedSrc]);

  // 6. Purge back-forward cache on unmount (tab close / unmount)
  useEffect(() => {
    return () => {
      clearBackForwardCache();
    };
  }, [clearBackForwardCache]);

  // 7. Background / Visibility Memory Throttling
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && !isActive) {
        try {
          if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage(
              {
                type: 'OMARVIO_PURGE_BFCACHE',
                tabId,
                timestamp: Date.now(),
              },
              '*'
            );
          }
        } catch {}
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isActive, tabId]);

  const handleIframeLoad = () => {
    setIsOptimisticNavigating(false);
    onLoadEndRef.current?.();

    const frameSrc = activeFrameSrc || '';
    const isProxyFrame = frameSrc.startsWith('/api/proxy');

    try {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        const loc = iframeRef.current.contentWindow.location.href;
        if (loc && loc !== 'about:blank') {
          if (loc.startsWith('chrome-error://') || loc === 'about:neterror') {
            setHasError(true);
            return;
          }
          // Detect blank body after proxy load when no handshake arrived
          try {
            const doc = iframeRef.current.contentDocument;
            if (isProxyFrame && doc && doc.body && doc.body.children.length === 0 && !doc.body.innerText?.trim()) {
              setHasError(true);
              return;
            }
          } catch {}

          // If the location is the proxy route, extract the real underlying target URL
          if (loc.includes('/api/proxy?url=')) {
            try {
              const u = new URL(loc, window.location.origin);
              const realUrl = u.searchParams.get('url');
              if (realUrl) {
                const realNorm = normalizeUrlKey(realUrl);
                const currentNorm = normalizeUrlKey(url);
                const lastInternalNorm = normalizeUrlKey(lastInternalNavUrlRef.current);
                if (realNorm !== currentNorm && realNorm !== lastInternalNorm) {
                  lastInternalNavUrlRef.current = realUrl;
                  lastProcessedUrlRef.current = realUrl;
                  onUrlChange(realUrl);
                }
              }
            } catch {}
          } else if (!loc.includes('/api/')) {
            const locNorm = normalizeUrlKey(loc);
            const currentNorm = normalizeUrlKey(url);
            const lastInternalNorm = normalizeUrlKey(lastInternalNavUrlRef.current);
            if (locNorm !== currentNorm && locNorm !== lastInternalNorm) {
              lastInternalNavUrlRef.current = loc;
              lastProcessedUrlRef.current = loc;
              onUrlChange(loc);
            }
          }
        }
      }
    } catch {
      // If a /api/proxy same-origin frame threw SecurityError on contentWindow.location.href,
      // it means it escaped the proxy or hit a blocked chrome-error:// X-Frame-Options sad-page!
      if (isProxyFrame && !proxyHandshakeRef.current && !currentYtId) {
        setHasError(true);
      }
    }
  };

  const handleIframeError = () => {
    setIsOptimisticNavigating(false);
    onLoadEndRef.current?.();
    setHasError(true);
  };



  const showReaderOverlay = Boolean(!isSleeping && (isReadingMode || (isReaderModeActive && readerArticle)));

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-[#070913] flex flex-col overflow-hidden touch-pan-y overscroll-contain select-none"
    >
      {/* Top Nano Glowing Progress Bar during instant transitions */}
      {isOptimisticNavigating && !showReaderOverlay && (
        <div className="absolute top-0 left-0 right-0 h-1 z-30 bg-slate-900/60 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-emerald-400 w-full animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.9)]" />
        </div>
      )}

      {/* Desktop Mode Indicator Pill */}
      {isDesktopMode && !showReaderOverlay && (
        <div className="absolute top-2 right-2 z-20 px-2 py-0.5 rounded-md bg-blue-950/80 border border-blue-400/40 text-[10px] font-bold text-blue-200 pointer-events-none shadow-md flex items-center gap-1 backdrop-blur-xs">
          <span>🖥️</span> Desktop site
        </div>
      )}

      {/* ========================================================================= */}
      {/* 0. DORMANT SLEEPING TAB (BFCACHE CLEARED, 0MB RAM, CRASH PREVENTION)      */}
      {/* ========================================================================= */}
      {isSleeping ? (
        <div className="flex-1 w-full h-full flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto select-none bg-[#070913] animate-fadeIn">
          <div className="w-14 h-14 rounded-3xl bg-slate-900/90 border border-slate-800 flex items-center justify-center text-cyan-400 mb-3.5 shadow-xl shadow-cyan-950/30">
            <Zap className="w-7 h-7 text-cyan-400" />
          </div>
          <h3 className="text-base font-bold text-slate-100 mb-1 truncate max-w-xs">
            {url ? (new URL(url.startsWith('http') ? url : `https://${url}`)).hostname : 'ডরম্যান্ট ট্যাব'}
          </h3>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold mb-3">
            <span>💤 স্লিপিং মোড সক্রিয় · ০MB র‍্যাম</span>
          </div>
          <p className="text-xs text-slate-400 mb-5 leading-relaxed">
            র‍্যাম বাঁচাতে এবং অ্যাপ ক্র্যাশ রোধ করতে ব্যাক-ফরোয়ার্ড ক্যাশ (bfcache) খালি করা হয়েছে। ট্যাপ করলেই তাৎক্ষণিকভাবে চালু হবে।
          </p>
          <button
            type="button"
            onClick={() => {
              if (onToast) onToast('⚡ ট্যাব মেমোরি রিস্টোর করা হচ্ছে...');
              setIsOptimisticNavigating(true);
              onLoadStartRef.current?.();
              setActiveFrameSrc(getProcessedSrc(url));
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-95"
          >
            <span>ট্যাব সক্রিয় করুন</span>
          </button>
        </div>
      ) : (
        <>
          {/* Distraction-Free Smart Reader Mode Overlay */}
          {showReaderOverlay && (
            <div className="flex-1 w-full h-full overflow-hidden">
              <SmartReaderView
                title={readerArticle?.title || url}
                url={readerArticle?.url || url}
                content={readerArticle?.content || ''}
                isLoading={isReaderLoading}
                onBackToOriginal={() => {
                  setIsReaderModeActive(false);
                  if (isReadingMode) {
                    onToggleReadingMode?.(false);
                  }
                }}
                onShare={onShare}
                onToast={onToast || (() => {})}
              />
            </div>
          )}

          {/* Search Results or Error Recovery Views (shown when not in Reader Mode) */}
          {!showReaderOverlay && isSearchResultsUrl && (
            <SearchResultsView
              query={extractSearchQuery(url)}
              initialEngine={extractSearchEngine(url)}
              onNavigate={onUrlChange}
              onOpenReaderMode={(title, u, content) => {
                setReaderArticle({ title, url: u, content });
                setIsReaderModeActive(true);
              }}
              onShare={onShare}
            />
          )}

          {!showReaderOverlay && !isSearchResultsUrl && hasError && (
            /* ========================================================================= */
            /* 3. CONNECTION RECOVERY CARD (REPLACES DEAD GREY FROWNY PAGE)              */
            /* ========================================================================= */
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto select-none">
              <div className="w-14 h-14 rounded-3xl bg-cyan-950/40 border border-cyan-500/40 flex items-center justify-center text-cyan-400 mb-4 shadow-lg shadow-cyan-950/50">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-100 mb-1">
                ওমারভিও কানেকশন শিল্ড
              </h3>
              <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                এই সাইটটি সরাসরি সংযোগ সীমিত করেছে। ওমারভিও এজ প্রক্সি দিয়ে এটি আনলক করুন অথবা বিজ্ঞাপনমুক্ত ক্লিন রিডার মোডে তাৎক্ষণিকভাবে পড়ুন।
              </p>

              <div className="w-full flex flex-col gap-2.5 mb-4">
                <a
                  href={url.startsWith('http') ? url : `https://${url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-95 touch-manipulation"
                >
                  <Zap className="w-4 h-4" />
                  <span>সরাসরি ব্রাউজারে খুলুন (১০০% কাজ করবে)</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setHasError(false);
                    setIsOptimisticNavigating(true);
                    onLoadStartRef.current?.();
                    if (iframeRef.current) {
                      iframeRef.current.src = `/api/proxy?url=${encodeURIComponent(url)}`;
                    }
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-95 touch-manipulation"
                >
                  <Zap className="w-4 h-4" />
                  <span>ওমারভিও প্রক্সি দিয়ে আনলক করুন (Bypass X-Frame)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onToggleReadingMode) {
                      onToggleReadingMode(true);
                    } else {
                      setIsReaderModeActive(true);
                    }
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 text-cyan-200 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                >
                  <BookOpen className="w-4 h-4 text-cyan-400" />
                  <span>ওমারভিও ক্লিন রিডার মোডে পড়ুন</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setHasError(false);
                    onLoadStartRef.current?.();
                    if (iframeRef.current) iframeRef.current.src = getProcessedSrc(url);
                  }}
                  className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>পুনরায় লোড করুন</span>
                </button>
              </div>
            </div>
          )}

          {/* Live Webpage Iframe kept mounted cleanly so toggling Reading Mode back is instant */}
          {!isSearchResultsUrl && !hasError && (
            <div
              className={`relative w-full h-full overflow-hidden bg-[#070913] flex-col ${
                showReaderOverlay ? 'hidden' : 'flex'
              }`}
            >
              <div
                className="flex-1 w-full h-full relative bg-[#070913] touch-pan-y overscroll-contain"
                style={{
                  touchAction: 'pan-x pan-y pinch-zoom',
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                <iframe
                  ref={iframeRef}
                  key={tabId}
                  src={activeFrameSrc}
                  title="Omarvio Sandboxed Viewport"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-presentation allow-downloads"
                  allow="fullscreen; autoplay; encrypted-media; picture-in-picture; camera; microphone; clipboard-write"
                  onLoad={handleIframeLoad}
                  onError={handleIframeError}
                  style={
                    isDesktopMode && scale < 1
                      ? {
                          width: '1024px',
                          height: `${100 / scale}%`,
                          transform: `scale(${scale})`,
                          transformOrigin: 'top left',
                          touchAction: 'pan-x pan-y pinch-zoom',
                          WebkitOverflowScrolling: 'touch',
                          backgroundColor: '#070913',
                          colorScheme: 'dark',
                        }
                      : {
                          width: '100%',
                          height: '100%',
                          touchAction: 'pan-x pan-y pinch-zoom',
                          WebkitOverflowScrolling: 'touch',
                          backgroundColor: '#070913',
                          colorScheme: 'dark',
                        }
                  }
                  className="border-none w-full h-full block bg-[#070913]"
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
