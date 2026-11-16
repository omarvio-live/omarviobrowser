/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OMARVIO BROWSER - Smart Distraction-Free Reader Mode Engine
 * Strips sidebars, ads, navigation chrome, and footers for text-focused reading.
 * Copyright (c) OMARVIO GLOBAL LTD.
 */

import React, { useState, useRef } from 'react';
import {
  BookOpen,
  ArrowLeft,
  Download,
  Share2,
  Globe,
  Clock,
  ShieldCheck,
  Check,
  Sun,
  Moon,
  Coffee,
  Loader2,
} from 'lucide-react';
import { saveWebpageArticleOffline } from '../engine/inAppDownloader';

interface SmartReaderViewProps {
  title: string;
  url: string;
  content: string;
  isLoading?: boolean;
  onBackToOriginal: () => void;
  onShare?: (title: string, url: string) => void;
  onToast: (msg: string) => void;
}

export const SmartReaderView: React.FC<SmartReaderViewProps> = ({
  title,
  url,
  content,
  isLoading = false,
  onBackToOriginal,
  onShare,
  onToast,
}) => {
  const [fontSize, setFontSize] = useState<number>(17);
  const [readerTheme, setReaderTheme] = useState<'oled' | 'sepia' | 'light'>('oled');
  const [isSavedOffline, setIsSavedOffline] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const wordsCount = content ? content.split(/\s+/).filter(Boolean).length : 0;
  const readMinutes = Math.max(1, Math.round(wordsCount / 180));

  let domain = 'webpage';
  try {
    domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./i, '');
  } catch {}

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const maxScroll = el.scrollHeight - el.clientHeight;
    if (maxScroll <= 0) {
      setScrollProgress(0);
      return;
    }
    setScrollProgress(Math.min(100, Math.round((el.scrollTop / maxScroll) * 100)));
  };

  const handleSaveOffline = () => {
    const res = saveWebpageArticleOffline(title, url, content);
    if (res.success) {
      setIsSavedOffline(true);
      onToast(res.message);
    }
  };

  const themeConfig = {
    oled: {
      wrapper: 'bg-[#070911] text-slate-200',
      topbar: 'bg-[#0c101c]/95 border-slate-800/90 text-slate-100',
      subtext: 'text-slate-400',
      heading: 'text-white',
      blockquote: 'border-slate-700 bg-slate-900/60 text-slate-300',
      divider: 'border-slate-800/80',
      controlBg: 'bg-slate-800/80 hover:bg-slate-700/80',
    },
    sepia: {
      wrapper: 'bg-[#1c1813] text-[#e6dac3]',
      topbar: 'bg-[#241e17]/95 border-[#3a3025] text-[#f3ead8]',
      subtext: 'text-[#b5a68e]',
      heading: 'text-[#fbf5e9]',
      blockquote: 'border-[#4b3e30] bg-[#262018] text-[#dfd1b8]',
      divider: 'border-[#3a3025]',
      controlBg: 'bg-[#332a20] hover:bg-[#41362a]',
    },
    light: {
      wrapper: 'bg-[#faf8f5] text-slate-800',
      topbar: 'bg-white/95 border-slate-200 text-slate-900',
      subtext: 'text-slate-500',
      heading: 'text-slate-950',
      blockquote: 'border-slate-300 bg-slate-100/80 text-slate-700',
      divider: 'border-slate-200',
      controlBg: 'bg-slate-100 hover:bg-slate-200 text-slate-800',
    },
  }[readerTheme];

  const blocks = content
    ? content
        .split(/\n{2,}/)
        .map((b) => b.trim())
        .filter(Boolean)
    : [];

  return (
    <div
      className={`w-full h-full flex flex-col overflow-hidden ${themeConfig.wrapper} transition-colors duration-200`}
    >
      {/* Reading Mode Top Control Bar */}
      <div
        className={`px-3 sm:px-5 py-2 border-b backdrop-blur-md flex items-center justify-between shrink-0 gap-2 z-20 ${themeConfig.topbar}`}
      >
        <button
          type="button"
          onClick={onBackToOriginal}
          className={`min-h-[40px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 cursor-pointer shrink-0 whitespace-nowrap ${themeConfig.controlBg}`}
        >
          <ArrowLeft className="w-4 h-4 text-cyan-400" />
          <span>ওয়েবসাইট ভিউ</span>
        </button>

        {/* Reader Typography & Theme Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none">
          {/* Font Size A- / A+ */}
          <div className={`flex items-center rounded-xl p-0.5 gap-0.5 shrink-0 ${themeConfig.controlBg}`}>
            <button
              type="button"
              onClick={() => setFontSize((s) => Math.max(14, s - 1))}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold hover:bg-black/15 transition-colors cursor-pointer"
              title="লেখা ছোট করুন"
            >
              A-
            </button>
            <span className="text-[11px] font-mono tabular-nums px-1 opacity-80">{fontSize}px</span>
            <button
              type="button"
              onClick={() => setFontSize((s) => Math.min(24, s + 1))}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold hover:bg-black/15 transition-colors cursor-pointer"
              title="লেখা বড় করুন"
            >
              A+
            </button>
          </div>

          {/* Theme Palette Switcher */}
          <div className={`flex items-center rounded-xl p-0.5 gap-0.5 shrink-0 ${themeConfig.controlBg}`}>
            <button
              type="button"
              onClick={() => setReaderTheme('oled')}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                readerTheme === 'oled' ? 'bg-cyan-500 text-slate-950 font-bold' : 'opacity-75 hover:opacity-100'
              }`}
              title="Dark Reading"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setReaderTheme('sepia')}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                readerTheme === 'sepia' ? 'bg-amber-500 text-slate-950 font-bold' : 'opacity-75 hover:opacity-100'
              }`}
              title="Warm Sepia"
            >
              <Coffee className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setReaderTheme('light')}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                readerTheme === 'light' ? 'bg-slate-900 text-white font-bold' : 'opacity-75 hover:opacity-100'
              }`}
              title="Light Paper"
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Save Offline */}
          <button
            type="button"
            onClick={handleSaveOffline}
            disabled={isLoading || !content}
            className="min-h-[36px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold shadow-sm active:scale-95 transition-all cursor-pointer shrink-0 whitespace-nowrap"
            title="ওমারভিও অফলাইন হাব-এ সেভ করুন"
          >
            {isSavedOffline ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">সেভ হয়েছে</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">অফলাইন সেভ</span>
              </>
            )}
          </button>

          {onShare && (
            <button
              type="button"
              onClick={() => onShare(title, url)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer shrink-0 ${themeConfig.controlBg}`}
              title="শেয়ার / QR"
            >
              <Share2 className="w-4 h-4 text-cyan-400" />
            </button>
          )}
        </div>
      </div>

      {/* Subtle Scroll Reading Progress Line */}
      <div className="w-full h-0.5 bg-transparent shrink-0">
        <div
          className="h-full bg-cyan-500 transition-[width] duration-150"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Reader Article Viewport (Text-Focused Single Column) */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-5 py-7 sm:px-10 select-text"
      >
        <article className="max-w-[68ch] mx-auto w-full space-y-6">
          {/* Article Meta Header (Zero-pill clean inline metadata) */}
          <header className={`space-y-3 pb-5 border-b ${themeConfig.divider}`}>
            <div className={`flex items-center gap-2 flex-wrap text-xs ${themeConfig.subtext}`}>
              <span className="flex items-center gap-1 font-mono text-cyan-500">
                <Globe className="w-3.5 h-3.5 shrink-0" />
                {domain}
              </span>
              <span aria-hidden="true">·</span>
              <span className="flex items-center gap-1 tabular-nums">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                ~{readMinutes} মিনিট পাঠ
              </span>
              <span aria-hidden="true">·</span>
              <span>সাইডবার, বিজ্ঞাপন ও ফুটার মুক্ত</span>
            </div>

            <h1 className={`text-xl sm:text-3xl font-bold leading-snug tracking-tight text-balance ${themeConfig.heading}`}>
              {title}
            </h1>
          </header>

          {/* Clean Extracted Article Body */}
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-center gap-3">
              <Loader2 className="w-7 h-7 text-cyan-400 animate-spin" />
              <p className={`text-sm font-medium ${themeConfig.subtext}`}>
                সাইডবার ও বিজ্ঞাপন সরিয়ে মূল লেখা প্রস্তুত করা হচ্ছে...
              </p>
            </div>
          ) : blocks.length > 0 ? (
            <div
              className="space-y-5 leading-[1.8]"
              style={{ fontSize: `${fontSize}px` }}
            >
              {blocks.map((block, idx) => {
                if (block.startsWith('## ')) {
                  return (
                    <h2
                      key={idx}
                      className={`text-lg sm:text-xl font-bold pt-3 leading-snug ${themeConfig.heading}`}
                    >
                      {block.slice(3)}
                    </h2>
                  );
                }
                if (block.startsWith('### ')) {
                  return (
                    <h3
                      key={idx}
                      className={`text-base sm:text-lg font-semibold pt-2 leading-snug ${themeConfig.heading}`}
                    >
                      {block.slice(4)}
                    </h3>
                  );
                }
                if (block.startsWith('> ')) {
                  return (
                    <blockquote
                      key={idx}
                      className={`p-4 rounded-xl border italic leading-relaxed ${themeConfig.blockquote}`}
                    >
                      {block.slice(2)}
                    </blockquote>
                  );
                }
                return (
                  <p key={idx} className="leading-[1.8]">
                    {block}
                  </p>
                );
              })}
            </div>
          ) : (
            <div className={`p-6 rounded-2xl border text-center text-sm space-y-2.5 ${themeConfig.divider}`}>
              <BookOpen className="w-8 h-8 text-cyan-400 mx-auto" />
              <p className={`font-semibold ${themeConfig.heading}`}>
                এই পেজ থেকে আলাদা আর্টিকেল টেক্সট পাওয়া যায়নি
              </p>
              <p className={`text-xs ${themeConfig.subtext}`}>
                এটি সম্ভবত ডায়নামিক অ্যাপ বা মিডিয়া পেজ। মূল ওয়েবসাইট ভিউতে ফিরে সম্পূর্ণ পেজ দেখুন।
              </p>
            </div>
          )}

          {/* Clean End-of-Article Action Strip */}
          <div className={`pt-6 border-t flex items-center justify-between gap-3 text-xs ${themeConfig.divider} ${themeConfig.subtext}`}>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              OMARVIO Reader Mode
            </span>
            <button
              type="button"
              onClick={onBackToOriginal}
              className="text-cyan-500 hover:underline font-medium cursor-pointer"
            >
              মূল ওয়েবসাইটে ফিরুন →
            </button>
          </div>
        </article>
      </div>
    </div>
  );
};
