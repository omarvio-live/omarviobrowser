/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OMARVIO BROWSER - GPU Hardware Acceleration Controller
 * Forces CSS `will-change: transform` on BrowserFrame container to promote a dedicated
 * compositor layer for ultra-smooth scrolling and rendering on high-resolution webpages.
 */

import { emitBrowserEvent } from './eventBus';

const STORAGE_KEY = 'omarvio_gpu_acceleration_v1';
const DOM_CLASS = 'omarvio-gpu-accelerated';

type Listener = (enabled: boolean) => void;
const listeners = new Set<Listener>();

function readInitial(): boolean {
  if (typeof localStorage === 'undefined') return true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === null ? true : raw === 'true';
  } catch {
    return true;
  }
}

let currentGpuAcceleration = readInitial();

export function applyGpuAccelerationDomClass(enabled: boolean): void {
  if (typeof document === 'undefined') return;
  try {
    document.documentElement.classList.toggle(DOM_CLASS, enabled);
  } catch {}
}

applyGpuAccelerationDomClass(currentGpuAcceleration);

export function getGpuAccelerationEnabled(): boolean {
  return currentGpuAcceleration;
}

export function setGpuAccelerationEnabled(enabled: boolean): boolean {
  currentGpuAcceleration = Boolean(enabled);
  try {
    localStorage.setItem(STORAGE_KEY, String(currentGpuAcceleration));
  } catch {}
  applyGpuAccelerationDomClass(currentGpuAcceleration);
  listeners.forEach((cb) => cb(currentGpuAcceleration));
  emitBrowserEvent('GPU_ACCELERATION_CHANGED', { enabled: currentGpuAcceleration });
  return currentGpuAcceleration;
}

export function toggleGpuAcceleration(): boolean {
  return setGpuAccelerationEnabled(!currentGpuAcceleration);
}

export function subscribeGpuAcceleration(cb: Listener): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
