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
  ArrowRight,
  Sparkles,
  Globe,
  Radio,
} from 'lucide-react';
import { Tab } from '../types/browser';
import { getSanitizedSearchUrl } from '../engine/adblocker';

interface SearchSuggestionsOverlayProps {
  isOpen: boolean;
  initialQuery?: string;
  tabs?: Tab[];
  onClose: () => void;
  onNavigate: (url: string) => void;
  onNewTabWithQuery: (query: string) => void;
}

interface SuggestionItem {
  id: string;
  type: 'history' | 'ai' | 'url' | 'trending' | 'tab';
  text: string;
  subtext?: string;
  url?: string;
  targetTabId?: string;
}

export const SearchSuggestionsOverlay: React.FC<SearchSuggestionsOverlayProps> = ({
  isOpen,
  initialQuery = '',
  tabs = [],
  onClose,
  onNavigate,
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
      }, 80);
    }
  }, [isOpen, initialQuery]);

  if (!isOpen) return null;

  // Curate dynamic suggestions matching user screenshot
  const getSuggestions = (): SuggestionItem[] => {
    const q = query.trim().toLowerCase();

    const baseList: SuggestionItem[] = [
      {
        id: 'sug-1',
        type: 'history',
        text: 'omarvio',
      },
      {
        id: 'sug-2',
        type: 'ai',
        text: 'OMARVIO এ কোম্পানি সম্পর্কে বাংলায় বল',
        subtext: 'AI Mode',
      },
      {
        id: 'sug-3',
        type: 'url',
        text: 'omarvio-app.pages.dev',
        url: 'https://omarvio-app.pages.dev',
      },
      {
        id: 'sug-4',
        type: 'trending',
        text: 'cricbuzz live scores bangladesh',
      },
      {
        id: 'sug-5',
        type: 'trending',
        text: 'omarvio browser ai features',
      },
      {
        id: 'sug-6',
        type: 'trending',
        text: 'espncricinfo bpl today match',
      },
      {
        id: 'sug-7',
        type: 'tab',
        text: 'OMARVIO BROWSER | Google AI Studio',
        subtext: 'aistudio.google.com/apps/ddd28578-5449-4208-9f54-1d8d8e7f1b44',
      },
    ];

    if (!q) return baseList;

    // Filter or insert user search query
    const filtered = baseList.filter(
      (item) =>
        item.text.toLowerCase().includes(q) ||
        (item.subtext && item.subtext.toLowerCase().includes(q))
    );

    // Ensure direct query is on top
    const results: SuggestionItem[] = [
      {
        id: 'direct-user',
        type: q.includes('.') ? 'url' : 'history',
        text: query,
        subtext: q.includes('.') ? 'Go to website' : 'Search Omarvio',
      },
      ...filtered,
    ];

    return results;
  };

  const handleSelect = (item: SuggestionItem) => {
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
      {/* Top Search Input Bar (matching screenshot) */}
      <form
        onSubmit={handleSubmit}
        className="w-full flex items-center gap-2 px-3 py-2.5 border-b border-[#3c4043] bg-[#28292c]"
      >
        {/* + Button for New Tab with Query */}
        <button
          type="button"
          onClick={() => {
            onNewTabWithQuery(query);
            onClose();
          }}
          title="Open query in new tab"
          className="p-1.5 rounded-full hover:bg-[#3c4043] text-[#c4c7c5] hover:text-white transition-colors shrink-0"
        >
          <Plus className="w-5 h-5" />
        </button>

        {/* Text Input */}
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

        {/* Clear (✕) Button */}
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className="p-1 text-[#9aa0a6] hover:text-white rounded-full hover:bg-[#3c4043] transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Cancel / Close */}
        <button
          type="button"
          onClick={onClose}
          className="px-2 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors shrink-0"
        >
          Cancel
        </button>
      </form>

      {/* Suggestions List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#2f3136]">
        {suggestions.map((item) => (
          <div
            key={item.id}
            onClick={() => handleSelect(item)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#28292c] active:bg-[#35363a] transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              {/* Leading Icon based on type */}
              {item.type === 'history' && (
                <History className="w-5 h-5 text-[#9aa0a6] group-hover:text-cyan-400 shrink-0" />
              )}
              {item.type === 'ai' && (
                <div className="relative shrink-0">
                  <History className="w-5 h-5 text-indigo-400" />
                  <Sparkles className="w-2.5 h-2.5 text-cyan-400 absolute -top-1 -right-1" />
                </div>
              )}
              {item.type === 'url' && (
                <Globe className="w-5 h-5 text-[#9aa0a6] group-hover:text-cyan-400 shrink-0" />
              )}
              {item.type === 'trending' && (
                <Search className="w-5 h-5 text-[#9aa0a6] group-hover:text-cyan-400 shrink-0" />
              )}
              {item.type === 'tab' && (
                <div className="w-5 h-5 rounded-md bg-cyan-600/50 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                  O
                </div>
              )}

              {/* Text content */}
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-normal text-[#e3e3e3] truncate group-hover:text-white">
                  {item.text}
                </span>
                {item.subtext && (
                  <span className="text-[11px] text-[#9aa0a6] truncate flex items-center gap-1 font-medium">
                    {item.type === 'ai' && <span className="text-cyan-400">✦</span>}
                    {item.subtext}
                  </span>
                )}
              </div>
            </div>

            {/* Trailing Arrow Up-Left to insert into input */}
            <button
              type="button"
              onClick={(e) => handleFillInput(e, item.text)}
              title="Insert into search"
              className="p-2 text-[#80868b] hover:text-[#e3e3e3] hover:bg-[#3c4043] rounded-full transition-colors shrink-0 ml-2"
            >
              <ArrowUpLeft className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
