/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldCheck, Lock } from 'lucide-react';

interface HeaderBrandingProps {
  compact?: boolean;
}

export const HeaderBranding: React.FC<HeaderBrandingProps> = ({ compact = false }) => {
  const logoPath = '/assets/omarvio-logo-256.webp';

  if (compact) {
    return (
      <div
        className="flex items-center gap-2 select-none"
        title="OMARVIO BROWSER"
      >
        <img
          src={logoPath}
          alt="OMARVIO BROWSER Logo"
          className="w-8 h-8 aspect-square rounded-lg shadow-sm object-contain bg-black shrink-0"
        />
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 leading-none">
            <span className="font-bold text-sm tracking-wide bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">
              OMARVIO
            </span>
            <span className="text-[10px] text-cyan-400 font-semibold tracking-wider">
              BROWSER
            </span>
          </div>
          <span className="text-[9px] text-cyan-300/80 font-medium tracking-tight truncate max-w-[210px] sm:max-w-none italic">
            &ldquo;My Phone, My Data – Why Surrender It To Others!&rdquo;
          </span>
        </div>
      </div>
    );
  }

  return (
    <header className="w-full flex flex-col items-center text-center py-4 px-3 select-none">
      <div className="flex items-center justify-center gap-3 mb-2">
        <img
          src={logoPath}
          alt="OMARVIO BROWSER Official Logo"
          className="w-16 h-16 aspect-square rounded-2xl shadow-lg shadow-cyan-900/30 object-contain bg-black shrink-0"
        />
        <div className="text-left">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-cyan-200 to-indigo-300 bg-clip-text text-transparent">
              OMARVIO BROWSER
            </h1>
            <span className="text-emerald-400 flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              256-Bit
            </span>
          </div>
          <p className="text-xs text-slate-400 font-semibold tracking-wider">
            OMARVIO GLOBAL LTD.
          </p>
        </div>
      </div>

      {/* Official Slogan */}
      <div className="mt-1 px-4 py-1.5 rounded-lg bg-blue-950/40 border border-blue-500/20 max-w-lg shadow-sm">
        <p className="text-xs sm:text-sm font-semibold tracking-wide text-cyan-200 italic">
          &ldquo;My Phone, My Data – Why Surrender It To Others!&rdquo;
        </p>
      </div>

      <div className="flex items-center justify-center gap-3 mt-2 text-[11px] text-slate-400 font-medium">
        <span className="flex items-center gap-1">
          <Lock className="w-3 h-3 text-cyan-400" /> Zero Server Cost
        </span>
        <span aria-hidden="true" className="text-slate-600">·</span>
        <span>Anti-Fingerprinting Shield</span>
        <span aria-hidden="true" className="text-slate-600">·</span>
        <span>100% In-Browser Privacy</span>
      </div>
    </header>
  );
};
