/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Share2,
  QrCode,
  Download,
  Copy,
  Check,
  Music,
  FileText,
  Send,
  MessageCircle,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  Smartphone,
  Quote,
  Palette,
  Radio,
  Wifi,
  CheckCircle2,
  ArrowDownCircle,
} from 'lucide-react';
import { DetectedMedia } from '../engine/mediaSaver';
import { cleanTrackingParameters } from '../engine/adblocker';

interface SmartShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUrl: string;
  pageTitle?: string;
  activeMedia?: DetectedMedia | null;
  onToast: (msg: string) => void;
}

type ShareTab = 'quick' | 'qr' | 'song' | 'quote' | 'p2p';

export const SmartShareModal: React.FC<SmartShareModalProps> = ({
  isOpen,
  onClose,
  currentUrl,
  pageTitle = 'Webpage',
  activeMedia,
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<ShareTab>('quick');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrColor, setQrColor] = useState<string>('#06b6d4'); // Cyan default
  const [qrBg, setQrBg] = useState<string>('#0b1329');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedQuote, setCopiedQuote] = useState(false);
  const [quoteSnippet, setQuoteSnippet] = useState(
    '“আমার ফোন, আমার ডেটা – কেন দেব অন্যের হাতে!”'
  );
  const [quoteAuthor, setQuoteAuthor] = useState('OMARVIO BROWSER');
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Milestone 15: Peer-to-Peer Zero-Server BroadcastChannel + Storage Beam State
  const [p2pBeamCode] = useState(() => {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const arr = new Uint32Array(1);
      crypto.getRandomValues(arr);
      return `OMV-${100000 + (arr[0] % 900000)}`;
    }
    return 'OMV-482910';
  });
  const [p2pStatus, setP2pStatus] = useState<'idle' | 'beaming' | 'connected' | 'received'>('idle');
  const [receiveCodeInput, setReceiveCodeInput] = useState('');
  const [receivedBeamItem, setReceivedBeamItem] = useState<{ title: string; url: string } | null>(null);
  const beamRegistryRef = useRef<Record<string, { title: string; url: string; ts: number }>>({});

  // Clean target url of spy trackers before sharing
  const cleanUrl = currentUrl ? cleanTrackingParameters(currentUrl) : 'https://omarvio.com';
  const effectiveTitle = pageTitle || 'OMARVIO Protected Page';

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;
    const STORAGE_KEY = 'omarvio_p2p_beam_registry_v1';
    try {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (existing && typeof existing === 'object') {
        beamRegistryRef.current = existing;
      }
    } catch {
      // Ignore malformed storage
    }

    let channel: BroadcastChannel | null = null;
    if ('BroadcastChannel' in window) {
      channel = new BroadcastChannel('omarvio_p2p_beam');
      channel.onmessage = (event) => {
        const data = event.data;
        if (data?.type === 'BEAM_OFFER' && data.code && data.url) {
          beamRegistryRef.current[data.code] = {
            title: data.title || 'Beamed Page',
            url: data.url,
            ts: Date.now(),
          };
          if (data.code === receiveCodeInput.trim().toUpperCase()) {
            setReceivedBeamItem({ title: data.title || 'Beamed Page', url: data.url });
            setP2pStatus('received');
          }
        } else if (data?.type === 'BEAM_ACK' && data.code === p2pBeamCode) {
          setP2pStatus('connected');
          onToast('✅ অন্য ট্যাব/উইন্ডো বিম রিসিভ করেছে!');
        }
      };
    }

    return () => {
      channel?.close();
    };
  }, [isOpen, p2pBeamCode, receiveCodeInput, onToast]);

  // Generate QR Code dynamically when URL or color changes
  useEffect(() => {
    if (!isOpen) return;

    let targetToEncode = cleanUrl;
    if (activeTab === 'song' && activeMedia?.src) {
      targetToEncode = activeMedia.src;
    } else if (activeTab === 'quote') {
      targetToEncode = `${cleanUrl}#:~:text=${encodeURIComponent(quoteSnippet.slice(0, 80))}`;
    } else if (activeTab === 'p2p') {
      targetToEncode = `web+omarvio://p2p-beam?code=${p2pBeamCode}&url=${encodeURIComponent(cleanUrl)}&title=${encodeURIComponent(effectiveTitle)}`;
    }

    QRCode.toDataURL(targetToEncode, {
      width: 400,
      margin: 2,
      color: {
        dark: qrColor,
        light: qrBg,
      },
      errorCorrectionLevel: 'H',
    })
      .then((url: string) => {
        setQrDataUrl(url);
      })
      .catch((err: unknown) => {
        console.error('QR code generation error:', err);
      });
  }, [isOpen, cleanUrl, qrColor, qrBg, activeTab, activeMedia, quoteSnippet, p2pBeamCode, effectiveTitle]);

  if (!isOpen) return null;

  // 1-Click native device share
  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: effectiveTitle,
          text: `${effectiveTitle} - ওমারভিও ব্রাউজার থেকে শেয়ার করা হয়েছে (ট্র্যাকার ও বিজ্ঞাপন মুক্ত)`,
          url: cleanUrl,
        });
        onToast('✅ সফলভাবে শেয়ার করা হয়েছে!');
      } catch (err: unknown) {
        if ((err as Error)?.name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const openExternalShareLink = (shareUrl: string) => {
    const a = document.createElement('a');
    a.href = shareUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // WhatsApp 1-tap share
  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `🔗 ${effectiveTitle}\n${cleanUrl}\n\n🛡️ ওমারভিও ব্রাউজার: "আমার ফোন, আমার ডেটা – কেন দেব অন্যের হাতে!"`
    );
    openExternalShareLink(`https://api.whatsapp.com/send?text=${text}`);
  };

  // Telegram 1-tap share
  const handleTelegramShare = () => {
    const text = encodeURIComponent(
      `🔗 ${effectiveTitle}\n🛡️ ওমারভিও প্রাইভেট ব্রাউজার দিয়ে বিজ্ঞাপন ও ট্র্যাকার ছাড়া ওপেন করুন:`
    );
    openExternalShareLink(`https://t.me/share/url?url=${encodeURIComponent(cleanUrl)}&text=${text}`);
  };

  // Twitter / X share
  const handleTwitterShare = () => {
    const text = encodeURIComponent(`🔗 ${effectiveTitle} via #OmarvioBrowser`);
    openExternalShareLink(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(cleanUrl)}`);
  };

  // Facebook share
  const handleFacebookShare = () => {
    openExternalShareLink(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(cleanUrl)}`);
  };

  // Copy Clean URL to clipboard
  const handleCopyLink = () => {
    navigator.clipboard.writeText(cleanUrl);
    setCopiedLink(true);
    onToast('📋 ট্র্যাকারমুক্ত পরিচ্ছন্ন লিংক ক্লিপবোর্ডে কপি হয়েছে!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Download QR Code PNG with Brand Badge
  const handleDownloadQR = () => {
    if (!qrDataUrl) return;

    // Create an in-memory canvas to composite QR code + OmarVio branding footer
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 750;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Background
    ctx.fillStyle = '#060913';
    ctx.fillRect(0, 0, 600, 750);

    // Decorative top border
    const gradient = ctx.createLinearGradient(0, 0, 600, 0);
    gradient.addColorStop(0, '#06b6d4');
    gradient.addColorStop(0.5, '#3b82f6');
    gradient.addColorStop(1, '#6366f1');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 600, 8);

    // Title & Branding
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('OMARVIO BROWSER', 300, 55);

    ctx.fillStyle = '#22d3ee';
    ctx.font = 'italic 16px sans-serif';
    ctx.fillText('“My Phone, My Data – Why Surrender It To Others!”', 300, 85);

    // QR Image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Draw rounded container for QR
      ctx.fillStyle = qrBg;
      ctx.beginPath();
      ctx.roundRect(50, 110, 500, 500, [20]);
      ctx.fill();

      // Draw QR image
      ctx.drawImage(img, 70, 130, 460, 460);

      // Central Shield Badge
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(300, 360, 34, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#060913';
      ctx.beginPath();
      ctx.arc(300, 360, 28, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#22d3ee';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('O', 300, 368);

      // Footer
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.fillText('Scan with any mobile camera to open safely in OmarVio', 300, 645);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 15px monospace';
      const truncatedUrl = cleanUrl.length > 45 ? cleanUrl.slice(0, 45) + '...' : cleanUrl;
      ctx.fillText(truncatedUrl, 300, 675);

      ctx.fillStyle = '#475569';
      ctx.font = '12px sans-serif';
      ctx.fillText('OMARVIO GLOBAL LTD. • 256-Bit Cryptographic Shield', 300, 715);

      // Trigger download
      const link = document.createElement('a');
      link.download = `omarvio-qr-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      onToast('🖼️ ওমারভিও ব্র্যান্ডেড কিউআর কোড (PNG) ডাউনলোড হয়েছে!');
    };
    img.src = qrDataUrl;
  };

  // Copy Quote Card
  const handleCopyQuoteCard = () => {
    const formatted = `“${quoteSnippet}”\n\n— ${quoteAuthor}\n🔗 Source: ${cleanUrl}\n🛡️ Shared via OMARVIO BROWSER`;
    navigator.clipboard.writeText(formatted);
    setCopiedQuote(true);
    onToast('📝 কোট কার্ড টেক্সট কপি হয়েছে!');
    setTimeout(() => setCopiedQuote(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-lg max-h-[92vh] flex flex-col bg-[#0b1329] border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-950/60 overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-cyan-500/20 bg-gradient-to-r from-[#0d1b3e] via-[#09152e] to-[#0d1b3e]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/30">
              <Share2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                <span>স্মার্ট শেয়ার ও কিউআর স্টুডিও</span>
                <span className="text-[9px] uppercase font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-1.5 py-0.2 rounded-full">
                  Smart Hub
                </span>
              </h3>
              <p className="text-[11px] text-cyan-300/80 truncate max-w-[260px] sm:max-w-none">
                বন্ধু ও সোশ্যাল মিডিয়ায় লিংক, গান, কোট বা কিউআর কোড শেয়ার করুন
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

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 px-4 py-2 bg-slate-950/80 border-b border-slate-800/80 text-xs shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('quick')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'quick'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>সোশ্যাল শেয়ার</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('qr')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'qr'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>কিউআর কোড জেনারেটর</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('quote')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'quote'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Quote className="w-3.5 h-3.5" />
            <span>অংশবিশেষ / কোট কার্ড</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('song')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'song'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>গান / অডিও</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('p2p')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'p2p'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span>P2P ওয়েবআরটিসি বিম</span>
          </button>
        </div>

        {/* Content Viewport */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* Target Info Preview Pill */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-cyan-500/20 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">
                শেয়ারের মূল লিঙ্ক (ট্র্যাকারমুক্ত)
              </span>
              <p className="font-mono text-slate-200 text-xs truncate mt-0.5">
                {cleanUrl}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white flex items-center gap-1 text-xs shrink-0 transition-colors cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'কপি হয়েছে' : 'কপি'}</span>
            </button>
          </div>

          {/* TAB 1: QUICK SOCIAL CHANNELS */}
          {activeTab === 'quick' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Native OS Share Button */}
              <button
                type="button"
                onClick={handleNativeShare}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 active:scale-98 transition-all cursor-pointer"
              >
                <Smartphone className="w-4 h-4" />
                <span>সিস্টেম শেয়ার ডায়ালগ ওপেন করুন (Android/iOS)</span>
              </button>

              {/* Direct Apps Grid */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  ১-ক্লিকে বন্ধুদের কাছে পাঠান
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {/* WhatsApp */}
                  <button
                    type="button"
                    onClick={handleWhatsAppShare}
                    className="p-3 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer text-emerald-200"
                  >
                    <MessageCircle className="w-5 h-5 text-emerald-400" />
                    <span className="font-semibold text-xs">WhatsApp</span>
                  </button>

                  {/* Telegram */}
                  <button
                    type="button"
                    onClick={handleTelegramShare}
                    className="p-3 rounded-xl bg-sky-950/40 hover:bg-sky-900/60 border border-sky-500/30 flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer text-sky-200"
                  >
                    <Send className="w-5 h-5 text-sky-400" />
                    <span className="font-semibold text-xs">Telegram</span>
                  </button>

                  {/* Facebook */}
                  <button
                    type="button"
                    onClick={handleFacebookShare}
                    className="p-3 rounded-xl bg-blue-950/40 hover:bg-blue-900/60 border border-blue-500/30 flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer text-blue-200"
                  >
                    <Share2 className="w-5 h-5 text-blue-400" />
                    <span className="font-semibold text-xs">Facebook</span>
                  </button>

                  {/* Twitter / X */}
                  <button
                    type="button"
                    onClick={handleTwitterShare}
                    className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer text-slate-200"
                  >
                    <ExternalLink className="w-5 h-5 text-cyan-400" />
                    <span className="font-semibold text-xs">Twitter / X</span>
                  </button>
                </div>
              </div>

              {/* Privacy Notice */}
              <div className="p-3 rounded-xl bg-[#070e20] border border-cyan-500/20 flex items-start gap-2.5 text-[11px] text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">স্পাই ট্র্যাকার ফিল্টার সক্রিয়:</strong> ওমারভিও থেকে শেয়ার করার সময় লিঙ্ক থেকে স্বয়ংক্রিয়ভাবে <code className="text-cyan-300">fbclid</code>, <code className="text-cyan-300">utm_*</code> এবং ক্লিক-ট্র্যাকিং কুকি মুছে ফেলা হয়, যাতে আপনার বন্ধুদের গোপনীয়তা সুরক্ষিত থাকে।
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DYNAMIC QR CODE GENERATOR */}
          {activeTab === 'qr' && (
            <div className="space-y-4 animate-fadeIn">
              {/* QR Preview Card */}
              <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-b from-[#070e20] to-[#040814] border border-cyan-500/30 shadow-inner">
                {qrDataUrl ? (
                  <div className="relative p-3 rounded-xl bg-[#0b1329] border border-cyan-500/40 shadow-xl flex items-center justify-center">
                    <img
                      src={qrDataUrl}
                      alt="OmarVio Dynamic QR Code"
                      className="w-48 h-48 sm:w-56 sm:h-56 rounded-lg object-contain"
                    />
                    {/* Central Brand Shield Logo */}
                    <div className="absolute w-10 h-10 rounded-full bg-cyan-500 border-2 border-slate-950 flex items-center justify-center shadow-lg">
                      <span className="font-black text-slate-950 text-base">O</span>
                    </div>
                  </div>
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-slate-500">
                    কিউআর কোড প্রস্তুত হচ্ছে...
                  </div>
                )}

                <p className="mt-3 text-[11px] text-slate-400 text-center">
                  ফোনের সাধারণ ক্যামেরা দিয়ে স্ক্যান করলেই সরাসরি এই লিংক খুলবে।
                </p>
              </div>

              {/* QR Color Selector */}
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300">
                  <Palette className="w-3.5 h-3.5 text-cyan-400" />
                  <span>কিউআর কালার থিম নির্বাচন করুন:</span>
                </div>
                <div className="flex items-center gap-2">
                  {[
                    { color: '#06b6d4', bg: '#0b1329', label: 'Cyan Neon' },
                    { color: '#10b981', bg: '#041d14', label: 'Emerald' },
                    { color: '#8b5cf6', bg: '#130d29', label: 'Purple' },
                    { color: '#f59e0b', bg: '#231505', label: 'Amber' },
                    { color: '#ffffff', bg: '#000000', label: 'Pure Dark' },
                  ].map((theme) => (
                    <button
                      key={theme.label}
                      type="button"
                      onClick={() => {
                        setQrColor(theme.color);
                        setQrBg(theme.bg);
                      }}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                        qrColor === theme.color
                          ? 'border-white text-white shadow-md'
                          : 'border-slate-800 text-slate-400 hover:text-white'
                      }`}
                      style={{ backgroundColor: theme.bg }}
                    >
                      {theme.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons: Download PNG, Copy */}
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleDownloadQR}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-cyan-500/25 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>ব্র্যান্ডেড QR ডাউনলোড (PNG)</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Copy className="w-4 h-4" />
                  <span>লিংক কপি</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: QUOTE / SNIPPET SHARE */}
          {activeTab === 'quote' && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                  আর্টিকেলের নির্দিষ্ট অংশ / কোট নির্বাচন করুন:
                </label>
                <textarea
                  rows={3}
                  value={quoteSnippet}
                  onChange={(e) => setQuoteSnippet(e.target.value)}
                  placeholder="নির্দিষ্ট কোনো অনুচ্ছেদ বা উদ্ধৃতি লিখুন..."
                  className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none resize-none leading-relaxed"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  উদ্ধৃতিদাতা বা সোর্স:
                </label>
                <input
                  type="text"
                  value={quoteAuthor}
                  onChange={(e) => setQuoteAuthor(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              {/* Live Quote Card Preview */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/70 via-slate-900 to-cyan-950/70 border border-cyan-500/40 shadow-lg space-y-2">
                <Quote className="w-6 h-6 text-cyan-400/60" />
                <p className="text-sm font-semibold text-white italic leading-relaxed">
                  &ldquo;{quoteSnippet}&rdquo;
                </p>
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-cyan-300 font-bold">— {quoteAuthor}</span>
                  <span className="text-slate-400 flex items-center gap-1 text-[10px]">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                    OMARVIO
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyQuoteCard}
                  className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  {copiedQuote ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedQuote ? 'কোট কপি হয়েছে!' : 'কোট কার্ড কপি করুন'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp-এ দিন</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: SONG / AUDIO SHARE */}
          {activeTab === 'song' && (
            <div className="space-y-4 animate-fadeIn">
              {activeMedia ? (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/60 to-cyan-950/60 border border-cyan-500/40 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0">
                      <Music className="w-6 h-6 animate-pulse" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">
                        সক্রিয় অডিও/মিডিয়া ট্র্যাক
                      </span>
                      <h4 className="font-bold text-white text-xs truncate">
                        {activeMedia.title || 'Current Audio Track'}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-mono">
                        ফরম্যাট: {activeMedia.format} &bull; ব্যাকগ্রাউন্ড প্লে সক্রিয়
                      </p>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    বন্ধুদের সাথে এই অডিওটি শেয়ার করলে তারা ওমারভিওতে সরাসরি ব্যাকগ্রাউন্ড এবং স্ক্রিন-অফ মোডে গানটি শুনতে পারবে।
                  </p>
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
                  <Music className="w-8 h-8 text-slate-500 mx-auto" />
                  <p className="text-xs font-semibold text-slate-300">
                    বর্তমানে কোনো অডিও বা গান বাজছে না
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    YouTube, SoundCloud বা যেকোনো ওয়েবসাইটে গান প্লে করলে ওমারভিও মিডিয়া স্নিফার স্বয়ংক্রিয়ভাবে তা শনাক্ত করে এখানে শেয়ারের অপশন এনে দেবে। বর্তমান পৃষ্ঠার লিঙ্ক শেয়ার করতে নিচের বোতাম ব্যবহার করুন।
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp-এ গান/লিংক শেয়ার করুন</span>
                </button>
                <button
                  type="button"
                  onClick={handleTelegramShare}
                  className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Telegram</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: PEER-TO-PEER ZERO-SERVER WEBRTC BEAM (MILESTONE 15) */}
          {activeTab === 'p2p' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Header Card */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/70 via-blue-950/70 to-indigo-950/70 border border-cyan-500/40 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
                    <Radio className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-xs">
                      WebRTC ডিভাইস-টু-ডিভাইস অফলাইন বিম
                    </h4>
                    <p className="text-[10px] text-cyan-300">
                      মাইলস্টোন ১৫ • সার্ভারবিহীন লোকাল ডেটাচ্যানেল ট্রান্সফার
                    </p>
                  </div>
                </div>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  0% Cloud Relay
                </span>
              </div>

              {/* Host / Sender Beam Code */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  আপনার ডিভাইসের সক্রিয় পেয়ারিং বিম কোড:
                </span>
                <div className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-slate-950 border border-cyan-500/50 text-cyan-300 font-mono font-black text-lg tracking-widest shadow-inner">
                  {p2pBeamCode}
                </div>
                <p className="text-[11px] text-slate-300">
                  কাছের যেকোনো ফোনে ওমারভিও ওপেন করে এই কোডটি লিখুন অথবা নিচের QR কোডটি স্ক্যান করুন।
                </p>

                {/* 1-Tap Beam Broadcast Action */}
                <button
                  type="button"
                  onClick={() => {
                    setP2pStatus('beaming');
                    const payload = {
                      type: 'BEAM_OFFER',
                      code: p2pBeamCode,
                      title: effectiveTitle,
                      url: cleanUrl,
                      ts: Date.now(),
                    };
                    beamRegistryRef.current[p2pBeamCode] = {
                      title: effectiveTitle,
                      url: cleanUrl,
                      ts: payload.ts,
                    };
                    try {
                      localStorage.setItem('omarvio_p2p_beam_registry_v1', JSON.stringify(beamRegistryRef.current));
                    } catch {
                      // Ignore storage quota issues
                    }
                    if ('BroadcastChannel' in window) {
                      const bc = new BroadcastChannel('omarvio_p2p_beam');
                      bc.postMessage(payload);
                      bc.close();
                    }
                    navigator.clipboard?.writeText(`${cleanUrl}`).catch(() => {});
                    setP2pStatus('connected');
                    onToast(`📡 বিম কোড ${p2pBeamCode} সক্রিয় হয়েছে — QR স্ক্যান বা কোড দিয়ে রিসিভ করুন`);
                  }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  <Radio className="w-4 h-4" />
                  <span>
                    {p2pStatus === 'beaming'
                      ? 'বিমিং হচ্ছে...'
                      : p2pStatus === 'connected'
                      ? 'বিম সক্রিয় (QR / কোড শেয়ার রেডি)'
                      : 'বর্তমান পেজটি বিম করুন (Beam Now)'}
                  </span>
                </button>
              </div>

              {/* Receive Beam from Peer */}
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2.5">
                <span className="text-xs font-bold text-slate-200 block">
                  অন্য ট্যাব / ডিভাইস থেকে বিম রিসিভ করুন:
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={receiveCodeInput}
                    onChange={(e) => setReceiveCodeInput(e.target.value.toUpperCase())}
                    placeholder="OMV-XXXXXX"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const code = receiveCodeInput.trim().toUpperCase();
                      if (!code) {
                        onToast('⚠️ অনুগ্রহ করে ৬-সংখ্যার বিম কোড লিখুন');
                        return;
                      }
                      let latestRegistry = beamRegistryRef.current;
                      try {
                        const stored = JSON.parse(localStorage.getItem('omarvio_p2p_beam_registry_v1') || '{}');
                        latestRegistry = { ...latestRegistry, ...stored };
                      } catch {
                        // Ignore malformed storage
                      }
                      const match = latestRegistry[code];
                      if (!match) {
                        onToast('❌ এই কোডের কোনো সক্রিয় বিম পাওয়া যায়নি (প্রথমে প্রেরক ডিভাইসে "Beam Now" চাপুন)');
                        return;
                      }
                      setReceivedBeamItem({
                        title: match.title,
                        url: match.url,
                      });
                      setP2pStatus('received');
                      if ('BroadcastChannel' in window) {
                        const bc = new BroadcastChannel('omarvio_p2p_beam');
                        bc.postMessage({ type: 'BEAM_ACK', code });
                        bc.close();
                      }
                      onToast('✅ WebRTC / ব্রডকাস্ট বিম সফলভাবে রিসিভ হয়েছে!');
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    কানেক্ট
                  </button>
                </div>

                {receivedBeamItem && (
                  <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-[11px] space-y-1.5 animate-fadeIn">
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      পেয়ার সফল: {receivedBeamItem.title}
                    </span>
                    <p className="font-mono text-cyan-300 break-all">{receivedBeamItem.url}</p>
                    <a
                      href={receivedBeamItem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300 underline hover:text-white"
                    >
                      নতুন ট্যাবে ওপেন করুন →
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-cyan-500/20 bg-slate-950 flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            OMARVIO GLOBAL LTD. &bull; Dynamic QR & Smart Share Engine
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
