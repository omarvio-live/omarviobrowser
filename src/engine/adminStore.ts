/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OMARVIO BROWSER - Master Admin Data Engine & Cloudflare Sync Store
 * Manages Admins, Half Admins, In-App Banner Ads, Urgent Broadcasts, and Privacy-Safe Analytics.
 */

export type AdminRole = 'super_admin' | 'admin' | 'half_admin' | 'support';

export interface AdminUser {
  id: string;
  name: string;
  role: AdminRole;
  roleLabel: string;
  specialSecurityNumber: string;
  password: string;
  permissions: string[];
  status: 'Online' | 'Offline';
  lastLogin: string;
  avatar?: string;
}

export interface Advertisement {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  targetUrl: string;
  position: 'bottom_banner' | 'home_card' | 'bottom_fold';
  active: boolean;
  date: string;
  clicks: number;
  views: number;
}

export interface AppCustomization {
  appName: string;
  slogan: string;
  urgentMessage: string;
  urgentMessageActive: boolean;
  urgentMessageType: 'info' | 'warning' | 'alert';
  adDisplayPosition: 'bottom_banner' | 'home_card' | 'disabled';
  isAdFolded: boolean;
}

export interface PrivacyAnalytics {
  totalVisitorsToday: number;
  visitorsGrowth: number;
  homeScreenOpens: number;
  homeGrowth: number;
  appDownloadsToday: number;
  downloadsGrowth: number;
  manualChecked: number;
  manualGrowth: number;
  malwareBlocked: number;
  suspiciousTrafficFiltered: number;
  searchEnginesUsage: { engine: string; percentage: number }[];
  platformDistribution: { platform: string; percentage: number; color: string }[];
  cloudflareStatus: {
    pages: number;
    workers: number;
    d1: number;
    kv: number;
    r2: number;
  };
}

const DEFAULT_ADMINS: AdminUser[] = [
  {
    id: 'adm-1',
    name: 'omarvio_official',
    role: 'super_admin',
    roleLabel: 'Super Admin',
    specialSecurityNumber: '',
    password: '',
    permissions: ['all'],
    status: 'Online',
    lastLogin: '2m ago',
  },
  {
    id: 'adm-2',
    name: 'admin02',
    role: 'admin',
    roleLabel: 'Admin',
    specialSecurityNumber: '',
    password: '',
    permissions: ['ads', 'customization', 'analytics'],
    status: 'Online',
    lastLogin: '1h ago',
  },
];

const DEFAULT_ADS: Advertisement[] = [
  {
    id: 'ad-1',
    title: 'OMARVIO App Store',
    subtitle: 'Get All OMARVIO Apps & Privacy Tools',
    imageUrl: '/assets/aistudio/file_0000000038508211a96b8fbe27d5ca68_9009abdf.png',
    targetUrl: 'https://omarvio.com',
    position: 'bottom_banner',
    active: true,
    date: 'Oct 27, 2026',
    clicks: 1420,
    views: 18450,
  },
  {
    id: 'ad-2',
    title: 'Best Browser for You',
    subtitle: 'Fast • Secure • Private • Ad-Free',
    imageUrl: '/assets/aistudio/file_0000000038508211a96b8fbe27d5ca68_9009abdf.png',
    targetUrl: 'https://omarvio.com/browser',
    position: 'bottom_fold',
    active: true,
    date: 'Oct 26, 2026',
    clicks: 890,
    views: 12400,
  },
  {
    id: 'ad-3',
    title: 'Download OMARVIO Mobile',
    subtitle: 'More Tools, Zero Surveillance',
    imageUrl: '/assets/aistudio/file_0000000038508211a96b8fbe27d5ca68_9009abdf.png',
    targetUrl: 'https://omarvio.com/download',
    position: 'home_card',
    active: true,
    date: 'Oct 25, 2026',
    clicks: 654,
    views: 9800,
  },
  {
    id: 'ad-4',
    title: 'Stay Connected Securely',
    subtitle: 'End-to-End Encrypted Browsing',
    imageUrl: '/assets/aistudio/file_0000000038508211a96b8fbe27d5ca68_9009abdf.png',
    targetUrl: 'https://omarvio.com/privacy',
    position: 'bottom_banner',
    active: true,
    date: 'Oct 24, 2026',
    clicks: 340,
    views: 5600,
  },
];

const DEFAULT_CUSTOMIZATION: AppCustomization = {
  appName: 'OMARVIO BROWSER',
  slogan: 'My Phone, My Data – Why Surrender It To Others!',
  urgentMessage: '⚠️ জরুরি নোটিশ: ওমারভিও নতুন সুপারফাস্ট কার্নেল সক্রিয় হয়েছে। সমস্ত বিজ্ঞাপন ও ট্র্যাকার ব্লকড।',
  urgentMessageActive: false,
  urgentMessageType: 'info',
  adDisplayPosition: 'bottom_banner',
  isAdFolded: false,
};

const DEFAULT_ANALYTICS: PrivacyAnalytics = {
  totalVisitorsToday: 18452,
  visitorsGrowth: 12.5,
  homeScreenOpens: 6873,
  homeGrowth: 8.3,
  appDownloadsToday: 4892,
  downloadsGrowth: 15.7,
  manualChecked: 1246,
  manualGrowth: 10.2,
  malwareBlocked: 489,
  suspiciousTrafficFiltered: 124,
  searchEnginesUsage: [
    { engine: 'Google Search (Direct & igu=1)', percentage: 65 },
    { engine: 'DuckDuckGo (HTML Clean)', percentage: 20 },
    { engine: 'Bing Search', percentage: 10 },
    { engine: 'Wikipedia & Other', percentage: 5 },
  ],
  platformDistribution: [
    { platform: 'Android', percentage: 62, color: '#38bdf8' },
    { platform: 'iOS', percentage: 18, color: '#06b6d4' },
    { platform: 'Web (PWA)', percentage: 12, color: '#818cf8' },
    { platform: 'Windows', percentage: 6, color: '#eab308' },
    { platform: 'Others', percentage: 2, color: '#f97316' },
  ],
  cloudflareStatus: {
    pages: 99.9,
    workers: 99.8,
    d1: 99.7,
    kv: 99.5,
    r2: 99.6,
  },
};

// Storage Keys
const ADMIN_USERS_KEY = 'omarvio_admin_users';
const ADS_KEY = 'omarvio_admin_ads';
const CUSTOM_KEY = 'omarvio_admin_customization';
const CURRENT_SESSION_KEY = 'omarvio_active_admin_session';

type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((cb) => {
    try { cb(); } catch {}
  });
}

export function subscribeAdminStore(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// -------------------------------------------------------------
// Admin Auth & Management
// -------------------------------------------------------------
export function getAdminUsers(): AdminUser[] {
  try {
    const raw = localStorage.getItem(ADMIN_USERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_ADMINS;
}

export function saveAdminUsers(users: AdminUser[]): void {
  try {
    localStorage.setItem(ADMIN_USERS_KEY, JSON.stringify(users));
    notify();
  } catch {}
}

export function authenticateAdmin(
  securityNumber: string,
  pass: string
): { success: boolean; user?: AdminUser; error?: string } {
  const users = getAdminUsers();
  const trimmedSec = securityNumber.trim();
  const trimmedPass = pass.trim();

  const found = users.find(
    (u) =>
      u.specialSecurityNumber === trimmedSec &&
      u.password === trimmedPass
  );

  if (found) {
    const session = {
      id: found.id,
      name: found.name,
      role: found.role,
      roleLabel: found.roleLabel,
      loginTime: Date.now(),
    };
    try {
      localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(session));
    } catch {}
    return { success: true, user: found };
  }

  return {
    success: false,
    error: 'ভুল সিকিউরিটি নাম্বার অথবা পাসওয়ার্ড! অনুগ্রহ করে সঠিক তথ্য প্রদান করুন।',
  };
}

export function getActiveAdminSession(): { id: string; name: string; role: AdminRole; roleLabel: string } | null {
  try {
    const raw = localStorage.getItem(CURRENT_SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function logoutAdmin(): void {
  try {
    localStorage.removeItem(CURRENT_SESSION_KEY);
    notify();
  } catch {}
}

export function addAdminUser(newAdmin: Omit<AdminUser, 'id' | 'status' | 'lastLogin'>): AdminUser {
  const users = getAdminUsers();
  const id = `adm-${Date.now()}`;
  const user: AdminUser = {
    ...newAdmin,
    id,
    status: 'Online',
    lastLogin: 'Just now',
  };
  saveAdminUsers([user, ...users]);
  return user;
}

export function deleteAdminUser(id: string): void {
  const users = getAdminUsers().filter((u) => u.id !== id);
  saveAdminUsers(users);
}

export function updateAdminUser(id: string, updates: Partial<AdminUser>): void {
  const users = getAdminUsers().map((u) => (u.id === id ? { ...u, ...updates } : u));
  saveAdminUsers(users);
}

// -------------------------------------------------------------
// Advertisement Management
// -------------------------------------------------------------
export function getAdvertisements(): Advertisement[] {
  try {
    const raw = localStorage.getItem(ADS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_ADS;
}

export function saveAdvertisements(ads: Advertisement[]): void {
  try {
    localStorage.setItem(ADS_KEY, JSON.stringify(ads));
    notify();
    syncToCloudflareKV({ ads });
  } catch {}
}

export function addAdvertisement(newAd: Omit<Advertisement, 'id' | 'clicks' | 'views'>): Advertisement {
  const ads = getAdvertisements();
  const ad: Advertisement = {
    ...newAd,
    id: `ad-${Date.now()}`,
    clicks: 0,
    views: 1,
  };
  saveAdvertisements([ad, ...ads]);
  return ad;
}

export function updateAdvertisement(id: string, updates: Partial<Advertisement>): void {
  const ads = getAdvertisements().map((a) => (a.id === id ? { ...a, ...updates } : a));
  saveAdvertisements(ads);
}

export function toggleAdStatus(id: string): void {
  const ads = getAdvertisements().map((a) => (a.id === id ? { ...a, active: !a.active } : a));
  saveAdvertisements(ads);
}

export function deleteAdvertisement(id: string): void {
  const ads = getAdvertisements().filter((a) => a.id !== id);
  saveAdvertisements(ads);
}

export function incrementAdClick(id: string): void {
  const ads = getAdvertisements().map((a) => (a.id === id ? { ...a, clicks: a.clicks + 1 } : a));
  saveAdvertisements(ads);
}

export function incrementAdView(id: string): void {
  const ads = getAdvertisements().map((a) => (a.id === id ? { ...a, views: a.views + 1 } : a));
  saveAdvertisements(ads);
}

// -------------------------------------------------------------
// App Customization & Urgent Broadcast
// -------------------------------------------------------------
export function getAppCustomization(): AppCustomization {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_CUSTOMIZATION;
}

export function saveAppCustomization(custom: AppCustomization): void {
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(custom));
    notify();
    syncToCloudflareKV({ customization: custom });
  } catch {}
}

export function updateAppCustomization(updates: Partial<AppCustomization>): void {
  const current = getAppCustomization();
  saveAppCustomization({ ...current, ...updates });
}

// -------------------------------------------------------------
// Real-Time Cloudflare KV Sync Engine
// -------------------------------------------------------------
let syncTimeout: any = null;

export async function syncToCloudflareKV(payload: { ads?: Advertisement[]; customization?: AppCustomization }): Promise<boolean> {
  clearTimeout(syncTimeout);
  return new Promise((resolve) => {
    syncTimeout = setTimeout(async () => {
      try {
        const fullPayload = {
          ads: payload.ads || getAdvertisements(),
          customization: payload.customization || getAppCustomization(),
        };
        const res = await fetch('/api/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fullPayload),
        });
        const data = await res.json();
        resolve(data.success === true);
      } catch {
        resolve(false);
      }
    }, 400);
  });
}

export async function pullFromCloudflareKV(): Promise<boolean> {
  try {
    const res = await fetch('/api/admin?action=get_all');
    if (!res.ok) return false;
    const data = await res.json();
    if (data.success) {
      if (Array.isArray(data.ads) && data.ads.length > 0) {
        localStorage.setItem(ADS_KEY, JSON.stringify(data.ads));
      }
      if (data.customization) {
        localStorage.setItem(CUSTOM_KEY, JSON.stringify(data.customization));
      }
      notify();
      return true;
    }
  } catch {}
  return false;
}

// Automatically pull latest Cloudflare KV state on browser start
if (typeof window !== 'undefined') {
  pullFromCloudflareKV();
}

// -------------------------------------------------------------
// Privacy Analytics
// -------------------------------------------------------------
export function getPrivacyAnalytics(): PrivacyAnalytics {
  return DEFAULT_ANALYTICS;
}
