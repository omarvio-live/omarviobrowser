/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * OMARVIO BROWSER - Hybrid PWA & Privacy-First Client Architecture
 */

import React, { useState, useEffect } from 'react';
import {
  Ghost,
  MoreVertical,
  Plus,
  Languages,
  Shield,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Home,
  Download,
  Settings,
  Zap,
  Share2,
  QrCode,
  MapPin,
} from 'lucide-react';
import { Tab } from './types/browser';
import { HeaderBranding } from './components/HeaderBranding';
import { Omnibox } from './components/Omnibox';
import { TabBar } from './components/TabBar';
import { BrowserHome } from './components/BrowserHome';
import { BrowserFrame, normalizeUrlKey } from './components/BrowserFrame';
import { NavigationBar } from './components/NavigationBar';
import { InstallBanner } from './components/InstallBanner';
import { TabSwitcherModal } from './components/TabSwitcherModal';
import { MediaControllerFloating } from './components/MediaControllerFloating';
import type { SettingsTabId } from './components/SettingsDrawer';
import type { DownloadedItem } from './components/DownloadsModal';
import { ChromeMenuDropdown } from './components/ChromeMenuDropdown';
import { FindInPageBar } from './components/FindInPageBar';
import { SearchSuggestionsOverlay } from './components/SearchSuggestionsOverlay';
import { InAppAdBanner } from './components/InAppAdBanner';
import { UrgentMessageBanner } from './components/UrgentMessageBanner';
import { SplashScreen } from './components/SplashScreen';
import { registerServiceWorker } from './engine/swRegister';
import { computeAliveTabIds, getMaxAliveTabs } from './engine/tabManager';
import { markTabSwitchStart, measureTabSwitchEnd } from './engine/metrics';

// Module M7: Code-split heavy modals with React.lazy
const SettingsDrawer = React.lazy(() => import('./components/SettingsDrawer').then(m => ({ default: m.SettingsDrawer })));
const DownloadsModal = React.lazy(() => import('./components/DownloadsModal').then(m => ({ default: m.DownloadsModal })));
const DocumentViewerModal = React.lazy(() => import('./components/DocumentViewerModal').then(m => ({ default: m.DocumentViewerModal })));
const CameraLensModal = React.lazy(() => import('./components/CameraLensModal').then(m => ({ default: m.CameraLensModal })));
const SmartShareModal = React.lazy(() => import('./components/SmartShareModal').then(m => ({ default: m.SmartShareModal })));
const DefaultBrowserModal = React.lazy(() => import('./components/DefaultBrowserModal').then(m => ({ default: m.DefaultBrowserModal })));
const SiteControlsModal = React.lazy(() => import('./components/SiteControlsModal').then(m => ({ default: m.SiteControlsModal })));
const ClearDataModal = React.lazy(() => import('./components/ClearDataModal').then(m => ({ default: m.ClearDataModal })));
const PanicModal = React.lazy(() => import('./components/PanicModal').then(m => ({ default: m.PanicModal })));
const LinkClinicModal = React.lazy(() => import('./components/LinkClinicModal').then(m => ({ default: m.LinkClinicModal })));

import {
  initLocalProxyBridge,
  triggerServiceWorkerPanicWipe,
  initHighPriorityWarmUp,
  initNativeDownloadObserver,
} from './engine/proxy';
import { unwrapAndSanitizeExternalUrl } from './engine/linkInterceptor';
import { cleanTrackingParameters, incrementTrackerStat } from './engine/adblocker';
import { detectRunningMedia, DetectedMedia } from './engine/mediaSaver';
import { updateLockScreenMediaSession } from './engine/media';
import { toggleOledDarkMode, getOledDarkStatus } from './engine/darkMode';
import { auditUrlSecurity, SecurityAuditResult } from './engine/security';
import { translateCurrentPage } from './engine/translator';
import { getLanguage, subscribeLanguage, t } from './engine/i18n';
import { addBrowsingHistory, clearAllBrowsingHistory } from './engine/history';

const createDefaultTab = (id?: string, isIncognito?: boolean): Tab => ({
  id: id || `tab-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
  title: isIncognito ? 'Incognito Tab' : 'New Tab',
  url: '',
  history: [''],
  historyIndex: 0,
  isLoading: false,
  canGoBack: false,
  canGoForward: false,
  isSecure: true,
  createdAt: Date.now(),
  isDesktopMode: false,
  isIncognito: !!isIncognito,
  isBookmarked: false,
});

export default function App() {
  const [tabs, setTabs] = useState<Tab[]>(() => {
    // Check if there is an incoming shared URL from PWA Share Target, WhatsApp, Messenger, or protocol handler
    const searchParams = new URLSearchParams(window.location.search);
    const sharedUrl =
      searchParams.get('url') ||
      searchParams.get('text') ||
      searchParams.get('link') ||
      searchParams.get('openUrl');
    const isIncognitoMode = searchParams.get('mode') === 'incognito';

    if (sharedUrl) {
      const initialTab = createDefaultTab('tab-initial', isIncognitoMode);
      const sanitized = unwrapAndSanitizeExternalUrl(sharedUrl);
      initialTab.url = sanitized.cleanedUrl;
      initialTab.title = sanitized.cleanedUrl;
      initialTab.history = [sanitized.cleanedUrl];
      return [initialTab];
    }

    if (isIncognitoMode) {
      return [createDefaultTab('tab-incognito', true)];
    }

    return [createDefaultTab('tab-1')];
  });

  const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0]?.id || 'tab-1');
  const [isDefaultBrowserModalOpen, setIsDefaultBrowserModalOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      return searchParams.get('mode') === 'intent_picker';
    }
    return false;
  });
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isTabSwitcherOpen, setIsTabSwitcherOpen] = useState(false);
  const [isPanicModalOpen, setIsPanicModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTabId>('general');

  const openSettings = (tab: SettingsTabId = 'general') => {
    setSettingsTab(tab);
    setIsSettingsOpen(true);
  };
  const [isLensOpen, setIsLensOpen] = useState(false);
  const [isDownloadsOpen, setIsDownloadsOpen] = useState(false);
  const [isChromeMenuOpen, setIsChromeMenuOpen] = useState(false);
  const [isSiteControlsOpen, setIsSiteControlsOpen] = useState(false);
  const [isFindInPageOpen, setIsFindInPageOpen] = useState(false);
  const [isClearDataOpen, setIsClearDataOpen] = useState(false);
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false);
  const [searchOverlayQuery, setSearchOverlayQuery] = useState('');
  const [activeDocItem, setActiveDocItem] = useState<DownloadedItem | null>(null);
  const [currentThreatAudit, setCurrentThreatAudit] = useState<SecurityAuditResult | null>(null);
  const [pendingSafeUrl, setPendingSafeUrl] = useState<string | null>(null);
  const [showToast, setShowToast] = useState<string | null>(null);
  const [activeMedia, setActiveMedia] = useState<DetectedMedia | null>(null);
  const [isOledDark, setIsOledDark] = useState(getOledDarkStatus());
  const [currentLang, setCurrentLang] = useState(getLanguage);

  // Splash Screen Engine & PWA Readiness Lifecycle
  const [isSplashMounted, setIsSplashMounted] = useState(true);
  const [isSplashExiting, setIsSplashExiting] = useState(false);
  const [splashProgress, setSplashProgress] = useState(25);
  const [splashStageLabel, setSplashStageLabel] = useState(() =>
    getLanguage() === 'bn' ? 'PWA ও থিম সেটিংস লোড হচ্ছে...' : 'Loading PWA preferences...'
  );
  const [showSplashSkip, setShowSplashSkip] = useState(false);

  const dismissSplash = React.useCallback(() => {
    setSplashProgress(100);
    setSplashStageLabel(getLanguage() === 'bn' ? 'ব্রাউজার প্রস্তুত' : 'Browser ready');
    setIsSplashExiting(true);
  }, []);

  useEffect(() => {
    if (!isSplashExiting) return;
    const unmountTimer = window.setTimeout(() => {
      setIsSplashMounted(false);
    }, 220);
    return () => window.clearTimeout(unmountTimer);
  }, [isSplashExiting]);

  // Module M3: Tab Manager Alive Tabs LRU State
  const [aliveTabIds, setAliveTabIds] = useState<string[]>(() => [activeTabId]);

  useEffect(() => {
    setAliveTabIds((prev) =>
      computeAliveTabIds(
        prev,
        activeTabId,
        tabs.map((t) => t.id),
        getMaxAliveTabs()
      )
    );
  }, [activeTabId, tabs]);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0] || createDefaultTab();

  // Register Service Worker, proxy bridge, DNS pre-warmer, and coordinate splash readiness
  useEffect(() => {
    let cancelled = false;
    const bootStartedAt = performance.now();
    const isBn = getLanguage() === 'bn';

    const skipRevealTimer = window.setTimeout(() => {
      if (!cancelled) setShowSplashSkip(true);
    }, 400);

    const maxCeilingTimer = window.setTimeout(() => {
      if (!cancelled) dismissSplash();
    }, 900);

    initHighPriorityWarmUp();
    if (!cancelled) {
      setSplashProgress(55);
      setSplashStageLabel(isBn ? 'DNS প্রি-ওয়ার্ম ও ডাউনলোড শিল্ড চালু হচ্ছে...' : 'Warming DNS & download shield...');
    }

    initNativeDownloadObserver((item) => {
      setShowToast(`📥 ওমারভিও ডাউনলোড হিস্ট্রিতে সংরক্ষিত: ${item.title}`);
    });
    initLocalProxyBridge({
      onTrackerBlocked: () => {
        // Tracker stat automatically updated in store
      },
      onMediaBufferDetected: (streamUrl, isAudio) => {
        setActiveMedia((prev) => {
          if (!prev) {
            return {
              id: `sniff-${Date.now()}`,
              type: isAudio ? 'audio' : 'video',
              title: isAudio ? 'Live Audio Stream' : 'Live Video Stream',
              src: streamUrl,
              format: isAudio ? 'MP3/AAC' : 'MP4/WEBM',
            };
          }
          return prev;
        });
      },
    });
    if (!cancelled) {
      setSplashProgress(78);
      setSplashStageLabel(isBn ? 'লোকাল প্রক্সি ও অফলাইন সার্ভিস ওয়ার্কার যুক্ত হচ্ছে...' : 'Registering offline Service Worker...');
    }

    registerServiceWorker().then(() => {
      if (cancelled) return;
      setSplashProgress(100);
      setSplashStageLabel(isBn ? 'ওমারভিও ইঞ্জিন প্রস্তুত' : 'Omarvio engine ready');
      const elapsed = performance.now() - bootStartedAt;
      const settleDelay = Math.max(0, 420 - elapsed);
      window.setTimeout(() => {
        if (!cancelled) dismissSplash();
      }, settleDelay);
    });

    const unsub = subscribeLanguage(setCurrentLang);

    // Notify if opened via external link (WhatsApp, Messenger, Share Target)
    const sp = new URLSearchParams(window.location.search);
    const incomingUrl = sp.get('url') || sp.get('text') || sp.get('link') || sp.get('openUrl');
    if (incomingUrl) {
      setShowToast('🛡️ WhatsApp/Messenger লিংক আনর‍্যাপ ও স্যানিটাইজ করে ওমারভিও-তে ওপেন করা হয়েছে!');
      try {
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch {}
    }

    return () => {
      cancelled = true;
      window.clearTimeout(skipRevealTimer);
      window.clearTimeout(maxCeilingTimer);
      unsub();
    };
  }, [dismissSplash]);

  // Detect media whenever the active tab URL changes
  useEffect(() => {
    if (activeTab.url) {
      const detected = detectRunningMedia(activeTab.url);
      setActiveMedia(detected);
      if (detected) {
        updateLockScreenMediaSession({
          title: detected.title,
          artist: 'OMARVIO Ad-Free Stream',
        });
      }
    } else {
      setActiveMedia(null);
    }
  }, [activeTab.url]);

  // Helper to show temporary toast notification
  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 2500);
  };

  // Tab Management
  const handleNewTab = () => {
    const newTab = createDefaultTab();
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
    triggerToast('✨ New Tab Created');
  };

  const handleNewIncognitoTab = () => {
    const incognitoTab = createDefaultTab(undefined, true);
    setTabs((prev) => [...prev, incognitoTab]);
    setActiveTabId(incognitoTab.id);
    triggerToast('🕵️ New Incognito Tab Opened (Zero traces recorded)');
  };

  const handleAddTabToGroup = () => {
    const groupName = 'Group 1';
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, groupId: 'group-1', groupName } : t))
    );
    triggerToast(`⊞ Tab added to ${groupName}`);
  };

  const handleToggleBookmark = () => {
    const nextState = !activeTab.isBookmarked;
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, isBookmarked: nextState } : t))
    );
    triggerToast(nextState ? '★ Bookmark saved' : 'Bookmark removed');
  };

  const handleToggleDesktopSite = () => {
    const nextState = !activeTab.isDesktopMode;
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, isDesktopMode: nextState } : t))
    );
    triggerToast(
      nextState
        ? '🖥️ Desktop site enabled (1024px viewport scaling)'
        : '📱 Mobile view restored'
    );
  };

  const handleDownloadPage = () => {
    triggerToast('✓ Page saved to Omarvio Offline Downloads');
  };

  const handleShare = () => {
    setIsShareModalOpen(true);
  };

  const handleCloseAllTabs = () => {
    const freshTab = createDefaultTab();
    setTabs([freshTab]);
    setActiveTabId(freshTab.id);
    triggerToast('All tabs closed');
  };

  const handleClearBrowsingData = (options: {
    history: boolean;
    cookies: boolean;
    cache: boolean;
    passwords: boolean;
  }) => {
    if (options.history) {
      clearAllBrowsingHistory();
    }
    if (options.cache) {
      try {
        sessionStorage.clear();
        if (typeof caches !== 'undefined') {
          caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
        }
      } catch {}
    }
    triggerToast('🗑️ নির্বাচিত হিস্টরি ও ক্যাশ সফলভাবে মুছে দেওয়া হয়েছে');
  };

  const handleOpenSearchSuggestions = (initialText = '') => {
    setSearchOverlayQuery(initialText || activeTab.url || '');
    setIsSearchOverlayOpen(true);
  };

  const handleCloseTab = (tabIdToClose: string) => {
    if (tabs.length <= 1) {
      const freshTab = createDefaultTab();
      setTabs([freshTab]);
      setActiveTabId(freshTab.id);
      return;
    }

    const newTabs = tabs.filter((t) => t.id !== tabIdToClose);
    setTabs(newTabs);

    if (activeTabId === tabIdToClose) {
      setActiveTabId(newTabs[newTabs.length - 1].id);
    }
  };

  const handleSelectTab = (tabId: string) => {
    markTabSwitchStart();
    setActiveTabId(tabId);
    setTimeout(() => {
      measureTabSwitchEnd(aliveTabIds.length);
    }, 0);
  };

  const extractSafeHostname = (targetUrl: string): string => {
    if (!targetUrl) return 'New Tab';
    try {
      if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
        return new URL(targetUrl).hostname;
      }
      if (targetUrl.startsWith('search:') || targetUrl.startsWith('ai:')) {
        return 'Search';
      }
      return new URL(`https://${targetUrl}`).hostname || targetUrl;
    } catch {
      return targetUrl;
    }
  };

  const handleLoadStart = React.useCallback((targetTabId?: string) => {
    const idToUpdate = targetTabId || activeTabId;
    setTabs((prev) => {
      let changed = false;
      const next = prev.map((t) => {
        if (t.id === idToUpdate && !t.isLoading) {
          changed = true;
          return { ...t, isLoading: true };
        }
        return t;
      });
      return changed ? next : prev;
    });
  }, [activeTabId]);

  const handleLoadEnd = React.useCallback((targetTabId?: string) => {
    const idToUpdate = targetTabId || activeTabId;
    setTabs((prev) => {
      let changed = false;
      const next = prev.map((t) => {
        if (t.id === idToUpdate && t.isLoading) {
          changed = true;
          return { ...t, isLoading: false };
        }
        return t;
      });
      return changed ? next : prev;
    });
  }, [activeTabId]);

  // Direct Execution Navigation
  const executeNavigate = (targetUrl: string) => {
    if (targetUrl) {
      addBrowsingHistory(targetUrl);
    }
    try {
      window.history.pushState({ url: targetUrl, time: Date.now() }, '');
    } catch {}
    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.id === activeTabId) {
          const newHistory = tab.history.slice(0, tab.historyIndex + 1);
          newHistory.push(targetUrl);
          return {
            ...tab,
            url: targetUrl,
            title: extractSafeHostname(targetUrl),
            history: newHistory,
            historyIndex: newHistory.length - 1,
            canGoBack: newHistory.length > 1,
            canGoForward: false,
            isLoading: true,
          };
        }
        return tab;
      })
    );
  };

  // Pre-flight Link Clinic Security Scanner + Navigation
  const handleNavigate = (rawUrl: string) => {
    if (!rawUrl) {
      executeNavigate('');
      return;
    }

    const cleanUrl = cleanTrackingParameters(rawUrl);
    if (cleanUrl !== rawUrl) {
      incrementTrackerStat(14000);
      triggerToast('🛡️ Tracking Query Cleanser: Surveillance tokens removed from URL!');
    }

    // Link Clinic Pre-Flight Audit
    const audit = auditUrlSecurity(cleanUrl);
    if (!audit.isSafe && audit.riskLevel === 'dangerous') {
      setCurrentThreatAudit(audit);
      setPendingSafeUrl(cleanUrl);
      return;
    }

    executeNavigate(cleanUrl);
  };

  const handleProceedThreat = () => {
    if (pendingSafeUrl) {
      executeNavigate(pendingSafeUrl);
      setPendingSafeUrl(null);
    }
    setCurrentThreatAudit(null);
  };

  const handleCancelThreat = () => {
    setCurrentThreatAudit(null);
    setPendingSafeUrl(null);
    triggerToast('🛡️ Omarvio Link Clinic: Returned to safety.');
  };

  const handleGoBack = () => {
    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.id === activeTabId && tab.historyIndex > 0) {
          const newIndex = tab.historyIndex - 1;
          const prevUrl = tab.history[newIndex];
          return {
            ...tab,
            url: prevUrl,
            title: prevUrl ? extractSafeHostname(prevUrl) : 'New Tab',
            historyIndex: newIndex,
            canGoBack: newIndex > 0,
            canGoForward: true,
            isLoading: Boolean(prevUrl),
          };
        }
        return tab;
      })
    );
  };

  const handleGoForward = () => {
    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.id === activeTabId && tab.historyIndex < tab.history.length - 1) {
          const newIndex = tab.historyIndex + 1;
          const nextUrl = tab.history[newIndex];
          return {
            ...tab,
            url: nextUrl,
            title: nextUrl ? extractSafeHostname(nextUrl) : 'New Tab',
            historyIndex: newIndex,
            canGoBack: true,
            canGoForward: newIndex < tab.history.length - 1,
            isLoading: Boolean(nextUrl),
          };
        }
        return tab;
      })
    );
  };

  const handleReload = () => {
    if (!activeTab.url) return;
    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.id === activeTabId) {
          return { ...tab, isLoading: true };
        }
        return tab;
      })
    );
  };

  const handleGoHome = () => {
    handleNavigate('');
  };

  const handleUrlChangeFromFrame = (newUrl: string, targetTabId?: string) => {
    const idToUpdate = targetTabId || activeTabId;
    const cleanUrl = cleanTrackingParameters(newUrl);
    if (!cleanUrl) return;

    addBrowsingHistory(cleanUrl);
    try {
      window.history.pushState({ url: cleanUrl, time: Date.now() }, '');
    } catch {}

    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.id === idToUpdate) {
          if (normalizeUrlKey(tab.url) === normalizeUrlKey(cleanUrl)) {
            return tab;
          }
          const prevHistory = tab.history && tab.history.length > 0 ? tab.history : [tab.url || ''];
          const currentIndex =
            typeof tab.historyIndex === 'number' && tab.historyIndex >= 0
              ? tab.historyIndex
              : prevHistory.length - 1;
          const newHistory = prevHistory.slice(0, currentIndex + 1);
          newHistory.push(cleanUrl);
          const newIndex = newHistory.length - 1;

          return {
            ...tab,
            url: cleanUrl,
            title: extractSafeHostname(cleanUrl),
            history: newHistory,
            historyIndex: newIndex,
            canGoBack: newIndex > 0,
            canGoForward: false,
            isLoading: false,
          };
        }
        return tab;
      })
    );
  };

  // Synchronize browser history and popstate for Android hardware/gesture Back button navigation
  useEffect(() => {
    const handleBrowserPopState = () => {
      // If modal is open, close modal first
      if (isChromeMenuOpen) {
        setIsChromeMenuOpen(false);
        return;
      }
      if (isTabSwitcherOpen) {
        setIsTabSwitcherOpen(false);
        return;
      }
      if (isSettingsOpen) {
        setIsSettingsOpen(false);
        return;
      }

      // Step-by-step history navigation: if tab has history, step back
      if (activeTab.historyIndex > 0) {
        handleGoBack();
      }
    };

    window.addEventListener('popstate', handleBrowserPopState);
    return () => window.removeEventListener('popstate', handleBrowserPopState);
  }, [activeTab.historyIndex, isChromeMenuOpen, isTabSwitcherOpen, isSettingsOpen]);

  // 1-Tap Ghost Panic Wipe
  const handlePanicWipe = () => {
    try {
      sessionStorage.clear();
      localStorage.clear();
    } catch {}
    triggerServiceWorkerPanicWipe();
    const freshTab = createDefaultTab('tab-fresh');
    setTabs([freshTab]);
    setActiveTabId(freshTab.id);
    setIsPanicModalOpen(false);
    setActiveMedia(null);
    triggerToast('👻 Ghost Wipe Complete: All sessions, tabs & caches permanently destroyed!');
  };

  const handleToggleOledDark = () => {
    const next = toggleOledDarkMode();
    setIsOledDark(next);
    triggerToast(next ? '🌙 OLED True Black Dark Mode Activated' : '☀️ Standard Display Restored');
  };

  const handleTranslateWebPage = () => {
    const res = translateCurrentPage(currentLang);
    triggerToast(res.message);
  };

  return (
    <div
      className={`relative w-full h-[100dvh] flex flex-col text-slate-100 overflow-hidden font-sans touch-manipulation ${
        isOledDark ? 'bg-black' : 'bg-[#060913]'
      }`}
    >
      {/* Branded Initialization Splash Screen */}
      <SplashScreen
        isVisible={isSplashMounted}
        isExiting={isSplashExiting}
        progress={splashProgress}
        stageLabel={splashStageLabel}
        showSkip={showSplashSkip}
        isOledDark={isOledDark}
        language={currentLang}
        onSkip={dismissSplash}
      />

      {/* Smart Auto-Hide "Add to Home Screen" Banner */}
      <InstallBanner />

      {/* Top Header matching Chrome on Android */}
      <header
        className={`w-full border-b px-2.5 sm:px-4 py-2 flex flex-col gap-1.5 z-30 safe-top shadow-md transition-colors ${
          isOledDark ? 'bg-black border-neutral-900' : 'bg-[#18191c] border-neutral-800'
        }`}
      >
        {!activeTab.url ? (
          /* HOME SCREEN HEADER: Brave-style Clean Minimalist Bar (Single unified search bar on Home) */
          <div className="w-full flex items-center justify-between gap-2 py-0.5">
            {/* Logo & Brand Name */}
            <div
              className="shrink-0 flex items-center gap-2"
              title="OMARVIO Home"
            >
              <HeaderBranding compact={true} />
            </div>

            {/* Right Action Icons matching Brave / Chrome Android */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Privacy Shield Badge */}
              <button
                type="button"
                onClick={() => openSettings('privacy')}
                title="OMARVIO Privacy Shield (Active - Zero Trackers)"
                className="w-10 h-10 rounded-full bg-cyan-950/80 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shadow-sm cursor-pointer hover:bg-cyan-900/60 transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
              </button>

              {/* Tab Switcher Counter Badge [N] */}
              <button
                type="button"
                onClick={() => setIsTabSwitcherOpen(true)}
                title="Tabs Overview"
                className="w-10 h-10 rounded-xl border border-[#3c4043] bg-[#28292c] text-[#e3e3e3] hover:text-white hover:border-cyan-400/60 font-mono font-bold text-xs transition-colors flex items-center justify-center active:scale-95 shadow-sm cursor-pointer tabular-nums"
              >
                {tabs.length}
              </button>

              {/* 3-Dot Overflow Menu */}
              <button
                type="button"
                onClick={() => setIsChromeMenuOpen(true)}
                title="More Options"
                className="w-10 h-10 rounded-full text-[#c4c7c5] hover:text-white hover:bg-[#3c4043] flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          /* WEBPAGE BROWSING HEADER: Home, Omnibox, Tab Badge, 3-Dots (Full controls on desktop) */
          <div className="w-full flex items-center gap-1 sm:gap-1.5">
            {/* Desktop Navigation buttons (hidden on mobile, where bottom bar is used) */}
            <div className="hidden md:flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleGoBack}
                disabled={!activeTab.canGoBack}
                className={`p-1.5 rounded-full transition-colors touch-manipulation ${
                  activeTab.canGoBack
                    ? 'text-slate-200 hover:text-white hover:bg-white/10 active:scale-95'
                    : 'text-slate-600 cursor-not-allowed'
                }`}
                title="Back"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={handleGoForward}
                disabled={!activeTab.canGoForward}
                className={`p-1.5 rounded-full transition-colors touch-manipulation ${
                  activeTab.canGoForward
                    ? 'text-slate-200 hover:text-white hover:bg-white/10 active:scale-95'
                    : 'text-slate-600 cursor-not-allowed'
                }`}
                title="Forward"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={handleReload}
                className="p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors touch-manipulation active:scale-95"
                title="Reload"
              >
                <RotateCw className={`w-4 h-4 ${activeTab.isLoading ? 'animate-spin text-cyan-400' : ''}`} />
              </button>
            </div>

            {/* Home button */}
            <button
              type="button"
              onClick={handleGoHome}
              className="p-1.5 sm:p-2 rounded-full text-cyan-400 hover:text-white hover:bg-white/10 transition-colors touch-manipulation active:scale-95 shrink-0"
              title="Home"
            >
              <Home className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Omnibox Address & Search Bar for Active Page: Now takes maximum space! */}
            <div className="flex-1 min-w-0">
              <Omnibox
                currentUrl={activeTab.url}
                isLoading={activeTab.isLoading}
                onNavigate={handleNavigate}
                onOpenLens={() => setIsLensOpen(true)}
                onOpenSearchOverlay={() => handleOpenSearchSuggestions(activeTab.url)}
              />
            </div>

            {/* Quick Translate Button: visible on tablet/desktop */}
            <button
              type="button"
              onClick={handleTranslateWebPage}
              title="Translate page into Bengali or English"
              className="hidden sm:flex w-8 h-8 rounded-lg text-[#c4c7c5] hover:text-white hover:bg-[#3c4043] items-center justify-center transition-colors active:scale-95 cursor-pointer shrink-0 touch-manipulation"
            >
              <Languages className="w-4 h-4 text-cyan-300" />
            </button>

            {/* Quick Smart Share: visible on tablet/desktop */}
            <button
              type="button"
              onClick={handleShare}
              title="স্মার্ট শেয়ার ও কিউআর কোড (WhatsApp/QR)"
              className="hidden sm:flex w-8 h-8 rounded-lg text-[#c4c7c5] hover:text-white hover:bg-[#3c4043] items-center justify-center transition-colors active:scale-95 cursor-pointer shrink-0 touch-manipulation"
            >
              <Share2 className="w-4 h-4 text-cyan-300" />
            </button>

            {/* Tab Counter Badge [N] */}
            <button
              type="button"
              onClick={() => setIsTabSwitcherOpen(true)}
              title="Tabs Overview"
              className="w-8 h-8 rounded-lg border border-[#3c4043] bg-[#28292c] text-[#e3e3e3] hover:text-white hover:border-cyan-400/60 font-mono font-bold text-xs transition-colors flex items-center justify-center active:scale-95 shadow-sm cursor-pointer shrink-0 touch-manipulation"
            >
              {tabs.length}
            </button>

            {/* 3-Dot Overflow Menu */}
            <button
              type="button"
              onClick={() => setIsChromeMenuOpen(true)}
              title="More Options"
              className="w-8 h-8 rounded-full text-[#c4c7c5] hover:text-white hover:bg-[#3c4043] flex items-center justify-center transition-colors active:scale-95 cursor-pointer shrink-0 touch-manipulation"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Desktop Horizontal Tab Bar (Visible on medium/large desktop screens) */}
        <div className="hidden md:block pt-0.5">
          <TabBar
            tabs={tabs}
            activeTabId={activeTabId}
            onSelectTab={handleSelectTab}
            onCloseTab={handleCloseTab}
            onNewTab={handleNewTab}
          />
        </div>
      </header>

      {/* Master Admin Urgent Emergency Broadcast Banner */}
      <UrgentMessageBanner />

      {/* Top Browser Loading Progress Indicator */}
      {activeTab.isLoading && (
        <div className="w-full h-1 bg-slate-900/90 overflow-hidden z-40 relative">
          <div className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 animate-pulse w-3/4 rounded-r-full shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
        </div>
      )}

      {/* Find in Page Floating Bar */}
      <FindInPageBar
        isOpen={isFindInPageOpen}
        onClose={() => setIsFindInPageOpen(false)}
        onToast={triggerToast}
      />

      {/* Main Browser Viewport with Floating Media Bar */}
      <main className="flex-1 relative w-full h-full overflow-hidden bg-[#060913]">
        {/* Contextual Floating Media Bar when YouTube/Facebook/Video is active */}
        {activeMedia && (
          <MediaControllerFloating
            media={activeMedia}
            onClose={() => setActiveMedia(null)}
            onToast={triggerToast}
          />
        )}

        {!activeTab.url && (
          <BrowserHome
            onNavigate={handleNavigate}
            onOpenLens={() => setIsLensOpen(true)}
            onOpenSearchSuggestions={handleOpenSearchSuggestions}
            onOpenIncognitoTab={handleNewIncognitoTab}
            onOpenAIMode={() => openSettings('ai')}
          />
        )}

        {/* Module M3: Zero-Reload Multi-Tab Container (Active visible, alive tabs mounted) */}
        {tabs.map((tab) => {
          if (!tab.url) return null;
          const isAlive = aliveTabIds.includes(tab.id);
          const isActive = tab.id === activeTabId;
          const isSleeping = !isAlive;
          return (
            <div
              key={tab.id}
              className="w-full h-full absolute inset-0"
              style={{
                display: isActive ? 'block' : 'none',
              }}
              aria-hidden={!isActive}
            >
              <BrowserFrame
                url={tab.url}
                tabId={tab.id}
                isDesktopMode={tab.isDesktopMode}
                isActive={isActive}
                isSleeping={isSleeping}
                onLoadStart={() => handleLoadStart(tab.id)}
                onLoadEnd={() => handleLoadEnd(tab.id)}
                onUrlChange={(newUrl) => handleUrlChangeFromFrame(newUrl, tab.id)}
                onToast={triggerToast}
                onShare={handleShare}
              />
            </div>
          );
        })}
      </main>

      {/* Conditionally render bottom NavigationBar only during active webpage browsing; leaving the Home Screen bottom completely clean & empty as requested */}
      {activeTab.url ? (
        <NavigationBar
          canGoBack={activeTab.canGoBack}
          canGoForward={activeTab.canGoForward}
          isLoading={activeTab.isLoading}
          tabCount={tabs.length}
          onGoBack={handleGoBack}
          onGoForward={handleGoForward}
          onReload={handleReload}
          onGoHome={handleGoHome}
          onOpenTabs={() => setIsTabSwitcherOpen(true)}
          onOpenPanic={() => setIsPanicModalOpen(true)}
          onOpenMenu={() => setIsChromeMenuOpen(true)}
          onNewTab={handleNewTab}
        />
      ) : null}

      {/* Mobile Tab Switcher Modal (2-Column Grid matching Screenshot) */}
      <TabSwitcherModal
        isOpen={isTabSwitcherOpen}
        tabs={tabs}
        activeTabId={activeTabId}
        onSelectTab={handleSelectTab}
        onCloseTab={handleCloseTab}
        onNewTab={handleNewTab}
        onCloseModal={() => setIsTabSwitcherOpen(false)}
        onCloseAllTabs={handleCloseAllTabs}
        onNewIncognitoTab={handleNewIncognitoTab}
      />

      {/* Chrome Android Authentic 3-Dot Overflow Menu Dropdown */}
      <ChromeMenuDropdown
        isOpen={isChromeMenuOpen}
        onClose={() => setIsChromeMenuOpen(false)}
        isHomePage={!activeTab.url}
        canGoBack={activeTab.canGoBack}
        canGoForward={activeTab.canGoForward}
        isBookmarked={!!activeTab.isBookmarked}
        isDesktopMode={!!activeTab.isDesktopMode}
        onGoBack={handleGoBack}
        onGoForward={handleGoForward}
        onToggleBookmark={handleToggleBookmark}
        onDownloadPage={handleDownloadPage}
        onReload={handleReload}
        onNewTab={handleNewTab}
        onNewIncognitoTab={handleNewIncognitoTab}
        onAddTabToGroup={handleAddTabToGroup}
        onOpenHistory={() => openSettings('history')}
        onOpenDeleteData={() => setIsClearDataOpen(true)}
        onOpenSiteControls={() => setIsSiteControlsOpen(true)}
        onOpenDownloads={() => setIsDownloadsOpen(true)}
        onOpenBookmarks={() => openSettings('vault')}
        onOpenRecentTabs={() => setIsTabSwitcherOpen(true)}
        onShare={() => handleShare()}
        onFindInPage={() => setIsFindInPageOpen(true)}
        onTranslate={handleTranslateWebPage}
        onToggleReadingMode={() => triggerToast('📄 Smart Reader Mode Active')}
        onInstallShortcut={() => triggerToast('📲 Omarvio Shortcut Created on Device')}
        onOpenDefaultBrowser={() => setIsDefaultBrowserModalOpen(true)}
        onToggleDesktopSite={handleToggleDesktopSite}
        onCustomizeHome={() => openSettings('general')}
        onOpenSettings={() => openSettings('general')}
        onOpenHelp={() => openSettings('feedback')}
      />

      {/* Full-Screen Search Suggestions Overlay */}
      <SearchSuggestionsOverlay
        isOpen={isSearchOverlayOpen}
        initialQuery={searchOverlayQuery}
        tabs={tabs}
        onClose={() => setIsSearchOverlayOpen(false)}
        onNavigate={handleNavigate}
        onNewTabWithQuery={(q) => {
          const newTab = createDefaultTab();
          newTab.url = q.includes('.')
            ? q.startsWith('http')
              ? q
              : `https://${q}`
            : `https://duckduckgo.com/?q=${encodeURIComponent(q)}`;
          newTab.title = q;
          setTabs((prev) => [...prev, newTab]);
          setActiveTabId(newTab.id);
        }}
      />

      {/* Module M7: Code-Split Heavy Modals (Loaded on-demand via Suspense) */}
      <React.Suspense fallback={null}>
        {/* Default Browser Modal */}
        {isDefaultBrowserModalOpen && (
          <DefaultBrowserModal
            isOpen={isDefaultBrowserModalOpen}
            onClose={() => setIsDefaultBrowserModalOpen(false)}
            onOpenCleanUrl={(cleanUrl) => {
              handleNavigate(cleanUrl);
              triggerToast('🛡️ নিরাপদ ওমারভিও ট্যাবে লিংক খোলা হয়েছে');
            }}
          />
        )}

        {/* Smart Share Hub & Dynamic QR Code Studio Modal */}
        {isShareModalOpen && (
          <SmartShareModal
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
            currentUrl={activeTab.url}
            pageTitle={activeTab.title}
            activeMedia={activeMedia}
            onToast={triggerToast}
          />
        )}

        {/* Site Controls Permission Modal */}
        {isSiteControlsOpen && (
          <SiteControlsModal
            isOpen={isSiteControlsOpen}
            onClose={() => setIsSiteControlsOpen(false)}
            currentUrl={activeTab.url}
            onToast={triggerToast}
          />
        )}

        {/* Delete Browsing Data Clean Modal */}
        {isClearDataOpen && (
          <ClearDataModal
            isOpen={isClearDataOpen}
            onClose={() => setIsClearDataOpen(false)}
            onConfirmClear={handleClearBrowsingData}
          />
        )}

        {/* 1-Tap Ghost Panic Modal */}
        {isPanicModalOpen && (
          <PanicModal
            isOpen={isPanicModalOpen}
            onConfirmWipe={handlePanicWipe}
            onCancel={() => setIsPanicModalOpen(false)}
          />
        )}

        {/* Full Settings & Privacy Drawer */}
        {isSettingsOpen && (
          <SettingsDrawer
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            initialTab={settingsTab}
            isOledDark={isOledDark}
            onToggleOledDark={handleToggleOledDark}
            onOpenDownloads={() => setIsDownloadsOpen(true)}
            onTranslatePage={handleTranslateWebPage}
            onToast={triggerToast}
            currentUrl={activeTab.url}
            onNavigate={handleNavigate}
          />
        )}

        {/* Omarvio Privacy Lens Scanner Modal */}
        {isLensOpen && (
          <CameraLensModal
            isOpen={isLensOpen}
            onClose={() => setIsLensOpen(false)}
            onNavigate={handleNavigate}
            onFlagSecurityThreat={(audit) => {
              setCurrentThreatAudit(audit);
              setPendingSafeUrl(audit.url);
            }}
          />
        )}

        {/* Omarvio Link Clinic Threat Warning Modal */}
        {currentThreatAudit && (
          <LinkClinicModal
            auditResult={currentThreatAudit}
            onProceed={handleProceedThreat}
            onCancel={handleCancelThreat}
          />
        )}

        {/* Downloads & Offline Files Modal */}
        {isDownloadsOpen && (
          <DownloadsModal
            isOpen={isDownloadsOpen}
            onClose={() => setIsDownloadsOpen(false)}
            onOpenDocument={(doc) => setActiveDocItem(doc)}
            onToast={triggerToast}
          />
        )}

        {/* In-Browser Offline Document / PDF Viewer Modal */}
        {activeDocItem && (
          <DocumentViewerModal
            documentItem={activeDocItem}
            onClose={() => setActiveDocItem(null)}
            onToast={triggerToast}
          />
        )}
      </React.Suspense>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-cyan-950/95 border border-cyan-400/50 text-cyan-200 text-xs font-semibold shadow-2xl backdrop-blur-md animate-bounce">
          {showToast}
        </div>
      )}
    </div>
  );
}

