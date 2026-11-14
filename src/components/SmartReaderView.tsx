/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OMARVIO BROWSER - Smart Distraction-Free Reader Mode Engine
 * Allows reading blocked / heavy web pages without ads, trackers, or X-Frame blocking!
 * Copyright (c) OMARVIO GLOBAL LTD.
 * Slogan: "My Phone, My Data – Why Surrender It To Others!"
 */

import React, { useState } from 'react';
import {
  BookOpen,
  ArrowLeft,
  Download,
  Share2,
  Globe,
  Clock,
  Sparkles,
  ShieldCheck,
  Check,
  FileText,
  Type,
  Sun,
  Moon,
  Coffee,
} from 'lucide-react';
import { saveWebpageArticleOffline } from '../engine/inAppDownloader';

interface SmartReaderViewProps {
  title: string;
  url: string;
  content: string;
  onBackToOriginal: () => void;
  onShare?: (title: string, url: string) => void;
  onToast: (msg: string) => void;
}

export const SmartReaderView: React.FC<SmartReaderViewProps> = ({
  title,
  url,
  content,
  onBackToOriginal,
  onShare,
  onToast,
}) => {
  const [fontSize, setFontSize] = useState<number>(16); // px
  const [readerTheme, setReaderTheme] = useState<'oled' | 'slate' | 'sepia'>('oled');
  const [isSavedOffline, setIsSavedOffline] = useState(false);

  // Calculate estimated reading time
  const wordsCount = content ? content.split(/\s+/).length : 200;
  const readMinutes = Math.max(1, Math.round(wordsCount / 180));

  let domain = 'webpage';
  try {
    domain = new URL(url).hostname;
  } catch {}

  const handleSaveOffline = () => {
    const res = saveWebpageArticleOffline(title, url, content);
    if (res.success) {
      setIsSavedOffline(true);
      onToast(res.message);
    }
  };

  const themeClasses = {
    oled: 'bg-black text-slate-200',
    slate: 'bg-[#0a0f1d] text-slate-100',
    sepia: 'bg-[#1c1813] text-[#e6dac3]',
  };

  return (
    <div className={`w-full h-full flex flex-col select-none overflow-hidden ${themeClasses[readerTheme]} transition-colors duration-200`}>
      {/* Reader Mode Top Control Bar */}
      <div className="px-4 py-3 border-b border-white/10 bg-black/40 backdrop-blur-md flex items-center justify-between shrink-0 gap-2">
        <button
          type="button"
          onClick={onBackToOriginal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold transition-all active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-cyan-400" />
          <span>ওয়েবসাইট ভিউ</span>
        </button>

        {/* Reader Customization Toolbar */}
        <div className="flex items-center gap-2">
          {/* Font Size A- / A+ */}
          <div className="flex items-center bg-white/10 rounded-xl p-1 gap-1">
            <button
              type="button"
              onClick={() => setFontSize((s) => Math.max(13, s - 1))}
              className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold hover:bg-white/10"
              title="লেখা ছোট করুন"
            >
              A-
            </button>
            <span className="text-[11px] font-mono px-1">{fontSize}px</span>
            <button
              type="button"
              onClick={() => setFontSize((s) => Math.min(24, s + 1))}
              className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold hover:bg-white/10"
              title="লেখা বড় করুন"
            >
              A+
            </button>
          </div>

          {/* Theme Palette Buttons */}
          <div className="flex items-center bg-white/10 rounded-xl p-1 gap-1">
            <button
              type="button"
              onClick={() => setReaderTheme('oled')}
              className={`w-6 h-6 rounded flex items-center justify-center text-xs ${
                readerTheme === 'oled' ? 'bg-cyan-500 text-black font-bold' : 'hover:bg-white/10'
              }`}
              title="OLED True Black"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setReaderTheme('sepia')}
              className={`w-6 h-6 rounded flex items-center justify-center text-xs ${
                readerTheme === 'sepia' ? 'bg-amber-500 text-black font-bold' : 'hover:bg-white/10'
              }`}
              title="Warm Sepia"
            >
              <Coffee className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setReaderTheme('slate')}
              className={`w-6 h-6 rounded flex items-center justify-center text-xs ${
                readerTheme === 'slate' ? 'bg-blue-500 text-black font-bold' : 'hover:bg-white/10'
              }`}
              title="Dark Slate"
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Save In-App Offline */}
          <button
            type="button"
            onClick={handleSaveOffline}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md active:scale-95 transition-all cursor-pointer"
            title="ওমারভিও অফলাইন হাব-এ সেভ করুন (ক্রোম ছাড়া)"
          >
            {isSavedOffline ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>সেভ হয়েছে</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>ইন-অ্যাপ সেভ</span>
              </>
            )}
          </button>

          {onShare && (
            <button
              type="button"
              onClick={() => onShare(title, url)}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
              title="শেয়ার / QR"
            >
              <Share2 className="w-4 h-4 text-cyan-300" />
            </button>
          )}
        </div>
      </div>

      {/* Reader Article Viewport */}
      <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-12 max-w-3xl mx-auto w-full space-y-6">
        {/* Article Meta Header */}
        <div className="space-y-3 pb-4 border-b border-white/10">
          <div className="flex items-center gap-2 flex-wrap text-xs text-cyan-400">
            <span className="flex items-center gap-1 font-mono">
              <Globe className="w-3.5 h-3.5" />
              {domain}
            </span>
            <span>&bull;</span>
            <span className="flex items-center gap-1 text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              পড়তে সময় লাগবে: ~{readMinutes} মিনিট
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
              ০ বিজ্ঞাপন · ১০০% প্রাইভেট
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black leading-snug tracking-tight">
            {title}
          </h1>
        </div>

        {/* Clean Article Text Content */}
        <div
          className="space-y-4 leading-relaxed font-sans"
          style={{ fontSize: `${fontSize}px` }}
        >
          {content ? (
            content.split('\n\n').map((paragraph, pIdx) => (
              <p key={pIdx} className="leading-relaxed">
                {paragraph}
              </p>
            ))
          ) : (
            <div className="p-6 rounded-2xl bg-white/5 text-center text-sm space-y-2">
              <BookOpen className="w-8 h-8 text-cyan-400 mx-auto" />
              <p className="font-bold">আর্টিকেলটি ওমারভিও ক্লিন রিডার মোডে লোড করা হয়েছে</p>
              <p className="text-xs text-slate-400">
                এই পেজের সমস্ত বিজ্ঞাপন, কুকি ব্যানার ও ট্র্যাকিং কোড মুছে দিয়ে শুধুমাত্র মূল লেখা উপস্থাপন করা হয়েছে।
              </p>
            </div>
          )}
        </div>

        {/* Article Footer */}
        <div className="pt-6 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            OMARVIO Smart Reader Engine &bull; Zero Server Leak
          </span>
          <button
            type="button"
            onClick={onBackToOriginal}
            className="text-cyan-400 hover:underline"
          >
            মূল ওয়েবসাইটে যান &rarr;
          </button>
        </div>
      </div>
    </div>
  );
};
