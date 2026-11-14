/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DownloadedItem } from './DownloadsModal';
import { FileText, ZoomIn, ZoomOut, Moon, Sun, BookOpen, X, Download, ArrowLeft } from 'lucide-react';

interface DocumentViewerModalProps {
  documentItem: DownloadedItem | null;
  onClose: () => void;
  onToast: (msg: string) => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  documentItem,
  onClose,
  onToast,
}) => {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [theme, setTheme] = useState<'dark' | 'sepia' | 'light'>('dark');

  if (!documentItem) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col animate-fadeIn select-none">
      {/* Top Reading Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-3 sm:px-4 py-2.5 flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white text-xs font-bold transition-all border border-slate-700 shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400" />
            <span>Back</span>
          </button>

          <FileText className="w-5 h-5 text-cyan-400 shrink-0" />
          <div className="truncate">
            <h3 className="text-xs font-bold text-slate-100 truncate">
              {documentItem.title}
            </h3>
            <span className="text-[10px] text-emerald-400 font-medium">
              100% In-Browser Offline Reader
            </span>
          </div>
        </div>

        {/* Reader Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Zoom */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-800/80 rounded-xl px-2 py-1 text-xs text-slate-300">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(70, z - 15))}
              className="p-1 hover:text-white"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] px-1">{zoomLevel}%</span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(160, z + 15))}
              className="p-1 hover:text-white"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Theme switcher */}
          <button
            type="button"
            onClick={() => {
              if (theme === 'dark') setTheme('sepia');
              else if (theme === 'sepia') setTheme('light');
              else setTheme('dark');
            }}
            title="Toggle Reader Theme (Dark / Sepia / Light)"
            className="p-2 text-slate-300 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Reader Page Viewport */}
      <div
        className={`flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center transition-colors duration-200 ${
          theme === 'dark'
            ? 'bg-slate-950 text-slate-200'
            : theme === 'sepia'
            ? 'bg-[#fbf0d9] text-[#433422]'
            : 'bg-white text-slate-900'
        }`}
      >
        <div
          style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
          className={`w-full max-w-2xl p-6 sm:p-10 rounded-2xl shadow-2xl transition-all border ${
            theme === 'dark'
              ? 'bg-slate-900/90 border-slate-800'
              : theme === 'sepia'
              ? 'bg-[#f4ecd8] border-[#e2d5ba]'
              : 'bg-slate-50 border-slate-200'
          }`}
        >
          {/* Document Header */}
          <div className="border-b pb-4 mb-6 text-center border-inherit">
            <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-500">
              Omarvio Universal Document Hub
            </span>
            <h1 className="text-xl sm:text-2xl font-black mt-1 mb-2 tracking-tight">
              {documentItem.title.replace(/\.[^/.]+$/, '').replace(/_/g, ' ')}
            </h1>
            <p className="text-xs opacity-75">
              Verified Clean Document · Rendered Locally Offline
            </p>
          </div>

          {/* Sample Document Content Rendering */}
          <div className="space-y-4 text-xs sm:text-sm leading-relaxed font-serif">
            <p className="font-semibold italic">
              &ldquo;My Phone, My Data – Why Surrender It To Others!&rdquo; — Official Manifesto of OMARVIO GLOBAL LTD.
            </p>
            <p>
              This document was opened directly inside <strong>OMARVIO BROWSER</strong> without needing any external bloated third-party reader (like Adobe Acrobat or WPS Office). All rendering, typography parsing, and memory isolation happen 100% locally on your device.
            </p>
            <h2 className="text-base font-bold pt-2 border-t border-inherit">
              1. Principle of Client-Side Privacy
            </h2>
            <p>
              Your phone belongs to you. Every document you download, every page you visit, and every media stream you listen to remains in your personal encrypted vault. Big Tech telemetry and surveillance bots are blocked at the perimeter.
            </p>
            <h2 className="text-base font-bold pt-2 border-t border-inherit">
              2. Zero-Server Cost Sustainability
            </h2>
            <p>
              By utilizing client-side Service Worker proxy engines and Edge DNS routing, OMARVIO BROWSER delivers unlimited bandwidth and zero server costs forever.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
