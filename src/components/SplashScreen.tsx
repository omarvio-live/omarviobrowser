/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShieldCheck, ArrowRight } from 'lucide-react';

export interface SplashScreenProps {
  isVisible: boolean;
  isExiting: boolean;
  progress: number;
  stageLabel: string;
  showSkip: boolean;
  isOledDark?: boolean;
  language?: string;
  onSkip: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  isVisible,
  isExiting,
  progress,
  stageLabel,
  showSkip,
  isOledDark = false,
  language = 'bn',
  onSkip,
}) => {
  const [logoFailed, setLogoFailed] = useState(false);

  if (!isVisible) return null;

  const clampedProgress = Math.max(0, Math.min(100, Math.round(progress)));
  const isBangla = language === 'bn';

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={isBangla ? 'OMARVIO ব্রাউজার চালু হচ্ছে' : 'Initializing OMARVIO Browser'}
      className={`fixed inset-0 z-50 flex flex-col justify-between px-6 py-8 select-none transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-opacity motion-reduce:transform-none ${
        isOledDark ? 'bg-black' : 'bg-[#060913]'
      } ${isExiting ? 'opacity-0 scale-[1.015] pointer-events-none' : 'opacity-100 scale-100'}`}
      style={{
        backgroundImage: isOledDark
          ? undefined
          : 'radial-gradient(circle at 50% 38%, rgba(6, 182, 212, 0.11) 0%, rgba(11, 19, 41, 0.35) 38%, rgba(6, 9, 19, 1) 75%)',
      }}
    >
      {/* Top Quiet Wordmark Bar */}
      <div className="w-full max-w-2xl mx-auto flex items-center justify-between text-xs text-slate-400">
        <span className="font-semibold tracking-wider text-slate-300">
          OMARVIO GLOBAL
        </span>
        <span className="font-mono tabular-nums text-slate-400">
          {clampedProgress}%
        </span>
      </div>

      {/* Center Focal Anchor: Official Emblem + Brand Identity + Progress Track */}
      <div className="w-full max-w-md mx-auto flex flex-col items-center text-center">
        <div className="relative mb-6 flex items-center justify-center">
          <div className="w-28 h-28 aspect-square rounded-3xl bg-black border border-cyan-500/25 shadow-2xl shadow-cyan-950/50 flex items-center justify-center overflow-hidden">
            {!logoFailed ? (
              <img
                src="/assets/aistudio/file_0000000038508211a96b8fbe27d5ca68_9009abdf.png"
                alt="OMARVIO BROWSER Official Emblem"
                referrerPolicy="no-referrer"
                onError={() => setLogoFailed(true)}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full rounded-2xl bg-cyan-950/70 flex items-center justify-center text-cyan-300">
                <ShieldCheck className="w-10 h-10" aria-hidden="true" />
              </div>
            )}
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white text-balance">
          OMARVIO BROWSER
        </h1>

        <p className="mt-2 text-sm sm:text-base font-medium text-cyan-200/90 max-w-xs text-balance leading-relaxed">
          &ldquo;My Phone, My Data &ndash; Why Surrender It To Others!&rdquo;
        </p>

        {/* Quiet Unboxed Metadata Capabilities (Zero-Pill Discipline) */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-slate-400">
          <span>Privacy Shield</span>
          <span aria-hidden="true">·</span>
          <span>Local Proxy</span>
          <span aria-hidden="true">·</span>
          <span>Offline PWA</span>
        </div>

        {/* Compositor-Only Initialization Progress Track */}
        <div className="w-full max-w-xs mt-8">
          <div
            className="w-full h-1.5 rounded-full bg-slate-800/90 overflow-hidden"
            role="progressbar"
            aria-valuenow={clampedProgress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full w-full origin-left rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
              style={{ transform: `scaleX(${clampedProgress / 100})` }}
            />
          </div>

          <p className="mt-3 text-xs font-medium text-slate-300 tracking-wide truncate">
            {stageLabel}
          </p>
        </div>
      </div>

      {/* Bottom Ergonomic Thumb Zone: Optional Skip Control */}
      <div className="w-full max-w-md mx-auto flex flex-col items-center justify-end min-h-[56px]">
        {showSkip ? (
          <button
            type="button"
            onClick={onSkip}
            className="min-h-[44px] min-w-[44px] px-5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-slate-200 hover:text-white hover:border-cyan-400/60 text-xs font-semibold inline-flex items-center gap-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 cursor-pointer whitespace-nowrap shrink-0"
          >
            <span>{isBangla ? 'ব্রাউজারে প্রবেশ করুন' : 'Continue to Browser'}</span>
            <ArrowRight className="w-4 h-4 text-cyan-400" aria-hidden="true" />
          </button>
        ) : (
          <p className="text-[11px] text-slate-500 font-medium">
            {isBangla ? 'নিরাপদ ক্রোমিয়াম ও PWA ইঞ্জিন প্রস্তুত হচ্ছে' : 'Preparing private browsing engine'}
          </p>
        )}
      </div>
    </div>
  );
};
