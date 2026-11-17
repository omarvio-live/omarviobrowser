/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OMARVIO BROWSER - Real-Time Browser Event Bus (CustomEvent + Light Pub/Sub)
 * Dispatches instant state notifications across UI chrome icons, status badges,
 * Omnibox, NavigationBar, ChromeMenuDropdown, and Home shortcuts without waiting
 * for full parent component re-renders.
 */

import { useEffect } from 'react';
import type { AdblockListId } from './adblocker';

export interface BrowserEventPayloads {
  BLOCKED_STAT_UPDATED: {
    trackersBlocked: number;
    adsDestroyed: number;
    dataSavedMB: number;
  };
  PRIVACY_SETTINGS_UPDATED: {
    aggressiveTrackerBlocking: boolean;
    adsFiltering: boolean;
    httpsOnlyMode: boolean;
    enabledLists: Record<AdblockListId, boolean>;
  };
  BOOKMARK_UPDATED: {
    count: number;
    lastUrl?: string;
    added?: boolean;
  };
  SHORTCUTS_UPDATED: {
    count: number;
    latestUrl?: string;
  };
  DESKTOP_MODE_CHANGED: {
    tabId: string;
    isDesktopMode: boolean;
  };
  READING_MODE_CHANGED: {
    tabId: string;
    isReadingMode: boolean;
  };
  ENERGY_SAVER_CHANGED: {
    enabled: boolean;
  };
  TABS_UPDATED: {
    count: number;
    activeTabId: string;
    sleepingCount: number;
  };
  ACTIVE_TAB_UPDATED: {
    tabId: string;
    url: string;
    title: string;
    isLoading: boolean;
    isDesktopMode: boolean;
    isReadingMode: boolean;
    isBookmarked: boolean;
  };
  APK_UPDATE_AVAILABLE: {
    version: string;
    versionCode: number;
    directApkUrl: string;
  };
  PWA_INSTALL_PROMPT_READY: {
    available: boolean;
  };
}

export type BrowserEventType = keyof BrowserEventPayloads;

export interface BrowserEventEnvelope<T extends BrowserEventType = BrowserEventType> {
  type: T;
  payload: BrowserEventPayloads[T];
  timestamp: number;
}

export const OMARVIO_DOM_EVENT_NAME = 'omarvio:bus';

type AnyEventHandler = (envelope: BrowserEventEnvelope<any>) => void;
const subscriberMap = new Map<BrowserEventType | '*', Set<AnyEventHandler>>();

let globalPwaPromptEvent: any = null;

export function setGlobalPwaInstallPrompt(promptEvent: any | null): void {
  globalPwaPromptEvent = promptEvent;
  emitBrowserEvent('PWA_INSTALL_PROMPT_READY', { available: Boolean(promptEvent) });
}

export function getGlobalPwaInstallPrompt(): any | null {
  return globalPwaPromptEvent;
}

export function emitBrowserEvent<T extends BrowserEventType>(
  type: T,
  payload: BrowserEventPayloads[T]
): void {
  const envelope: BrowserEventEnvelope<T> = {
    type,
    payload,
    timestamp: Date.now(),
  };

  // 1. Synchronous in-memory Pub/Sub for zero-lag badge & icon updates
  const exactListeners = subscriberMap.get(type);
  if (exactListeners) {
    exactListeners.forEach((handler) => {
      try {
        handler(envelope);
      } catch {}
    });
  }

  const wildcardListeners = subscriberMap.get('*');
  if (wildcardListeners) {
    wildcardListeners.forEach((handler) => {
      try {
        handler(envelope);
      } catch {}
    });
  }

  // 2. Native DOM CustomEvent broadcast for decoupled WebViews / custom listeners
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(
        new CustomEvent<BrowserEventEnvelope<T>>(OMARVIO_DOM_EVENT_NAME, {
          detail: envelope,
        })
      );
    } catch {}
  }
}

export function subscribeBrowserEvent<T extends BrowserEventType>(
  type: T,
  handler: (payload: BrowserEventPayloads[T], envelope: BrowserEventEnvelope<T>) => void
): () => void;
export function subscribeBrowserEvent(
  type: '*',
  handler: (envelope: BrowserEventEnvelope<any>) => void
): () => void;
export function subscribeBrowserEvent(
  type: BrowserEventType | '*',
  handler: (...args: any[]) => void
): () => void {
  const wrapped: AnyEventHandler = (envelope) => {
    if (type === '*') {
      handler(envelope);
    } else {
      handler(envelope.payload, envelope);
    }
  };

  let set = subscriberMap.get(type);
  if (!set) {
    set = new Set();
    subscriberMap.set(type, set);
  }
  set.add(wrapped);

  return () => {
    const currentSet = subscriberMap.get(type);
    if (currentSet) {
      currentSet.delete(wrapped);
      if (currentSet.size === 0) {
        subscriberMap.delete(type);
      }
    }
  };
}

export function useBrowserEvent<T extends BrowserEventType>(
  type: T,
  handler: (payload: BrowserEventPayloads[T], envelope: BrowserEventEnvelope<T>) => void
): void {
  useEffect(() => {
    return subscribeBrowserEvent(type, handler);
  }, [type, handler]);
}
