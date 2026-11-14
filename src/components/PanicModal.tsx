/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Ghost, AlertTriangle, ShieldCheck, X } from 'lucide-react';

interface PanicModalProps {
  isOpen: boolean;
  onConfirmWipe: () => void;
  onCancel: () => void;
}

export const PanicModal: React.FC<PanicModalProps> = ({
  isOpen,
  onConfirmWipe,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn select-none">
      <div className="w-full max-w-sm bg-gradient-to-b from-slate-900 to-slate-950 border border-rose-500/40 rounded-3xl p-6 shadow-2xl shadow-rose-950/40 text-center">
        {/* Ghost Icon */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-rose-950/50 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-900/30 animate-pulse">
          <Ghost className="w-9 h-9" />
        </div>

        <h3 className="text-xl font-black text-rose-100 tracking-tight mb-2">
          1-Tap Ghost Panic Wipe
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed mb-6">
          Are you sure you want to instantly wipe all open tabs, active sessions, cache, and navigation memory?
          <span className="block font-bold text-rose-400 mt-1">
            Zero footprint will remain on this device.
          </span>
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onConfirmWipe}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-black text-sm tracking-wide shadow-lg shadow-rose-950/50 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Ghost className="w-4 h-4" />
            <span>CONFIRM EMERGENCY WIPE</span>
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="w-full py-2.5 px-4 rounded-2xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 font-bold text-xs transition-colors"
          >
            Cancel & Keep Browsing
          </button>
        </div>
      </div>
    </div>
  );
};
