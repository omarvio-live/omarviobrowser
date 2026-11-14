/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OMARVIO BROWSER - Sleek, Clean Chrome/Brave-Style Home Interface
 * Copyright (c) OMARVIO GLOBAL LTD.
 * Slogan: "My Phone, My Data – Why Surrender It To Others!"
 * 
 * Clean, uncluttered layout:
 * - Prominent OMARVIO branding
 * - Unified Smart Omnibox with Instant Search Engine Picker
 * - Sleek AI Mode & Incognito Quick Actions
 * - Spacious 4-Column Grid of Circular Shortcuts
 * - Direct Android APK Download & PWA Install Hub
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Mic,
  MicOff,
  Sparkles,
  Ghost,
  ShieldCheck,
  Search,
  Plus,
  X,
  ChevronDown,
  Download,
  ArrowRight,
} from 'lucide-react';
import { getSanitizedSearchUrl } from '../engine/adblocker';
import {
  SearchEngineSelectorModal,
  SEARCH_ENGINES,
} from './SearchEngineSelectorModal';

interface BrowserHomeProps {
  onNavigate: (url: string) => void;
  onOpenLens?: () => void;
  onOpenSearchSuggestions?: (initialText?: string) => void;
  onOpenIncognitoTab?: () => void;
  onOpenAIMode?: () => void;
}

export interface CustomShortcut {
  id: string;
  name: string;
  url: string;
  colorBg: string;
  textColor?: string;
  letter: string;
}

const DEFAULT_SHORTCUTS: CustomShortcut[] = [
  {
    id: 'google',
    name: 'Google',
    url: 'https://www.google.com',
    colorBg: 'bg-white',
    textColor: 'text-[#4285F4]',
    letter: 'G',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    url: 'https://m.youtube.com',
    colorBg: 'bg-[#ff0000]',
    textColor: 'text-white',
    letter: '▶',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    url: 'https://m.facebook.com',
    colorBg: 'bg-[#1877f2]',
    textColor: 'text-white',
    letter: 'f',
  },
  {
    id: 'wikipedia',
    name: 'Wikipedia',
    url: 'https://bn.m.wikipedia.org',
    colorBg: 'bg-white',
    textColor: 'text-slate-900',
    letter: 'W',
  },
  {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    url: 'https://duckduckgo.com',
    colorBg: 'bg-[#de5833]',
    textColor: 'text-white',
    letter: '🦆',
  },
  {
    id: 'bing',
    name: 'Bing',
    url: 'https://www.bing.com',
    colorBg: 'bg-white',
    textColor: 'text-[#008373]',
    letter: 'B',
  },
  {
    id: 'firefox',
    name: 'Firefox',
    url: 'https://duckduckgo.com/?t=ffab',
    colorBg: 'bg-gradient-to-tr from-[#6c1b82] to-[#ff9400]',
    textColor: 'text-white',
    letter: '🦊',
  },
  {
    id: 'prothomalo',
    name: 'প্রথম আলো',
    url: 'https://www.prothomalo.com',
    colorBg: 'bg-[#0a192f]',
    textColor: 'text-rose-400',
    letter: 'PA',
  },
];

const renderShortcutIcon = (item: CustomShortcut) => {
  const id = item.id.toLowerCase();
  const url = item.url.toLowerCase();

  if (id === 'google' || url.includes('google.com')) {
    return (
      <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
      </svg>
    );
  }

  if (id === 'youtube' || url.includes('youtube.com')) {
    return (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" aria-hidden="true">
        <path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z" />
      </svg>
    );
  }

  if (id === 'facebook' || url.includes('facebook.com')) {
    return (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" aria-hidden="true">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    );
  }

  if (id === 'duckduckgo' || url.includes('duckduckgo.com')) {
    return (
      <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
        <circle cx="12" cy="12" r="11" fill="#DE5833" />
        <path d="M12 4.5C9.5 4.5 7.5 6.5 7.5 9c0 1.2.5 2.3 1.3 3.1-.3.7-.8 1.4-1.5 1.9 1 .1 2.1-.2 2.9-.8.6.2 1.2.3 1.8.3 3 0 5.5-2.2 5.5-5.2 0-2.1-1.3-3.8-3.1-4.5-.4-.2-.9-.3-1.4-.3z" fill="#FFFFFF" />
        <path d="M14.5 10c0 .6-.4 1-1 1s-1-.4-1-1 .4-1 1-1 1 .4 1 1z" fill="#202124" />
        <path d="M15.5 10.5c.8.2 2 .8 2 1.5 0 .8-1.5 1.2-3 1.2-.5 0-1-.1-1.5-.2.5-.5 1.5-1.5 2.5-2.5z" fill="#E8710A" />
      </svg>
    );
  }

  if (id === 'bing' || url.includes('bing.com')) {
    return (
      <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
        <path d="M4.5 2.5v18.2l6.2 3.3 8.8-5.1-3.9-2.3-4.9 2.8V6.8l7 4 2.8-3.5L4.5 2.5z" fill="#008373" />
      </svg>
    );
  }

  if (id === 'firefox' || url.includes('firefox') || url.includes('mozilla')) {
    return (
      <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill="#2B3A67" />
        <path d="M12 3a9 9 0 0 0-8.2 5.3c1-.5 2.1-.6 3.2-.2 1.2.4 2 1.3 2.5 2.3.4.8.5 1.7.3 2.6-.2 1.1-.9 2-1.8 2.5a5.5 5.5 0 0 1-2.9.7c.3.8.7 1.6 1.3 2.2a9 9 0 1 0 5.6-15.4z" fill="#FF7139" />
        <path d="M16 6.5c-1.3-.8-2.8-1-4.2-.6 1.4.6 2.4 1.7 2.8 3.1.3 1 .1 2.2-.5 3.1-.7 1-1.8 1.6-3 1.6-.7 0-1.4-.2-2-.5 1 .9 2.3 1.4 3.7 1.3 1.9-.1 3.6-1.2 4.4-2.9.9-1.8.7-3.9-.4-5.5-.2-.2-.5-.4-.8-.6z" fill="#FFAA00" />
      </svg>
    );
  }

  if (id === 'wikipedia' || url.includes('wikipedia.org')) {
    return (
      <span className="font-serif font-black text-slate-900 text-lg">W</span>
    );
  }

  return <span>{item.letter}</span>;
};

export const BrowserHome: React.FC<BrowserHomeProps> = ({
  onNavigate,
  onOpenLens,
  onOpenIncognitoTab,
  onOpenAIMode,
}) => {
  const [homeQuery, setHomeQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechFeedback, setSpeechFeedback] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Search Engine Selector State
  const [isEngineModalOpen, setIsEngineModalOpen] = useState(false);
  const [currentEngineId, setCurrentEngineId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('omarvio_search_engine') || 'google';
    }
    return 'google';
  });

  // User Customizable Shortcuts State
  const [shortcuts, setShortcuts] = useState<CustomShortcut[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('omarvio_shortcuts_v5');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length >= 8) {
            return parsed;
          }
        }
        // If older storage exists, merge custom additions with the 8 core defaults
        const oldSaved = localStorage.getItem('omarvio_custom_shortcuts');
        if (oldSaved) {
          const oldParsed = JSON.parse(oldSaved);
          if (Array.isArray(oldParsed)) {
            const defaultIds = new Set(DEFAULT_SHORTCUTS.map((s) => s.id));
            const customOnly = oldParsed.filter(
              (s: any) => s && s.id && !defaultIds.has(s.id) && s.id.startsWith('shortcut-')
            );
            return [...DEFAULT_SHORTCUTS, ...customOnly];
          }
        }
      } catch {}
    }
    return DEFAULT_SHORTCUTS;
  });

  // Add Shortcut Dialog Modal State
  const [isAddShortcutOpen, setIsAddShortcutOpen] = useState(false);
  const [newShortcutName, setNewShortcutName] = useState('');
  const [newShortcutUrl, setNewShortcutUrl] = useState('');
  const [isManageShortcuts, setIsManageShortcuts] = useState(false);

  // Persist shortcuts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('omarvio_shortcuts_v5', JSON.stringify(shortcuts));
      localStorage.setItem('omarvio_custom_shortcuts', JSON.stringify(shortcuts));
    }
  }, [shortcuts]);

  const activeEngine =
    SEARCH_ENGINES.find((e) => e.id === currentEngineId) || SEARCH_ENGINES[1];

  const handleSelectEngine = (engineId: string) => {
    setCurrentEngineId(engineId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('omarvio_search_engine', engineId);
    }
  };

  const handleAddShortcut = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShortcutName.trim() || !newShortcutUrl.trim()) return;

    let finalUrl = newShortcutUrl.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = `https://${finalUrl}`;
    }

    const colors = [
      'bg-indigo-600',
      'bg-emerald-600',
      'bg-blue-600',
      'bg-rose-600',
      'bg-amber-600',
      'bg-teal-600',
      'bg-purple-600',
    ];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const letter = newShortcutName.trim().charAt(0).toUpperCase();

    const newEntry: CustomShortcut = {
      id: `shortcut-${Date.now()}`,
      name: newShortcutName.trim(),
      url: finalUrl,
      colorBg: randomColor,
      textColor: 'text-white',
      letter,
    };

    setShortcuts((prev) => [...prev, newEntry]);
    setNewShortcutName('');
    setNewShortcutUrl('');
    setIsAddShortcutOpen(false);
  };

  const handleDeleteShortcut = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setShortcuts((prev) => prev.filter((s) => s.id !== id));
  };

  // Web Speech API Voice Search
  const toggleVoiceSearch = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      setSpeechFeedback(null);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechFeedback('Voice search unsupported');
      setTimeout(() => setSpeechFeedback(null), 2500);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'bn-BD';

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechFeedback('কথা বলুন (বাংলা বা ইংরেজি)...');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setHomeQuery(transcript);
          setIsListening(false);
          setSpeechFeedback(null);
          // Navigate with query to the active engine
          onNavigate(getSanitizedSearchUrl(transcript, currentEngineId));
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
        setSpeechFeedback('ভয়েস শনাক্ত হয়নি। পুনরায় চেষ্টা করুন।');
        setTimeout(() => setSpeechFeedback(null), 2500);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
      setSpeechFeedback('Microphone unavailable.');
      setTimeout(() => setSpeechFeedback(null), 2500);
    }
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = homeQuery.trim();
    if (!q) return;

    // Direct URL check
    if (
      q.startsWith('http://') ||
      q.startsWith('https://') ||
      (q.includes('.') && !q.includes(' ') && !q.startsWith('?'))
    ) {
      const targetUrl = q.startsWith('http://') || q.startsWith('https://') ? q : `https://${q}`;
      onNavigate(targetUrl);
      return;
    }

    onNavigate(getSanitizedSearchUrl(q, currentEngineId));
  };

  const getPlaceholderText = () => {
    switch (currentEngineId) {
      case 'brave':
        return 'Brave Search বা URL লিখুন...';
      case 'duckduckgo':
        return 'DuckDuckGo প্রাইভেট সার্চ...';
      case 'qwant':
        return 'Qwant দিয়ে সার্চ করুন...';
      case 'bing':
        return 'Bing সার্চ বা URL লিখুন...';
      case 'firefox':
        return 'Firefox (Mozilla) সার্চ বা URL লিখুন...';
      case 'startpage':
        return 'Startpage প্রাইভেট সার্চ...';
      case 'ecosia':
        return 'Ecosia দিয়ে সার্চ করুন...';
      case 'google':
      default:
        return 'গুগলে সার্চ বা ওয়েব ঠিকানা লিখুন...';
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-gradient-to-b from-[#0b1021] via-[#080d1a] to-[#04060d] text-white scrollbar-none touch-manipulation">
      <div className="relative w-full min-h-full flex flex-col items-center justify-start px-4 pt-10 sm:pt-14 pb-24 max-w-lg mx-auto">
        {/* Glow ambient background sphere */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -z-0" />

        {/* ============================================================== */}
        {/* 1. CLEAN SLEEK BRANDING                                        */}
        {/* ============================================================== */}
        <div className="flex flex-col items-center mb-6 relative z-10 text-center select-none">
          <img
            src="/assets/aistudio/file_0000000038508211a96b8fbe27d5ca68_9009abdf.png"
            alt="OMARVIO BROWSER Logo"
            className="w-20 h-20 sm:w-24 sm:h-24 aspect-square rounded-2xl object-contain bg-black shadow-2xl shadow-cyan-950/50 mb-3"
          />
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-3xl sm:text-4xl font-black tracking-tight bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-300 bg-clip-text text-transparent drop-shadow-md">
              OMARVIO BROWSER
            </span>
          </div>
          <p className="text-[11px] font-bold tracking-[0.22em] text-cyan-400/90 uppercase mb-1">
            CHROMIUM PRIVATE BROWSER
          </p>
          <p className="text-xs font-semibold text-cyan-200/80 italic">
            &ldquo;আমার ফোন, আমার ডেটা – কাউকে দেব না!&rdquo;
          </p>
        </div>

        {/* ============================================================== */}
        {/* 2. UNIFIED SMART OMNIBOX WITH ENGINE PICKER                   */}
        {/* ============================================================== */}
        <form
          onSubmit={handleSearchSubmit}
          className="w-full h-13 sm:h-14 rounded-full bg-white text-slate-800 px-3.5 py-2 flex items-center justify-between shadow-2xl hover:shadow-cyan-500/20 transition-all relative z-10 mb-3 touch-manipulation border border-slate-200"
        >
          {/* Left: Interactive Engine Picker Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsEngineModalOpen(true);
            }}
            title={`বর্তমান সার্চ ইঞ্জিন: ${activeEngine.name} (ক্লিক করে পরিবর্তন করুন)`}
            className="flex items-center gap-1 p-1 rounded-full hover:bg-slate-100 transition-colors mr-1 cursor-pointer shrink-0"
          >
            <div className="scale-90">{activeEngine.logo}</div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          </button>

          {/* Search Input */}
          <div className="flex-1 min-w-0 pr-1">
            <input
              type="text"
              value={homeQuery}
              onChange={(e) => setHomeQuery(e.target.value)}
              placeholder={getPlaceholderText()}
              className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none font-medium truncate"
            />
          </div>

          {/* Right Action Icons: Search, Mic, Lens, Submit */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Search Icon */}
            <button
              type="button"
              onClick={() => handleSearchSubmit()}
              title="অনুসন্ধান করুন"
              className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Mic Voice Search */}
            <button
              type="button"
              onClick={toggleVoiceSearch}
              title="Voice Search"
              className={`p-1.5 rounded-full hover:bg-slate-100 transition-colors ${
                isListening ? 'text-rose-600 animate-pulse bg-rose-50' : 'text-slate-500'
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Lens Camera */}
            {onOpenLens && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenLens();
                }}
                title="Camera Lens & QR Scanner"
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 hover:text-cyan-600 transition-colors"
              >
                <Camera className="w-4 h-4" />
              </button>
            )}

            {/* Submit Arrow */}
            <button
              type="submit"
              title="অনুসন্ধান চালান"
              className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition-colors shadow-sm ml-0.5 active:scale-95 cursor-pointer shrink-0"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Voice Feedback Tooltip */}
        {speechFeedback && (
          <div className="mb-3 px-4 py-1.5 rounded-full bg-cyan-950/90 border border-cyan-400/50 text-cyan-200 text-xs font-semibold shadow-lg animate-fadeIn z-20">
            {speechFeedback}
          </div>
        )}

        {/* ============================================================== */}
        {/* 3. TWO PILL BUTTONS: [ ✦ AI Mode ] & [ 🕵 Incognito ]           */}
        {/* ============================================================== */}
        <div className="w-full flex items-center justify-center gap-2.5 mb-6 relative z-10">
          <button
            type="button"
            onClick={onOpenAIMode}
            className="flex-1 py-2 px-3 rounded-full bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white active:scale-97 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer border border-slate-700/60"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-semibold">AI Mode</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenIncognitoTab?.()}
            className="flex-1 py-2 px-3 rounded-full bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white active:scale-97 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer border border-slate-700/60"
          >
            <Ghost className="w-3.5 h-3.5 text-slate-300" />
            <span className="text-xs font-semibold">Incognito</span>
          </button>
        </div>

        {/* ============================================================== */}
        {/* 4. CHROME-STYLE CLEAN 4-COLUMN SHORTCUTS GRID                  */}
        {/* ============================================================== */}
        <div className="w-full mb-6 relative z-10">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              শীর্ষ ওয়েবসাইট
            </span>
            <button
              type="button"
              onClick={() => setIsManageShortcuts(!isManageShortcuts)}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
            >
              {isManageShortcuts ? 'সম্পন্ন' : 'এডিট'}
            </button>
          </div>

          <div className="grid grid-cols-4 gap-y-4 gap-x-2">
            {shortcuts.map((item) => (
              <div
                key={item.id}
                className="relative flex flex-col items-center gap-1.5 group select-none"
              >
                {/* Delete button in edit mode */}
                {isManageShortcuts && (
                  <button
                    type="button"
                    onClick={(e) => handleDeleteShortcut(item.id, e)}
                    title="শর্টকাট মুছুন"
                    className="absolute -top-1 -right-1 z-20 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg active:scale-90"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onNavigate(item.url)}
                  className="w-13 h-13 rounded-full bg-[#1b2234] hover:bg-[#222b42] border border-slate-700/60 hover:border-cyan-400/50 flex items-center justify-center text-white shadow-md group-hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <div className={`w-10 h-10 rounded-full ${item.colorBg} flex items-center justify-center font-bold text-base shadow-sm ${item.textColor || 'text-white'}`}>
                    {renderShortcutIcon(item)}
                  </div>
                </button>
                <span className="text-[11px] font-medium text-slate-300 group-hover:text-white truncate max-w-[68px] text-center">
                  {item.name}
                </span>
              </div>
            ))}

            {/* '+' Add Shortcut Tile */}
            <div className="flex flex-col items-center gap-1.5 select-none">
              <button
                type="button"
                onClick={() => setIsAddShortcutOpen(true)}
                title="নতুন শর্টকাট যোগ করুন"
                className="w-13 h-13 rounded-full border-2 border-dashed border-cyan-500/40 bg-cyan-950/20 hover:bg-cyan-900/30 flex items-center justify-center text-cyan-300 hover:text-white transition-all active:scale-95 cursor-pointer shadow-md"
              >
                <Plus className="w-5 h-5 text-cyan-400" />
              </button>
              <span className="text-[11px] font-medium text-cyan-300 text-center">
                যোগ করুন
              </span>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 5. NATIVE ANDROID APK DOWNLOAD HUB & PWA COMPACT CARD          */}
        {/* ============================================================== */}
        <div className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/30 via-slate-900/40 to-cyan-950/30 border border-emerald-500/30 flex items-center justify-between text-xs backdrop-blur-xs mb-4 relative z-10 shadow-lg">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0 shadow-sm">
              <Download className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-100 text-xs flex items-center gap-1.5">
                <span>অ্যান্ড্রয়েড APK (v2.0.0)</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-400/30">
                  Native
                </span>
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                সরাসরি ফোনে ইনস্টল • ১০০% ক্রোমিয়াম ইঞ্জিন
              </p>
            </div>
          </div>
          <a
            href={(() => {
              if (typeof window !== 'undefined') {
                const repo = (localStorage.getItem('omarvio_github_repo') || '').trim();
                if (repo && repo.includes('/')) {
                  return `https://github.com/${repo}/releases/latest/download/omarvio-browser.apk`;
                }
              }
              return '/api/download-apk';
            })()}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 transition-all active:scale-95 shadow-md shadow-emerald-950 shrink-0 cursor-pointer"
          >
            <span>APK</span>
          </a>
        </div>

        {/* ============================================================== */}
        {/* 6. SUBTLE FOOTER TRUST BADGE                                   */}
        {/* ============================================================== */}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 select-none">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>১০০% বিজ্ঞাপন ও ট্র্যাকারমুক্ত · রিয়েল ক্রোমিয়াম ইঞ্জিন</span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* BRAVE SEARCH ENGINE SELECTOR MODAL                             */}
      {/* ============================================================== */}
      <SearchEngineSelectorModal
        isOpen={isEngineModalOpen}
        currentEngine={currentEngineId}
        onSelectEngine={handleSelectEngine}
        onClose={() => setIsEngineModalOpen(false)}
      />

      {/* ============================================================== */}
      {/* ADD CUSTOM SHORTCUT DIALOG                                     */}
      {/* ============================================================== */}
      {isAddShortcutOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn"
          onClick={() => setIsAddShortcutOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-[#1c1d24] rounded-3xl border border-neutral-700 p-5 shadow-2xl animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-neutral-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                <span>নতুন শর্টকাট যোগ করুন</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddShortcutOpen(false)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddShortcut} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  সাইটের নাম
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: Prothom Alo, GitHub"
                  value={newShortcutName}
                  onChange={(e) => setNewShortcutName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-white text-sm focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  ওয়েব অ্যাড্রেস (URL)
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: prothomalo.com বা https://..."
                  value={newShortcutUrl}
                  onChange={(e) => setNewShortcutUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-white text-sm focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddShortcutOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 transition-colors cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 shadow-md transition-colors cursor-pointer"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
