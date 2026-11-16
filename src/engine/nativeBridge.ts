/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OMARVIO BROWSER - Web UI <-> Native Android Chromium Bridge
 * Allows a single React/Cloudflare UI codebase to drive the native Android
 * Chromium WebView engine seamlessly with zero duplicate UI maintenance.
 */

import { getSanitizedSearchUrl, PrivacyFilterSettings } from './adblocker';

export interface OmarvioAndroidBridge {
  openUrl: (url: string, isIncognito?: boolean) => void;
  openIncognitoHome?: () => void;
  setSearchEngine?: (engineId: string) => void;
  setDesktopMode?: (enabled: boolean) => void;
  setAdBlockEnabled?: (enabled: boolean) => void;
  setBlockThirdPartyCookies?: (blocked: boolean) => void;
  setHttpsOnly?: (enabled: boolean) => void;
  setPrivacyConfig?: (jsonConfig: string) => void;
  openDownloads?: () => void;
  registerDownload?: (url: string, title: string, category?: string) => void;
  checkAppUpdate?: () => void;
  openNativeSettings?: () => void;
  clearAllData?: () => void;
  getAppVersion?: () => string;
  getBlockedCount?: () => number;
}

declare global {
  interface Window {
    OmarvioAndroid?: OmarvioAndroidBridge;
  }
}

const SHELL_SESSION_KEY = 'omarvio_android_shell_v1';

export function isAndroidNativeShell(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.OmarvioAndroid && typeof window.OmarvioAndroid.openUrl === 'function') {
    try {
      sessionStorage.setItem(SHELL_SESSION_KEY, '1');
    } catch {}
    return true;
  }
  try {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('androidShell') === '1') {
      sessionStorage.setItem(SHELL_SESSION_KEY, '1');
      return true;
    }
    return sessionStorage.getItem(SHELL_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export function getNativeAndroidVersion(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.OmarvioAndroid?.getAppVersion?.() || null;
  } catch {
    return null;
  }
}

export function resolveNavigableUrl(rawUrl: string): string {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('search:ai:')) {
    return getSanitizedSearchUrl(trimmed.slice('search:ai:'.length), 'google');
  }
  if (trimmed.startsWith('ai:search:')) {
    return getSanitizedSearchUrl(trimmed.slice('ai:search:'.length), 'google');
  }
  if (trimmed.startsWith('search:')) {
    const engine = (typeof localStorage !== 'undefined' && localStorage.getItem('omarvio_search_engine')) || 'google';
    return getSanitizedSearchUrl(trimmed.slice('search:'.length), engine);
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.includes('.') && !trimmed.includes(' ')) {
    return `https://${trimmed}`;
  }
  const engine = (typeof localStorage !== 'undefined' && localStorage.getItem('omarvio_search_engine')) || 'google';
  return getSanitizedSearchUrl(trimmed, engine);
}

export function openUrlInNativeAndroid(rawUrl: string, isIncognito = false): boolean {
  if (typeof window === 'undefined') return false;
  const bridge = window.OmarvioAndroid;
  if (!bridge || typeof bridge.openUrl !== 'function') return false;
  const resolved = resolveNavigableUrl(rawUrl);
  if (!resolved) return false;
  try {
    bridge.openUrl(resolved, isIncognito);
    return true;
  } catch {
    return false;
  }
}

export function syncSearchEngineWithAndroid(engineId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.OmarvioAndroid?.setSearchEngine?.(engineId);
  } catch {}
}

export function syncDesktopModeWithAndroid(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.OmarvioAndroid?.setDesktopMode?.(enabled);
  } catch {}
}

export function syncAdBlockWithAndroid(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.OmarvioAndroid?.setAdBlockEnabled?.(enabled);
  } catch {}
}

export function syncPrivacyConfigWithAndroid(settings: PrivacyFilterSettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.OmarvioAndroid?.setAdBlockEnabled?.(
      settings.aggressiveTrackerBlocking || settings.adsFiltering
    );
    window.OmarvioAndroid?.setHttpsOnly?.(settings.httpsOnlyMode);
    window.OmarvioAndroid?.setPrivacyConfig?.(JSON.stringify(settings));
  } catch {}
}

export function syncThirdPartyCookieBlockWithAndroid(blocked: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.OmarvioAndroid?.setBlockThirdPartyCookies?.(blocked);
  } catch {}
}

export function openAndroidDownloadsHub(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (typeof window.OmarvioAndroid?.openDownloads === 'function') {
      window.OmarvioAndroid.openDownloads();
      return true;
    }
  } catch {}
  return false;
}

export function registerDownloadInAndroid(url: string, title: string, category = 'doc'): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (typeof window.OmarvioAndroid?.registerDownload === 'function') {
      window.OmarvioAndroid.registerDownload(url, title, category);
      return true;
    }
  } catch {}
  return false;
}

export function triggerAndroidAppUpdateCheck(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (typeof window.OmarvioAndroid?.checkAppUpdate === 'function') {
      window.OmarvioAndroid.checkAppUpdate();
      return true;
    }
  } catch {}
  return false;
}

export function openNativeAndroidSettings(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (typeof window.OmarvioAndroid?.openNativeSettings === 'function') {
      window.OmarvioAndroid.openNativeSettings();
      return true;
    }
  } catch {}
  return false;
}

export function clearNativeAndroidBrowsingData(): void {
  if (typeof window === 'undefined') return;
  try {
    window.OmarvioAndroid?.clearAllData?.();
  } catch {}
}
