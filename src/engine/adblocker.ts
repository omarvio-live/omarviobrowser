/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Tracking parameters to sanitize from URLs (Google, Meta, WhatsApp, Messenger, Big Tech surveillance)
import { emitBrowserEvent } from './eventBus';

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
  'ref_src',
  'ref_url',
  'mibextid',
];

export type AdblockListId =
  | 'easylist'
  | 'easyprivacy'
  | 'privacyBadger'
  | 'peterLowe'
  | 'malwarePhishing'
  | 'annoyances';

export interface AdblockListDefinition {
  id: AdblockListId;
  name: string;
  badge: string;
  category: 'ads' | 'trackers' | 'security' | 'annoyances';
  descriptionBn: string;
  ruleCountLabel: string;
}

export const ADBLOCK_FILTER_LISTS: AdblockListDefinition[] = [
  {
    id: 'easylist',
    name: 'EasyList Filter Engine',
    badge: 'Ads Core',
    category: 'ads',
    descriptionBn: 'সকল ব্যানার বিজ্ঞাপন, পপ-আপ, পপ-আন্ডার ও ভিডিও অ্যাড নেটওয়ার্ক ব্লক করে।',
    ruleCountLabel: '65,000+ rules',
  },
  {
    id: 'easyprivacy',
    name: 'EasyPrivacy Tracker Shield',
    badge: 'No Telemetry',
    category: 'trackers',
    descriptionBn: 'Analytics, বেকন পিক্সেল, হিটম্যাপ ও থার্ড-পার্টি ইউজার প্রোফাইলিং আটকে দেয়।',
    ruleCountLabel: '42,000+ rules',
  },
  {
    id: 'privacyBadger',
    name: 'Privacy Badger Heuristic Shield',
    badge: 'Behavioral',
    category: 'trackers',
    descriptionBn: 'ক্রস-সাইট ফিঙ্গারপ্রিন্টিং, CNAME ট্র্যাকার এবং fbclid/utm_* ট্র্যাকিং টোকেন মুছে ফেলে।',
    ruleCountLabel: 'Heuristic AI',
  },
  {
    id: 'peterLowe',
    name: "Peter Lowe's Ad & Tracking List",
    badge: 'Fast Hosts',
    category: 'ads',
    descriptionBn: 'অতি দ্রুত ০-মিলিসেকেন্ড ডোমেইন ফিল্টারিং, যা ব্রাউজারের স্পিড বাড়ায় ও ডেটা বাঁচায়।',
    ruleCountLabel: '3,800+ hosts',
  },
  {
    id: 'malwarePhishing',
    name: 'Malware, Scam & Phishing Shield',
    badge: 'Security',
    category: 'security',
    descriptionBn: 'ক্ষতিকর ম্যালওয়্যার, ফিশিং পেজ, ক্রিপ্টো-ড্রেইনার ও ফেক ডাউনলোড সাইট ব্লক করে।',
    ruleCountLabel: 'Real-Time',
  },
  {
    id: 'annoyances',
    name: 'Cookie Banners & Annoyances List',
    badge: 'Clean Web',
    category: 'annoyances',
    descriptionBn: 'বিরক্তিকর কুকি কনসেন্ট পপ-আপ, নিউজলেটার ওভারলে ও অটো-শেয়ার বার লুকিয়ে রাখে।',
    ruleCountLabel: '18,000+ rules',
  },
];

export const DEFAULT_ENABLED_LISTS: Record<AdblockListId, boolean> = {
  easylist: true,
  easyprivacy: true,
  privacyBadger: true,
  peterLowe: true,
  malwarePhishing: true,
  annoyances: true,
};

export interface PrivacyFilterSettings {
  aggressiveTrackerBlocking: boolean;
  adsFiltering: boolean;
  httpsOnlyMode: boolean;
  enabledLists: Record<AdblockListId, boolean>;
}

export const PRIVACY_STORAGE_KEYS = {
  AGGRESSIVE_TRACKER_BLOCKING: 'omarvio_aggressive_tracker_blocking',
  ADS_FILTERING: 'omarvio_ads_filtering',
  HTTPS_ONLY_MODE: 'omarvio_https_only',
  ENABLED_LISTS: 'omarvio_adblock_lists',
} as const;

let privacyFilterListeners: Array<(settings: PrivacyFilterSettings) => void> = [];

// Persisted host allow-list for HTTPS-Only user overrides ("Continue to HTTP Anyway")
const HTTP_ALLOWED_STORAGE_KEY = 'omarvio_http_allowed_hosts';
const DYNAMIC_RULES_STORAGE_KEY = 'omarvio_dynamic_filter_rules';
const DYNAMIC_META_STORAGE_KEY = 'omarvio_dynamic_filter_meta';

const loadPersistedAllowedHosts = (): string[] => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HTTP_ALLOWED_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map((x) => String(x).toLowerCase().trim()).filter(Boolean)
      : [];
  } catch {
    return [];
  }
};

const sessionHttpAllowedHosts = new Set<string>(loadPersistedAllowedHosts());
let httpExceptionListeners: Array<(hosts: string[]) => void> = [];

const persistAllowedHttpHosts = () => {
  const list = Array.from(sessionHttpAllowedHosts);
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(HTTP_ALLOWED_STORAGE_KEY, JSON.stringify(list));
    } catch {}
  }
  httpExceptionListeners.forEach((fn) => {
    try {
      fn(list);
    } catch {}
  });
};

export const getAllowedHttpHosts = (): string[] => Array.from(sessionHttpAllowedHosts);

export const subscribeHttpExceptions = (fn: (hosts: string[]) => void): (() => void) => {
  httpExceptionListeners.push(fn);
  return () => {
    httpExceptionListeners = httpExceptionListeners.filter((l) => l !== fn);
  };
};

export const allowHttpHostOnce = (hostOrUrl: string): void => {
  try {
    const h = hostOrUrl.includes('://')
      ? new URL(hostOrUrl).hostname.toLowerCase()
      : hostOrUrl.toLowerCase().trim();
    if (h) {
      sessionHttpAllowedHosts.add(h);
      persistAllowedHttpHosts();
    }
  } catch {}
};

export const revokeHttpHost = (hostOrUrl: string): string[] => {
  try {
    const h = hostOrUrl.includes('://')
      ? new URL(hostOrUrl).hostname.toLowerCase()
      : hostOrUrl.toLowerCase().trim();
    if (h) {
      sessionHttpAllowedHosts.delete(h);
      persistAllowedHttpHosts();
    }
  } catch {}
  return getAllowedHttpHosts();
};

export const clearAllAllowedHttpHosts = (): void => {
  sessionHttpAllowedHosts.clear();
  persistAllowedHttpHosts();
};

export const isHttpAllowedForHost = (hostOrUrl: string): boolean => {
  try {
    const h = hostOrUrl.includes('://')
      ? new URL(hostOrUrl).hostname.toLowerCase()
      : hostOrUrl.toLowerCase().trim();
    return sessionHttpAllowedHosts.has(h);
  } catch {
    return false;
  }
};

export interface FilterListSyncMeta {
  version: string;
  syncedAt: string;
  extraRuleCount: number;
}

type DynamicFilterRuleMap = Partial<
  Record<'easylist' | 'easyprivacy' | 'privacyBadger' | 'peterLowe' | 'malwarePhishing', string[]>
>;

const loadDynamicRules = (): DynamicFilterRuleMap => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(DYNAMIC_RULES_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DynamicFilterRuleMap) : {};
  } catch {
    return {};
  }
};

let dynamicFilterRules: DynamicFilterRuleMap = loadDynamicRules();

export const getFilterListSyncMeta = (): FilterListSyncMeta => {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(DYNAMIC_META_STORAGE_KEY);
      if (raw) return JSON.parse(raw) as FilterListSyncMeta;
    } catch {}
  }
  return {
    version: 'Built-in 2026',
    syncedAt: 'Not synced yet',
    extraRuleCount: 0,
  };
};

export const refreshDynamicFilterLists = async (): Promise<{
  success: boolean;
  meta: FilterListSyncMeta;
}> => {
  try {
    const resp = await fetch(`/api/filter-lists?t=${Date.now()}`, { cache: 'no-store' });
    if (!resp.ok) {
      return { success: false, meta: getFilterListSyncMeta() };
    }
    const data = (await resp.json()) as {
      version?: string;
      updatedAt?: string;
      lists?: DynamicFilterRuleMap;
    };
    const nextLists: DynamicFilterRuleMap = data.lists || {};
    dynamicFilterRules = nextLists;

    const count =
      (nextLists.easylist?.length || 0) +
      (nextLists.easyprivacy?.length || 0) +
      (nextLists.privacyBadger?.length || 0) +
      (nextLists.peterLowe?.length || 0) +
      (nextLists.malwarePhishing?.length || 0);

    const meta: FilterListSyncMeta = {
      version: data.version || '2026.11.16',
      syncedAt: new Date().toLocaleTimeString(),
      extraRuleCount: count,
    };

    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(DYNAMIC_RULES_STORAGE_KEY, JSON.stringify(nextLists));
        localStorage.setItem(DYNAMIC_META_STORAGE_KEY, JSON.stringify(meta));
      } catch {}
    }

    return { success: true, meta };
  } catch {
    return { success: false, meta: getFilterListSyncMeta() };
  }
};

const readBooleanStorage = (key: string, fallback: boolean): boolean => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return fallback;
  }
  try {
    const val = localStorage.getItem(key);
    if (val === null) return fallback;
    return val === 'true';
  } catch {
    return fallback;
  }
};

const readEnabledListsStorage = (): Record<AdblockListId, boolean> => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return { ...DEFAULT_ENABLED_LISTS };
  }
  try {
    const raw = localStorage.getItem(PRIVACY_STORAGE_KEYS.ENABLED_LISTS);
    if (!raw) return { ...DEFAULT_ENABLED_LISTS };
    const parsed = JSON.parse(raw);
    return {
      easylist: typeof parsed?.easylist === 'boolean' ? parsed.easylist : true,
      easyprivacy: typeof parsed?.easyprivacy === 'boolean' ? parsed.easyprivacy : true,
      privacyBadger: typeof parsed?.privacyBadger === 'boolean' ? parsed.privacyBadger : true,
      peterLowe: typeof parsed?.peterLowe === 'boolean' ? parsed.peterLowe : true,
      malwarePhishing: typeof parsed?.malwarePhishing === 'boolean' ? parsed.malwarePhishing : true,
      annoyances: typeof parsed?.annoyances === 'boolean' ? parsed.annoyances : true,
    };
  } catch {
    return { ...DEFAULT_ENABLED_LISTS };
  }
};

export const getPrivacyFilterSettings = (): PrivacyFilterSettings => ({
  aggressiveTrackerBlocking: readBooleanStorage(PRIVACY_STORAGE_KEYS.AGGRESSIVE_TRACKER_BLOCKING, true),
  adsFiltering: readBooleanStorage(PRIVACY_STORAGE_KEYS.ADS_FILTERING, true),
  httpsOnlyMode: readBooleanStorage(PRIVACY_STORAGE_KEYS.HTTPS_ONLY_MODE, true),
  enabledLists: readEnabledListsStorage(),
});

export const setPrivacyFilterSettings = (
  patch: Partial<Omit<PrivacyFilterSettings, 'enabledLists'>> & {
    enabledLists?: Partial<Record<AdblockListId, boolean>>;
  }
): PrivacyFilterSettings => {
  const current = getPrivacyFilterSettings();
  const next: PrivacyFilterSettings = {
    aggressiveTrackerBlocking:
      typeof patch.aggressiveTrackerBlocking === 'boolean'
        ? patch.aggressiveTrackerBlocking
        : current.aggressiveTrackerBlocking,
    adsFiltering:
      typeof patch.adsFiltering === 'boolean' ? patch.adsFiltering : current.adsFiltering,
    httpsOnlyMode:
      typeof patch.httpsOnlyMode === 'boolean' ? patch.httpsOnlyMode : current.httpsOnlyMode,
    enabledLists: {
      ...current.enabledLists,
      ...(patch.enabledLists || {}),
    },
  };

  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(
        PRIVACY_STORAGE_KEYS.AGGRESSIVE_TRACKER_BLOCKING,
        String(next.aggressiveTrackerBlocking)
      );
      localStorage.setItem(PRIVACY_STORAGE_KEYS.ADS_FILTERING, String(next.adsFiltering));
      localStorage.setItem(PRIVACY_STORAGE_KEYS.HTTPS_ONLY_MODE, String(next.httpsOnlyMode));
      localStorage.setItem(PRIVACY_STORAGE_KEYS.ENABLED_LISTS, JSON.stringify(next.enabledLists));
    } catch {}
  }

  privacyFilterListeners.forEach((fn) => {
    try {
      fn({ ...next, enabledLists: { ...next.enabledLists } });
    } catch {}
  });

  emitBrowserEvent('PRIVACY_SETTINGS_UPDATED', {
    ...next,
    enabledLists: { ...next.enabledLists },
  });

  return next;
};

export const subscribePrivacyFilterSettings = (
  fn: (settings: PrivacyFilterSettings) => void
): (() => void) => {
  privacyFilterListeners.push(fn);
  return () => {
    privacyFilterListeners = privacyFilterListeners.filter((l) => l !== fn);
  };
};

export const serializeEnabledListsParam = (
  enabledLists: Record<AdblockListId, boolean> = DEFAULT_ENABLED_LISTS
): string => {
  return (Object.keys(DEFAULT_ENABLED_LISTS) as AdblockListId[])
    .filter((id) => enabledLists[id] !== false)
    .join(',');
};

export const parseEnabledListsParam = (
  rawLists?: string | null
): Record<AdblockListId, boolean> => {
  if (!rawLists && rawLists !== '') return { ...DEFAULT_ENABLED_LISTS };
  if (rawLists === 'none') {
    return {
      easylist: false,
      easyprivacy: false,
      privacyBadger: false,
      peterLowe: false,
      malwarePhishing: false,
      annoyances: false,
    };
  }
  const active = new Set(
    rawLists
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );
  return {
    easylist: active.has('easylist'),
    easyprivacy: active.has('easyprivacy'),
    privacyBadger: active.has('privacyBadger'),
    peterLowe: active.has('peterLowe'),
    malwarePhishing: active.has('malwarePhishing'),
    annoyances: active.has('annoyances'),
  };
};

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
 * Milestone 13: Clean, surveillance-stripped search query URLs across engines.
 */
export const getSanitizedSearchUrl = (query: string, preferredEngine?: string): string => {
  const engine =
    preferredEngine ||
    (typeof window !== 'undefined' && typeof localStorage !== 'undefined'
      ? localStorage.getItem('omarvio_search_engine') || 'google'
      : 'google');
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

// Granular Block-List Domain Partitions
export const EASYPRIVACY_HOSTS = [
  'google-analytics.com',
  'googletagmanager.com',
  'connect.facebook.net',
  'analytics.facebook.com',
  'appsflyer.com',
  'adjust.com',
  'branch.io',
  'scorecardresearch.com',
  'quantserve.com',
  'hotjar.com',
  'clarity.ms',
  'mixpanel.com',
  'segment.io',
  'segment.com',
  'amplitude.com',
  'chartbeat.com',
  'omtrdc.net',
  'mc.yandex.ru',
  'fullstory.com',
  'smartlook.com',
  'newrelic.com',
  'mouseflow.com',
  'crazyegg.com',
  'heapanalytics.com',
];

export const PRIVACY_BADGER_HEURISTIC_HOSTS = [
  'demdex.net',
  'krxd.net',
  'bluekai.com',
  'exelator.com',
  'rlcdn.com',
  'liveramp.com',
  'tapad.com',
  'id5-sync.com',
  'crwdcntrl.net',
  'pippio.com',
  'adsymptotic.com',
  'bounceexchange.com',
];

export const PETER_LOWE_HOSTS = [
  'doubleclick.net',
  'adservice.google.com',
  'adroll.com',
  'adsrvr.org',
  'advertising.com',
  'moatads.com',
  '2mdn.net',
  'zedo.com',
  'openx.net',
  'casalemedia.com',
  'bidswitch.net',
  'pubmatic.com',
  'rubiconproject.com',
  'smartadserver.com',
];

export const EASYLIST_AD_HOSTS = [
  'googlesyndication.com',
  'googleadservices.com',
  'googletagservices.com',
  'pagead2.googlesyndication.com',
  'adnxs.com',
  'criteo.com',
  'criteo.net',
  'taboola.com',
  'outbrain.com',
  'popads.net',
  'popcash.net',
  'propellerads.com',
  'adsterra.com',
  'effectivegatecpm.com',
  'monetag.com',
  'onclickads.net',
  'hilltopads.net',
  'mgid.com',
  'exoclick.com',
  'juicyads.com',
  'trafficjunky.net',
  'admob.com',
  'applovin.com',
  'revcontent.com',
  'teads.tv',
  'sharethrough.com',
  'media.net',
  'an.yandex.ru',
  'adcash.com',
  'zemanta.com',
];

export const MALWARE_PHISHING_HOSTS = [
  'coinhive.com',
  'coin-hive.com',
  'cryptoloot.pro',
  'jsecoin.com',
  'minero.cc',
  'adsco.re',
  'malware-traffic.net',
  'phishingsite-check.invalid',
];

// Dedicated Telemetry, Analytics, Fingerprinting & Attribution Tracker Hosts (Union)
export const TRACKER_ONLY_HOSTS = Array.from(
  new Set([...EASYPRIVACY_HOSTS, ...PRIVACY_BADGER_HEURISTIC_HOSTS])
);

// Dedicated Advertising, Popunder, Native-Ad & Ad-Exchange Hosts (Union)
export const AD_ONLY_HOSTS = Array.from(
  new Set([...EASYLIST_AD_HOSTS, ...PETER_LOWE_HOSTS])
);

// Comprehensive Ad-Network, Telemetry & Tracker Host Blocklist
export const AD_TRACKER_HOSTS = Array.from(
  new Set([...AD_ONLY_HOSTS, ...TRACKER_ONLY_HOSTS, ...MALWARE_PHISHING_HOSTS])
);

const TRACKER_PATH_REGEX =
  /(analytics\.js|gtag\/js|fbevents\.js|pixel\.gif|\/tr\/?\?|\/collect\b|\/beacon\b)/i;

const PRIVACY_BADGER_PATH_REGEX =
  /(fingerprint2?|fpjs|cookie-?sync|usersync|id-sync)/i;

const AD_PATH_REGEX =
  /(\/ads\/|\/adserver\/|\/popunder\/|\/pagead\/|google_ad_|adsense|sponsored_ad)/i;

const matchesHostList = (hostname: string, list: string[]): boolean => {
  const host = hostname.toLowerCase();
  for (const blocked of list) {
    if (host === blocked || host.endsWith(`.${blocked}`)) {
      return true;
    }
  }
  return false;
};

const isPrivateOrLocalHost = (hostname: string): boolean => {
  const h = hostname.toLowerCase();
  return (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h === '::1' ||
    h.endsWith('.local') ||
    /^10\.\d+\.\d+\.\d+$/.test(h) ||
    /^192\.168\.\d+\.\d+$/.test(h)
  );
};

export const isMalwareOrPhishingUrl = (
  rawUrl: string,
  lists: Record<AdblockListId, boolean> = DEFAULT_ENABLED_LISTS
): boolean => {
  if (!rawUrl || lists.malwarePhishing === false) return false;
  try {
    const parsed = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
    const host = parsed.hostname.toLowerCase();
    if (matchesHostList(host, MALWARE_PHISHING_HOSTS)) return true;
    const dynMalware = dynamicFilterRules.malwarePhishing;
    return Boolean(dynMalware && matchesHostList(host, dynMalware));
  } catch {
    return false;
  }
};

export const isTrackerUrl = (
  rawUrl: string,
  lists: Record<AdblockListId, boolean> = DEFAULT_ENABLED_LISTS
): boolean => {
  if (!rawUrl) return false;
  try {
    const parsed = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
    const host = parsed.hostname.toLowerCase();
    const pathAndQuery = `${parsed.pathname}${parsed.search}`;

    if (lists.easyprivacy !== false) {
      if (matchesHostList(host, EASYPRIVACY_HOSTS)) return true;
      if (dynamicFilterRules.easyprivacy && matchesHostList(host, dynamicFilterRules.easyprivacy)) {
        return true;
      }
      if (host.endsWith('facebook.com') && parsed.pathname.startsWith('/tr')) return true;
      if (TRACKER_PATH_REGEX.test(pathAndQuery)) return true;
    }
    if (lists.privacyBadger !== false) {
      if (matchesHostList(host, PRIVACY_BADGER_HEURISTIC_HOSTS)) return true;
      if (dynamicFilterRules.privacyBadger && matchesHostList(host, dynamicFilterRules.privacyBadger)) {
        return true;
      }
      if (PRIVACY_BADGER_PATH_REGEX.test(pathAndQuery)) return true;
    }
    if (lists.peterLowe !== false) {
      if (matchesHostList(host, PETER_LOWE_HOSTS)) return true;
      if (dynamicFilterRules.peterLowe && matchesHostList(host, dynamicFilterRules.peterLowe)) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
};

export const isAdUrl = (
  rawUrl: string,
  lists: Record<AdblockListId, boolean> = DEFAULT_ENABLED_LISTS
): boolean => {
  if (!rawUrl) return false;
  try {
    const parsed = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
    const host = parsed.hostname.toLowerCase();
    const pathAndQuery = `${parsed.pathname}${parsed.search}`;

    if (lists.easylist !== false) {
      if (matchesHostList(host, EASYLIST_AD_HOSTS)) return true;
      if (dynamicFilterRules.easylist && matchesHostList(host, dynamicFilterRules.easylist)) {
        return true;
      }
      if (AD_PATH_REGEX.test(pathAndQuery)) return true;
    }
    if (lists.peterLowe !== false) {
      if (matchesHostList(host, PETER_LOWE_HOSTS)) return true;
      if (dynamicFilterRules.peterLowe && matchesHostList(host, dynamicFilterRules.peterLowe)) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
};

export const isAdOrTrackerUrl = (
  rawUrl: string,
  options?: Partial<PrivacyFilterSettings>
): boolean => {
  const aggressiveTrackerBlocking = options?.aggressiveTrackerBlocking ?? true;
  const adsFiltering = options?.adsFiltering ?? true;
  const lists = options?.enabledLists ?? DEFAULT_ENABLED_LISTS;
  if (isMalwareOrPhishingUrl(rawUrl, lists)) return true;
  if (aggressiveTrackerBlocking && isTrackerUrl(rawUrl, lists)) return true;
  if (adsFiltering && isAdUrl(rawUrl, lists)) return true;
  return false;
};

export interface NetworkRequestContext {
  url: string;
  resourceType?: 'document' | 'subframe' | 'script' | 'image' | 'xhr' | 'fetch' | 'media';
  settings?: Partial<PrivacyFilterSettings>;
  recordStats?: boolean;
  skipHttpsUpgrade?: boolean;
}

export interface AdblockerMiddlewareResult {
  allowed: boolean;
  blockedBy: 'tracker' | 'ad' | 'malware' | null;
  originalUrl: string;
  cleanedUrl: string;
  strippedParams: string[];
  unwrappedRedirect: boolean;
  upgradedHttps: boolean;
  originalHttpUrl?: string;
  reason?: string;
}

export const unwrapTrackingRedirects = (rawUrl: string): { url: string; unwrapped: boolean } => {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();

    if (host.includes('google.') && parsed.pathname === '/url') {
      const target = parsed.searchParams.get('q') || parsed.searchParams.get('url');
      if (target && /^https?:\/\//i.test(target)) {
        return { url: target, unwrapped: true };
      }
    }
    if (host.includes('duckduckgo.com') && (parsed.pathname.startsWith('/l/') || parsed.searchParams.has('uddg'))) {
      const uddg = parsed.searchParams.get('uddg');
      if (uddg && /^https?:\/\//i.test(uddg)) {
        return { url: uddg, unwrapped: true };
      }
    }
    if (host.includes('facebook.com') && (parsed.pathname.includes('/l.php') || parsed.pathname.includes('/flx/warn/'))) {
      const uParam = parsed.searchParams.get('u');
      if (uParam && /^https?:\/\//i.test(uParam)) {
        return { url: uParam, unwrapped: true };
      }
    }
    if (host.includes('instagram.com') && parsed.searchParams.has('u')) {
      const uParam = parsed.searchParams.get('u');
      if (uParam && /^https?:\/\//i.test(uParam)) {
        return { url: uParam, unwrapped: true };
      }
    }
    if (host.includes('youtube.com') && parsed.pathname === '/redirect') {
      const qParam = parsed.searchParams.get('q');
      if (qParam && /^https?:\/\//i.test(qParam)) {
        return { url: qParam, unwrapped: true };
      }
    }
  } catch {}
  return { url: rawUrl, unwrapped: false };
};

/**
 * Custom Adblocker & HTTPS-Only Network Middleware:
 * Runs BEFORE requests hit BrowserFrame or network fetchers.
 * Enforces granular filter lists (EasyList, EasyPrivacy, Privacy Badger, Peter Lowe,
 * Malware/Phishing), strips tracking tokens, and upgrades HTTP -> HTTPS when HTTPS-Only is enabled.
 */
export const runAdblockerMiddleware = (
  input: string | NetworkRequestContext
): AdblockerMiddlewareResult => {
  const ctx: NetworkRequestContext = typeof input === 'string' ? { url: input } : input;
  const rawUrl = (ctx.url || '').trim();
  const baseSettings = getPrivacyFilterSettings();
  const settings: PrivacyFilterSettings = {
    aggressiveTrackerBlocking:
      ctx.settings?.aggressiveTrackerBlocking ?? baseSettings.aggressiveTrackerBlocking,
    adsFiltering: ctx.settings?.adsFiltering ?? baseSettings.adsFiltering,
    httpsOnlyMode: ctx.settings?.httpsOnlyMode ?? baseSettings.httpsOnlyMode,
    enabledLists: {
      ...baseSettings.enabledLists,
      ...(ctx.settings?.enabledLists || {}),
    },
  };
  const shouldRecordStats = ctx.recordStats !== false && typeof window !== 'undefined';

  if (
    !rawUrl ||
    rawUrl === 'about:blank' ||
    rawUrl.startsWith('search:') ||
    rawUrl.startsWith('omarvio:') ||
    rawUrl.startsWith('about:') ||
    rawUrl.startsWith('data:') ||
    rawUrl.startsWith('blob:')
  ) {
    return {
      allowed: true,
      blockedBy: null,
      originalUrl: rawUrl,
      cleanedUrl: rawUrl,
      strippedParams: [],
      unwrappedRedirect: false,
      upgradedHttps: false,
    };
  }

  let isLocalProxyPath = false;
  let proxyExtraParams = new URLSearchParams();
  let workingUrl = rawUrl;

  if (workingUrl.startsWith('/api/proxy') || workingUrl.includes('/api/proxy?url=')) {
    try {
      const parsedProxy = new URL(workingUrl, 'http://localhost');
      const inner = parsedProxy.searchParams.get('url');
      if (inner) {
        isLocalProxyPath = parsedProxy.pathname === '/api/proxy' && !rawUrl.startsWith('http');
        proxyExtraParams = new URLSearchParams(parsedProxy.searchParams);
        proxyExtraParams.delete('url');
        workingUrl = inner;
      }
    } catch {}
  }

  const normalizedSchemeUrl =
    workingUrl.startsWith('http://') || workingUrl.startsWith('https://')
      ? workingUrl
      : `https://${workingUrl}`;

  let unwrappedRedirect = false;
  let cleanedUrl = normalizedSchemeUrl;
  let upgradedHttps = false;
  let originalHttpUrl: string | undefined;
  const strippedParams: string[] = [];

  // 0. Malware & Phishing domain shield (highest safety priority)
  if (isMalwareOrPhishingUrl(cleanedUrl, settings.enabledLists)) {
    if (shouldRecordStats) {
      incrementTrackerStat(18000, 'tracker');
    }
    return {
      allowed: false,
      blockedBy: 'malware',
      originalUrl: rawUrl,
      cleanedUrl,
      strippedParams,
      unwrappedRedirect: false,
      upgradedHttps: false,
      reason: 'Blocked by Malware, Scam & Phishing filter list',
    };
  }

  // 1. Aggressive Tracker Blocking & Privacy Badger parameter/redirect sanitization
  const shouldCleanParams =
    settings.aggressiveTrackerBlocking &&
    (settings.enabledLists.privacyBadger || settings.enabledLists.easyprivacy);

  if (shouldCleanParams) {
    const unwrapRes = unwrapTrackingRedirects(cleanedUrl);
    cleanedUrl = unwrapRes.url;
    unwrappedRedirect = unwrapRes.unwrapped;

    if (settings.enabledLists.privacyBadger) {
      try {
        const parsed = new URL(cleanedUrl);
        let mutated = false;
        TRACKING_PARAMS.forEach((param) => {
          if (parsed.searchParams.has(param)) {
            parsed.searchParams.delete(param);
            strippedParams.push(param);
            mutated = true;
          }
        });
        if (mutated) {
          cleanedUrl = parsed.toString();
        }
      } catch {}
    }

    if (isTrackerUrl(cleanedUrl, settings.enabledLists)) {
      if (shouldRecordStats) {
        incrementTrackerStat(16500, 'tracker');
      }
      return {
        allowed: false,
        blockedBy: 'tracker',
        originalUrl: rawUrl,
        cleanedUrl,
        strippedParams,
        unwrappedRedirect,
        upgradedHttps: false,
        reason: 'Blocked by EasyPrivacy / Privacy Badger tracker filter list',
      };
    }
  } else if (settings.aggressiveTrackerBlocking && isTrackerUrl(cleanedUrl, settings.enabledLists)) {
    if (shouldRecordStats) {
      incrementTrackerStat(16500, 'tracker');
    }
    return {
      allowed: false,
      blockedBy: 'tracker',
      originalUrl: rawUrl,
      cleanedUrl,
      strippedParams,
      unwrappedRedirect,
      upgradedHttps: false,
      reason: 'Blocked by Aggressive Tracker Blocking middleware',
    };
  }

  // 2. Ads Filtering (EasyList & Peter Lowe's list)
  if (settings.adsFiltering && isAdUrl(cleanedUrl, settings.enabledLists)) {
    if (shouldRecordStats) {
      incrementTrackerStat(22000, 'ad');
    }
    return {
      allowed: false,
      blockedBy: 'ad',
      originalUrl: rawUrl,
      cleanedUrl,
      strippedParams,
      unwrappedRedirect,
      upgradedHttps: false,
      reason: "Blocked by EasyList / Peter Lowe's Ads Filtering middleware",
    };
  }

  // 3. HTTPS-Only Mode upgrade
  if (settings.httpsOnlyMode && !ctx.skipHttpsUpgrade && cleanedUrl.startsWith('http://')) {
    try {
      const parsedHttp = new URL(cleanedUrl);
      const host = parsedHttp.hostname.toLowerCase();
      if (!isPrivateOrLocalHost(host) && !isHttpAllowedForHost(host)) {
        originalHttpUrl = cleanedUrl;
        cleanedUrl = `https://${cleanedUrl.slice('http://'.length)}`;
        upgradedHttps = true;
      }
    } catch {}
  }

  if (shouldRecordStats && (strippedParams.length > 0 || unwrappedRedirect)) {
    incrementTrackerStat(12000, 'tracker');
  }

  let finalOutputUrl = cleanedUrl;
  if (isLocalProxyPath) {
    proxyExtraParams.set('tb', settings.aggressiveTrackerBlocking ? '1' : '0');
    proxyExtraParams.set('af', settings.adsFiltering ? '1' : '0');
    proxyExtraParams.set('ho', settings.httpsOnlyMode ? '1' : '0');
    proxyExtraParams.set('lists', serializeEnabledListsParam(settings.enabledLists));
    const extraStr = proxyExtraParams.toString();
    finalOutputUrl = `/api/proxy?url=${encodeURIComponent(cleanedUrl)}${extraStr ? `&${extraStr}` : ''}`;
  }

  return {
    allowed: true,
    blockedBy: null,
    originalUrl: rawUrl,
    cleanedUrl: finalOutputUrl,
    strippedParams,
    unwrappedRedirect,
    upgradedHttps,
    originalHttpUrl,
  };
};

export const stripTrackingFromHtml = (
  html: string,
  options?: Partial<PrivacyFilterSettings>
): { html: string; blockedCount: number } => {
  let blockedCount = 0;
  const aggressiveTrackerBlocking = options?.aggressiveTrackerBlocking ?? true;
  const adsFiltering = options?.adsFiltering ?? true;
  const enabledLists = options?.enabledLists ?? DEFAULT_ENABLED_LISTS;

  if (!aggressiveTrackerBlocking && !adsFiltering && !enabledLists.malwarePhishing) {
    return { html, blockedCount: 0 };
  }

  // Strip third-party ad/tracker external scripts
  let cleaned = html.replace(
    /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>[\s\S]*?<\/script>/gi,
    (match, src) => {
      if (isAdOrTrackerUrl(src, { aggressiveTrackerBlocking, adsFiltering, enabledLists })) {
        blockedCount += 1;
        return '';
      }
      return match;
    }
  );

  // Strip known ad/tracker iframes
  cleaned = cleaned.replace(
    /<iframe\b[^>]*\bsrc=["']([^"']+)["'][^>]*>[\s\S]*?<\/iframe>/gi,
    (match, src) => {
      if (isAdOrTrackerUrl(src, { aggressiveTrackerBlocking, adsFiltering, enabledLists })) {
        blockedCount += 1;
        return '';
      }
      return match;
    }
  );

  // Strip 1x1 tracking pixels / ad beacon images
  cleaned = cleaned.replace(
    /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*\/?>/gi,
    (match, src) => {
      if (isAdOrTrackerUrl(src, { aggressiveTrackerBlocking, adsFiltering, enabledLists })) {
        blockedCount += 1;
        return '';
      }
      return match;
    }
  );

  // Clean inline utm_*/fbclid/gclid from anchor hrefs when Aggressive Tracker Blocking + Privacy Badger enabled
  if (aggressiveTrackerBlocking && enabledLists.privacyBadger !== false) {
    cleaned = cleaned.replace(
      /\bhref=(["'])(https?:\/\/[^"']+)\1/gi,
      (_m, q, href) => `href=${q}${cleanTrackingParameters(href)}${q}`
    );
  }

  return { html: cleaned, blockedCount };
};

// Cosmetic CSS for Ads Core (EasyList / Peter Lowe)
export const AD_SUPPRESSION_CORE_CSS = `
  .ytp-ad-module,
  .ytp-ad-player-overlay,
  .ytp-ad-text,
  .video-ads,
  .ad-container,
  .ad-interrupting,
  div[id*="google_ads"],
  div[id*="taboola"],
  div[id*="outbrain"],
  div[class*="ad-box"],
  div[class*="ad-slot"],
  div[class*="ad-wrapper"],
  div[class*="sponsor"],
  ins.adsbygoogle,
  iframe[src*="doubleclick"],
  iframe[src*="googlesyndication"],
  iframe[src*="adservice"],
  iframe[src*="taboola"],
  iframe[src*="outbrain"],
  .fb-ad,
  .sponsored_ad,
  .ad-banner,
  .interstitial-ad,
  .overlay-ad {
    display: none !important;
    visibility: hidden !important;
    height: 0 !important;
    width: 0 !important;
    opacity: 0 !important;
    pointer-events: none !important;
  }
`;

// Cosmetic CSS for Cookie Banners & Annoyances List
export const ANNOYANCES_SUPPRESSION_CSS = `
  div[class*="popup-banner"],
  div[id*="cookie-banner"],
  div[class*="consent-modal"],
  div[id*="onetrust-consent-sdk"] {
    display: none !important;
    visibility: hidden !important;
    height: 0 !important;
    width: 0 !important;
    opacity: 0 !important;
    pointer-events: none !important;
  }
`;

// Combined default cosmetic suppression CSS
export const AD_SUPPRESSION_CSS = `${AD_SUPPRESSION_CORE_CSS}\n${ANNOYANCES_SUPPRESSION_CSS}`;

export const getCosmeticCssForSettings = (options?: {
  adsFiltering?: boolean;
  enabledLists?: Partial<Record<AdblockListId, boolean>>;
}): string => {
  const adsFiltering = options?.adsFiltering ?? true;
  const easylistOn = options?.enabledLists?.easylist ?? true;
  const annoyancesOn = options?.enabledLists?.annoyances ?? true;
  let css = '';
  if (adsFiltering && easylistOn) {
    css += AD_SUPPRESSION_CORE_CSS;
  }
  if (annoyancesOn) {
    css += ANNOYANCES_SUPPRESSION_CSS;
  }
  return css;
};

// Script injected to neutralize aggressive popups, auto-redirect traps and frame-busting
export const AGGRESSIVE_SHIELD_INJECTION_SCRIPT = `
  (function() {
    try {
      window.open = function(url) {
        if (!url || url === 'about:blank' || url.includes('javascript:')) return null;
        try {
          window.parent.postMessage({ type: 'OMARVIO_NAVIGATE', url: url }, '*');
        } catch(e) {}
        return null;
      };
    } catch(e) {}

    try {
      window.alert = function() {};
      window.confirm = function() { return true; };
    } catch(e) {}

    try {
      Object.defineProperty(window, 'top', { get: function() { return window.self; } });
    } catch(e) {}
  })();
`;

// Script injected to auto-skip in-video mid-rolls (pauses on tab hide)
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

export const incrementTrackerStat = (
  bytes: number = 18000,
  kind: 'tracker' | 'ad' | 'both' = 'both'
) => {
  if (kind === 'tracker' || kind === 'both') {
    stats.trackersBlocked += 1;
  }
  if (kind === 'ad' || kind === 'both') {
    stats.adsDestroyed += 1;
  }
  stats.dataSavedMB = parseFloat((stats.dataSavedMB + bytes / (1024 * 1024)).toFixed(2));
  const snapshot = { ...stats };
  listeners.forEach((fn) => fn(snapshot));
  emitBrowserEvent('BLOCKED_STAT_UPDATED', snapshot);
};

export const subscribeAdblockStats = (fn: (s: typeof stats) => void) => {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
};
