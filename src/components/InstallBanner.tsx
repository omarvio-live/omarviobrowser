/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OMARVIO BROWSER - Universal 1-Click PWA / Standalone Engine
 * Enables 100% standalone browsing on Android, iOS Safari, and Desktop
 * Launches full-screen without Chrome/Safari frames or address bars.
 */

import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Check, Laptop, Share, Compass } from 'lucide-react';

export const InstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [deviceType, setDeviceType] = useState<'ios' | 'android' | 'desktop'>('android');

  useEffect(() => {
    // Detect device environment
    const ua = navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(ua);
    const isAndroid = /android/.test(ua);
    if (isIos) setDeviceType('ios');
    else if (isAndroid) setDeviceType('android');
    else setDeviceType('desktop');

    // Check if already running in standalone mode (installed as PWA)
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(isStandaloneMode);
    };

    checkStandalone();

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setInstalledSuccess(true);
      setIsStandalone(true);
      setDeferredPrompt(null);
      setTimeout(() => setDismissed(true), 3500);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // If already standalone (installed) or dismissed by user, do not render
  if (isStandalone || dismissed) {
    return null;
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setInstalledSuccess(true);
          setTimeout(() => setIsStandalone(true), 1500);
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.warn('Install prompt error:', err);
        setShowGuide(true);
      }
    } else {
      setShowGuide((prev) => !prev);
    }
  };

  return (
    <div className="w-full bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-950 border-b border-cyan-500/30 text-xs shadow-md z-30 select-none animate-fadeIn">
      <div className="max-w-7xl mx-auto px-3 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src="/assets/aistudio/file_0000000038508211a96b8fbe27d5ca68_9009abdf.png"
            alt="OMARVIO BROWSER"
            className="w-8 h-8 aspect-square rounded-lg object-contain bg-black shrink-0 shadow-sm"
          />
          <div className="min-w-0">
            <p className="font-bold text-slate-100 flex items-center gap-1.5 text-[11px] sm:text-xs truncate">
              <span>OMARVIO BROWSER</span>
              <span className="text-[9px] text-cyan-300 font-semibold px-1.5 py-0.2 rounded-full bg-cyan-500/20 border border-cyan-400/30">
                PWA
              </span>
            </p>
            <p className="text-[10px] text-slate-400 truncate hidden xs:block">
              ক্রোমের ঝামেলা ছাড়া হোম স্ক্রিন থেকে চালান
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {installedSuccess ? (
            <span className="flex items-center gap-1 text-emerald-400 font-semibold text-xs px-2.5 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/30">
              <Check className="w-3.5 h-3.5" /> ইনস্টল সম্পন্ন!
            </span>
          ) : (
            <div className="flex items-center gap-1.5">
              <a
                href={(() => {
                  if (typeof window !== 'undefined') {
                    const repo = (localStorage.getItem('omarvio_github_repo') || '').trim();
                    if (repo && repo.includes('/')) {
                      return `https://github.com/${repo}/releases/latest/download/omarvio-browser.apk`;
                    }
                  }
                  return '/api/download-apk';
                })()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-[11px] sm:text-xs shadow-sm shadow-emerald-950 active:scale-95 transition-all cursor-pointer touch-manipulation"
                title="সরাসরি নেটিভ অ্যান্ড্রয়েড APK ডাউনলোড করুন"
              >
                <Download className="w-3.5 h-3.5" />
                <span>APK ডাউনলোড</span>
              </a>

              <button
                type="button"
                onClick={handleInstallClick}
                className="flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-[11px] sm:text-xs shadow-sm shadow-cyan-950 active:scale-95 transition-all cursor-pointer touch-manipulation"
                title="ব্রাউজার থেকে সরাসরি PWA অ্যাপ ইনস্টল করুন"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="sm:hidden">PWA</span>
                <span className="hidden sm:inline">PWA ইনস্টল</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-full hover:bg-slate-800 transition-colors cursor-pointer touch-manipulation"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Guide dropdown when deferredPrompt is not available (e.g. iOS Safari or manual instruction) */}
      {showGuide && (
        <div className="px-3.5 py-2.5 bg-slate-900/95 border-t border-cyan-500/20 text-[11px] text-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-0.5">
            {deviceType === 'ios' ? (
              <p className="flex items-center gap-1.5 text-cyan-200">
                <Share className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>
                  <strong>iPhone / iPad Safari:</strong> নিচের <span className="underline font-semibold">Share বাটন (⎋)</span> ট্যাপ করে <span className="text-white font-bold">&ldquo;Add to Home Screen (+)&rdquo;</span> নির্বাচন করুন।
                </span>
              </p>
            ) : deviceType === 'android' ? (
              <p className="flex items-center gap-1.5 text-cyan-200">
                <Compass className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>
                  <strong>Android ব্রাউজার:</strong> ওপরের ডানদিকের <span className="underline font-semibold">৩-ডট মেনু (⋮)</span> ট্যাপ করে <span className="text-white font-bold">&ldquo;Install app&rdquo; বা &ldquo;Add to Home Screen&rdquo;</span> ট্যাপ করুন।
                </span>
              </p>
            ) : (
              <p className="flex items-center gap-1.5 text-cyan-200">
                <Laptop className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>
                  <strong>ল্যাপটপ / কম্পিউটার:</strong> ব্রাউজার অ্যাড্রেস বারের ডানপাশের <span className="underline font-semibold">ইনস্টল আইকন (⊕)</span> এ ক্লিক করুন অথবা মেনু থেকে &ldquo;Install OMARVIO&rdquo; চাপুন।
                </span>
              </p>
            )}
            <p className="text-[10px] text-slate-400">
              💡 ইনস্টল করার পর ওমারভিও কোনো ব্রাউজার ফ্রেম বা অ্যাড্রেস বার ছাড়া সরাসরি আসল অ্যাপের মতো ওপেন হবে।
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowGuide(false)}
            className="self-end sm:self-center px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 hover:text-white text-[10px] uppercase font-bold shrink-0 transition-colors"
          >
            বুঝেছি
          </button>
        </div>
      )}
    </div>
  );
};
