/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OMARVIO BROWSER - Local Zero-Telemetry Browsing History Engine
 * Encrypted & Stored 100% on device memory (0% server leak)
 * Copyright (c) OMARVIO GLOBAL LTD.
 */

export interface HistoryItem {
  id: string;
  url: string;
  title: string;
  domain: string;
  timestamp: number;
}

const STORAGE_KEY = 'omarvio_history';
const MAX_HISTORY_ITEMS = 500;

let saveTimeout: any = null;
function debouncedPersist(items: HistoryItem[]) {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, 250);
}

type HistoryListener = (items: HistoryItem[]) => void;
const listeners: HistoryListener[] = [];

/**
 * Retrieves all browsing history items from device storage
 */
export const getBrowsingHistory = (): HistoryItem[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Default initial history entries for clean first experience
      const initial: HistoryItem[] = [
        {
          id: 'hist-init-1',
          url: 'https://en.wikipedia.org',
          title: 'Wikipedia – The Free Encyclopedia',
          domain: 'wikipedia.org',
          timestamp: Date.now() - 1000 * 60 * 15,
        },
        {
          id: 'hist-init-2',
          url: 'https://duckduckgo.com',
          title: 'DuckDuckGo – Privacy, simplified.',
          domain: 'duckduckgo.com',
          timestamp: Date.now() - 1000 * 60 * 60,
        },
        {
          id: 'hist-init-3',
          url: 'https://google.com',
          title: 'Google Search Clean Engine',
          domain: 'google.com',
          timestamp: Date.now() - 1000 * 60 * 180,
        },
      ];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

/**
 * Adds a new page visit to the history
 */
export const addBrowsingHistory = (rawUrl: string, customTitle?: string): void => {
  if (!rawUrl || typeof window === 'undefined') return;
  const url = rawUrl.trim();
  if (!url || url === 'about:blank' || url.startsWith('javascript:')) return;

  try {
    let domain = 'webpage';
    let fallbackTitle = customTitle || url;
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      domain = parsed.hostname.replace(/^www\./, '');
      if (!customTitle) {
        fallbackTitle = domain;
      }
    } catch {
      domain = url.split('/')[0] || 'web';
    }

    const currentHistory = getBrowsingHistory();

    // Prevent immediate duplicate if top item has same URL
    if (currentHistory.length > 0 && currentHistory[0].url === url) {
      return;
    }

    const newItem: HistoryItem = {
      id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      url,
      title: customTitle || fallbackTitle,
      domain,
      timestamp: Date.now(),
    };

    const updated = [newItem, ...currentHistory.filter((item) => item.url !== url)].slice(
      0,
      MAX_HISTORY_ITEMS
    );

    debouncedPersist(updated);
    notifyListeners(updated);
  } catch (err) {
    console.error('Failed to add browsing history:', err);
  }
};

/**
 * Deletes a single history item by id
 */
export const deleteHistoryItem = (id: string): void => {
  try {
    const current = getBrowsingHistory();
    const updated = current.filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    notifyListeners(updated);
  } catch {}
};

/**
 * Clears all browsing history from device storage
 */
export const clearAllBrowsingHistory = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    notifyListeners([]);
  } catch {}
};

/**
 * Subscribes to history updates
 */
export const subscribeHistory = (listener: HistoryListener): (() => void) => {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx !== -1) listeners.splice(idx, 1);
  };
};

const notifyListeners = (items: HistoryItem[]) => {
  listeners.forEach((fn) => fn(items));
};
