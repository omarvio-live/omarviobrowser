/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  X,
  History,
  Search,
  ArrowUpLeft,
  Bookmark,
  Globe,
  TrendingUp,
} from 'lucide-react';
import { Tab } from '../types/browser';
import { getSanitizedSearchUrl } from '../engine/adblocker';
import { getBrowsingHistory } from '../engine/history';
import { getBookmarks } from '../engine/bookmarks';

interface SearchSuggestionsOverlayProps {
  isOpen: boolean;
  initialQuery?: string;
  tabs?: Tab[];
  onClose: () => void;
  onNavigate: (url: string) => void;
  onSelectTab?: (tabId: string) => void;
  onNewTabWithQuery: (query: string) => void;
}

interface SuggestionItem {
  id: string;
  type: 'history' | 'bookmark' | 'url' | 'trending' | 'tab';
  text: string;
  subtext?: string;
  url?: string;
  targetTabId?: string;
}

const DEFAULT_TRENDING: SuggestionItem[] = [
  {
    id: 'tr-1',
    type: 'trending',
    text: 'Bangladesh cricket live score today',
    subtext: 'Trending Search',
  },
  {
    id: 'tr-2',
    type: 'trending',
    text: 'প্রথম আলো আজকের সর্বশেষ খবর',
    subtext: 'Trending News',
  },
  {
    id: 'tr-3',
    type: 'url',
    text: 'bn.m.wikipedia.org',
    url: 'https://bn.m.wikipedia.org',
    subtext: 'Fast Ad-Free Reference',
  },
];

export const SearchSuggestionsOverlay: React.FC<SearchSuggestionsOverlayProps> = ({
  isOpen,
  initialQuery = '',
  tabs = [],
  onClose,
  onNavigate,
  onSelectTab,
  onNewTabWithQuery,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 60);
    }
  }, [isOpen, initialQuery]);

  if (!isOpen) return null;

  const getSuggestions = (): SuggestionItem[] => {
    const q = query.trim().toLowerCase();
    const seen = new Set<string>();
    const results: SuggestionItem[] = [];

    if (q) {
      results.push({
        id: 'direct-user',
        type: q.includes('.') && !q.includes(' ') ? 'url' : 'trending',
        text: query.trim(),
        subtext: q.includes('.') && !q.includes(' ') ? 'Go directly to website' : 'Search privately with Omarvio',
      });
    }

    // 1. Open tabs matching query (switch-to-tab)
    tabs.forEach((tab) => {
      if (!tab.url) return;
      const matches =
        !q ||
        tab.title.toLowerCase().includes(q) ||
        tab.url.toLowerCase().includes(q);
      if (matches && !seen.has(`tab:${tab.id}`)) {
        seen.add(`tab:${tab.id}`);
        results.push({
          id: `open-tab-${tab.id}`,
          type: 'tab',
          text: tab.title || tab.url,
          subtext: `Switch to open tab · ${tab.url}`,
          url: tab.url,
          targetTabId: tab.id,
        });
      }
    });

    // 2. Real Bookmarks from Vault
    const bookmarks = getBookmarks();
    bookmarks.slice(0, 6).forEach((bm) => {
      const matches =
        !q ||
        bm.title.toLowerCase().includes(q) ||
        bm.url.toLowerCase().includes(q);
      if (matches && !seen.has(bm.url)) {
        seen.add(bm.url);
        results.push({
          id: `bm-${bm.id}`,
          type: 'bookmark',
          text: bm.title,
          subtext: bm.url,
          url: bm.url,
        });
      }
    });

    // 3. Real Browsing History
    const history = getBrowsingHistory();
    history.slice(0, 12).forEach((h) => {
      const matches =
        !q ||
        h.title.toLowerCase().includes(q) ||
        h.url.toLowerCase().includes(q) ||
        h.domain.toLowerCase().includes(q);
      if (matches && !seen.has(h.url)) {
        seen.add(h.url);
        results.push({
          id: `hist-${h.id}`,
          type: 'history',
          text: h.title || h.domain,
          subtext: h.url,
          url: h.url,
        });
      }
    });

    // 4. Trending queries fallback
    DEFAULT_TRENDING.forEach((tr) => {
      const matches = !q || tr.text.toLowerCase().includes(q);
      if (matches && !seen.has(tr.text)) {
        seen.add(tr.text);
        results.push(tr);
      }
    });

    return results.slice(0, 14);
  };

  const handleSelect = (item: SuggestionItem) => {
    if (item.type === 'tab' && item.targetTabId && onSelectTab) {
      onSelectTab(item.targetTabId);
      onClose();
      return;
    }
    if (item.url) {
      onNavigate(item.url);
    } else if (item.text.includes('.') && !item.text.includes(' ')) {
      const url = item.text.startsWith('http') ? item.text : `https://${item.text}`;
      onNavigate(url);
    } else {
      onNavigate(getSanitizedSearchUrl(item.text));
    }
    onClose();
  };

  const handleFillInput = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    setQuery(text);
    inputRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    const text = query.trim();
    if (text.includes('.') && !text.includes(' ')) {
      const target = text.startsWith('http') ? text : `https://${text}`;
      onNavigate(target);
    } else {
      onNavigate(getSanitizedSearchUrl(text));
    }
    onClose();
  };

  const suggestions = getSuggestions();

  return (
    <div className="fixed inset-0 z-50 bg-[#1f1f23] text-white flex flex-col animate-fadeIn touch-manipulation">
      {/* Top Search Input Bar */}
      <form
        onSubmit={handleSubmit}
        className="w-full flex items-center gap-2 px-3 py-2.5 border-b border-[#3c4043] bg-[#28292c]"
      >
        <button
          type="button"
          onClick={() => {
            onNewTabWithQuery(query);
            onClose();
          }}
          title="Open query in new tab"
          className="p-1.5 rounded-full hover:bg-[#3c4043] text-[#c4c7c5] hover:text-white transition-colors shrink-0 cursor-pointer"
        >
          <Plus className="w-5 h-5" />
        </button>

        <div className="flex-1 flex items-center min-w-0">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search or type URL"
            className="w-full bg-transparent text-base text-white placeholder-[#9aa0a6] focus:outline-none truncate"
          />
        </div>

        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className="p-1 text-[#9aa0a6] hover:text-white rounded-full hover:bg-[#3c4043] transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          className="px-2 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors shrink-0 cursor-pointer"
        >
          Cancel
        </button>
      </form>

      {/* Real Suggestions List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#2f3136]">
        {suggestions.map((item) => (
          <div
            key={item.id}
            onClick={() => handleSelect(item)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#28292c] active:bg-[#35363a] transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              {item.type === 'history' && (
                <History className="w-5 h-5 text-[#9aa0a6] group-hover:text-cyan-400 shrink-0" />
              )}
              {item.type === 'bookmark' && (
                <Bookmark className="w-5 h-5 text-amber-400 shrink-0" />
              )}
              {item.type === 'url' && (
                <Globe className="w-5 h-5 text-cyan-400 shrink-0" />
              )}
              {item.type === 'trending' && (
                <TrendingUp className="w-5 h-5 text-[#9aa0a6] group-hover:text-cyan-400 shrink-0" />
              )}
              {item.type === 'tab' && (
                <div className="w-5 h-5 rounded-md bg-cyan-600/60 border border-cyan-400/50 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                  T
                </div>
              )}

              <div className="flex flex-col min-w-0">
                <span className="text-sm font-normal text-[#e3e3e3] truncate group-hover:text-white">
                  {item.text}
                </span>
                {item.subtext && (
                  <span className="text-[11px] text-[#9aa0a6] truncate flex items-center gap-1 font-medium">
                    {item.subtext}
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => handleFillInput(e, item.url || item.text)}
              title="Insert into search"
              className="p-2 text-[#80868b] hover:text-[#e3e3e3] hover:bg-[#3c4043] rounded-full transition-colors shrink-0 ml-2 cursor-pointer"
            >
              <ArrowUpLeft className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
