/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OMARVIO BROWSER - In-App Collapsible / Folding Advertisement Banner
 * Driven by Master Admin Panel via Cloudflare Sync Store.
 */

import React, { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, ExternalLink, Megaphone, Sparkles, X } from 'lucide-react';
import {
  getAdvertisements,
  Advertisement,
  getAppCustomization,
  AppCustomization,
  subscribeAdminStore,
  incrementAdClick,
  incrementAdView,
} from '../engine/adminStore';

interface InAppAdBannerProps {
  onNavigate: (url: string) => void;
  placement?: 'bottom_banner' | 'home_card';
}

export const InAppAdBanner: React.FC<InAppAdBannerProps> = ({ onNavigate, placement = 'bottom_banner' }) => {
  const [ads, setAds] = useState<Advertisement[]>(getAdvertisements);
  const [customization, setCustomization] = useState<AppCustomization>(getAppCustomization);
  const [isFolded, setIsFolded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);

  useEffect(() => {
    const unsub = subscribeAdminStore(() => {
      setAds(getAdvertisements());
      setCustomization(getAppCustomization());
    });
    return unsub;
  }, []);

  const activeAds = ads.filter((a) => a.active);

  // Rotate ads every 12 seconds if multiple
  useEffect(() => {
    if (activeAds.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentAdIndex((prev) => (prev + 1) % activeAds.length);
    }, 12000);
    return () => clearInterval(interval);
  }, [activeAds.length]);

  if (isDismissed || activeAds.length === 0) return null;
  if (customization.adDisplayPosition === 'disabled') return null;
  if (placement !== customization.adDisplayPosition && !(placement === 'bottom_banner' && customization.adDisplayPosition === 'bottom_banner')) {
    return null;
  }

  const currentAd = activeAds[currentAdIndex] || activeAds[0];
  if (!currentAd) return null;

  const handleAdClick = () => {
    incrementAdClick(currentAd.id);
    if (currentAd.targetUrl) {
      onNavigate(currentAd.targetUrl);
    }
  };

  return (
    <div className="w-full z-20 px-3 py-1 animate-fadeIn select-none">
      <div className="max-w-xl mx-auto rounded-2xl bg-gradient-to-r from-[#0d163a]/95 via-[#09102c]/95 to-[#0d163a]/95 border border-cyan-500/30 shadow-xl shadow-cyan-950/60 overflow-hidden backdrop-blur-md transition-all">
        {/* Top Header / Fold Toggle Bar */}
        <div className="px-3 py-1 bg-slate-900/80 border-b border-cyan-500/20 flex items-center justify-between text-[10px]">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1">
              <Megaphone className="w-3 h-3 text-cyan-400" />
              <span>ওমারভিও ফিচারড</span>
            </span>
            <span className="text-[9px] px-1 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/30">
              AD
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsFolded(!isFolded)}
              className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
              title={isFolded ? 'প্রসারিত করুন' : 'ফোল্ড করুন'}
            >
              {isFolded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
              title="লুকান"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content Body (Collapsible) */}
        {!isFolded && (
          <div
            onClick={handleAdClick}
            className="p-2.5 flex items-center gap-3 cursor-pointer hover:bg-white/[0.02] transition-colors group"
          >
            <img
              src={currentAd.imageUrl}
              alt={currentAd.title}
              className="w-11 h-11 rounded-xl object-cover border border-cyan-500/40 bg-slate-950 shrink-0 shadow-md group-hover:scale-105 transition-transform"
            />
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors truncate">
                {currentAd.title}
              </h4>
              <p className="text-[10px] text-slate-300 truncate mt-0.5">
                {currentAd.subtitle}
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleAdClick();
              }}
              className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-[10px] flex items-center gap-1 shrink-0 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <span>দেখুন</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
