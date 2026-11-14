/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * OMARVIO BROWSER - Brave Search Engine Selector Modal
 * Matches Brave Browser's native Search Engine preference dialog 1:1
 */

import React from 'react';
import { ArrowLeft, Check, Search, ShieldCheck } from 'lucide-react';

export interface SearchEngineOption {
  id: string;
  name: string;
  logo: React.ReactNode;
  urlPattern: string;
  isPrivate: boolean;
  badge?: string;
}

export const SEARCH_ENGINES: SearchEngineOption[] = [
  {
    id: 'brave',
    name: 'Brave',
    isPrivate: true,
    badge: 'Privacy Default',
    urlPattern: 'https://search.brave.com/search?q=',
    logo: (
      <div className="w-8 h-8 rounded-full bg-[#FB542B] flex items-center justify-center text-white shadow-sm shrink-0">
        <svg viewBox="0 0 32 32" className="w-5 h-5 fill-white" aria-hidden="true">
          <path d="M26.4 12.4l-3-6.5c-.3-.6-.8-1-1.4-1.2L16 3l-6 1.7c-.6.2-1.1.6-1.4 1.2l-3 6.5c-.3.6-.3 1.3 0 1.9l4.5 9.7c.3.6.8 1.1 1.4 1.3l4.5 1.7 4.5-1.7c.6-.2 1.1-.7 1.4-1.3l4.5-9.7c.3-.6.3-1.3 0-1.9z" />
          <path d="M16 6.5l4 1.2 2 4.3-3.5 1-2.5-2.5-2.5 2.5-3.5-1 2-4.3 4-1.2z" fill="#FB542B" />
        </svg>
      </div>
    ),
  },
  {
    id: 'google',
    name: 'Google',
    isPrivate: false,
    badge: 'Popular',
    urlPattern: 'https://www.google.com/search?q=',
    logo: (
      <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm shrink-0">
        <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
      </div>
    ),
  },
  {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    isPrivate: true,
    badge: 'Zero Tracking',
    urlPattern: 'https://duckduckgo.com/?q=',
    logo: (
      <div className="w-8 h-8 rounded-full bg-[#DE5833] flex items-center justify-center shadow-sm shrink-0 overflow-hidden p-1">
        <svg viewBox="0 0 24 24" className="w-full h-full" aria-hidden="true">
          <circle cx="12" cy="12" r="11" fill="#DE5833" />
          <path d="M12 4.5C9.5 4.5 7.5 6.5 7.5 9c0 1.2.5 2.3 1.3 3.1-.3.7-.8 1.4-1.5 1.9 1 .1 2.1-.2 2.9-.8.6.2 1.2.3 1.8.3 3 0 5.5-2.2 5.5-5.2 0-2.1-1.3-3.8-3.1-4.5-.4-.2-.9-.3-1.4-.3z" fill="#FFFFFF" />
          <path d="M14.5 10c0 .6-.4 1-1 1s-1-.4-1-1 .4-1 1-1 1 .4 1 1z" fill="#202124" />
          <circle cx="14" cy="9.7" r="0.3" fill="#FFFFFF" />
          <path d="M15.5 10.5c.8.2 2 .8 2 1.5 0 .8-1.5 1.2-3 1.2-.5 0-1-.1-1.5-.2.5-.5 1.5-1.5 2.5-2.5z" fill="#E8710A" />
          <path d="M10.5 17c.8-.8 2-1 3-1s2.2.2 3 1c-.8.8-2 1-3 1s-2.2-.2-3-1z" fill="#399438" />
        </svg>
      </div>
    ),
  },
  {
    id: 'firefox',
    name: 'Firefox',
    isPrivate: true,
    badge: 'Mozilla 🦊',
    urlPattern: 'https://duckduckgo.com/?q=&t=ffab',
    logo: (
      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#6c1b82] via-[#d63b2f] to-[#ff9400] flex items-center justify-center text-white shadow-sm shrink-0 overflow-hidden p-1">
        <svg viewBox="0 0 24 24" className="w-full h-full" aria-hidden="true">
          <circle cx="12" cy="12" r="9" fill="#2B3A67" />
          <path
            d="M12 3a9 9 0 0 0-8.2 5.3c1-.5 2.1-.6 3.2-.2 1.2.4 2 1.3 2.5 2.3.4.8.5 1.7.3 2.6-.2 1.1-.9 2-1.8 2.5a5.5 5.5 0 0 1-2.9.7c.3.8.7 1.6 1.3 2.2a9 9 0 1 0 5.6-15.4z"
            fill="url(#ff-fox-grad)"
          />
          <path
            d="M16 6.5c-1.3-.8-2.8-1-4.2-.6 1.4.6 2.4 1.7 2.8 3.1.3 1 .1 2.2-.5 3.1-.7 1-1.8 1.6-3 1.6-.7 0-1.4-.2-2-.5 1 .9 2.3 1.4 3.7 1.3 1.9-.1 3.6-1.2 4.4-2.9.9-1.8.7-3.9-.4-5.5-.2-.2-.5-.4-.8-.6z"
            fill="#FFAA00"
          />
          <defs>
            <linearGradient id="ff-fox-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF7139" />
              <stop offset="50%" stopColor="#E22550" />
              <stop offset="100%" stopColor="#9013FE" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    ),
  },
  {
    id: 'bing',
    name: 'Bing',
    isPrivate: false,
    badge: 'Microsoft',
    urlPattern: 'https://www.bing.com/search?q=',
    logo: (
      <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm shrink-0 p-1">
        <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
          <path
            d="M4.5 2.5v18.2l6.2 3.3 8.8-5.1-3.9-2.3-4.9 2.8V6.8l7 4 2.8-3.5L4.5 2.5z"
            fill="url(#bing-grad)"
          />
          <defs>
            <linearGradient id="bing-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#008373" />
              <stop offset="50%" stopColor="#00a4ef" />
              <stop offset="100%" stopColor="#2b5797" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    ),
  },
  {
    id: 'startpage',
    name: 'Startpage',
    isPrivate: true,
    badge: 'Private Google',
    urlPattern: 'https://www.startpage.com/sp/search?query=',
    logo: (
      <div className="w-8 h-8 rounded-full bg-[#002B49] border border-blue-900/60 flex items-center justify-center text-white shadow-sm shrink-0 p-1">
        <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
          <circle cx="9" cy="12" r="4.5" stroke="#1351d8" strokeWidth="2.2" fill="none" />
          <circle cx="15" cy="12" r="4.5" stroke="#4285F4" strokeWidth="2.2" fill="none" />
          <path d="M18 15.5L20.5 18" stroke="#4285F4" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </div>
    ),
  },
  {
    id: 'ecosia',
    name: 'Ecosia',
    isPrivate: true,
    badge: 'Trees 🌳',
    urlPattern: 'https://www.ecosia.org/search?q=',
    logo: (
      <div className="w-8 h-8 rounded-full bg-[#008543] flex items-center justify-center text-white shadow-sm shrink-0 p-1">
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" aria-hidden="true">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15.93c-2.31-.22-4.15-2.02-4.42-4.32l1.98-.39c.17 1.34 1.25 2.39 2.62 2.52v2.19zm2.44-3.1l-1.44 1.44V12h-2V9.83l-1.44 1.44-1.41-1.41L12 7l4.85 4.85-1.41 1.42z" />
        </svg>
      </div>
    ),
  },
  {
    id: 'qwant',
    name: 'Qwant',
    isPrivate: true,
    badge: 'EU Privacy',
    urlPattern: 'https://www.qwant.com/?q=',
    logo: (
      <div className="w-8 h-8 rounded-full bg-[#181a24] border border-slate-700 flex items-center justify-center shadow-sm shrink-0 p-1">
        <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
          <path
            d="M12 4a7 7 0 1 0 4.9 12l2.6 2.6 1.4-1.4-2.6-2.6A7 7 0 0 0 12 4zm0 11.5a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z"
            fill="url(#qwant-grad)"
          />
          <defs>
            <linearGradient id="qwant-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff455b" />
              <stop offset="50%" stopColor="#5c79ff" />
              <stop offset="100%" stopColor="#00d1b2" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    ),
  },
];

interface SearchEngineSelectorModalProps {
  isOpen: boolean;
  currentEngine: string;
  onSelectEngine: (engineId: string) => void;
  onClose: () => void;
}

export const SearchEngineSelectorModal: React.FC<SearchEngineSelectorModalProps> = ({
  isOpen,
  currentEngine,
  onSelectEngine,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fadeIn touch-manipulation"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#1e2025] rounded-3xl border border-neutral-700/80 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header matching Brave Settings Screenshot 1:1 */}
        <div className="px-5 py-4 flex items-center gap-3 border-b border-neutral-800 bg-[#252830]">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 -ml-1 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="ফিরে যান"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Search engine</h2>
            <p className="text-[11px] text-slate-400">ডিফল্ট সার্চ ইঞ্জিন ও প্রাইভেসির উৎস বেছে নিন</p>
          </div>
        </div>

        {/* Engine List Container */}
        <div className="p-4 overflow-y-auto space-y-2 scrollbar-none">
          {SEARCH_ENGINES.map((engine) => {
            const isSelected = currentEngine.toLowerCase() === engine.id.toLowerCase();

            return (
              <button
                key={engine.id}
                type="button"
                onClick={() => {
                  onSelectEngine(engine.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-blue-600/15 border-blue-500/80 shadow-md'
                    : 'bg-[#292c34] hover:bg-[#323640] border-transparent'
                }`}
              >
                {/* Left: Engine Logo + Name + Privacy Badge */}
                <div className="flex items-center gap-3.5 min-w-0">
                  {engine.logo}
                  <div className="text-left min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white tracking-wide">
                        {engine.name}
                      </span>
                      {engine.badge && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 font-medium">
                          {engine.badge}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 truncate block">
                      {engine.isPrivate ? '🛡️ ট্র্যাকারমুক্ত গোপনীয় সার্চ' : '⚡ দ্রুত গতির রেজাল্ট'}
                    </span>
                  </div>
                </div>

                {/* Right: Authentic Brave Radio Circle */}
                <div className="shrink-0 ml-3">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-600 shadow-[0_0_8px_rgba(59,130,246,0.6)]'
                        : 'border-slate-500 hover:border-slate-400'
                    }`}
                  >
                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer reassurance */}
        <div className="p-4 border-t border-neutral-800 bg-[#252830]/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>কোনো সার্চ কোয়েরি বা প্রোফাইল সংরক্ষণ করা হয় না</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-white font-medium text-xs transition-colors"
          >
            ঠিক আছে
          </button>
        </div>
      </div>
    </div>
  );
};
