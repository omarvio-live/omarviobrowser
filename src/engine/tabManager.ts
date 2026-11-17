/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OMARVIO BROWSER - Module M3 Tab Manager
 * Delivers zero-reload, sub-200ms tab switching with hardware-adaptive LRU memory preservation.
 */

export interface SleepingTabState {
  id: string;
  url: string;
  title: string;
  scrollX: number;
  scrollY: number;
  sleptAt: number;
}

/**
 * Calculates maximum concurrent alive tabs based on device hardware memory (RAM)
 * - <= 2GB: 2 tabs
 * - <= 4GB: 3 tabs
 * - >= 6GB: 4 tabs
 * Safe default: 3
 */
export function getMaxAliveTabs(energySaverActive = false): number {
  if (energySaverActive) {
    // Strictly keep only the foreground active tab mounted; put all background tabs to sleep
    return 1;
  }
  if (typeof navigator !== 'undefined' && 'deviceMemory' in navigator) {
    const mem = (navigator as any).deviceMemory || 4;
    if (mem <= 2) return 2;
    if (mem <= 4) return 3;
    return 4;
  }
  return 3;
}

/**
 * Computes updated LRU list of alive tab IDs.
 * The active tab is moved to the head.
 * Inactive tabs beyond maxAliveTabs (or explicitly sleeping tabs) are put to sleep.
 */
export function computeAliveTabIds(
  prevAlive: string[],
  activeTabId: string,
  existingTabIds: string[],
  maxAlive: number = getMaxAliveTabs(),
  explicitlySleepingIds: Set<string> = new Set()
): string[] {
  // Filter out any closed or manually sleeping tabs
  const validPrev = prevAlive.filter(
    (id) => existingTabIds.includes(id) && !explicitlySleepingIds.has(id)
  );

  // Place active tab at head unless explicitly put to sleep
  const withoutActive = validPrev.filter((id) => id !== activeTabId);
  const reordered = explicitlySleepingIds.has(activeTabId)
    ? withoutActive
    : [activeTabId, ...withoutActive];

  // Return at most maxAlive
  return reordered.slice(0, Math.max(1, maxAlive));
}

// In-memory registry for sleeping tab restore data
const sleepingTabStore = new Map<string, SleepingTabState>();

export function putTabToSleep(id: string, url: string, title: string, scrollX = 0, scrollY = 0) {
  sleepingTabStore.set(id, {
    id,
    url,
    title,
    scrollX,
    scrollY,
    sleptAt: Date.now(),
  });
}

export function wakeSleepingTab(id: string): SleepingTabState | undefined {
  const state = sleepingTabStore.get(id);
  sleepingTabStore.delete(id);
  return state;
}

export function clearSleepingTab(id: string) {
  sleepingTabStore.delete(id);
}

export function isTabSleepingInStore(id: string): boolean {
  return sleepingTabStore.has(id);
}

export function getSleepingTabCount(): number {
  return sleepingTabStore.size;
}
