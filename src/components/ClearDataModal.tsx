/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Trash2, X, Check, ShieldAlert } from 'lucide-react';

interface ClearDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmClear: (options: {
    history: boolean;
    cookies: boolean;
    cache: boolean;
    passwords: boolean;
  }) => void;
}

export const ClearDataModal: React.FC<ClearDataModalProps> = ({
  isOpen,
  onClose,
  onConfirmClear,
}) => {
  const [history, setHistory] = useState(true);
  const [cookies, setCookies] = useState(true);
  const [cache, setCache] = useState(true);
  const [passwords, setPasswords] = useState(false);
  const [timeRange, setTimeRange] = useState('all');

  if (!isOpen) return null;

  const handleClear = () => {
    onConfirmClear({ history, cookies, cache, passwords });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-4 select-none animate-fadeIn">
      <div className="w-full max-w-md bg-[#28292c] text-[#e3e3e3] border border-[#3c4043] rounded-3xl p-5 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#3c4043]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-rose-950/70 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Delete browsing data</h3>
              <p className="text-[11px] text-[#9aa0a6]">Privacy Clean Sweep</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[#c4c7c5] hover:text-white hover:bg-[#3c4043] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Time range selector */}
        <div className="pt-3 pb-2 flex items-center justify-between text-xs">
          <span className="text-[#9aa0a6]">Time range:</span>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-[#1f1f23] border border-[#3c4043] text-white text-xs rounded-xl px-2.5 py-1 focus:outline-none"
          >
            <option value="lastHour">Last hour</option>
            <option value="last24">Last 24 hours</option>
            <option value="last7">Last 7 days</option>
            <option value="all">All time (Permanent)</option>
          </select>
        </div>

        {/* Options */}
        <div className="py-2 space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={history}
              onChange={(e) => setHistory(e.target.checked)}
              className="mt-1 w-4 h-4 accent-cyan-500 rounded"
            />
            <div>
              <p className="text-xs font-semibold text-white">Browsing history</p>
              <p className="text-[10px] text-[#9aa0a6]">Clears history and autocompletions in the omnibox</p>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={cookies}
              onChange={(e) => setCookies(e.target.checked)}
              className="mt-1 w-4 h-4 accent-cyan-500 rounded"
            />
            <div>
              <p className="text-xs font-semibold text-white">Cookies and site data</p>
              <p className="text-[10px] text-[#9aa0a6]">Signs you out of most sites</p>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={cache}
              onChange={(e) => setCache(e.target.checked)}
              className="mt-1 w-4 h-4 accent-cyan-500 rounded"
            />
            <div>
              <p className="text-xs font-semibold text-white">Cached images and files</p>
              <p className="text-[10px] text-[#9aa0a6]">Frees up RAM and device storage</p>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={passwords}
              onChange={(e) => setPasswords(e.target.checked)}
              className="mt-1 w-4 h-4 accent-cyan-500 rounded"
            />
            <div>
              <p className="text-xs font-semibold text-white">Saved credentials & vault items</p>
              <p className="text-[10px] text-[#9aa0a6]">Leaves passwords intact by default</p>
            </div>
          </label>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#3c4043] mt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#9aa0a6] hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-colors"
          >
            Clear data
          </button>
        </div>
      </div>
    </div>
  );
};
