/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Tab {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  history: string[];
  historyIndex: number;
  isSecure: boolean;
  createdAt: number;
  isDesktopMode?: boolean;
  isReadingMode?: boolean;
  isSleeping?: boolean;
  isIncognito?: boolean;
  isBookmarked?: boolean;
  groupId?: string;
  groupName?: string;
  groupColor?: string;
}

export interface SearchEngine {
  id: string;
  name: string;
  searchUrl: string;
  icon: string;
}

export interface QuickShortcut {
  id: string;
  title: string;
  url: string;
  icon: string;
  category: 'social' | 'media' | 'search' | 'info';
  color: string;
}

export interface BrowserStats {
  trackersBlocked: number;
  dataSavedMB: number;
  adsDestroyed: number;
  timeSavedMinutes: number;
}
