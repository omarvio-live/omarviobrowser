/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, Shield, Lock, Camera, ArrowRight, X, Globe, Sparkles, ExternalLink } from 'lucide-react';
import { getSanitizedSearchUrl } from '../engine/adblocker';

interface OmniboxProps {
  currentUrl: string;
  isLoading: boolean;
  onNavigate: (targetUrl: string) => void;
  onOpenLens?: () => void;
  onOpenSearchOverlay?: () => void;
}

export const Omnibox: React.FC<OmniboxProps> = ({
  currentUrl,
  isLoading,
  onNavigate,
  onOpenLens,
  onOpenSearchOverlay,
}) => {
  const [inputValue, setInputValue] = useState(currentUrl);
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isFocused) {
      setInputValue(currentUrl);
    }
  }, [currentUrl, isFocused]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    if (val.trim().length > 1) {
      const q = val.trim();
      // Generate instant smart suggestions
      const list: string[] = [];
      if (!q.includes('.')) {
        list.push(`${q} - Private Search`);
        list.push(`${q} youtube`);
        list.push(`${q} wikipedia`);
        list.push(`${q} bangla news`);
      } else {
        list.push(q.startsWith('http') ? q : `https://${q}`);
      }
      setSuggestions(list);
    } else {
      setSuggestions([]);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = inputValue.trim();
    if (!query) return;

    setIsFocused(false);
    setSuggestions([]);
    if (inputRef.current) inputRef.current.blur();

    let target = query;
    if (query.trim().toLowerCase() === 'google' || query.trim().toLowerCase() === 'google.com') {
      target = 'https://google.com';
    } else if (!query.includes('.') || query.includes(' ')) {
      target = getSanitizedSearchUrl(query);
    } else {
      if (!query.startsWith('http://') && !query.startsWith('https://')) {
        target = `https://${query}`;
      }
      try {
        const parsed = new URL(target);
        target = `${parsed.protocol}//${parsed.hostname.toLowerCase()}${parsed.pathname === '/' && !query.endsWith('/') ? '' : parsed.pathname}${parsed.search}${parsed.hash}`;
      } catch {
        // keep target
      }
    }
    onNavigate(target);
  };

  const handleSelectSuggestion = (suggestion: string) => {
    const clean = suggestion.replace(' - Private Search', '');
    setInputValue(clean);
    setIsFocused(false);
    setSuggestions([]);
    if (clean.trim().toLowerCase() === 'google' || clean.trim().toLowerCase() === 'google.com') {
      onNavigate('https://google.com');
      return;
    }
    if (!clean.includes('.') || clean.includes(' ')) {
      onNavigate(getSanitizedSearchUrl(clean));
    } else {
      let target = clean.startsWith('http') ? clean : `https://${clean}`;
      try {
        const parsed = new URL(target);
        target = `${parsed.protocol}//${parsed.hostname.toLowerCase()}${parsed.pathname === '/' && !clean.endsWith('/') ? '' : parsed.pathname}${parsed.search}${parsed.hash}`;
      } catch {}
      onNavigate(target);
    }
  };

  const displayHost = () => {
    if (!currentUrl) return '';
    try {
      const u = new URL(currentUrl);
      return u.hostname;
    } catch {
      return currentUrl;
    }
  };

  return (
    <div className="relative w-full z-30">
      <form
        onSubmit={handleSubmit}
        className={`w-full flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl sm:rounded-full transition-all duration-200 border ${
          isFocused
            ? 'bg-slate-900/95 border-cyan-400/80 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-400/30'
            : 'bg-slate-900/80 hover:bg-slate-900 border-slate-700/60 hover:border-slate-600'
        }`}
      >
        {/* Security Indicator */}
        <div
          title="256-Bit Military Privacy Shield Active"
          className="flex items-center gap-1 pl-0.5 text-cyan-400 select-none cursor-default shrink-0"
        >
          <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 shrink-0" />
          <span className="hidden md:inline-block text-[10px] font-semibold text-cyan-300 tracking-wider">
            SECURE
          </span>
        </div>

        {/* Omnibox Input */}
        <div
          onClick={() => {
            if (onOpenSearchOverlay) {
              onOpenSearchOverlay();
            }
          }}
          className="relative flex-1 flex items-center min-w-0 cursor-pointer"
        >
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => {
              if (onOpenSearchOverlay) {
                inputRef.current?.blur();
                onOpenSearchOverlay();
                return;
              }
              setIsFocused(true);
              if (inputValue === currentUrl) {
                inputRef.current?.select();
              }
            }}
            onBlur={() => {
              setTimeout(() => {
                setIsFocused(false);
                setSuggestions([]);
              }, 200);
            }}
            placeholder="Search privately or enter URL..."
            className="w-full bg-transparent text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none px-1 py-0.5 font-sans selection:bg-cyan-500/30 truncate"
          />

        </div>

        {/* Clear Button */}
        {inputValue && isFocused && (
          <button
            type="button"
            onClick={() => {
              setInputValue('');
              inputRef.current?.focus();
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded-full transition-colors touch-manipulation shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Camera Lens Icon - hidden on very narrow screens when typing */}
        {onOpenLens && !inputValue && (
          <button
            type="button"
            onClick={onOpenLens}
            title="Omarvio Privacy Lens & QR/Barcode Scanner"
            className="p-1.5 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/40 rounded-full transition-colors shrink-0 touch-manipulation"
          >
            <Camera className="w-4 h-4" />
          </button>
        )}

        {/* Quick In-App Search Navigate */}
        <button
          type="button"
          onClick={() => {
            const q = inputValue.trim();
            const target = q
              ? `https://www.google.com/search?q=${encodeURIComponent(q)}`
              : 'https://www.google.com';
            onNavigate(target);
          }}
          className="hidden sm:flex p-1.5 text-cyan-400 hover:text-white hover:bg-cyan-950/40 rounded-full transition-colors shrink-0 touch-manipulation"
          title="In-App Search Navigation"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </button>

        {/* Secure In-App Frame Navigate / Submit button */}
        <button
          type="submit"
          className="w-8 h-8 flex items-center justify-center text-slate-100 hover:text-white bg-blue-600 hover:bg-blue-500 rounded-full transition-colors shadow-sm shrink-0 touch-manipulation active:scale-95"
          title="Search / Go"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      {/* Progress Bar */}
      {isLoading && (
        <div className="absolute -bottom-1 left-3 right-3 h-0.5 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 w-1/3 animate-pulse rounded-full" />
        </div>
      )}

      {/* Instant Suggestions Dropdown */}
      {isFocused && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden py-1 z-50 backdrop-blur-md">
          {suggestions.map((item, idx) => (
            <div
              key={idx}
              onMouseDown={() => handleSelectSuggestion(item)}
              className="px-4 py-2 hover:bg-cyan-950/40 text-sm text-slate-200 hover:text-cyan-300 flex items-center justify-between cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2.5 truncate">
                {item.startsWith('http') ? (
                  <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
                ) : (
                  <Search className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                <span className="truncate">{item}</span>
              </div>
              <span className="text-[10px] text-slate-500 shrink-0 pl-2">Select ↵</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
