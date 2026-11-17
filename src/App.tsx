/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * OMARVIO BROWSER - Hybrid PWA & Privacy-First Client Architecture
 */

import React, { useState, useEffect } from 'react';
import {
  MoreVertical,
  Languages,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Home,
  Download,
  Share2,
  BookOpen,
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
import {
  computeAliveTabIds,
  getMaxAliveTabs,
  putTabToSleep,
  wakeSleepingTab,
  clearSleepingTab,
} from './engine/tabManager';
import { markTabSwitchStart, measureTabSwitchEnd } from './engine/metrics';
import {
  getEnergySaverEnabled,
  toggleEnergySaver,
  subscribeEnergySaver,
  applyEnergySaverDomClass,
} from './engine/energySaver';
import {
  isAndroidNativeShell,
  openUrlInNativeAndroid,
  syncDesktopModeWithAndroid,
  clearNativeAndroidBrowsingData,
  openAndroidDownloadsHub,
  fetchLiveApkReleaseStatus,
  ApkReleaseStatus,
  triggerAndroidAppUpdateCheck,
  pinWebsiteToAndroidHomeScreen,
} from './engine/nativeBridge';
import {
  emitBrowserEvent,
  useBrowserEvent,
  setGlobalPwaInstallPrompt,
  getGlobalPwaInstallPrompt,
} from './engine/eventBus';

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
import {
  runAdblockerMiddleware,
  refreshDynamicFilterLists,
  getAdblockStats,
} from './engine/adblocker';
import { detectRunningMedia, DetectedMedia } from './engine/mediaSaver';
import { saveActiveWebpageOffline } from './engine/inAppDownloader';
import { updateLockScreenMediaSession } from './engine/media';
import { toggleOledDarkMode, getOledDarkStatus } from './engine/darkMode';
import { auditUrlSecurity, SecurityAuditResult } from './engine/security';
import { translateCurrentPage } from './engine/translator';
import { getLanguage, subscribeLanguage, t } from './engine/i18n';
import {
  addBrowsingHistory,
  clearAllBrowsingHistory,
  clearBrowsingHistorySince,
} from './engine/history';
import { clearVaultPin } from './engine/vault';
import { isUrlBookmarked, toggleBookmark } from './engine/bookmarks';

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
  isReadingMode: false,
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('openSettings') === '1';
    }
    return false;
  });
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
  const [energySaverEnabled, setEnergySaverEnabled] = useState<boolean>(getEnergySaverEnabled);
  const [liveApkStatus, setLiveApkStatus] = useState<ApkReleaseStatus | null>(null);
  const [liveBlockedCount, setLiveBlockedCount] = useState<number>(() => {
    const s = getAdblockStats();
    return s.trackersBlocked + s.adsDestroyed;
  });
  const [addToHomeModal, setAddToHomeModal] = useState<{
    isOpen: boolean;
    title: string;
    url: string;
    isPwaHome: boolean;
  }>({ isOpen: false, title: '', url: '', isPwaHome: false });
  const [hasPwaPrompt, setHasPwaPrompt] = useState<boolean>(() => Boolean(getGlobalPwaInstallPrompt()));

  const isAndroidShell = React.useMemo(() => isAndroidNativeShell(), []);

  useBrowserEvent(
    'BLOCKED_STAT_UPDATED',
    React.useCallback((st) => {
      setLiveBlockedCount(st.trackersBlocked + st.adsDestroyed);
    }, [])
  );

  useBrowserEvent(
    'PWA_INSTALL_PROMPT_READY',
    React.useCallback((payload) => {
      setHasPwaPrompt(payload.available);
    }, [])
  );

  // Capture PWA beforeinstallprompt globally for 1-tap Chrome "Add to Home screen / Install app"
  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setGlobalPwaInstallPrompt(e);
      setHasPwaPrompt(true);
    };
    const onAppInstalled = () => {
      setGlobalPwaInstallPrompt(null);
      setHasPwaPrompt(false);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  // Apply & subscribe Energy Saver mode globally (limits background tabs + throttles UI animations)
  useEffect(() => {
    applyEnergySaverDomClass(energySaverEnabled);
    return subscribeEnergySaver(setEnergySaverEnabled);
  }, [energySaverEnabled]);

  // Keep live APK update status fresh on mount & focus
  useEffect(() => {
    const refreshApkStatus = () => {
      fetchLiveApkReleaseStatus().then((live) => {
        if (live) {
          setLiveApkStatus(live);
          emitBrowserEvent('APK_UPDATE_AVAILABLE', {
            version: live.version,
            versionCode: live.versionCode,
            directApkUrl: live.directApkUrl,
          });
        }
      });
    };
    refreshApkStatus();
    window.addEventListener('focus', refreshApkStatus);
    return () => window.removeEventListener('focus', refreshApkStatus);
  }, []);

  // Splash Screen Engine & PWA Readiness Lifecycle
  const [isSplashMounted, setIsSplashMounted] = useState(() => !isAndroidNativeShell());
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

  // Module M3: Tab Manager Alive Tabs LRU State (Strictly constrained to 1 when Energy Saver is active)
  const [aliveTabIds, setAliveTabIds] = useState<string[]>(() => [activeTabId]);

  useEffect(() => {
    const explicitlySleepingIds = new Set(
      tabs.filter((tabItem) => tabItem.isSleeping).map((tabItem) => tabItem.id)
    );
    setAliveTabIds((prev) =>
      computeAliveTabIds(
        prev,
        activeTabId,
        tabs.map((tabItem) => tabItem.id),
        getMaxAliveTabs(energySaverEnabled),
        explicitlySleepingIds
      )
    );
  }, [activeTabId, tabs, energySaverEnabled]);

  const activeTab = tabs.find((tabItem) => tabItem.id === activeTabId) || tabs[0] || createDefaultTab();

  // Emit instant Event Bus notifications whenever tabs or active tab attributes mutate
  useEffect(() => {
    const sleepingCount = tabs.filter((t) => Boolean(t.isSleeping)).length;
    emitBrowserEvent('TABS_UPDATED', {
      count: tabs.length,
      activeTabId,
      sleepingCount,
    });
    emitBrowserEvent('ACTIVE_TAB_UPDATED', {
      tabId: activeTab.id,
      url: activeTab.url,
      title: activeTab.title,
      isLoading: activeTab.isLoading,
      isDesktopMode: Boolean(activeTab.isDesktopMode),
      isReadingMode: Boolean(activeTab.isReadingMode),
      isBookmarked: Boolean(activeTab.isBookmarked || (activeTab.url && isUrlBookmarked(activeTab.url))),
    });
  }, [
    tabs,
    activeTabId,
    activeTab.id,
    activeTab.url,
    activeTab.title,
    activeTab.isLoading,
    activeTab.isDesktopMode,
    activeTab.isReadingMode,
    activeTab.isBookmarked,
  ]);

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

    if (!getEnergySaverEnabled()) {
      initHighPriorityWarmUp();
    }
    refreshDynamicFilterLists().catch(() => {});
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

  const GROUP_COLORS = ['cyan', 'emerald', 'amber', 'violet', 'rose'];

  const getNextGroupMeta = (currentTabs: Tab[], preferredName?: string) => {
    const existingIds = new Set<string>();
    currentTabs.forEach((t) => {
      if (t.groupId) existingIds.add(t.groupId);
    });
    const nextNumber = existingIds.size + 1;
    const groupId = `group-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    const groupName = (preferredName || '').trim() || `Group ${nextNumber}`;
    const groupColor = GROUP_COLORS[existingIds.size % GROUP_COLORS.length];
    return { groupId, groupName, groupColor };
  };

  const handleAddTabToGroup = (targetTabId?: string, preferredName?: string) => {
    const idToGroup = targetTabId || activeTabId;
    let createdGroupName = '';
    setTabs((prev) => {
      const { groupId, groupName, groupColor } = getNextGroupMeta(prev, preferredName);
      createdGroupName = groupName;
      return prev.map((t) =>
        t.id === idToGroup ? { ...t, groupId, groupName, groupColor } : t
      );
    });
    triggerToast(`⊞ Added tab to ${createdGroupName || 'New Group'}`);
  };

  const handleGroupTabs = (sourceTabId: string, targetTabId: string) => {
    if (!sourceTabId || !targetTabId || sourceTabId === targetTabId) return;
    setTabs((prev) => {
      const targetTab = prev.find((t) => t.id === targetTabId);
      if (!targetTab) return prev;
      if (targetTab.groupId) {
        return prev.map((t) =>
          t.id === sourceTabId
            ? {
                ...t,
                groupId: targetTab.groupId,
                groupName: targetTab.groupName || 'Tab Group',
                groupColor: targetTab.groupColor || 'cyan',
              }
            : t
        );
      }
      const { groupId, groupName, groupColor } = getNextGroupMeta(prev);
      return prev.map((t) =>
        t.id === sourceTabId || t.id === targetTabId
          ? { ...t, groupId, groupName, groupColor }
          : t
      );
    });
    triggerToast('⊞ Tabs grouped together');
  };

  const handleAssignTabToGroup = (
    tabId: string,
    groupId: string,
    groupName: string,
    groupColor = 'cyan'
  ) => {
    setTabs((prev) =>
      prev.map((t) =>
        t.id === tabId ? { ...t, groupId, groupName, groupColor } : t
      )
    );
    triggerToast(`⊞ Moved tab to ${groupName}`);
  };

  const handleRemoveTabFromGroup = (tabId: string) => {
    setTabs((prev) =>
      prev.map((t) =>
        t.id === tabId
          ? { ...t, groupId: undefined, groupName: undefined, groupColor: undefined }
          : t
      )
    );
    triggerToast('Tab removed from group');
  };

  const handleRenameGroup = (groupId: string, newName: string) => {
    const clean = newName.trim();
    if (!clean) return;
    setTabs((prev) =>
      prev.map((t) => (t.groupId === groupId ? { ...t, groupName: clean } : t))
    );
  };

  const handleCloseGroup = (groupId: string) => {
    setTabs((prev) => {
      const remaining = prev.filter((t) => t.groupId !== groupId);
      if (remaining.length === 0) {
        const freshTab = createDefaultTab();
        setActiveTabId(freshTab.id);
        return [freshTab];
      }
      if (!remaining.some((t) => t.id === activeTabId)) {
        setActiveTabId(remaining[remaining.length - 1].id);
      }
      return remaining;
    });
    triggerToast('Tab group closed');
  };

  const handleNewTabInGroup = (groupId: string, groupName: string, groupColor = 'cyan') => {
    const newTab = createDefaultTab();
    newTab.groupId = groupId;
    newTab.groupName = groupName;
    newTab.groupColor = groupColor;
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
  };

  const handleDuplicateTab = (tabId: string) => {
    const source = tabs.find((t) => t.id === tabId);
    if (!source) return;
    const copy: Tab = {
      ...source,
      id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now(),
      isLoading: Boolean(source.url),
    };
    setTabs((prev) => [...prev, copy]);
    setActiveTabId(copy.id);
    triggerToast('❐ Tab duplicated');
  };

  const handleToggleBookmark = () => {
    if (!activeTab.url) {
      openSettings('vault');
      return;
    }
    const { added } = toggleBookmark(activeTab.url, activeTab.title);
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, isBookmarked: added } : t))
    );
    triggerToast(added ? '★ Bookmark saved' : 'Bookmark removed');
  };

  const handleToggleDesktopSite = () => {
    const nextState = !activeTab.isDesktopMode;
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, isDesktopMode: nextState } : t))
    );
    emitBrowserEvent('DESKTOP_MODE_CHANGED', { tabId: activeTabId, isDesktopMode: nextState });
    syncDesktopModeWithAndroid(nextState);
    triggerToast(
      nextState
        ? '🖥️ Desktop site enabled (1280px desktop layout)'
        : '📱 Mobile view restored'
    );
  };

  const handleToggleReadingMode = (forceState?: boolean, targetTabId?: string) => {
    const idToUpdate = targetTabId || activeTabId;
    const current = tabs.find((t) => t.id === idToUpdate);
    if (!current || !current.url) return;

    const nextState = typeof forceState === 'boolean' ? forceState : !current.isReadingMode;
    setTabs((prev) =>
      prev.map((t) => (t.id === idToUpdate ? { ...t, isReadingMode: nextState } : t))
    );
    emitBrowserEvent('READING_MODE_CHANGED', { tabId: idToUpdate, isReadingMode: nextState });
    triggerToast(
      nextState
        ? '📖 ক্লিন রিডার মোড চালু হয়েছে — সাইডবার, বিজ্ঞাপন ও ফুটার সরানো হয়েছে'
        : '🌐 ওয়েবসাইটের স্বাভাবিক ভিউ ফিরে এসেছে'
    );
  };

  const handleDownloadPage = async () => {
    if (!activeTab.url) {
      triggerToast('⚠️ অফলাইনে সেভ করার জন্য আগে যেকোনো একটি ওয়েবসাইট খুলুন');
      return;
    }
    triggerToast('📥 ওয়েবপেজ অফলাইন রিডিংয়ের জন্য সংরক্ষণ হচ্ছে...');
    const result = await saveActiveWebpageOffline(activeTab.title, activeTab.url);
    triggerToast(result.message);
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
    timeRange?: 'lastHour' | 'last24' | 'last7' | 'all';
  }) => {
    if (options.history) {
      if (!options.timeRange || options.timeRange === 'all') {
        clearAllBrowsingHistory();
      } else {
        const now = Date.now();
        const deltaMs =
          options.timeRange === 'lastHour'
            ? 3600_000
            : options.timeRange === 'last24'
            ? 86400_000
            : 7 * 86400_000;
        clearBrowsingHistorySince(now - deltaMs);
      }
    }
    if (options.cache || options.cookies) {
      clearNativeAndroidBrowsingData();
      try {
        sessionStorage.clear();
        if (typeof caches !== 'undefined') {
          caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
        }
      } catch {}
    }
    if (options.passwords) {
      clearVaultPin();
      try {
        localStorage.removeItem('omarvio_vault_data');
      } catch {}
    }
    triggerToast('🗑️ নির্বাচিত হিস্টরি ও ক্যাশ সফলভাবে মুছে দেওয়া হয়েছে');
  };

  const handleToggleEnergySaver = () => {
    const next = toggleEnergySaver();
    if (next) {
      setTabs((prev) =>
        prev.map((tab) => {
          if (tab.id !== activeTabId && tab.url && !tab.isSleeping) {
            putTabToSleep(tab.id, tab.url, tab.title);
            return { ...tab, isSleeping: true, isLoading: false };
          }
          return tab;
        })
      );
    }
    triggerToast(
      next
        ? '🔋 এনার্জি সেভার চালু — ব্যাকগ্রাউন্ড ট্যাব স্লিপ ও UI অ্যানিমেশন কমানো হয়েছে'
        : '🚀 নরমাল পাওয়ার মোড চালু হয়েছে'
    );
  };

  const handleSleepTab = (tabId: string) => {
    const target = tabs.find((tabItem) => tabItem.id === tabId);
    if (!target) return;
    if (target.url) {
      putTabToSleep(target.id, target.url, target.title);
    }
    setTabs((prev) =>
      prev.map((tabItem) =>
        tabItem.id === tabId ? { ...tabItem, isSleeping: true, isLoading: false } : tabItem
      )
    );
    setAliveTabIds((prev) => prev.filter((id) => id !== tabId));
    triggerToast(`💤 "${target.title || 'Tab'}" স্লিপ করা হয়েছে (RAM ফ্রি)`);
  };

  const handleWakeTab = (tabId: string) => {
    wakeSleepingTab(tabId);
    setTabs((prev) =>
      prev.map((tabItem) =>
        tabItem.id === tabId ? { ...tabItem, isSleeping: false } : tabItem
      )
    );
    setAliveTabIds((prev) => (prev.includes(tabId) ? prev : [tabId, ...prev]));
  };

  const handleSleepAllBackgroundTabs = () => {
    let sleptCount = 0;
    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== activeTabId && tab.url && !tab.isSleeping) {
          sleptCount += 1;
          putTabToSleep(tab.id, tab.url, tab.title);
          return { ...tab, isSleeping: true, isLoading: false };
        }
        return tab;
      })
    );
    setAliveTabIds([activeTabId]);
    triggerToast(
      sleptCount > 0
        ? `💤 ${sleptCount}টি ব্যাকগ্রাউন্ড ট্যাব স্লিপ করে RAM ও ব্যাটারি সাশ্রয় করা হয়েছে`
        : '💤 সব ব্যাকগ্রাউন্ড ট্যাব ইতিমধ্যেই স্লিপ অবস্থায় আছে'
    );
  };

  const handleInstallShortcut = () => {
    if (!activeTab.url) {
      setAddToHomeModal({
        isOpen: true,
        title: 'OMARVIO BROWSER',
        url: window.location.origin,
        isPwaHome: true,
      });
      return;
    }
    const host = extractSafeHostname(activeTab.url);
    setAddToHomeModal({
      isOpen: true,
      title: (activeTab.title && activeTab.title !== 'New Tab' ? activeTab.title : host).slice(0, 28),
      url: activeTab.url,
      isPwaHome: false,
    });
  };

  const handleConfirmAddToHomeScreen = async (mode: 'shortcut' | 'pwa') => {
    const cleanTitle = addToHomeModal.title.trim() || 'Website';
    const targetUrl = addToHomeModal.url.trim() || window.location.origin;

    if (mode === 'pwa') {
      const promptEvent = getGlobalPwaInstallPrompt();
      if (promptEvent && typeof promptEvent.prompt === 'function') {
        try {
          promptEvent.prompt();
          const { outcome } = await promptEvent.userChoice;
          setGlobalPwaInstallPrompt(null);
          setAddToHomeModal((prev) => ({ ...prev, isOpen: false }));
          triggerToast(
            outcome === 'accepted'
              ? '📲 OMARVIO PWA আপনার ফোনের হোম স্ক্রিনে ইনস্টল হয়েছে!'
              : 'PWA ইনস্টল বাতিল করা হয়েছে'
          );
          return;
        } catch {}
      }
    }

    // Save to persistent Omarvio Home Shortcuts + pin on Android Phone Launcher if in native APK
    try {
      const raw = localStorage.getItem('omarvio_shortcuts_v5');
      const existing = raw ? JSON.parse(raw) : [];
      const list = Array.isArray(existing) ? existing : [];
      if (!addToHomeModal.isPwaHome && !list.some((item: any) => item.url === targetUrl)) {
        const colors = ['bg-cyan-600', 'bg-blue-600', 'bg-emerald-600', 'bg-indigo-600'];
        const chosenColor = colors[list.length % colors.length];
        list.push({
          id: `shortcut-${Date.now()}`,
          name: cleanTitle.slice(0, 18),
          url: targetUrl,
          colorBg: chosenColor,
          textColor: 'text-white',
          letter: cleanTitle.charAt(0).toUpperCase() || 'W',
        });
        localStorage.setItem('omarvio_shortcuts_v5', JSON.stringify(list));
        localStorage.setItem('omarvio_custom_shortcuts', JSON.stringify(list));
        window.dispatchEvent(new Event('omarvio-shortcuts-updated'));
        emitBrowserEvent('SHORTCUTS_UPDATED', { count: list.length, latestUrl: targetUrl });
      }
    } catch {}

    const pinnedNative = pinWebsiteToAndroidHomeScreen(targetUrl, cleanTitle);
    setAddToHomeModal((prev) => ({ ...prev, isOpen: false }));
    if (pinnedNative) {
      triggerToast(`📲 "${cleanTitle}" ফোনের হোম স্ক্রিন ও ওমারভিও হোমে যুক্ত হয়েছে!`);
    } else if (addToHomeModal.isPwaHome) {
      triggerToast('📲 ব্রাউজার মেনু (⋮) থেকে "Add to Home screen" / "Install app" চাপুন');
    } else {
      triggerToast(`📲 "${cleanTitle}" ওমারভিও হোম স্ক্রিনে পিন করা হয়েছে!`);
    }
  };

  const handleOpenSearchSuggestions = (initialText = '') => {
    setSearchOverlayQuery(initialText || activeTab.url || '');
    setIsSearchOverlayOpen(true);
  };

  const handleCloseTab = (tabIdToClose: string) => {
    clearSleepingTab(tabIdToClose);
    if (tabs.length <= 1) {
      const freshTab = createDefaultTab();
      setTabs([freshTab]);
      setActiveTabId(freshTab.id);
      return;
    }

    const newTabs = tabs.filter((tabItem) => tabItem.id !== tabIdToClose);
    setTabs(newTabs);

    if (activeTabId === tabIdToClose) {
      setActiveTabId(newTabs[newTabs.length - 1].id);
    }
  };

  const handleSelectTab = (tabId: string) => {
    markTabSwitchStart();
    wakeSleepingTab(tabId);
    setTabs((prev) =>
      prev.map((tabItem) =>
        tabItem.id === tabId && tabItem.isSleeping
          ? { ...tabItem, isSleeping: false }
          : tabItem
      )
    );
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
      if (!activeTab.isIncognito) {
        addBrowsingHistory(targetUrl);
      }
      if (isAndroidShell && openUrlInNativeAndroid(targetUrl, !!activeTab.isIncognito)) {
        return;
      }
    }
    try {
      window.history.pushState({ url: targetUrl, time: Date.now() }, '');
    } catch {}
    wakeSleepingTab(activeTabId);
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
            isLoading: Boolean(targetUrl),
            isReadingMode: false,
            isSleeping: false,
          };
        }
        return tab;
      })
    );
  };

  // Pre-flight Adblocker Middleware + Link Clinic Security Scanner + Navigation
  const handleNavigate = (rawUrl: string) => {
    if (!rawUrl) {
      executeNavigate('');
      return;
    }

    const mw = runAdblockerMiddleware({
      url: rawUrl,
      resourceType: 'document',
    });

    if (!mw.allowed) {
      triggerToast(
        mw.blockedBy === 'ad'
          ? '🚫 Blocked by Ads Filtering middleware before loading.'
          : '🛡️ Blocked by Aggressive Tracker Blocking middleware before loading.'
      );
      return;
    }

    const cleanUrl = mw.cleanedUrl;
    if (mw.strippedParams.length > 0 || mw.unwrappedRedirect) {
      triggerToast(
        `🛡️ Privacy Middleware: Cleaned ${
          mw.strippedParams.length > 0 ? `${mw.strippedParams.length} tracking tokens` : 'tracking redirect'
        } from URL!`
      );
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
    const mw = runAdblockerMiddleware({
      url: newUrl,
      resourceType: 'document',
      recordStats: false,
    });
    if (!mw.allowed) {
      triggerToast(
        mw.blockedBy === 'ad'
          ? '🚫 Ads Filtering blocked a frame navigation attempt.'
          : '🛡️ Aggressive Tracker Blocking stopped a tracker navigation attempt.'
      );
      return;
    }
    const cleanUrl = mw.cleanedUrl;
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

      {/* Smart Auto-Hide "Add to Home Screen" Banner (hidden inside Native Android APK) */}
      {!isAndroidShell && <InstallBanner />}

      {/* Unified Top Browser Header (Consistent structure & styling across Home & Browsing modes) */}
      <header
        className={`w-full border-b px-2.5 sm:px-4 py-2 flex flex-col gap-1.5 z-30 safe-top shadow-md transition-colors ${
          isOledDark ? 'bg-black border-neutral-900' : 'bg-[#18191c] border-neutral-800'
        }`}
      >
        <div className="w-full flex items-center gap-1 sm:gap-1.5">
          {/* Desktop Navigation buttons (hidden on mobile, where bottom bar is used) */}
          <div className="hidden md:flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleGoBack}
              disabled={!activeTab.canGoBack}
              className={`p-1.5 rounded-full transition-colors touch-manipulation ${
                activeTab.canGoBack
                  ? 'text-slate-200 hover:text-white hover:bg-white/10 active:scale-95 cursor-pointer'
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
                  ? 'text-slate-200 hover:text-white hover:bg-white/10 active:scale-95 cursor-pointer'
                  : 'text-slate-600 cursor-not-allowed'
              }`}
              title="Forward"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={handleReload}
              disabled={!activeTab.url}
              className={`p-1.5 rounded-full transition-colors touch-manipulation ${
                activeTab.url
                  ? 'text-slate-300 hover:text-white hover:bg-white/10 active:scale-95 cursor-pointer'
                  : 'text-slate-600 cursor-not-allowed'
              }`}
              title="Reload"
            >
              <RotateCw className={`w-4 h-4 ${activeTab.isLoading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>

          {/* Left Anchor: Compact Brand Mark on Home / Home Icon during active browsing */}
          {!activeTab.url ? (
            <button
              type="button"
              onClick={handleGoHome}
              title="OMARVIO Home"
              className="p-1 sm:px-2 sm:py-1 rounded-full hover:bg-white/10 transition-colors touch-manipulation active:scale-95 shrink-0 flex items-center cursor-pointer"
            >
              <HeaderBranding compact={true} hideTextOnMobile={true} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleGoHome}
              className="p-1.5 sm:p-2 rounded-full text-cyan-400 hover:text-white hover:bg-white/10 transition-colors touch-manipulation active:scale-95 shrink-0 cursor-pointer"
              title="Home"
            >
              <Home className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}

          {/* Unified Omnibox Address & Search Bar */}
          <div className="flex-1 min-w-0">
            <Omnibox
              currentUrl={activeTab.url}
              isLoading={activeTab.isLoading}
              onNavigate={handleNavigate}
              onOpenLens={() => setIsLensOpen(true)}
              onOpenSearchOverlay={() => handleOpenSearchSuggestions(activeTab.url)}
              onOpenSiteControls={() => setIsSiteControlsOpen(true)}
            />
          </div>

          {/* Right Action Controls (Unified across Home & Browsing modes) */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Quick Reading Mode Toggle: visible on tablet/desktop */}
            <button
              type="button"
              onClick={() => handleToggleReadingMode()}
              disabled={!activeTab.url}
              title={
                activeTab.isReadingMode
                  ? 'Exit Reading Mode'
                  : 'Reading Mode (Strip sidebars, ads & footers)'
              }
              className={`hidden sm:flex w-8 h-8 rounded-lg items-center justify-center transition-colors active:scale-95 shrink-0 touch-manipulation ${
                !activeTab.url
                  ? 'text-slate-600 cursor-not-allowed opacity-50'
                  : activeTab.isReadingMode
                  ? 'bg-cyan-500/20 border border-cyan-400/60 text-cyan-300 cursor-pointer'
                  : 'text-[#c4c7c5] hover:text-white hover:bg-[#3c4043] cursor-pointer'
              }`}
            >
              <BookOpen className="w-4 h-4" />
            </button>

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

            {/* Always-Visible Top Update Button on every release */}
            {isAndroidShell ? (
              <button
                type="button"
                onClick={() => {
                  if (!triggerAndroidAppUpdateCheck()) {
                    window.location.href = liveApkStatus?.directApkUrl || '/api/download-apk?direct=1';
                  }
                }}
                title={`অ্যাপ আপডেট করুন (v${liveApkStatus?.version || '2.0.0.14'})`}
                className="h-8 px-2 sm:px-2.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 border border-emerald-400/50 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm transition-colors active:scale-95 cursor-pointer shrink-0 touch-manipulation whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">আপডেট</span>
                <span className="font-mono text-[10px]">v{liveApkStatus?.version || '2.0.0.14'}</span>
              </button>
            ) : (
              <a
                href={liveApkStatus?.directApkUrl || '/api/download-apk?direct=1'}
                download="omarvio-browser.apk"
                title={`নতুন ভার্সন APK ডাউনলোড/আপডেট করুন (v${liveApkStatus?.version || '2.0.0.14'})`}
                className="h-8 px-2 sm:px-2.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 border border-emerald-400/50 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm transition-colors active:scale-95 cursor-pointer shrink-0 touch-manipulation whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">আপডেট</span>
                <span className="font-mono text-[10px]">v{liveApkStatus?.version || '2.0.0.14'}</span>
              </a>
            )}

            {/* Privacy Shield Badge with Real-Time Blocked Counter */}
            <button
              type="button"
              onClick={() => openSettings('privacy')}
              title={`OMARVIO Privacy Shield (${liveBlockedCount} ads & trackers blocked)`}
              className="h-8 px-2 rounded-lg bg-cyan-950/70 border border-cyan-500/35 flex items-center gap-1 text-cyan-300 hover:bg-cyan-900/60 transition-colors active:scale-95 cursor-pointer shrink-0 touch-manipulation"
            >
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              {liveBlockedCount > 0 && (
                <span className="text-[10px] font-mono font-bold text-cyan-200 tabular-nums">
                  {liveBlockedCount}
                </span>
              )}
            </button>

            {/* Tab Counter Badge [N] */}
            <button
              type="button"
              onClick={() => setIsTabSwitcherOpen(true)}
              title="Tabs Overview"
              className="w-8 h-8 rounded-lg border border-[#3c4043] bg-[#28292c] text-[#e3e3e3] hover:text-white hover:border-cyan-400/60 font-mono font-bold text-xs tabular-nums transition-colors flex items-center justify-center active:scale-95 shadow-sm cursor-pointer shrink-0 touch-manipulation"
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
        </div>

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
            onOpenBookmarks={() => openSettings('vault')}
          />
        )}

        {/* Module M3: Zero-Reload Multi-Tab Container (Active visible, alive tabs mounted) */}
        {tabs.map((tab) => {
          if (!tab.url) return null;
          const isAlive = aliveTabIds.includes(tab.id);
          const isActive = tab.id === activeTabId;
          const isSleeping = !isAlive || Boolean(tab.isSleeping);
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
                isReadingMode={!!tab.isReadingMode}
                isActive={isActive}
                isSleeping={isSleeping}
                onLoadStart={() => handleLoadStart(tab.id)}
                onLoadEnd={() => handleLoadEnd(tab.id)}
                onUrlChange={(newUrl) => handleUrlChangeFromFrame(newUrl, tab.id)}
                onToggleReadingMode={(next) => handleToggleReadingMode(next, tab.id)}
                onToast={triggerToast}
                onShare={handleShare}
                onWakeTab={() => handleWakeTab(tab.id)}
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

      {/* Mobile Tab Switcher Modal (2-Column Grid with Visual Tab Groups & Drag-and-Drop) */}
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
        onGroupTabs={handleGroupTabs}
        onAddTabToNewGroup={handleAddTabToGroup}
        onAssignTabToGroup={handleAssignTabToGroup}
        onRemoveTabFromGroup={handleRemoveTabFromGroup}
        onRenameGroup={handleRenameGroup}
        onCloseGroup={handleCloseGroup}
        onNewTabInGroup={handleNewTabInGroup}
        onDuplicateTab={handleDuplicateTab}
        onSleepTab={handleSleepTab}
      />

      {/* Chrome Android Authentic 3-Dot Overflow Menu Dropdown */}
      <ChromeMenuDropdown
        isOpen={isChromeMenuOpen}
        onClose={() => setIsChromeMenuOpen(false)}
        isHomePage={!activeTab.url}
        canGoBack={activeTab.canGoBack}
        canGoForward={activeTab.canGoForward}
        isBookmarked={Boolean(activeTab.url && (activeTab.isBookmarked || isUrlBookmarked(activeTab.url)))}
        isDesktopMode={!!activeTab.isDesktopMode}
        isReadingMode={!!activeTab.isReadingMode}
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
        onOpenDownloads={() => {
          if (!openAndroidDownloadsHub()) {
            setIsDownloadsOpen(true);
          }
        }}
        onOpenBookmarks={() => openSettings('vault')}
        onOpenRecentTabs={() => setIsTabSwitcherOpen(true)}
        onShare={() => handleShare()}
        onFindInPage={() => setIsFindInPageOpen(true)}
        onTranslate={handleTranslateWebPage}
        onToggleReadingMode={() => handleToggleReadingMode()}
        onInstallShortcut={handleInstallShortcut}
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
        onSelectTab={handleSelectTab}
        onNewTabWithQuery={(q) => {
          const targetUrl = q.includes('.')
            ? q.startsWith('http')
              ? q
              : `https://${q}`
            : `https://duckduckgo.com/?q=${encodeURIComponent(q)}`;
          if (isAndroidShell && openUrlInNativeAndroid(targetUrl)) {
            addBrowsingHistory(targetUrl);
            return;
          }
          const newTab = createDefaultTab();
          newTab.url = targetUrl;
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
            onOpenDownloads={() => {
              if (!openAndroidDownloadsHub()) {
                setIsDownloadsOpen(true);
              }
            }}
            onTranslatePage={handleTranslateWebPage}
            onToast={triggerToast}
            currentUrl={activeTab.url}
            onNavigate={handleNavigate}
            tabs={tabs}
            aliveTabIds={aliveTabIds}
            activeTabId={activeTabId}
            activeMediaUrl={activeMedia?.src || null}
            energySaverEnabled={energySaverEnabled}
            onToggleEnergySaver={handleToggleEnergySaver}
            onSleepTab={handleSleepTab}
            onSleepAllBackgroundTabs={handleSleepAllBackgroundTabs}
            onCloseTab={handleCloseTab}
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

      {/* Chrome-Style Add to Home Screen / PWA Install Modal */}
      {addToHomeModal.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn"
          onClick={() => setAddToHomeModal((prev) => ({ ...prev, isOpen: false }))}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-[#202124] border border-[#3c4043] p-5 shadow-2xl text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-black text-lg shadow-lg shrink-0">
                {(addToHomeModal.title.trim().charAt(0) || 'O').toUpperCase()}
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-white">Add to Home screen</h3>
                <p className="text-[11px] text-slate-400 truncate">{addToHomeModal.url}</p>
              </div>
            </div>

            <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
              শর্টকাট বা অ্যাপের নাম
            </label>
            <input
              type="text"
              value={addToHomeModal.title}
              onChange={(e) =>
                setAddToHomeModal((prev) => ({ ...prev, title: e.target.value }))
              }
              maxLength={32}
              className="w-full px-3 py-2.5 rounded-xl bg-[#28292c] border border-[#3c4043] focus:border-cyan-400 focus:outline-none text-sm text-white mb-4"
              placeholder="Website name"
            />

            <div className="flex flex-col gap-2">
              {hasPwaPrompt && !isAndroidShell && (
                <button
                  type="button"
                  onClick={() => handleConfirmAddToHomeScreen('pwa')}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-xs cursor-pointer transition-all active:scale-95"
                >
                  Install PWA App (ডাইরেক্ট অ্যাপ ইনস্টল)
                </button>
              )}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setAddToHomeModal((prev) => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/10 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmAddToHomeScreen('shortcut')}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer transition-all active:scale-95"
                >
                  Add (হোম স্ক্রিনে পিন করুন)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-cyan-950/95 border border-cyan-400/50 text-cyan-200 text-xs font-semibold shadow-2xl backdrop-blur-md animate-bounce">
          {showToast}
        </div>
      )}
    </div>
  );
}

