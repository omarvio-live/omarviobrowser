/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Star,
  Download,
  RotateCw,
  Plus,
  Ghost,
  FolderPlus,
  History,
  Trash2,
  Sliders,
  CheckSquare,
  Square,
  Bookmark,
  Layers,
  Share2,
  Search,
  Languages,
  BookOpen,
  Smartphone,
  Monitor,
  Settings,
  HelpCircle,
  Edit3,
  Zap,
  MapPin,
} from 'lucide-react';

interface ChromeMenuDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  isHomePage: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  isBookmarked: boolean;
  isDesktopMode: boolean;
  isReadingMode?: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  onToggleBookmark: () => void;
  onDownloadPage: () => void;
  onReload: () => void;
  onNewTab: () => void;
  onNewIncognitoTab: () => void;
  onAddTabToGroup: () => void;
  onOpenHistory: () => void;
  onOpenDeleteData: () => void;
  onOpenSiteControls: () => void;
  onOpenDownloads: () => void;
  onOpenBookmarks: () => void;
  onOpenRecentTabs: () => void;
  onShare: () => void;
  onFindInPage: () => void;
  onTranslate: () => void;
  onToggleReadingMode: () => void;
  onInstallShortcut: () => void;
  onOpenDefaultBrowser?: () => void;
  onToggleDesktopSite: () => void;
  onCustomizeHome: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
}

export const ChromeMenuDropdown: React.FC<ChromeMenuDropdownProps> = ({
  isOpen,
  onClose,
  isHomePage,
  canGoBack,
  canGoForward,
  isBookmarked,
  isDesktopMode,
  isReadingMode = false,
  onGoBack,
  onGoForward,
  onToggleBookmark,
  onDownloadPage,
  onReload,
  onNewTab,
  onNewIncognitoTab,
  onAddTabToGroup,
  onOpenHistory,
  onOpenDeleteData,
  onOpenSiteControls,
  onOpenDownloads,
  onOpenBookmarks,
  onOpenRecentTabs,
  onShare,
  onFindInPage,
  onTranslate,
  onToggleReadingMode,
  onInstallShortcut,
  onOpenDefaultBrowser,
  onToggleDesktopSite,
  onCustomizeHome,
  onOpenSettings,
  onOpenHelp,
}) => {
  if (!isOpen) return null;

  const handleAction = (cb: () => void) => {
    cb();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end select-none animate-fadeIn">
      {/* Invisible backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />

      {/* Chrome Android Dropdown Floating Panel */}
      <div
        className="relative z-10 w-[290px] xs:w-[320px] max-h-[92vh] overflow-y-auto mt-2 mr-2 rounded-2xl bg-[#28292c] text-[#e3e3e3] border border-[#3c4043] shadow-2xl flex flex-col py-1.5 scrollbar-thin scrollbar-thumb-neutral-600"
        style={{
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.65), 0 2px 6px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Top 5-Action Buttons Row: Back, Forward, Bookmark, Download, Reload */}
        <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-[#3c4043]/60 mb-1">
          {/* Back */}
          <button
            type="button"
            disabled={!canGoBack}
            onClick={() => handleAction(onGoBack)}
            title="Back"
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
              canGoBack
                ? 'text-[#e3e3e3] hover:bg-[#3c4043] active:scale-95'
                : 'text-[#80868b] cursor-not-allowed opacity-50'
            }`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Forward */}
          <button
            type="button"
            disabled={!canGoForward}
            onClick={() => handleAction(onGoForward)}
            title="Forward"
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
              canGoForward
                ? 'text-[#e3e3e3] hover:bg-[#3c4043] active:scale-95'
                : 'text-[#80868b] cursor-not-allowed opacity-50'
            }`}
          >
            <ArrowRight className="w-5 h-5" />
          </button>

          {/* Bookmark */}
          <button
            type="button"
            onClick={() => handleAction(onToggleBookmark)}
            title={isBookmarked ? 'Bookmarked' : 'Add bookmark'}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[#e3e3e3] hover:bg-[#3c4043] active:scale-95 transition-colors"
          >
            <Star
              className={`w-5 h-5 ${
                isBookmarked ? 'fill-amber-400 text-amber-400' : 'text-[#e3e3e3]'
              }`}
            />
          </button>

          {/* Download */}
          <button
            type="button"
            onClick={() => handleAction(onDownloadPage)}
            title="Download page offline"
            className="w-10 h-10 rounded-full flex items-center justify-center text-[#e3e3e3] hover:bg-[#3c4043] active:scale-95 transition-colors"
          >
            <Download className="w-5 h-5" />
          </button>

          {/* Reload */}
          <button
            type="button"
            onClick={() => handleAction(onReload)}
            title="Reload"
            className="w-10 h-10 rounded-full flex items-center justify-center text-[#e3e3e3] hover:bg-[#3c4043] active:scale-95 transition-colors"
          >
            <RotateCw className="w-5 h-5" />
          </button>
        </div>

        {/* Menu Items List */}
        <div className="flex flex-col py-0.5">
          {/* New Tab */}
          <button
            type="button"
            onClick={() => handleAction(onNewTab)}
            className="w-full flex items-center gap-3.5 px-4 py-3 hover:bg-[#35363a] active:bg-[#3c4043] text-left text-sm transition-colors cursor-pointer"
          >
            <Plus className="w-5 h-5 text-[#c4c7c5] shrink-0" />
            <span className="text-[#e3e3e3] font-normal">New tab</span>
          </button>

          {/* New Incognito Tab */}
          <button
            type="button"
            onClick={() => handleAction(onNewIncognitoTab)}
            className="w-full flex items-center gap-3.5 px-4 py-3 hover:bg-[#35363a] active:bg-[#3c4043] text-left text-sm transition-colors cursor-pointer"
          >
            <Ghost className="w-5 h-5 text-[#c4c7c5] shrink-0" />
            <span className="text-[#e3e3e3] font-normal">New Incognito tab</span>
          </button>

          {/* Add tab to new group */}
          <button
            type="button"
            onClick={() => handleAction(onAddTabToGroup)}
            className="w-full flex items-center gap-3.5 px-4 py-3 hover:bg-[#35363a] active:bg-[#3c4043] text-left text-sm transition-colors cursor-pointer"
          >
            <FolderPlus className="w-5 h-5 text-[#c4c7c5] shrink-0" />
            <span className="text-[#e3e3e3] font-normal">Add tab to new group</span>
          </button>

          <div className="my-1 border-t border-[#3c4043]/80" />

          {/* History */}
          <button
            type="button"
            onClick={() => handleAction(onOpenHistory)}
            className="w-full flex items-center gap-3.5 px-4 py-3 hover:bg-[#35363a] active:bg-[#3c4043] text-left text-sm transition-colors cursor-pointer"
          >
            <History className="w-5 h-5 text-[#c4c7c5] shrink-0" />
            <span className="text-[#e3e3e3] font-normal">History</span>
          </button>

          {/* Delete browsing data */}
          <button
            type="button"
            onClick={() => handleAction(onOpenDeleteData)}
            className="w-full flex items-center gap-3.5 px-4 py-3 hover:bg-[#35363a] active:bg-[#3c4043] text-left text-sm transition-colors cursor-pointer"
          >
            <Trash2 className="w-5 h-5 text-[#c4c7c5] shrink-0" />
            <span className="text-[#e3e3e3] font-normal">Delete browsing data</span>
          </button>

          {/* Site controls (Webpage only) */}
          {!isHomePage && (
            <button
              type="button"
              onClick={() => handleAction(onOpenSiteControls)}
              className="w-full flex items-center gap-3.5 px-4 py-3 hover:bg-[#35363a] active:bg-[#3c4043] text-left text-sm transition-colors cursor-pointer"
            >
              <Sliders className="w-5 h-5 text-[#c4c7c5] shrink-0" />
              <span className="text-[#e3e3e3] font-normal">Site controls</span>
            </button>
          )}

          <div className="my-1 border-t border-[#3c4043]/80" />

          {/* Downloads */}
          <button
            type="button"
            onClick={() => handleAction(onOpenDownloads)}
            className="w-full flex items-center gap-3.5 px-4 py-3 hover:bg-[#35363a] active:bg-[#3c4043] text-left text-sm transition-colors cursor-pointer"
          >
            <Download className="w-5 h-5 text-[#c4c7c5] shrink-0" />
            <span className="text-[#e3e3e3] font-normal">Downloads</span>
          </button>

          {/* Bookmarks */}
          <button
            type="button"
            onClick={() => handleAction(onOpenBookmarks)}
            className="w-full flex items-center gap-3.5 px-4 py-3 hover:bg-[#35363a] active:bg-[#3c4043] text-left text-sm transition-colors cursor-pointer"
          >
            <Bookmark className="w-5 h-5 text-[#c4c7c5] shrink-0" />
            <span className="text-[#e3e3e3] font-normal">Bookmarks</span>
          </button>

          {/* Recent tabs */}
          <button
            type="button"
            onClick={() => handleAction(onOpenRecentTabs)}
            className="w-full flex items-center gap-3.5 px-4 py-3 hover:bg-[#35363a] active:bg-[#3c4043] text-left text-sm transition-colors cursor-pointer"
          >
            <Layers className="w-5 h-5 text-[#c4c7c5] shrink-0" />
            <span className="text-[#e3e3e3] font-normal">Recent tabs</span>
          </button>

          <div className="my-1 border-t border-[#3c4043]/80" />

          {/* Webpage-specific items */}
          {!isHomePage && (
            <>
              {/* Share... */}
              <button
                type="button"
                onClick={() => handleAction(onShare)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#35363a] active:bg-[#3c4043] text-left text-sm transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <Share2 className="w-5 h-5 text-[#c4c7c5] shrink-0" />
                  <span className="text-[#e3e3e3] font-normal">Share...</span>
                </div>
                {/* OMARVIO brand icon badge */}
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-sm">
                  <span className="text-[10px] font-black text-white">O</span>
                </div>
              </button>

              {/* Find in page */}
              <button
                type="button"
                onClick={() => handleAction(onFindInPage)}
                className="w-full flex items-center gap-3.5 px-4 py-3 hover:bg-[#35363a] active:bg-[#3c4043] text-left text-sm transition-colors cursor-pointer"
              >
                <Search className="w-5 h-5 text-[#c4c7c5] shrink-0" />
                <span className="text-[#e3e3e3] font-normal">Find in page</span>
              </button>

              {/* Translate... */}
              <button
                type="button"
                onClick={() => handleAction(onTranslate)}
                className="w-full flex items-center gap-3.5 px-4 py-3 hover:bg-[#35363a] active:bg-[#3c4043] text-left text-sm transition-colors cursor-pointer"
              >
                <Languages className="w-5 h-5 text-[#c4c7c5] shrink-0" />
                <span className="text-[#e3e3e3] font-normal">Translate...</span>
              </button>

              {/* Show / Exit Reading mode */}
              <button
                type="button"
                onClick={() => handleAction(onToggleReadingMode)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#35363a] active:bg-[#3c4043] text-left text-sm transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <BookOpen
                    className={`w-5 h-5 shrink-0 ${
                      isReadingMode ? 'text-cyan-400' : 'text-[#c4c7c5]'
                    }`}
                  />
                  <span className={isReadingMode ? 'text-cyan-300 font-medium' : 'text-[#e3e3e3] font-normal'}>
                    {isReadingMode ? 'Exit Reading mode' : 'Show Reading mode'}
                  </span>
                </div>
                <div className="text-cyan-400">
                  {isReadingMode ? (
                    <div className="w-5 h-5 rounded bg-cyan-500 border border-cyan-400 flex items-center justify-center text-slate-950 font-bold shadow-sm">
                      <svg className="w-3.5 h-3.5 stroke-current stroke-2 fill-none" viewBox="0 0 24 24">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded border-2 border-[#8e918f] bg-transparent" />
                  )}
                </div>
              </button>

              {/* Install and create shortcut */}
              <button
                type="button"
                onClick={() => handleAction(onInstallShortcut)}
                className="w-full flex items-center gap-3.5 px-4 py-3 hover:bg-[#35363a] active:bg-[#3c4043] text-left text-sm transition-colors cursor-pointer"
              >
                <Smartphone className="w-5 h-5 text-[#c4c7c5] shrink-0" />
                <span className="text-[#e3e3e3] font-normal">Install and create shortcut</span>
              </button>

              {/* Set as default browser & WhatsApp link suggestion optimizer */}
              {onOpenDefaultBrowser && (
                <button
                  type="button"
                  onClick={() => handleAction(onOpenDefaultBrowser)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#35363a] active:bg-[#3c4043] text-left text-sm transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <Zap className="w-5 h-5 text-cyan-400 shrink-0" />
                    <span className="text-[#e3e3e3] font-normal">Set as default browser</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    ডিফল্ট ব্রাউজার
                  </span>
                </button>
              )}

              {/* Desktop site with CHECKBOX toggle */}
              <button
                type="button"
                onClick={() => {
                  onToggleDesktopSite();
                  onClose();
                }}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#35363a] active:bg-[#3c4043] text-left text-sm transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <Monitor className="w-5 h-5 text-[#c4c7c5] shrink-0" />
                  <span className="text-[#e3e3e3] font-normal">Desktop site</span>
                </div>
                {/* Authentic Square Checkbox matching Chrome Android */}
                <div className="text-cyan-400">
                  {isDesktopMode ? (
                    <div className="w-5 h-5 rounded bg-cyan-500 border border-cyan-400 flex items-center justify-center text-slate-950 font-bold shadow-sm">
                      <svg className="w-3.5 h-3.5 stroke-current stroke-2 fill-none" viewBox="0 0 24 24">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded border-2 border-[#8e918f] bg-transparent" />
                  )}
                </div>
              </button>

              <div className="my-1 border-t border-[#3c4043]/80" />
            </>
          )}

          {/* Home-specific items */}
          {isHomePage && (
            <>
              {/* Customize new tab page */}
              <button
                type="button"
                onClick={() => handleAction(onCustomizeHome)}
                className="w-full flex items-center gap-3.5 px-4 py-3 hover:bg-[#35363a] active:bg-[#3c4043] text-left text-sm transition-colors cursor-pointer"
              >
                <Edit3 className="w-5 h-5 text-[#c4c7c5] shrink-0" />
                <span className="text-[#e3e3e3] font-normal">Customize new tab page</span>
              </button>

              <div className="my-1 border-t border-[#3c4043]/80" />
            </>
          )}

          {/* Settings */}
          <button
            type="button"
            onClick={() => handleAction(onOpenSettings)}
            className="w-full flex items-center gap-3.5 px-4 py-3 hover:bg-[#35363a] active:bg-[#3c4043] text-left text-sm transition-colors cursor-pointer"
          >
            <Settings className="w-5 h-5 text-[#c4c7c5] shrink-0" />
            <span className="text-[#e3e3e3] font-normal">Settings</span>
          </button>

          {/* Help & feedback */}
          <button
            type="button"
            onClick={() => handleAction(onOpenHelp)}
            className="w-full flex items-center gap-3.5 px-4 py-3 hover:bg-[#35363a] active:bg-[#3c4043] text-left text-sm transition-colors cursor-pointer"
          >
            <HelpCircle className="w-5 h-5 text-[#c4c7c5] shrink-0" />
            <span className="text-[#e3e3e3] font-normal">Help & feedback</span>
          </button>
        </div>
      </div>
    </div>
  );
};
