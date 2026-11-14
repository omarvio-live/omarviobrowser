/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OMARVIO BROWSER - Web UI <-> Native Android Chromium Bridge
 * Allows a single React/Cloudflare UI codebase to drive the native Android
 * Chromium WebView engine seamlessly with zero duplicate UI maintenance.
 */

import { getSanitizedSearchUrl } from './adblocker';

export interface OmarvioAndroidBridge {
  openUrl: (url: string, isIncognito?: boolean) => void;
  openIncognitoHome?: () => void;
  setSearchEngine?: (engineId: string) => void;
  setDesktopMode?: (enabled: boolean) => void;
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

export function clearNativeAndroidBrowsingData(): void {
  if (typeof window === 'undefined') return;
  try {
    window.OmarvioAndroid?.clearAllData?.();
  } catch {}
}
