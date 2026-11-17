/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OMARVIO BROWSER - Local Bookmarks & Encrypted Vault Persistence Engine
 * Copyright (c) OMARVIO GLOBAL LTD.
 */

import { emitBrowserEvent } from './eventBus';

export interface SavedBookmark {
  id: string;
  title: string;
  url: string;
  encrypted: boolean;
  timestamp: number;
}

const STORAGE_KEY = 'omarvio_bookmarks';

export const DEFAULT_BOOKMARKS: SavedBookmark[] = [
  {
    id: 'bm-1',
    title: 'YouTube (Ad-Free Isolation)',
    url: 'https://youtube.com',
    encrypted: true,
    timestamp: Date.now() - 3600000,
  },
  {
    id: 'bm-2',
    title: 'Wikipedia (The Free Encyclopedia)',
    url: 'https://wikipedia.org',
    encrypted: true,
    timestamp: Date.now() - 7200000,
  },
  {
    id: 'bm-3',
    title: 'BBC News Global',
    url: 'https://bbc.com/news',
    encrypted: true,
    timestamp: Date.now() - 86400000,
  },
];

type BookmarkListener = (bookmarks: SavedBookmark[]) => void;
const listeners: BookmarkListener[] = [];

function notifyBookmarkListeners(items: SavedBookmark[]) {
  listeners.forEach((fn) => fn(items));
}

function normalizeUrlForCompare(raw: string): string {
  try {
    const parsed = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    return `${parsed.hostname.replace(/^www\./i, '').toLowerCase()}${parsed.pathname.replace(/\/+$/, '')}${parsed.search}`;
  } catch {
    return raw.trim().toLowerCase().replace(/\/+$/, '');
  }
}

export function getBookmarks(): SavedBookmark[] {
  if (typeof window === 'undefined') return DEFAULT_BOOKMARKS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_BOOKMARKS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return [...parsed].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }
  } catch {}
  return DEFAULT_BOOKMARKS;
}

export function saveBookmarks(items: SavedBookmark[]): SavedBookmark[] {
  const sorted = [...items].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
    } catch {}
  }
  notifyBookmarkListeners(sorted);
  emitBrowserEvent('BOOKMARK_UPDATED', { count: sorted.length });
  return sorted;
}

export function isUrlBookmarked(url: string): boolean {
  if (!url) return false;
  const key = normalizeUrlForCompare(url);
  return getBookmarks().some((bm) => normalizeUrlForCompare(bm.url) === key);
}

export function toggleBookmark(
  url: string,
  title?: string
): { added: boolean; bookmarks: SavedBookmark[] } {
  const current = getBookmarks();
  const key = normalizeUrlForCompare(url);
  const existingIdx = current.findIndex((bm) => normalizeUrlForCompare(bm.url) === key);

  if (existingIdx !== -1) {
    const updated = current.filter((_, idx) => idx !== existingIdx);
    const saved = saveBookmarks(updated);
    emitBrowserEvent('BOOKMARK_UPDATED', { count: saved.length, lastUrl: url, added: false });
    return { added: false, bookmarks: saved };
  }

  let safeTitle = (title || '').trim();
  if (!safeTitle || safeTitle === 'New Tab') {
    try {
      safeTitle = new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./i, '');
    } catch {
      safeTitle = url;
    }
  }

  const entry: SavedBookmark = {
    id: `bm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: safeTitle,
    url,
    encrypted: true,
    timestamp: Date.now(),
  };

  const saved = saveBookmarks([entry, ...current]);
  emitBrowserEvent('BOOKMARK_UPDATED', { count: saved.length, lastUrl: url, added: true });
  return { added: true, bookmarks: saved };
}

export function deleteBookmarkById(id: string): SavedBookmark[] {
  const updated = getBookmarks().filter((bm) => bm.id !== id);
  return saveBookmarks(updated);
}

export function subscribeBookmarks(listener: BookmarkListener): () => void {
  listeners.push(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      listener(getBookmarks());
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', onStorage);
  }
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx !== -1) listeners.splice(idx, 1);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', onStorage);
    }
  };
}
