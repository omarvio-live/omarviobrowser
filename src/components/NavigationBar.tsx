/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Home,
  Ghost,
  MoreVertical,
  Plus,
} from 'lucide-react';

interface NavigationBarProps {
  canGoBack: boolean;
  canGoForward: boolean;
  isLoading: boolean;
  tabCount: number;
  onGoBack: () => void;
  onGoForward: () => void;
  onReload: () => void;
  onGoHome: () => void;
  onOpenTabs: () => void;
  onOpenPanic: () => void;
  onOpenMenu: () => void;
  onNewTab: () => void;
}

export const NavigationBar: React.FC<NavigationBarProps> = ({
  canGoBack,
  canGoForward,
  isLoading,
  tabCount,
  onGoBack,
  onGoForward,
  onReload,
  onGoHome,
  onOpenTabs,
  onOpenPanic,
  onOpenMenu,
  onNewTab,
}) => {
  return (
    <div className="w-full bg-slate-950/95 border-t border-slate-800/80 px-2 sm:px-3 py-1.5 flex items-center justify-between safe-bottom backdrop-blur-md z-40 touch-manipulation">
      {/* Left Navigation Buttons */}
      <div className="flex items-center gap-1 sm:gap-2">
        <button
          type="button"
          onClick={onGoBack}
          disabled={!canGoBack}
          title="Back"
          className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full transition-colors touch-manipulation ${
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
          className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full transition-colors touch-manipulation ${
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
          className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-slate-300 hover:text-cyan-300 hover:bg-slate-900 rounded-full transition-colors active:scale-95 cursor-pointer touch-manipulation"
        >
          <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
        </button>

        <button
          type="button"
          onClick={onGoHome}
          title="Home Page"
          className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-slate-300 hover:text-cyan-300 hover:bg-slate-900 rounded-full transition-colors active:scale-95 cursor-pointer touch-manipulation"
        >
          <Home className="w-4 h-4" />
        </button>
      </div>

      {/* Right Action Buttons */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        {/* 1-Tap Ghost Panic Button */}
        <button
          type="button"
          onClick={onOpenPanic}
          title="1-Tap Ghost Panic Button (Wipe All Sessions & History Instantly)"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-rose-950/40 border border-rose-500/30 text-rose-300 hover:text-rose-100 hover:bg-rose-900/60 transition-all active:scale-95 cursor-pointer touch-manipulation"
        >
          <Ghost className="w-4 h-4 text-rose-400" />
          <span className="text-[11px] font-bold tracking-wider hidden sm:inline-block">
            PANIC
          </span>
        </button>

        {/* Tab Count Indicator / Switcher */}
        <button
          type="button"
          onClick={onOpenTabs}
          title="Tabs Overview"
          className="relative px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-900 text-cyan-400 hover:text-cyan-200 hover:border-cyan-400/60 font-mono font-bold text-xs transition-colors flex items-center justify-center min-w-[32px] h-8 active:scale-95 cursor-pointer touch-manipulation"
        >
          {tabCount}
        </button>

        {/* New Tab Quick Button */}
        <button
          type="button"
          onClick={onNewTab}
          title="New Tab (+)"
          className="w-8 h-8 sm:w-9 sm:h-9 text-cyan-300 hover:text-white bg-cyan-950/60 border border-cyan-500/40 hover:bg-cyan-900 rounded-xl transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-sm touch-manipulation"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* 3-Dot Menu Button */}
        <button
          type="button"
          onClick={onOpenMenu}
          title="Browser Settings & Tools"
          className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-slate-300 hover:text-cyan-300 hover:bg-slate-900 rounded-full transition-colors active:scale-95 cursor-pointer touch-manipulation"
        >
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
