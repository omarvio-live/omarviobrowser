/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldAlert, AlertTriangle, ArrowLeft, ExternalLink, X } from 'lucide-react';
import { SecurityAuditResult } from '../engine/security';

interface LinkClinicModalProps {
  auditResult: SecurityAuditResult | null;
  onProceed: () => void;
  onCancel: () => void;
}

export const LinkClinicModal: React.FC<LinkClinicModalProps> = ({
  auditResult,
  onProceed,
  onCancel,
}) => {
  if (!auditResult || auditResult.isSafe) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn select-none">
      <div className="w-full max-w-md bg-gradient-to-b from-slate-900 via-rose-950/40 to-slate-950 border-2 border-rose-500/80 rounded-3xl p-6 shadow-2xl shadow-rose-950/60 text-center">
        {/* Pulsing Warning Icon */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-rose-950/80 border border-rose-500/50 flex items-center justify-center text-rose-400 shadow-xl shadow-rose-900/40 animate-pulse">
          <ShieldAlert className="w-9 h-9" />
        </div>

        {/* Threat Header */}
        <span className="text-[10px] font-black tracking-widest text-rose-400 px-3 py-1 rounded-full bg-rose-950 border border-rose-500/30 uppercase">
          Omarvio Link Clinic Security Alert
        </span>
        <h3 className="text-xl font-black text-rose-100 tracking-tight mt-3 mb-2">
          {auditResult.threatTitle || 'High-Risk Malicious Threat Detected'}
        </h3>

        {/* Threat Description */}
        <p className="text-xs text-slate-300 leading-relaxed mb-4">
          {auditResult.threatDescription ||
            'This link exhibits deceptive phishing patterns designed to capture sensitive personal or financial credentials.'}
        </p>

        {/* Flagged URL Box */}
        <div className="p-3 rounded-xl bg-slate-950/90 border border-rose-900/50 text-[11px] text-rose-300 font-mono truncate mb-6 text-left">
          <span className="text-[10px] text-slate-500 block mb-0.5">Target Destination:</span>
          {auditResult.url}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm tracking-wide shadow-lg shadow-teal-950/40 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>RETURN TO SAFETY (RECOMMENDED)</span>
          </button>

          <button
            type="button"
            onClick={onProceed}
            className="w-full py-2 px-4 rounded-xl text-slate-400 hover:text-rose-300 text-xs font-semibold hover:bg-slate-900 transition-colors"
          >
            Ignore Warning & Proceed at Own Risk ➔
          </button>
        </div>
      </div>
    </div>
  );
};
