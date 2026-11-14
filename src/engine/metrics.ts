/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OMARVIO BROWSER - Module M10 Performance & Diagnostics Telemetry Engine
 * Local-only metrics (0% telemetry sent to servers).
 */

interface PerfMetrics {
  lastTabSwitchMs: number;
  lastSearchMs: number;
  memoryGB: number;
  activeTabsAlive: number;
}

const metrics: PerfMetrics = {
  lastTabSwitchMs: 0,
  lastSearchMs: 0,
  memoryGB: typeof navigator !== 'undefined' && 'deviceMemory' in navigator ? (navigator as any).deviceMemory : 4,
  activeTabsAlive: 1,
};

let tabSwitchStartTime = 0;

export function markTabSwitchStart() {
  tabSwitchStartTime = performance.now();
}

export function measureTabSwitchEnd(aliveCount?: number): number {
  if (tabSwitchStartTime === 0) return 0;
  const elapsed = Math.round(performance.now() - tabSwitchStartTime);
  metrics.lastTabSwitchMs = elapsed;
  if (aliveCount !== undefined) metrics.activeTabsAlive = aliveCount;
  tabSwitchStartTime = 0;
  return elapsed;
}

export function recordSearchLatency(ms: number) {
  metrics.lastSearchMs = Math.round(ms);
}

export function getLocalMetrics(): PerfMetrics {
  return { ...metrics };
}
