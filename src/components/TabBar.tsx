/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Tab } from '../types/browser';
import { Plus, X, Globe, Shield } from 'lucide-react';

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onNewTab: () => void;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
}) => {
  return (
    <div className="w-full flex items-center bg-slate-950/80 border-b border-slate-800/80 px-2 pt-1 gap-1 overflow-x-auto select-none no-scrollbar">
      {/* Tab Items */}
      <div className="flex items-center gap-1 flex-1 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-t-lg text-xs font-medium cursor-pointer transition-all duration-150 max-w-[200px] min-w-[110px] shrink-0 border-t border-x ${
                isActive
                  ? 'bg-slate-900 text-cyan-300 border-slate-700/80 shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 border-transparent'
              }`}
            >
              {/* Tab Icon */}
              {tab.favicon ? (
                <img
                  src={tab.favicon}
                  alt=""
                  className="w-3.5 h-3.5 rounded shrink-0 object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <Globe className="w-3.5 h-3.5 text-cyan-500/70 shrink-0" />
              )}

              {/* Title */}
              <span className="truncate flex-1 text-left">
                {tab.title || (tab.url ? new URL(tab.url).hostname : 'New Tab')}
              </span>

              {/* Close Button */}
              {tabs.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.id);
                  }}
                  className={`p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors ${
                    isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                  title="Close Tab"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* New Tab Button */}
      <button
        type="button"
        onClick={onNewTab}
        className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-md transition-colors shrink-0"
        title="Open New Tab"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
};
