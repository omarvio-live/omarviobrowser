/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Smartphone,
  ExternalLink,
  CheckCircle2,
  Zap,
  ArrowRight,
  Share2,
  Copy,
  Check,
  Sparkles,
  Link as LinkIcon,
  HelpCircle,
  Cpu,
  EyeOff,
} from 'lucide-react';
import {
  detectPlatform,
  registerProtocolHandler,
  launchAndroidDefaultAppsIntent,
  unwrapAndSanitizeExternalUrl,
  CleanedExternalLinkResult,
} from '../engine/linkInterceptor';

interface DefaultBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCleanUrl?: (url: string) => void;
}

export const DefaultBrowserModal: React.FC<DefaultBrowserModalProps> = ({
  isOpen,
  onClose,
  onOpenCleanUrl,
}) => {
  const [protocolStatus, setProtocolStatus] = useState<'idle' | 'registered' | 'error'>('idle');
  const [testInput, setTestInput] = useState(
    'https://l.facebook.com/l.php?u=https%3A%2F%2Fbdnews24.com%2Fbangladesh%2Fnews&h=AT1m_&fbclid=IwAR3aXk_938102948293'
  );
  const [testResult, setTestResult] = useState<CleanedExternalLinkResult | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeStepTab, setActiveStepTab] = useState<'samsung' | 'xiaomi' | 'pixel' | 'ios' | 'pc'>(() => {
    const platform = detectPlatform();
    if (platform.brand === 'samsung') return 'samsung';
    if (platform.brand === 'xiaomi') return 'xiaomi';
    if (platform.os === 'ios') return 'ios';
    if (platform.os === 'windows' || platform.os === 'mac') return 'pc';
    return 'pixel';
  });

  if (!isOpen) return null;

  const currentPlatform = detectPlatform();

  const handleRegisterProtocol = async () => {
    const res = await registerProtocolHandler();
    if (res.success) {
      setProtocolStatus('registered');
    } else {
      setProtocolStatus('error');
    }
  };

  const handleRunSimulation = (sampleType?: 'facebook' | 'whatsapp') => {
    let raw = testInput;
    if (sampleType === 'facebook') {
      raw = 'https://l.facebook.com/l.php?u=https%3A%2F%2Fprothomalo.com%2Fbangladesh%2Farticle&fbclid=IwAR999_fake_tracker_token';
      setTestInput(raw);
    } else if (sampleType === 'whatsapp') {
      raw = 'https://youtube.com/watch?v=dQw4w9WgXcQ?si=secret_wa_token&utm_source=whatsapp&wa_click_id=98721';
      setTestInput(raw);
    }

    const cleaned = unwrapAndSanitizeExternalUrl(raw);
    setTestResult(cleaned);
  };

  const handleOpenSimulated = () => {
    if (testResult && onOpenCleanUrl) {
      onOpenCleanUrl(testResult.cleanedUrl);
      onClose();
    }
  };

  const handleCopyLink = () => {
    if (testResult) {
      navigator.clipboard.writeText(testResult.cleanedUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-[#0b1329] border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-950/60 overflow-hidden text-slate-100">
        {/* Header with branding */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-cyan-500/20 bg-gradient-to-r from-[#0d1b3e] via-[#09152e] to-[#0d1b3e]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/30">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg text-white">
                  ডিফল্ট ব্রাউজার ও লিংক সাজেশন অপ্টিমাইজার
                </h3>
                <span className="text-[10px] uppercase font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded-full">
                  Rank #1 Engine
                </span>
              </div>
              <p className="text-xs text-slate-300">
                WhatsApp, Messenger ও SMS লিংকে ক্লিক করলেই সবার উপরে OMARVIO সাজেস্ট হবে
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-sm">
          {/* Device & Status Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-950/40 to-blue-950/30 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Smartphone className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  শনাক্তকৃত ডিভাইস:
                </span>
                <span className="text-xs font-bold text-cyan-300 bg-cyan-900/50 px-2 py-0.5 rounded">
                  {currentPlatform.name} ({currentPlatform.os.toUpperCase()})
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                ওমারভিও-কে ডিফল্ট ব্রাউজার সেট করলে যেকোনো অ্যাপ থেকে লিংক ক্লিক করা মাত্রই বিজ্ঞাপন ও ট্র্যাকার ছাড়া তাৎক্ষণিক নিরাপদ ব্রাউজিং শুরু হবে।
              </p>
            </div>

            {currentPlatform.os === 'android' && (
              <button
                type="button"
                onClick={launchAndroidDefaultAppsIntent}
                className="shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 active:scale-95 text-white font-semibold text-xs shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                <span>১-ক্লিকে অ্যান্ড্রয়েড সেটিংসে যান</span>
              </button>
            )}
          </div>

          {/* 4-Layer System Hook Architecture */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-cyan-400" />
              সিস্টেম ইন্টিগ্রেশন ও র্যাঙ্কিং অ্যালগরিদম আর্কিটেকচার
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-xs text-white">১. WebAPK Native Intent Hook</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    অ্যান্ড্রয়েড OS-এ ব্রাউজার ক্যাটাগরি ও <code className="text-cyan-300">http/https</code> ইন্টেন্ট ফিল্টার সক্রিয়।
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-xs text-white">২. Share Target API</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    WhatsApp ও Messenger-এ &quot;Share to...&quot; অপশনে ওমারভিও সবার আগে দৃশ্যমান হয়।
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-xs text-white">৩. Protocol Handlers (<code className="text-cyan-300">web+omarvio</code>)</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    ওয়েব প্রোটোকলের সাথে সরাসরি সংযুক্ত যা যেকোনো বহিরাগত লিংক ওমারভিওতে কল করতে পারে।
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-xs text-white">৪. Redirect & Tracker Unwrapper</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Facebook & Google রিডাইরেক্ট ব্রিজ ও ট্র্যাকিং কোড (<code className="text-cyan-300">fbclid</code>) ০.০৫ সেকেন্ডে ডিকোড করে।
                  </div>
                </div>
              </div>
            </div>

            {/* Protocol register action button */}
            <div className="mt-3 flex items-center justify-between p-3 rounded-lg bg-slate-950/80 border border-cyan-500/20">
              <span className="text-xs text-slate-300">
                ব্রাউজারে ওমারভিও প্রোটোকল হ্যান্ডলার হিসেবে রেজিস্টার করুন:
              </span>
              <button
                type="button"
                onClick={handleRegisterProtocol}
                className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {protocolStatus === 'registered' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>রেজিস্টার্ড হয়েছে!</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>প্রোটোকল রেজিস্টার করুন</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Device-Specific Step-by-Step Setup Guide */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-cyan-400" />
              আপনার ব্র্যান্ড অনুযায়ী ৩-স্টেপ গাইড
            </h4>

            {/* Brand tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveStepTab('samsung')}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors cursor-pointer ${
                  activeStepTab === 'samsung'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Samsung Galaxy
              </button>
              <button
                type="button"
                onClick={() => setActiveStepTab('xiaomi')}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors cursor-pointer ${
                  activeStepTab === 'xiaomi'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Xiaomi / Redmi
              </button>
              <button
                type="button"
                onClick={() => setActiveStepTab('pixel')}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors cursor-pointer ${
                  activeStepTab === 'pixel'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Pixel / Realme / Vivo
              </button>
              <button
                type="button"
                onClick={() => setActiveStepTab('ios')}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors cursor-pointer ${
                  activeStepTab === 'ios'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Apple iOS (iPhone)
              </button>
              <button
                type="button"
                onClick={() => setActiveStepTab('pc')}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors cursor-pointer ${
                  activeStepTab === 'pc'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Windows / Mac PC
              </button>
            </div>

            {/* Steps Content */}
            <div className="mt-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs text-slate-300 space-y-2.5">
              {activeStepTab === 'samsung' && (
                <>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0">1</span>
                    <span>ফোনের <strong>Settings (সেটিংস)</strong> এ গিয়ে <strong>Apps (অ্যাপস)</strong> এ ট্যাপ করুন।</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0">2</span>
                    <span>উপরে থাকা <strong>Choose default apps (ডিফল্ট অ্যাপস নির্বাচন করুন)</strong> অপশনে ট্যাপ করুন।</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0">3</span>
                    <span><strong>Browser app (ব্রাউজার অ্যাপ)</strong> এ ট্যাপ করে তালিকা থেকে <strong>OMARVIO BROWSER</strong> সিলেক্ট করুন। ব্যাস, হোয়াটসঅ্যাপ বা মেসেঞ্জারের প্রতিটা লিংক সরাসরি ওমারভিও-তে ওপেন হবে!</span>
                  </div>
                </>
              )}

              {activeStepTab === 'xiaomi' && (
                <>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0">1</span>
                    <span><strong>Settings</strong> &gt; <strong>Apps</strong> &gt; <strong>Manage apps</strong> এ যান।</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0">2</span>
                    <span>উপরে ডানদিকের <strong>তিনটি বিন্দু (⋮)</strong> মেনু থেকে <strong>Default apps</strong> নির্বাচন করুন।</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0">3</span>
                    <span><strong>Browser</strong> অপশন থেকে <strong>OMARVIO BROWSER</strong> নির্বাচন করে ডিফল্ট হিসেবে সেট করুন।</span>
                  </div>
                </>
              )}

              {activeStepTab === 'pixel' && (
                <>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0">1</span>
                    <span><strong>Settings</strong> এ গিয়ে <strong>Apps</strong> এ প্রবেশ করুন।</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0">2</span>
                    <span><strong>Default apps</strong> এ ট্যাপ করে <strong>Browser app</strong> সিলেক্ট করুন।</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0">3</span>
                    <span>তালিকা থেকে <strong>OMARVIO BROWSER</strong> নির্বাচন করুন। এর ফলে যেকোনো লিংক সাজেশন ডায়লগে ওমারভিও সর্বদা ১ নম্বরে থাকবে।</span>
                  </div>
                </>
              )}

              {activeStepTab === 'ios' && (
                <>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0">1</span>
                    <span>Safari-তে ওমারভিও ওপেন থাকা অবস্থায় শেয়ার আইকন (Share Sheet) ট্যাপ করুন।</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0">2</span>
                    <span><strong>&quot;Add to Home Screen&quot;</strong> ট্যাপ করে হোম স্ক্রিনে ইনস্টল করুন।</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0">3</span>
                    <span>হোয়াটসঅ্যাপ বা যেকোনো অ্যাপের লিংক লং-প্রেস করে <strong>&quot;Share...&quot;</strong> দিলে সাজেশনে ওমারভিও সিলেক্ট করুন।</span>
                  </div>
                </>
              )}

              {activeStepTab === 'pc' && (
                <>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0">1</span>
                    <span>Windows Settings (Win + I) &gt; <strong>Apps</strong> &gt; <strong>Default apps</strong> এ যান।</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0">2</span>
                    <span>ওয়েব ব্রাউজার সেকশনে <strong>OMARVIO BROWSER</strong> বা Chrome PWA নির্বাচন করুন।</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0">3</span>
                    <span>পিসির যেকোনো মেসেঞ্জার, টেলিগ্রাম বা ডকুমেন্টের ওয়েব লিংকে ক্লিক করলেই ওমারভিওতে চালু হবে।</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Live Link Interceptor Simulator */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-cyan-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                  লাইভ লিংক ইন্টারসেপ্টর টেস্ট সিমুলেটর
                </h4>
              </div>
              <span className="text-[10px] text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                Live Simulator
              </span>
            </div>
            <p className="text-xs text-slate-400">
              WhatsApp বা Messenger থেকে আসা যেকোনো ট্র্যাকিং যুক্ত বা রিডাইরেক্ট লিংক কীভাবে ওমারভিও নিখুঁতভাবে পরিষ্কার করে তা সরাসরি যাচাই করুন:
            </p>

            {/* Quick sample chips */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-slate-400">স্যাম্পল টেস্ট করুন:</span>
              <button
                type="button"
                onClick={() => handleRunSimulation('facebook')}
                className="px-2.5 py-1 rounded bg-blue-950/80 hover:bg-blue-900 border border-blue-700/50 text-[11px] text-blue-300 transition-colors cursor-pointer"
              >
                🔵 Messenger / Facebook রিডাইরেক্ট লিংক
              </button>
              <button
                type="button"
                onClick={() => handleRunSimulation('whatsapp')}
                className="px-2.5 py-1 rounded bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/50 text-[11px] text-emerald-300 transition-colors cursor-pointer"
              >
                🟢 WhatsApp ট্র্যাকিং লিংক (si / wa_click)
              </button>
            </div>

            {/* Input & Run */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder="https://... লিংক পেস্ট করুন"
                className="flex-1 bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleRunSimulation()}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-white font-semibold text-xs transition-all cursor-pointer"
              >
                আনর‍্যাপ টেস্ট
              </button>
            </div>

            {/* Test result display */}
            {testResult && (
              <div className="mt-3 p-3.5 rounded-xl bg-[#070d1e] border border-cyan-500/40 space-y-2 text-xs">
                <div className="flex items-center justify-between text-emerald-400 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    লিংক সফলভাবে আনর‍্যাপ ও স্যানিটাইজ করা হয়েছে!
                  </span>
                  <span className="text-[10px] bg-emerald-900/40 px-2 py-0.5 rounded text-emerald-300 border border-emerald-600/30">
                    {testResult.sourceApp.toUpperCase()} DETECTED
                  </span>
                </div>

                <div className="space-y-1.5 font-mono text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px]">মূল ইনকামিং লিংক (ট্র্যাকার ও স্পাই টোকেন সহ):</span>
                    <span className="text-red-400 break-all line-through opacity-75">{testResult.originalUrl}</span>
                  </div>
                  <div>
                    <span className="text-cyan-400 block text-[10px]">ওমারভিও ক্লিন ডেসটিনেশন লিংক:</span>
                    <span className="text-emerald-300 font-bold break-all bg-emerald-950/40 p-1.5 rounded block border border-emerald-800/40">
                      {testResult.cleanedUrl}
                    </span>
                  </div>
                </div>

                {testResult.trackersRemoved.length > 0 && (
                  <div className="text-[11px] text-slate-300 flex items-center gap-1.5">
                    <EyeOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>মুছে ফেলা ট্র্যাকার টোকেনসমূহ: </span>
                    <div className="flex gap-1 flex-wrap">
                      {testResult.trackersRemoved.map((trk) => (
                        <span key={trk} className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px]">
                          {trk}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenSimulated}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-900/30 transition-all cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>এই পরিষ্কার লিংকে ওমারভিও ট্যাবে যান</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'কপি হয়েছে' : 'কপি'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-cyan-500/20 bg-slate-950 flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            OMARVIO GLOBAL LTD. &bull; Privacy-First Link Suggestion Engine
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition-colors cursor-pointer"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
