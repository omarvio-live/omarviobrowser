/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OMARVIO BROWSER - Module M10 Performance & Diagnostics Telemetry Engine
 * Local-only metrics (0% telemetry sent to servers).
 */

import { Tab } from '../types/browser';

interface PerfMetrics {
  lastTabSwitchMs: number;
  lastSearchMs: number;
  memoryGB: number;
  activeTabsAlive: number;
}

export interface TabEnergyProfile {
  tabId: string;
  title: string;
  url: string;
  domain: string;
  isActive: boolean;
  isSleeping: boolean;
  isAlive: boolean;
  estimatedMB: number;
  energyScore: number;
  isHighEnergy: boolean;
  reasonBn: string;
  reasonEn: string;
}

export interface BatteryHealthInsight {
  sleepingTabsCount: number;
  estimatedSavedRamMB: number;
  projectedExtensionMinutes: number;
  projectedExtensionLabel: string;
  batterySavePercent: number;
  energySaverActive: boolean;
  healthScore: number;
  healthGradeBn: string;
  summaryBn: string;
}

export interface ProcessMemorySnapshot {
  usedHeapMB: number;
  totalHeapMB: number;
  heapLimitMB: number;
  estimatedTabsMB: number;
  totalProcessMB: number;
  percentUsed: number;
  isLiveHeapApi: boolean;
  aliveCount: number;
  sleepingCount: number;
  highEnergyCount: number;
  batteryHealth: BatteryHealthInsight;
  tabProfiles: TabEnergyProfile[];
}

const HEAVY_MEDIA_HOSTS = [
  'youtube.com',
  'youtu.be',
  'facebook.com',
  'fb.watch',
  'instagram.com',
  'tiktok.com',
  'twitch.tv',
  'vimeo.com',
  'netflix.com',
  'soundcloud.com',
  'spotify.com',
];

function extractDomainLabel(url: string): string {
  if (!url) return 'New Tab';
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./i, '');
  } catch {
    return url.slice(0, 32);
  }
}

const metrics: PerfMetrics = {
  lastTabSwitchMs: 0,
  lastSearchMs: 0,
  memoryGB: typeof navigator !== 'undefined' && 'deviceMemory' in navigator ? (navigator as any).deviceMemory : 4,
  activeTabsAlive: 1,
};

let tabSwitchStartTime = 0;

export function markTabSwitchStart() {
  tabSwitchStartTime = performance.now();
}

export function measureTabSwitchEnd(aliveCount?: number): number {
  if (tabSwitchStartTime === 0) return 0;
  const elapsed = Math.round(performance.now() - tabSwitchStartTime);
  metrics.lastTabSwitchMs = elapsed;
  if (aliveCount !== undefined) metrics.activeTabsAlive = aliveCount;
  tabSwitchStartTime = 0;
  return elapsed;
}

export function recordSearchLatency(ms: number) {
  metrics.lastSearchMs = Math.round(ms);
}

export function getLocalMetrics(): PerfMetrics {
  return { ...metrics };
}

/**
 * Computes real-time process memory usage (using Chrome performance.memory JS heap API when available)
 * and scores each open tab to detect High-Energy tabs for manual Sleep / Close controls.
 */
export function getRealtimeProcessMemorySnapshot(
  tabs: Tab[],
  aliveTabIds: string[],
  activeTabId: string,
  activeMediaUrl: string | null = null,
  energySaverActive = false
): ProcessMemorySnapshot {
  const perfMem =
    typeof performance !== 'undefined' ? (performance as any).memory : undefined;
  const isLiveHeapApi = Boolean(
    perfMem && typeof perfMem.usedJSHeapSize === 'number' && perfMem.usedJSHeapSize > 0
  );

  const usedHeapMB = isLiveHeapApi
    ? Math.round((perfMem.usedJSHeapSize / (1024 * 1024)) * 10) / 10
    : 28;
  const totalHeapMB = isLiveHeapApi
    ? Math.round((perfMem.totalJSHeapSize / (1024 * 1024)) * 10) / 10
    : 48;
  const heapLimitMB = isLiveHeapApi
    ? Math.round(perfMem.jsHeapSizeLimit / (1024 * 1024))
    : Math.max(512, (metrics.memoryGB || 4) * 256);

  let estimatedTabsMB = 0;
  let aliveCount = 0;
  let sleepingCount = 0;

  const tabProfiles: TabEnergyProfile[] = tabs.map((tab) => {
    const isActive = tab.id === activeTabId;
    const isWebTab = Boolean(tab.url);
    const isAlive = isWebTab && !tab.isSleeping && aliveTabIds.includes(tab.id);
    const isSleeping = isWebTab && !isAlive;

    if (!isWebTab) {
      return {
        tabId: tab.id,
        title: tab.title || 'Home',
        url: '',
        domain: 'omarvio://home',
        isActive,
        isSleeping: false,
        isAlive: true,
        estimatedMB: 6,
        energyScore: 5,
        isHighEnergy: false,
        reasonBn: 'হালকা হোম স্ক্রিন',
        reasonEn: 'Lightweight home tab',
      };
    }

    if (isSleeping) {
      sleepingCount += 1;
      return {
        tabId: tab.id,
        title: tab.title || extractDomainLabel(tab.url),
        url: tab.url,
        domain: extractDomainLabel(tab.url),
        isActive,
        isSleeping: true,
        isAlive: false,
        estimatedMB: 0,
        energyScore: 0,
        isHighEnergy: false,
        reasonBn: 'স্লিপিং মোড · ০MB',
        reasonEn: 'Sleeping · 0 MB',
      };
    }

    aliveCount += 1;
    const domain = extractDomainLabel(tab.url);
    const lowerUrl = tab.url.toLowerCase();
    const hasHeavyMedia =
      Boolean(activeMediaUrl && activeMediaUrl === tab.url) ||
      HEAVY_MEDIA_HOSTS.some((h) => domain.includes(h) || lowerUrl.includes(h));

    let energyScore = isActive ? 22 : 46;
    let tabMB = energySaverActive ? 34 : 46;
    const reasonsBn: string[] = [];
    const reasonsEn: string[] = [];

    if (!isActive) {
      reasonsBn.push('ব্যাকগ্রাউন্ডে সক্রিয়');
      reasonsEn.push('Awake in background');
      tabMB += 12;
    } else {
      reasonsBn.push('সক্রিয় ফোরগ্রাউন্ড ট্যাব');
      reasonsEn.push('Active foreground');
    }

    if (hasHeavyMedia) {
      energyScore += 36;
      tabMB += 48;
      reasonsBn.unshift('ভিডিও / মিডিয়া স্ট্রিম');
      reasonsEn.unshift('Video / media playback');
    }

    if (tab.isLoading) {
      energyScore += 18;
      tabMB += 16;
      reasonsBn.push('রেন্ডারিং চলছে');
      reasonsEn.push('Loading scripts');
    }

    if (tab.isDesktopMode) {
      energyScore += 14;
      tabMB += 18;
      reasonsBn.push('ডেস্কটপ ভিউপোর্ট');
      reasonsEn.push('Desktop viewport');
    }

    if (tab.isReadingMode) {
      energyScore = Math.max(10, energyScore - 15);
      tabMB = Math.max(18, tabMB - 16);
    }

    const clampedScore = Math.min(100, energyScore);
    const isHighEnergy = clampedScore >= 45 || (hasHeavyMedia && !tab.isReadingMode);
    estimatedTabsMB += tabMB;

    return {
      tabId: tab.id,
      title: tab.title || domain,
      url: tab.url,
      domain,
      isActive,
      isSleeping: false,
      isAlive: true,
      estimatedMB: tabMB,
      energyScore: clampedScore,
      isHighEnergy,
      reasonBn: reasonsBn.slice(0, 2).join(' · '),
      reasonEn: reasonsEn.slice(0, 2).join(' · '),
    };
  });

  const homeTabsMB = tabs.filter((t) => !t.url).length * 6;
  const totalProcessMB = Math.round((usedHeapMB + estimatedTabsMB + homeTabsMB) * 10) / 10;
  const baselineCeilingMB = isLiveHeapApi
    ? Math.max(256, Math.min(heapLimitMB, 768))
    : Math.max(256, (metrics.memoryGB || 4) * 192);
  const percentUsed = Math.min(100, Math.max(4, Math.round((totalProcessMB / baselineCeilingMB) * 100)));

  const sortedProfiles = [...tabProfiles].sort((a, b) => b.energyScore - a.energyScore);
  const highEnergyCount = sortedProfiles.filter((p) => p.isHighEnergy).length;

  // Projected Battery Health Insight based on sleeping tabs + Energy Saver status
  const estimatedSavedRamMB =
    sleepingCount * 54 + (energySaverActive ? Math.max(24, aliveCount * 12) : 0);
  const perSleepingTabMinutes = energySaverActive ? 12 : 9;
  const baseThrottleMinutes = energySaverActive ? 18 : 0;
  const projectedExtensionMinutes = Math.min(
    180,
    sleepingCount * perSleepingTabMinutes + baseThrottleMinutes
  );

  const extHours = Math.floor(projectedExtensionMinutes / 60);
  const extMins = projectedExtensionMinutes % 60;
  const projectedExtensionLabel =
    projectedExtensionMinutes <= 0
      ? '+0 মি.'
      : extHours > 0
      ? `+${extHours} ঘ. ${extMins} মি.`
      : `+${extMins} মি.`;

  const batterySavePercent = Math.min(
    48,
    sleepingCount * 7 + (energySaverActive ? 14 : 0)
  );
  const rawScore =
    68 +
    (energySaverActive ? 18 : 0) +
    Math.min(18, sleepingCount * 6) -
    Math.min(26, highEnergyCount * 8);
  const healthScore = Math.max(25, Math.min(100, rawScore));
  const healthGradeBn =
    healthScore >= 85
      ? 'চমৎকার (Optimal)'
      : healthScore >= 65
      ? 'ভালো (Balanced)'
      : 'উচ্চ লোড (Heavy Drain)';

  const summaryBn =
    projectedExtensionMinutes > 0
      ? `${sleepingCount}টি স্লিপিং ট্যাব ও ${
          energySaverActive ? 'এনার্জি সেভার' : 'স্ট্যান্ডার্ড মোড'
        } থেকে ~${estimatedSavedRamMB} MB RAM এবং ${projectedExtensionLabel} অতিরিক্ত ব্যাটারি ব্যাকআপ পাওয়া যাচ্ছে।`
      : 'অতিরিক্ত ব্যাটারি সেভ করতে ব্যাকগ্রাউন্ড ট্যাব স্লিপ করুন অথবা এনার্জি সেভার চালু করুন।';

  return {
    usedHeapMB,
    totalHeapMB,
    heapLimitMB,
    estimatedTabsMB: Math.round(estimatedTabsMB + homeTabsMB),
    totalProcessMB,
    percentUsed,
    isLiveHeapApi,
    aliveCount,
    sleepingCount,
    highEnergyCount,
    batteryHealth: {
      sleepingTabsCount: sleepingCount,
      estimatedSavedRamMB,
      projectedExtensionMinutes,
      projectedExtensionLabel,
      batterySavePercent,
      energySaverActive,
      healthScore,
      healthGradeBn,
      summaryBn,
    },
    tabProfiles: sortedProfiles,
  };
}
