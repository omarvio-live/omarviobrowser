/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OMARVIO BROWSER - Energy Saver Core Controller
 * Limits background tab processing and reduces non-essential UI animations.
 */

import { syncEnergySaverWithAndroid } from './nativeBridge';
import { emitBrowserEvent } from './eventBus';

const STORAGE_KEY = 'omarvio_energy_saver_v1';
const DOM_CLASS = 'omarvio-energy-saver';

type Listener = (enabled: boolean) => void;
const listeners = new Set<Listener>();

function readInitial(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

let currentEnergySaver = readInitial();

export function applyEnergySaverDomClass(enabled: boolean): void {
  if (typeof document === 'undefined') return;
  try {
    document.documentElement.classList.toggle(DOM_CLASS, enabled);
  } catch {}
}

// Apply immediately on module load
applyEnergySaverDomClass(currentEnergySaver);

export function getEnergySaverEnabled(): boolean {
  return currentEnergySaver;
}

export function setEnergySaverEnabled(enabled: boolean): boolean {
  currentEnergySaver = Boolean(enabled);
  try {
    localStorage.setItem(STORAGE_KEY, String(currentEnergySaver));
  } catch {}
  applyEnergySaverDomClass(currentEnergySaver);
  syncEnergySaverWithAndroid(currentEnergySaver);
  listeners.forEach((cb) => cb(currentEnergySaver));
  emitBrowserEvent('ENERGY_SAVER_CHANGED', { enabled: currentEnergySaver });
  return currentEnergySaver;
}

export function toggleEnergySaver(): boolean {
  return setEnergySaverEnabled(!currentEnergySaver);
}

export function subscribeEnergySaver(cb: Listener): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
