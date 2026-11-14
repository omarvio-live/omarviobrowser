/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Tab } from '../types/browser';
import {
  X,
  Plus,
  Globe,
  MoreVertical,
  Search,
  LayoutGrid,
  Ghost,
  Shield,
  ExternalLink,
} from 'lucide-react';

interface TabSwitcherModalProps {
  isOpen: boolean;
  tabs: Tab[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onNewTab: () => void;
  onCloseModal: () => void;
  onCloseAllTabs?: () => void;
  onNewIncognitoTab?: () => void;
}

export const TabSwitcherModal: React.FC<TabSwitcherModalProps> = ({
  isOpen,
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
  onCloseModal,
  onCloseAllTabs,
  onNewIncognitoTab,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showMenu, setShowMenu] = useState(false);

  if (!isOpen) return null;

  const filteredTabs = searchQuery.trim()
    ? tabs.filter(
        (t) =>
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.url.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : tabs;

  return (
    <div className="fixed inset-0 z-50 bg-[#121316] text-[#e3e3e3] flex flex-col select-none animate-fadeIn">
      {/* ============================================================== */}
      {/* TOP TOOLBAR (MATCHING SCREENSHOT 1:1) */}
      {/* ============================================================== */}
      <div className="w-full flex items-center justify-between px-3.5 py-3 border-b border-[#28292c]">
        {/* Left: Rounded square button with '+' (New Tab) */}
        <button
          type="button"
          onClick={() => {
            onNewTab();
            onCloseModal();
          }}
          title="New Tab"
          className="w-10 h-10 rounded-2xl bg-[#a8c7fa] hover:bg-[#8ab4f8] text-[#041e49] flex items-center justify-center font-bold shadow-md active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>

        {/* Center: Rounded badge with tab count [N] + Grid icon */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1e1f23] border border-[#3c4043] shadow-inner">
          <div className="w-6 h-6 rounded-md bg-[#28292c] border border-[#3c4043] text-white flex items-center justify-center text-xs font-mono font-bold">
            {tabs.length}
          </div>
          <button
            type="button"
            className="p-1 rounded text-[#c4c7c5] hover:text-white transition-colors"
            title="Tab Grid View"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>

        {/* Right: 3-Dot Overflow Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            title="Tabs Options"
            className="w-10 h-10 rounded-full hover:bg-[#28292c] text-[#e3e3e3] flex items-center justify-center active:scale-95 transition-colors cursor-pointer"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {/* Quick Tabs Menu Popup */}
          {showMenu && (
            <div className="absolute top-full right-0 mt-2 w-48 rounded-2xl bg-[#28292c] border border-[#3c4043] shadow-2xl py-1.5 z-50 animate-fadeIn">
              <button
                type="button"
                onClick={() => {
                  onNewTab();
                  setShowMenu(false);
                  onCloseModal();
                }}
                className="w-full px-4 py-2.5 text-left text-xs text-white hover:bg-[#35363a] transition-colors flex items-center gap-2.5"
              >
                <Plus className="w-4 h-4 text-[#c4c7c5]" /> New tab
              </button>
              {onNewIncognitoTab && (
                <button
                  type="button"
                  onClick={() => {
                    onNewIncognitoTab();
                    setShowMenu(false);
                    onCloseModal();
                  }}
                  className="w-full px-4 py-2.5 text-left text-xs text-white hover:bg-[#35363a] transition-colors flex items-center gap-2.5"
                >
                  <Ghost className="w-4 h-4 text-[#c4c7c5]" /> New Incognito tab
                </button>
              )}
              {onCloseAllTabs && (
                <button
                  type="button"
                  onClick={() => {
                    onCloseAllTabs();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-xs text-rose-400 hover:bg-rose-950/40 transition-colors flex items-center gap-2.5 border-t border-[#3c4043]"
                >
                  <X className="w-4 h-4 text-rose-400" /> Close all tabs
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* SEARCH YOUR TABS INPUT PILL (MATCHING SCREENSHOT 1:1) */}
      {/* ============================================================== */}
      <div className="px-3.5 py-2.5">
        <div className="w-full h-11 rounded-full bg-[#28292c] border border-[#3c4043] flex items-center px-4 gap-2.5 shadow-sm">
          <Search className="w-4 h-4 text-[#9aa0a6] shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your tabs"
            className="w-full bg-transparent text-sm text-white placeholder-[#9aa0a6] focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="p-1 rounded-full text-[#9aa0a6] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2-COLUMN TAB CARDS GRID (MATCHING SCREENSHOT 1:1) */}
      {/* ============================================================== */}
      <div className="flex-1 overflow-y-auto px-3.5 py-2 grid grid-cols-2 gap-3 scrollbar-thin scrollbar-thumb-neutral-700">
        {filteredTabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const isHomeTab = !tab.url;

          return (
            <div
              key={tab.id}
              onClick={() => {
                onSelectTab(tab.id);
                onCloseModal();
              }}
              className={`relative flex flex-col h-56 rounded-2xl overflow-hidden cursor-pointer active:scale-[0.98] transition-all group ${
                isActive
                  ? 'ring-2 ring-[#a8c7fa] shadow-xl shadow-blue-950/40'
                  : 'border border-[#3c4043] hover:border-[#5f6368] shadow-md'
              } ${tab.isIncognito ? 'bg-[#18191c]' : 'bg-[#202124]'}`}
            >
              {/* Card Header Bar */}
              <div
                className={`w-full flex items-center justify-between px-2.5 py-2 z-10 ${
                  isActive
                    ? 'bg-[#2b3140] text-white'
                    : tab.isIncognito
                    ? 'bg-[#121316] text-[#c4c7c5]'
                    : 'bg-[#2d2f34] text-[#c4c7c5]'
                }`}
              >
                {/* Favicon + Title */}
                <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-1">
                  {tab.isIncognito ? (
                    <Ghost className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  ) : isHomeTab ? (
                    <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-500 flex items-center justify-center text-[9px] font-black text-slate-950 shrink-0">
                      O
                    </div>
                  ) : (
                    <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  )}

                  <span className="text-xs font-medium truncate text-white">
                    {isHomeTab ? 'OMARVIO Browser' : tab.title || 'Webpage'}
                  </span>
                </div>

                {/* Close Button (✕) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.id);
                  }}
                  title="Close Tab"
                  className="p-1 rounded-full text-[#9aa0a6] hover:text-white hover:bg-white/10 transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Card Body: Live Preview Thumbnail */}
              <div className="flex-1 w-full relative bg-[#18191c] overflow-hidden flex flex-col justify-center items-center p-2">
                {isHomeTab ? (
                  /* Miniature Home Screen Preview */
                  <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center pointer-events-none select-none opacity-85">
                    <span className="text-sm font-black tracking-tight text-cyan-400 mb-1">
                      OMARVIO
                    </span>
                    <div className="w-full h-5 rounded-full bg-white/90 mb-2 flex items-center px-2">
                      <span className="text-[7px] text-slate-600">Search Omarvio</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1 w-full px-1">
                      <div className="w-4 h-4 rounded-full bg-blue-600 mx-auto" />
                      <div className="w-4 h-4 rounded-full bg-red-600 mx-auto" />
                      <div className="w-4 h-4 rounded-full bg-green-600 mx-auto" />
                      <div className="w-4 h-4 rounded-full bg-slate-700 mx-auto" />
                    </div>
                  </div>
                ) : (
                  /* Miniature Webpage Preview */
                  <div className="w-full h-full flex flex-col justify-start p-2 pointer-events-none opacity-80">
                    <div className="w-full h-2.5 rounded bg-[#2d2f34] mb-1.5" />
                    <div className="w-3/4 h-2 rounded bg-[#3c4043] mb-1" />
                    <div className="w-1/2 h-2 rounded bg-[#3c4043] mb-2" />
                    <div className="w-full flex-1 rounded bg-[#202124] border border-[#2d2f34] flex items-center justify-center">
                      <span className="text-[9px] text-[#9aa0a6] truncate max-w-[100px] px-1 font-mono">
                        {tab.url}
                      </span>
                    </div>
                  </div>
                )}

                {/* Incognito Badge */}
                {tab.isIncognito && (
                  <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 border border-slate-700 text-[9px] text-indigo-300 flex items-center gap-1">
                    <Ghost className="w-2.5 h-2.5" /> Incognito
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Done / Return bar */}
      <div className="w-full p-2.5 bg-[#1e1f23] border-t border-[#28292c] flex items-center justify-between">
        <span className="text-xs text-[#9aa0a6] pl-2">
          {tabs.length} {tabs.length === 1 ? 'tab' : 'tabs'} open
        </span>
        <button
          type="button"
          onClick={onCloseModal}
          className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-colors shadow-sm cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  );
};
