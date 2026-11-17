/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Sliders, RefreshCw } from 'lucide-react';
import { syncThirdPartyCookieBlockWithAndroid, syncPrivacyConfigWithAndroid } from '../engine/nativeBridge';
import { getPrivacyFilterSettings, setPrivacyFilterSettings } from '../engine/adblocker';

interface SiteControlConfig {
  blockThirdPartyCookies: boolean;
  blockTrackers: boolean;
  allowJavaScript: boolean;
  blockPopups: boolean;
  fingerprintResist: boolean;
}

const DEFAULT_SITE_CONTROL: SiteControlConfig = {
  blockThirdPartyCookies: true,
  blockTrackers: true,
  allowJavaScript: true,
  blockPopups: true,
  fingerprintResist: true,
};

const STORAGE_KEY = 'omarvio_site_controls_v1';

function loadSiteControlsMap(): Record<string, SiteControlConfig> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {}
  return {};
}

function saveSiteControlForHost(host: string, cfg: SiteControlConfig): void {
  if (typeof window === 'undefined') return;
  try {
    const map = loadSiteControlsMap();
    map[host] = cfg;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {}
}

interface SiteControlsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUrl: string;
  onToast: (msg: string) => void;
}

export const SiteControlsModal: React.FC<SiteControlsModalProps> = ({
  isOpen,
  onClose,
  currentUrl,
  onToast,
}) => {
  const hostname = (() => {
    try {
      return currentUrl ? new URL(currentUrl.startsWith('http') ? currentUrl : `https://${currentUrl}`).hostname : 'default-shield';
    } catch {
      return 'default-shield';
    }
  })();

  const [config, setConfig] = useState<SiteControlConfig>(DEFAULT_SITE_CONTROL);

  useEffect(() => {
    if (!isOpen) return;
    const saved = loadSiteControlsMap()[hostname];
    const globalFilters = getPrivacyFilterSettings();
    setConfig({
      blockThirdPartyCookies: saved?.blockThirdPartyCookies ?? DEFAULT_SITE_CONTROL.blockThirdPartyCookies,
      blockTrackers: saved?.blockTrackers ?? globalFilters.aggressiveTrackerBlocking,
      allowJavaScript: saved?.allowJavaScript ?? DEFAULT_SITE_CONTROL.allowJavaScript,
      blockPopups: saved?.blockPopups ?? DEFAULT_SITE_CONTROL.blockPopups,
      fingerprintResist: saved?.fingerprintResist ?? DEFAULT_SITE_CONTROL.fingerprintResist,
    });
  }, [isOpen, hostname]);

  if (!isOpen) return null;

  const updateKey = (key: keyof SiteControlConfig, nextVal: boolean) => {
    const nextConfig = { ...config, [key]: nextVal };
    setConfig(nextConfig);
    saveSiteControlForHost(hostname, nextConfig);

    if (key === 'blockThirdPartyCookies') {
      syncThirdPartyCookieBlockWithAndroid(nextVal);
    } else if (key === 'blockTrackers') {
      const updated = setPrivacyFilterSettings({ aggressiveTrackerBlocking: nextVal });
      syncPrivacyConfigWithAndroid(updated);
    } else if (key === 'fingerprintResist') {
      try {
        localStorage.setItem('omarvio_fingerprint_shield', String(nextVal));
      } catch {}
    }
  };

  const handleReset = () => {
    setConfig(DEFAULT_SITE_CONTROL);
    saveSiteControlForHost(hostname, DEFAULT_SITE_CONTROL);
    syncThirdPartyCookieBlockWithAndroid(true);
    const updated = setPrivacyFilterSettings({ aggressiveTrackerBlocking: true });
    syncPrivacyConfigWithAndroid(updated);
    onToast(`🛡️ Site controls reset to Omarvio Shield defaults for ${hostname}`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-4 select-none animate-fadeIn">
      <div className="w-full max-w-md bg-[#28292c] text-[#e3e3e3] border border-[#3c4043] rounded-3xl p-5 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#3c4043]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-cyan-950/80 border border-cyan-400/40 flex items-center justify-center text-cyan-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Site controls</h3>
              <p className="text-[11px] text-cyan-400 truncate max-w-[220px]">{hostname}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[#c4c7c5] hover:text-white hover:bg-[#3c4043] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toggles list */}
        <div className="py-4 space-y-4">
          {/* Block Third-Party Cookies */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#e3e3e3]">Third-party cookies</p>
              <p className="text-[10px] text-[#9aa0a6]">Blocked across cross-site domains</p>
            </div>
            <button
              type="button"
              onClick={() => updateKey('blockThirdPartyCookies', !config.blockThirdPartyCookies)}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                config.blockThirdPartyCookies ? 'bg-cyan-500' : 'bg-[#5f6368]'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform transform ${
                  config.blockThirdPartyCookies ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Omarvio Privacy & Tracker Shield */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#e3e3e3]">Tracker & Ad Isolation</p>
              <p className="text-[10px] text-[#9aa0a6]">14,000+ telemetry lists filtered</p>
            </div>
            <button
              type="button"
              onClick={() => updateKey('blockTrackers', !config.blockTrackers)}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                config.blockTrackers ? 'bg-cyan-500' : 'bg-[#5f6368]'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform transform ${
                  config.blockTrackers ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* JavaScript Execution */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#e3e3e3]">JavaScript</p>
              <p className="text-[10px] text-[#9aa0a6]">Allowed for web compatibility</p>
            </div>
            <button
              type="button"
              onClick={() => updateKey('allowJavaScript', !config.allowJavaScript)}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                config.allowJavaScript ? 'bg-cyan-500' : 'bg-[#5f6368]'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform transform ${
                  config.allowJavaScript ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Pop-ups & Redirects */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#e3e3e3]">Block pop-ups and redirects</p>
              <p className="text-[10px] text-[#9aa0a6]">Prevent aggressive tab hijacks</p>
            </div>
            <button
              type="button"
              onClick={() => updateKey('blockPopups', !config.blockPopups)}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                config.blockPopups ? 'bg-cyan-500' : 'bg-[#5f6368]'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform transform ${
                  config.blockPopups ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Anti-Fingerprinting */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#e3e3e3]">Canvas & WebGL spoofing</p>
              <p className="text-[10px] text-[#9aa0a6]">Masks hardware IDs & canvas hashes</p>
            </div>
            <button
              type="button"
              onClick={() => updateKey('fingerprintResist', !config.fingerprintResist)}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                config.fingerprintResist ? 'bg-cyan-500' : 'bg-[#5f6368]'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform transform ${
                  config.fingerprintResist ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[#3c4043]">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-[#9aa0a6] hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reset permissions
          </button>
          <button
            type="button"
            onClick={() => {
              saveSiteControlForHost(hostname, config);
              onToast(`✅ Site controls saved & applied for ${hostname}`);
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
