/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Ghost,
  Plus,
} from 'lucide-react';
import { useBrowserEvent } from '../engine/eventBus';
import { getEnergySaverEnabled } from '../engine/energySaver';

interface NavigationBarProps {
  canGoBack: boolean;
  canGoForward: boolean;
  isLoading: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  onReload: () => void;
  onOpenPanic: () => void;
  onNewTab: () => void;
}

export const NavigationBar: React.FC<NavigationBarProps> = ({
  canGoBack,
  canGoForward,
  isLoading,
  onGoBack,
  onGoForward,
  onReload,
  onOpenPanic,
  onNewTab,
}) => {
  const [energySaverActive, setEnergySaverActive] = useState(getEnergySaverEnabled);

  useBrowserEvent(
    'ENERGY_SAVER_CHANGED',
    React.useCallback((payload) => {
      setEnergySaverActive(payload.enabled);
    }, [])
  );

  return (
    <div
      className={`w-full md:hidden border-t px-4 py-1.5 flex items-center justify-around safe-bottom backdrop-blur-md z-40 touch-manipulation ${
        energySaverActive
          ? 'bg-black/95 border-emerald-900/50'
          : 'bg-slate-950/95 border-slate-800/80'
      }`}
    >
      <button
        type="button"
        onClick={onGoBack}
        disabled={!canGoBack}
        title="Back"
        className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors touch-manipulation ${
          canGoBack
            ? 'text-slate-200 hover:text-cyan-300 hover:bg-slate-900 active:scale-95 cursor-pointer'
            : 'text-slate-600 cursor-not-allowed'
        }`}
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <button
        type="button"
        onClick={onGoForward}
        disabled={!canGoForward}
        title="Forward"
        className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors touch-manipulation ${
          canGoForward
            ? 'text-slate-200 hover:text-cyan-300 hover:bg-slate-900 active:scale-95 cursor-pointer'
            : 'text-slate-600 cursor-not-allowed'
        }`}
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      <button
        type="button"
        onClick={onReload}
        title="Reload Page"
        className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-cyan-300 hover:bg-slate-900 rounded-full transition-colors active:scale-95 cursor-pointer touch-manipulation"
      >
        <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
      </button>

      <button
        type="button"
        onClick={onNewTab}
        title="New Tab (+)"
        className="w-10 h-10 text-cyan-300 hover:text-white bg-cyan-950/60 border border-cyan-500/40 hover:bg-cyan-900 rounded-xl transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-sm touch-manipulation"
      >
        <Plus className="w-5 h-5" />
      </button>

      <button
        type="button"
        onClick={onOpenPanic}
        title="1-Tap Ghost Panic Wipe"
        className="w-10 h-10 flex items-center justify-center rounded-full bg-rose-950/40 border border-rose-500/30 text-rose-300 hover:text-rose-100 hover:bg-rose-900/60 transition-all active:scale-95 cursor-pointer touch-manipulation"
      >
        <Ghost className="w-4 h-4 text-rose-400" />
      </button>
    </div>
  );
};
