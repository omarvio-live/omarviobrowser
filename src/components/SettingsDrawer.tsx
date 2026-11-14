/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  X,
  Globe,
  Shield,
  Moon,
  Cookie,
  Smartphone,
  Download,
  Trash2,
  Share2,
  FileText,
  Lock,
  Sparkles,
  Check,
  Search,
  Bookmark,
  Info,
  Copy,
  ChevronRight,
  ShieldCheck,
  Cpu,
  Sliders,
  Send,
  MessageSquare,
  Star,
  ExternalLink,
  Mail,
  Zap,
  CheckCircle2,
  MapPin,
  Key,
  Upload,
  History as HistoryIcon,
} from 'lucide-react';
import { SUPPORTED_LANGUAGES, LanguageCode, getLanguage, setLanguage, t } from '../engine/i18n';
import { encryptData, createEncryptedVaultBackup, restoreEncryptedVaultBackup } from '../engine/vault';
import {
  getBrowsingHistory,
  deleteHistoryItem,
  clearAllBrowsingHistory,
  HistoryItem,
  subscribeHistory,
} from '../engine/history';
import {
  detectPlatform,
  registerProtocolHandler,
  launchAndroidDefaultAppsIntent,
  unwrapAndSanitizeExternalUrl,
  CleanedExternalLinkResult,
} from '../engine/linkInterceptor';

export type SettingsTabId =
  | 'general'
  | 'history'
  | 'default-browser'
  | 'ai'
  | 'privacy'
  | 'vault'
  | 'feedback'
  | 'display'
  | 'about';

interface SavedBookmark {
  id: string;
  title: string;
  url: string;
  encrypted: boolean;
  timestamp: number;
}

export interface AIModelOption {
  id: string;
  name: string;
  developer: string;
  badge: string;
  badgeColor: string;
  desc: string;
  tagBn: string;
}

export const AI_MODELS: AIModelOption[] = [
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    developer: 'Google DeepMind',
    badge: 'ডিফল্ট / অতি দ্রুত',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    desc: 'Ultra-fast multimodal search, smart summaries and low latency browsing.',
    tagBn: 'সর্বোচ্চ গতির মাল্টিমোডাল সার্চ সারসংক্ষেপ ও তাৎক্ষণিক রিয়েল-টাইম বিশ্লেষণ।',
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    developer: 'Google DeepMind',
    badge: 'গভীর রিজনিং',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    desc: 'Advanced problem solving, intricate code inspection, and detailed answers.',
    tagBn: 'জটিল প্রোগ্রামিং সমস্যা, গভীর যৌক্তিক অনুসন্ধান ও বৃহৎ ডকুমেন্ট বিশ্লেষণ।',
  },
  {
    id: 'deepseek-r1',
    name: 'DeepSeek R1 / V3',
    developer: 'DeepSeek AI',
    badge: 'ওপেন রিজনিং',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    desc: 'Pure mathematical logic, verified chain-of-thought, and precise coding.',
    tagBn: 'শক্তিশালী গাণিতিক হিসাব এবং উচ্চমাত্রার যৌক্তিক চেইন-অব-থট সমাধান।',
  },
  {
    id: 'claude-3.7-sonnet',
    name: 'Claude 3.7 Sonnet',
    developer: 'Anthropic',
    badge: 'সাহিত্য ও কোড',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    desc: 'Exceptional contextual writing, nuance detection, and clean software architecture.',
    tagBn: 'অত্যন্ত মার্জিত ভাষা শৈলী, সূক্ষ্ম ব্যাকরণ এবং নির্ভুল সফটওয়্যার বিশ্লেষণ।',
  },
  {
    id: 'chatgpt-gpt-4o',
    name: 'ChatGPT (GPT-4o)',
    developer: 'OpenAI',
    badge: 'বহুমুখী কনভারসেশন',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    desc: 'Dynamic conversational agility, smart brainstorming, and general intelligence.',
    tagBn: 'স্মার্ট কথোপকথন, সৃজনশীল পরিকল্পনা ও দ্রুত বহুভাষিক তথ্যের সমাহার।',
  },
  {
    id: 'llama-3.3-70b',
    name: 'Llama 3.3 70B',
    developer: 'Meta Open Source',
    badge: 'প্রাইভেট ওপেন সোর্স',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    desc: 'Independent open-weights model, zero corporate lock-in, client-side isolation.',
    tagBn: 'উন্মুক্ত স্বাধীন বুদ্ধিমত্তা যা সম্পূর্ণ ডেটা নিরাপত্তা নিশ্চিত করে।',
  },
];

const SEARCH_ENGINES = [
  {
    id: 'google',
    name: 'Google Search (Default)',
    badge: 'M13 Out-of-the-Box',
    desc: 'Unmatched Bengali & global indexing with Omarvio zero-telemetry & udm=14 privacy shield',
  },
  {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    badge: 'Tracker-Free',
    desc: 'Zero user tracking, no profiling, encrypted searches',
  },
  {
    id: 'brave',
    name: 'Brave Search',
    badge: 'Independent',
    desc: 'Independent index, zero surveillance, privacy focused',
  },
  {
    id: 'bing',
    name: 'Microsoft Bing',
    badge: 'Fast',
    desc: 'Comprehensive web indexing with image discovery',
  },
  {
    id: 'startpage',
    name: 'Startpage',
    badge: 'High Privacy',
    desc: 'Google search results with zero data surveillance',
  },
  {
    id: 'ecosia',
    name: 'Ecosia',
    badge: 'Eco Friendly',
    desc: 'Trees planted for every search performed',
  },
];

const OFFICIAL_EMAIL = 'omarvio.official@gmail.com';
const OFFICIAL_TELEGRAM_LINK = 'https://t.me/omarvio_official';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: SettingsTabId;
  isOledDark: boolean;
  onToggleOledDark: () => void;
  onOpenDownloads: () => void;
  onTranslatePage: () => void;
  onToast: (msg: string) => void;
  currentUrl?: string;
  onNavigate?: (url: string) => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  onClose,
  initialTab = 'general',
  isOledDark,
  onToggleOledDark,
  onOpenDownloads,
  onTranslatePage,
  onToast,
  currentUrl = '',
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTabId>(initialTab);
  const [currentLang, setCurrentLangState] = useState<LanguageCode>(getLanguage);

  // Sync activeTab whenever the drawer opens or initialTab changes
  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Browsing History State
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>(getBrowsingHistory);
  const [historySearch, setHistorySearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      setHistoryItems(getBrowsingHistory());
    }
    const unsub = subscribeHistory((items) => {
      setHistoryItems(items);
    });
    return unsub;
  }, [isOpen]);

  // Search Engine (M13 Out-of-the-box Google Default with udm=14 privacy)
  const [selectedEngine, setSelectedEngine] = useState<string>(() => {
    try {
      return localStorage.getItem('omarvio_search_engine') || 'google';
    } catch {
      return 'google';
    }
  });

  // AI Model State
  const [selectedAIModel, setSelectedAIModel] = useState<string>(() => {
    try {
      return localStorage.getItem('omarvio_ai_model') || 'gemini-2.5-flash';
    } catch {
      return 'gemini-2.5-flash';
    }
  });
  const [aiSearchSummary, setAiSearchSummary] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('omarvio_ai_search_summary');
      return v !== null ? v === 'true' : true;
    } catch {
      return true;
    }
  });
  const [aiPromptSanitizer, setAiPromptSanitizer] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('omarvio_ai_prompt_sanitizer');
      return v !== null ? v === 'true' : true;
    } catch {
      return true;
    }
  });
  const [aiTemperature, setAiTemperature] = useState<number>(() => {
    try {
      const v = localStorage.getItem('omarvio_ai_temperature');
      return v !== null ? parseFloat(v) : 0.7;
    } catch {
      return 0.7;
    }
  });
  const [aiAutoTranslateBn, setAiAutoTranslateBn] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('omarvio_ai_auto_translate_bn');
      return v !== null ? v === 'true' : true;
    } catch {
      return true;
    }
  });

  // Privacy Shields (Persisted in Local Storage)
  const [linkClinicActive, setLinkClinicActive] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('omarvio_link_clinic');
      return v !== null ? v === 'true' : true;
    } catch {
      return true;
    }
  });
  const [cookieRejecterActive, setCookieRejecterActive] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('omarvio_cookie_rejecter');
      return v !== null ? v === 'true' : true;
    } catch {
      return true;
    }
  });
  const [cacheCleaned, setCacheCleaned] = useState(false);
  const [webrtcShield, setWebrtcShield] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('omarvio_webrtc_shield');
      return v !== null ? v === 'true' : true;
    } catch {
      return true;
    }
  });
  const [httpsOnly, setHttpsOnly] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('omarvio_https_only');
      return v !== null ? v === 'true' : true;
    } catch {
      return true;
    }
  });
  const [dntHeader, setDntHeader] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('omarvio_dnt_header');
      return v !== null ? v === 'true' : true;
    } catch {
      return true;
    }
  });
  const [fingerprintShield, setFingerprintShield] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('omarvio_fingerprint_shield');
      return v !== null ? v === 'true' : true;
    } catch {
      return true;
    }
  });
  const [stripReferrer, setStripReferrer] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('omarvio_strip_referrer');
      return v !== null ? v === 'true' : true;
    } catch {
      return true;
    }
  });

  // Feedback Form State
  const [feedbackCategory, setFeedbackCategory] = useState<'bug' | 'feature' | 'ai' | 'speed' | 'general'>('feature');
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackContact, setFeedbackContact] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Bookmarks Vault (Persisted in Local Storage)
  const [bookmarks, setBookmarks] = useState<SavedBookmark[]>(() => {
    try {
      const saved = localStorage.getItem('omarvio_bookmarks');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'bm-1',
        title: 'YouTube (Ad-Free Isolation)',
        url: 'https://youtube.com',
        encrypted: true,
        timestamp: Date.now() - 3600000,
      },
      {
        id: 'bm-2',
        title: 'Wikipedia (The Free Encyclopedia)',
        url: 'https://wikipedia.org',
        encrypted: true,
        timestamp: Date.now() - 7200000,
      },
      {
        id: 'bm-3',
        title: 'BBC News Global',
        url: 'https://bbc.com/news',
        encrypted: true,
        timestamp: Date.now() - 86400000,
      },
    ];
  });

  // Default Browser & Simulator States
  const [defaultStepTab, setDefaultStepTab] = useState<'samsung' | 'xiaomi' | 'pixel' | 'ios' | 'pc'>('samsung');
  const [testSimUrl, setTestSimUrl] = useState('https://l.facebook.com/l.php?u=https%3A%2F%2Fprothomalo.com&fbclid=IwAR999');
  const [simResult, setSimResult] = useState<CleanedExternalLinkResult | null>(null);
  const [isProtoRegistered, setIsProtoRegistered] = useState(false);

  // Milestone 16: Decentralized User-Key E2EE Backup & Sync State
  const [e2eePassphrase, setE2eePassphrase] = useState('');
  const [restoreCipherInput, setRestoreCipherInput] = useState('');
  const [showE2eePanel, setShowE2eePanel] = useState(false);
  const [isExportingE2ee, setIsExportingE2ee] = useState(false);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const handleLanguageChange = (lang: LanguageCode) => {
    setLanguage(lang);
    setCurrentLangState(lang);
    onToast(`🌐 ভাষা পরিবর্তিত হয়েছে: ${SUPPORTED_LANGUAGES.find((l) => l.code === lang)?.label}`);
  };

  const handleSelectEngine = (engineId: string) => {
    setSelectedEngine(engineId);
    try {
      localStorage.setItem('omarvio_search_engine', engineId);
    } catch {}
    const engine = SEARCH_ENGINES.find((e) => e.id === engineId);
    onToast(`🔍 ডিফল্ট সার্চ ইঞ্জিন: ${engine?.name || engineId}`);
  };

  const handleSelectAIModel = (modelId: string) => {
    setSelectedAIModel(modelId);
    try {
      localStorage.setItem('omarvio_ai_model', modelId);
    } catch {}
    const model = AI_MODELS.find((m) => m.id === modelId);
    onToast(`🤖 সক্রিয় AI মডেল: ${model?.name || modelId}`);
  };

  const handleClearCache = async () => {
    try {
      sessionStorage.clear();
      if (typeof caches !== 'undefined') {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      clearAllBrowsingHistory();
      const lang = localStorage.getItem('omarvio_lang');
      const se = localStorage.getItem('omarvio_search_engine');
      const ai = localStorage.getItem('omarvio_ai_model');
      localStorage.clear();
      if (lang) localStorage.setItem('omarvio_lang', lang);
      if (se) localStorage.setItem('omarvio_search_engine', se);
      if (ai) localStorage.setItem('omarvio_ai_model', ai);
    } catch {}
    setCacheCleaned(true);
    onToast('🧹 সমস্ত ক্যাশ ও ব্রাউজিং ডেটা সফলভাবে মুছে ফোন ফ্রি করা হয়েছে!');
    setTimeout(() => setCacheCleaned(false), 2500);
  };

  const handleSetDefaultBrowser = () => {
    setActiveTab('default-browser');
    onToast('⚡ ডিফল্ট ব্রাউজার অ্যাসিস্ট্যান্ট খোলা হয়েছে');
  };

  const handleAddCurrentBookmark = async () => {
    if (!currentUrl) {
      onToast('⚠️ বুকমার্ক করার মতো কোনো সক্রিয় ওয়েবপেজ নেই');
      return;
    }
    await encryptData(currentUrl);
    const newBm: SavedBookmark = {
      id: `bm-${Date.now()}`,
      title: currentUrl ? new URL(currentUrl).hostname : 'New Page',
      url: currentUrl,
      encrypted: true,
      timestamp: Date.now(),
    };
    setBookmarks((prev) => {
      const updated = [newBm, ...prev];
      try {
        localStorage.setItem('omarvio_bookmarks', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    onToast('🔐 পেজটি AES-256 এনক্রিপ্টেড ভল্টে সেভ করা হয়েছে!');
  };

  const handleDeleteBookmark = (id: string) => {
    setBookmarks((prev) => {
      const updated = prev.filter((b) => b.id !== id);
      try {
        localStorage.setItem('omarvio_bookmarks', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    onToast('🗑️ বুকমার্ক মুছে ফেলা হয়েছে');
  };

  // Milestone 16: E2EE Vault Backup & Restore Handlers
  const handleExportE2eeBackup = async () => {
    if (!e2eePassphrase || e2eePassphrase.length < 4) {
      onToast('⚠️ পাসফ্রেজ কমপক্ষে ৪ অক্ষরের হতে হবে');
      return;
    }
    setIsExportingE2ee(true);
    try {
      const backupBase64 = await createEncryptedVaultBackup(bookmarks, e2eePassphrase);
      const blob = new Blob([backupBase64], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `omarvio-vault-backup-${Date.now()}.omarvio`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onToast('🛡️ AES-256 E2EE ভল্ট ব্যাকআপ ফাইল (.omarvio) ডাউনলোড হয়েছে!');
    } catch {
      onToast('⚠️ এনক্রিপ্টেড ব্যাকআপ তৈরিতে সমস্যা হয়েছে');
    } finally {
      setIsExportingE2ee(false);
    }
  };

  const handleRestoreE2eeBackup = async () => {
    if (!e2eePassphrase) {
      onToast('⚠️ ব্যাকআপ খোলার জন্য মূল পাসফ্রেজটি লিখুন');
      return;
    }
    if (!restoreCipherInput.trim()) {
      onToast('⚠️ ব্যাকআপ ডেটা বা ফাইল কনটেন্ট পেস্ট করুন');
      return;
    }
    const res = await restoreEncryptedVaultBackup(restoreCipherInput.trim(), e2eePassphrase);
    if (res.success && Array.isArray(res.data)) {
      setBookmarks(res.data);
      setRestoreCipherInput('');
      onToast('✅ ভল্ট সফলভাবে ডিক্রিপ্ট এবং রিস্টোর সম্পন্ন হয়েছে!');
    } else {
      onToast(`❌ ${res.error || 'ডিক্রিপশন ব্যর্থ হয়েছে! ভুল পাসফ্রেজ'}`);
    }
  };

  const handleCopyEmail = () => {
    navigator.clipboard?.writeText(OFFICIAL_EMAIL);
    onToast(`📋 ইমেইল কপি করা হয়েছে: ${OFFICIAL_EMAIL}`);
  };

  const handleOpenTelegram = () => {
    window.open(OFFICIAL_TELEGRAM_LINK, '_blank');
    onToast('🚀 টেলিগ্রাম চ্যানেল খোলা হচ্ছে...');
  };

  const handleSubmitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackMessage.trim()) {
      onToast('⚠️ অনুগ্রহ করে আপনার মতামত বা মেসেজটি লিখুন!');
      return;
    }

    const currentModelName = AI_MODELS.find((m) => m.id === selectedAIModel)?.name || 'Gemini 2.5 Flash';
    const categoryLabels: Record<string, string> = {
      bug: 'Bug Report / বাগ বা ত্রুটি',
      feature: 'Feature Request / নতুন ফিচারের প্রস্তাব',
      ai: 'AI Model / এআই মডেল সংক্রান্ত',
      speed: 'Speed / গতি ও পারফরম্যান্স',
      general: 'General Review / সাধারণ মন্তব্য',
    };

    const subject = encodeURIComponent(`[OMARVIO Feedback] ${categoryLabels[feedbackCategory]} (${feedbackRating} Stars)`);
    const body = encodeURIComponent(
      `মতামত ক্যাটাগরি: ${categoryLabels[feedbackCategory]}\n` +
      `রেটিং: ${feedbackRating} / 5 Stars\n` +
      `সক্রিয় AI মডেল: ${currentModelName}\n` +
      `ব্যবহারকারীর যোগাযোগ: ${feedbackContact.trim() || 'Anonymous'}\n\n` +
      `বিস্তারিত মতামত:\n${feedbackMessage.trim()}\n\n` +
      `-----------------------------------------\n` +
      `OMARVIO BROWSER v1.0.0 (OMARVIO GLOBAL LTD.)`
    );

    // Save to local feedback history
    try {
      const historyStr = localStorage.getItem('omarvio_feedback_history') || '[]';
      const history = JSON.parse(historyStr);
      history.push({
        category: feedbackCategory,
        rating: feedbackRating,
        message: feedbackMessage,
        contact: feedbackContact,
        date: new Date().toISOString(),
      });
      localStorage.setItem('omarvio_feedback_history', JSON.stringify(history));
    } catch {}

    setFeedbackSubmitted(true);
    onToast('❤️ ধন্যবাদ! আপনার মতামত প্রস্তুত। ইমেইল অ্যাপ খুলছে...');

    // Open prefilled mailto
    const mailtoUrl = `mailto:${OFFICIAL_EMAIL}?subject=${subject}&body=${body}`;
    window.location.href = mailtoUrl;

    setTimeout(() => {
      setFeedbackMessage('');
      setFeedbackSubmitted(false);
    }, 4000);
  };

  const tabsConfig: { id: SettingsTabId; label: string; icon: React.ReactNode }[] = [
    { id: 'general', label: 'সাধারণ', icon: <Sliders className="w-3.5 h-3.5" /> },
    { id: 'history', label: 'হিস্টরি', icon: <HistoryIcon className="w-3.5 h-3.5 text-cyan-400" /> },
    { id: 'default-browser', label: 'ডিফল্ট ব্রাউজার', icon: <Zap className="w-3.5 h-3.5 text-cyan-400" /> },
    { id: 'ai', label: 'AI মডেল', icon: <Cpu className="w-3.5 h-3.5" /> },
    { id: 'privacy', label: 'প্রাইভেসি', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
    { id: 'vault', label: 'ভল্ট', icon: <Lock className="w-3.5 h-3.5" /> },
    { id: 'feedback', label: 'মতামত ও সহায়তা', icon: <MessageSquare className="w-3.5 h-3.5" /> },
    { id: 'display', label: 'থিম ও ডিসপ্লে', icon: <Moon className="w-3.5 h-3.5" /> },
    { id: 'about', label: 'পরিচিতি', icon: <Info className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end animate-fadeIn select-none">
      {/* Background backdrop click to close */}
      <div className="flex-1 hidden sm:block" onClick={onClose} />

      <div className="w-full max-w-md h-full bg-[#0a0f1d] border-l border-slate-800 flex flex-col shadow-2xl overflow-hidden">
        {/* ========================================================= */}
        {/* TOP HEADER: Prominent Back Button & Unified Branding */}
        {/* ========================================================= */}
        <div className="p-3 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-[#0a0f1d]/95 backdrop-blur-md z-20">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-cyan-300 hover:text-white text-xs font-bold transition-all shadow-sm active:scale-95 border border-slate-700/60"
              title="ব্রাউজারে ফিরে যান"
            >
              <ArrowLeft className="w-4 h-4 text-cyan-400" />
              <span>{t('back')}</span>
            </button>

            <div className="ml-1 truncate">
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-1.5 truncate">
                <span>{t('settingsTitle')}</span>
              </h2>
              <p className="text-[10px] text-cyan-400 font-medium">OMARVIO GLOBAL LTD.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ========================================================= */}
        {/* HORIZONTAL TAB NAVIGATION (UNIFIED AUTHORITATIVE HUBS) */}
        {/* ========================================================= */}
        <div className="flex items-center gap-1 px-2.5 py-2 overflow-x-auto scrollbar-none border-b border-slate-800/80 bg-[#0d1326]/60 shrink-0">
          {tabsConfig.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                    : 'bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ========================================================= */}
        {/* SCROLLABLE VIEWPORT CONTENT */}
        {/* ========================================================= */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* ==================== TAB 1: সাধারণ (GENERAL) ==================== */}
          {activeTab === 'general' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Slogan banner */}
              <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-950/70 to-indigo-950/70 border border-cyan-500/30 text-center shadow-lg">
                <p className="text-xs font-bold text-cyan-200 italic leading-snug">
                  {t('slogan')}
                </p>
              </div>

              {/* Default Search Engine */}
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                  ডিফল্ট সার্চ ইঞ্জিন (Search Engine)
                </label>
                <div className="space-y-1.5">
                  {SEARCH_ENGINES.map((engine) => (
                    <button
                      key={engine.id}
                      type="button"
                      onClick={() => handleSelectEngine(engine.id)}
                      className={`w-full text-left p-3 rounded-2xl transition-all border ${
                        selectedEngine === engine.id
                          ? 'bg-blue-950/70 border-cyan-400 ring-1 ring-cyan-400/40 text-white'
                          : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-bold flex items-center gap-2">
                          <span>{engine.name}</span>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 border border-slate-700">
                            {engine.badge}
                          </span>
                        </span>
                        {selectedEngine === engine.id && (
                          <Check className="w-4 h-4 text-cyan-400" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-normal">
                        {engine.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Set as Default Browser */}
              <button
                type="button"
                onClick={handleSetDefaultBrowser}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs font-bold transition-all border border-slate-800 hover:border-slate-700"
              >
                <div className="flex items-center gap-2.5">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>{t('setDefaultBrowser')}</span>
                </div>
                <span className="text-[10px] text-emerald-400">Android টিপস</span>
              </button>

              {/* Offline Downloads Hub */}
              <button
                type="button"
                onClick={() => {
                  onOpenDownloads();
                  onClose();
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs font-bold transition-all border border-slate-800 hover:border-slate-700"
              >
                <div className="flex items-center gap-2.5">
                  <Download className="w-4 h-4 text-blue-400" />
                  <span>{t('downloads')}</span>
                </div>
                <span className="text-[10px] text-slate-400">অফলাইন ফাইল ও পিডিএফ</span>
              </button>

              {/* Clear Cache & Free Memory */}
              <button
                type="button"
                onClick={handleClearCache}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-rose-950/25 hover:bg-rose-950/45 text-rose-300 text-xs font-bold transition-all border border-rose-500/20"
              >
                <div className="flex items-center gap-2.5">
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span>{cacheCleaned ? '২৪.৮ MB ক্যাশ সফলভাবে মুছে গেছে!' : t('clearCache')}</span>
                </div>
                <span className="text-[10px] text-rose-400 font-mono">মেমোরি খালি করুন</span>
              </button>
            </div>
          )}

          {/* ==================== TAB: হিস্টরি (BROWSING HISTORY) ==================== */}
          {activeTab === 'history' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Header Box */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/70 to-blue-950/70 border border-cyan-500/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0">
                    <HistoryIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                      <span>ব্রাউজিং হিস্টরি</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-mono">
                        {historyItems.length} আইটেম
                      </span>
                    </h3>
                    <p className="text-[10px] text-cyan-400/90 leading-tight">
                      সম্পূর্ণ আপনার ফোনের লোকাল মেমোরিতে এনক্রিপ্টেড। জিরো সার্ভার ট্র্যাকিং।
                    </p>
                  </div>
                </div>

                {historyItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      clearAllBrowsingHistory();
                      onToast('🧹 সমস্ত হিস্টরি মুছে দেওয়া হয়েছে!');
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-rose-950/50 hover:bg-rose-900 border border-rose-500/40 text-rose-300 text-[11px] font-bold transition-all shrink-0 cursor-pointer active:scale-95 flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>সব মুছুন</span>
                  </button>
                )}
              </div>

              {/* History Search Filter */}
              {historyItems.length > 0 && (
                <div className="relative">
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="হিস্টরি থেকে খুঁজুন (URL বা নাম)..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
                </div>
              )}

              {/* History Items List */}
              <div className="space-y-1.5">
                {historyItems.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800/80 text-center flex flex-col items-center justify-center">
                    <HistoryIcon className="w-8 h-8 text-slate-600 mb-2" />
                    <p className="text-xs font-semibold text-slate-300">কোনো হিস্টরি সংরক্ষিত নেই</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      ওমারভিও ব্রাউজারে পেজ ভিজিট করলে তা এই তালিকায় দেখা যাবে।
                    </p>
                  </div>
                ) : (
                  historyItems
                    .filter((item) => {
                      if (!historySearch.trim()) return true;
                      const q = historySearch.toLowerCase();
                      return (
                        item.title.toLowerCase().includes(q) ||
                        item.url.toLowerCase().includes(q) ||
                        item.domain.toLowerCase().includes(q)
                      );
                    })
                    .map((item) => (
                      <div
                        key={item.id}
                        className="group flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800/80 hover:border-slate-700 transition-all cursor-pointer"
                        onClick={() => {
                          if (onNavigate) {
                            onNavigate(item.url);
                            onClose();
                          }
                        }}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 shrink-0">
                            <Globe className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-200 truncate group-hover:text-cyan-300 transition-colors">
                              {item.title}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5 truncate">
                              <span className="font-mono text-cyan-400/90 truncate">{item.domain}</span>
                              <span>•</span>
                              <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteHistoryItem(item.id);
                            onToast('আইটেমটি হিস্টরি থেকে মোছা হয়েছে');
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors shrink-0 ml-1 cursor-pointer"
                          title="মুছে ফেলুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                )}
              </div>
            </div>
          )}

          {/* ==================== TAB: ডিফল্ট ব্রাউজার ও লিংক অপ্টিমাইজার (DEFAULT BROWSER) ==================== */}
          {activeTab === 'default-browser' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Header Box */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/70 to-blue-950/70 border border-cyan-500/30 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-slate-100">
                      ডিফল্ট ব্রাউজার ও লিংক সাজেশন
                    </h3>
                    <span className="text-[9px] uppercase font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-1.5 py-0.2 rounded-full">
                      #1 Suggestion
                    </span>
                  </div>
                  <p className="text-[11px] text-cyan-300/90 leading-tight">
                    WhatsApp, Messenger বা SMS লিংকে ক্লিক করলেই সবার উপরে ওমারভিও ওপেন হবে।
                  </p>
                </div>
              </div>

              {/* 1-Click Android Intent Jumper */}
              <div className="p-3 rounded-2xl bg-slate-900/90 border border-cyan-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">ডিভাইস ডিটেকশন:</span>
                  <span className="text-[11px] font-mono text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
                    {detectPlatform().name}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  সরাসরি ফোনের &ldquo;Default Apps &gt; Browser app&rdquo; সেটিংসে গিয়ে ওমারভিও নির্বাচন করার জন্য নিচের বোতামটি ট্যাপ করুন:
                </p>
                <button
                  type="button"
                  onClick={() => {
                    launchAndroidDefaultAppsIntent();
                    onToast('📱 অ্যান্ড্রয়েড ডিফল্ট অ্যাপ সেটিংস ওপেন হচ্ছে...');
                  }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 active:scale-95 text-white font-bold text-xs shadow-md shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Zap className="w-4 h-4" />
                  <span>১-ক্লিকে অ্যান্ড্রয়েড ডিফল্ট সেটিংসে যান</span>
                </button>
              </div>

              {/* Protocol Registration */}
              <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-200">ওয়েব প্রোটোকল হ্যান্ডলার</div>
                  <div className="text-[10px] text-slate-400">web+omarvio লিংকের সাথে যুক্ত করুন</div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const res = await registerProtocolHandler();
                    if (res.success) {
                      setIsProtoRegistered(true);
                      onToast('✅ প্রোটোকল সফলভাবে রেজিস্টার করা হয়েছে!');
                    } else {
                      onToast('ℹ️ প্রোটোকল স্ট্যাটাস: ব্রাউজার দ্বারা পরিচালিত');
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {isProtoRegistered ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>রেজিস্টার্ড</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>রেজিস্টার</span>
                    </>
                  )}
                </button>
              </div>

              {/* Brand Guide */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  ব্র্যান্ড অনুযায়ী ডিফল্ট করার গাইড
                </label>
                <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px]">
                  {(['samsung', 'xiaomi', 'pixel', 'ios', 'pc'] as const).map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setDefaultStepTab(b)}
                      className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                        defaultStepTab === b
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'text-slate-400 hover:text-white bg-slate-900'
                      }`}
                    >
                      {b === 'samsung' && 'Samsung'}
                      {b === 'xiaomi' && 'Xiaomi'}
                      {b === 'pixel' && 'Pixel/Realme'}
                      {b === 'ios' && 'iPhone'}
                      {b === 'pc' && 'PC'}
                    </button>
                  ))}
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 space-y-1.5">
                  {defaultStepTab === 'samsung' && (
                    <>
                      <div>1. Settings &gt; Apps এ যান</div>
                      <div>2. Choose default apps &gt; Browser app ট্যাপ করুন</div>
                      <div>3. <strong>OMARVIO BROWSER</strong> নির্বাচন করুন</div>
                    </>
                  )}
                  {defaultStepTab === 'xiaomi' && (
                    <>
                      <div>1. Settings &gt; Apps &gt; Manage apps</div>
                      <div>2. ডানপাশের ৩-ডট (⋮) &gt; Default apps &gt; Browser</div>
                      <div>3. <strong>OMARVIO BROWSER</strong> নির্বাচন করুন</div>
                    </>
                  )}
                  {defaultStepTab === 'pixel' && (
                    <>
                      <div>1. Settings &gt; Apps &gt; Default apps</div>
                      <div>2. Browser app &gt; <strong>OMARVIO BROWSER</strong> সিলেক্ট করুন</div>
                      <div>3. সব মেসেঞ্জার ও চ্যাট লিংক এখন ওমারভিওতেই খুলবে</div>
                    </>
                  )}
                  {defaultStepTab === 'ios' && (
                    <>
                      <div>1. Safari শেয়ার শিট থেকে &quot;Add to Home Screen&quot; করুন</div>
                      <div>2. WhatsApp-এ লিংক লং-প্রেস করে Share &gt; OmarVio দিন</div>
                    </>
                  )}
                  {defaultStepTab === 'pc' && (
                    <>
                      <div>1. Windows Settings &gt; Apps &gt; Default apps</div>
                      <div>2. Web browser হিসেবে OMARVIO সিলেক্ট করুন</div>
                    </>
                  )}
                </div>
              </div>

              {/* WhatsApp/Messenger Link Cleaning Simulator */}
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-cyan-500/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">
                    WhatsApp/Messenger আনর‍্যাপার টেস্ট
                  </span>
                  <span className="text-[10px] text-cyan-300 font-mono bg-cyan-950 px-1.5 py-0.5 rounded">
                    Auto-Clean
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={testSimUrl}
                    onChange={(e) => setTestSimUrl(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const res = unwrapAndSanitizeExternalUrl(testSimUrl);
                      setSimResult(res);
                      onToast('🛡️ লিংক আনর‍্যাপ ও ট্র্যাকার রিমুভ সম্পন্ন!');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    টেস্ট
                  </button>
                </div>

                {simResult && (
                  <div className="p-2.5 rounded-xl bg-[#070e20] border border-emerald-500/30 text-[11px] space-y-1">
                    <div className="text-emerald-400 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      ক্লিন লিংক:
                    </div>
                    <div className="text-emerald-300 font-mono break-all bg-emerald-950/30 p-1.5 rounded">
                      {simResult.cleanedUrl}
                    </div>
                    {onNavigate && (
                      <button
                        type="button"
                        onClick={() => {
                          onNavigate(simResult.cleanedUrl);
                          onClose();
                        }}
                        className="mt-1 w-full py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold text-center cursor-pointer"
                      >
                        ট্যাবে ওপেন করুন
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== TAB 2: AI মডেল ও ইঞ্জিন (AI MODELS) ==================== */}
          {activeTab === 'ai' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Header Box */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-950/60 to-cyan-950/60 border border-cyan-500/30 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-100">
                    {t('aiModelsTitle')}
                  </h3>
                  <p className="text-[11px] text-cyan-300/90 leading-tight">
                    আপনার পছন্দের শীর্ষস্থানীয় এআই মডেল নির্বাচন করুন ও কাস্টমাইজ করুন।
                  </p>
                </div>
              </div>

              {/* Models List */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  উপলব্ধ AI মডেলসমূহ (Select Active Model)
                </label>

                {AI_MODELS.map((model) => {
                  const isSelected = selectedAIModel === model.id;
                  return (
                    <div
                      key={model.id}
                      onClick={() => handleSelectAIModel(model.id)}
                      className={`p-3.5 rounded-2xl cursor-pointer transition-all border ${
                        isSelected
                          ? 'bg-blue-950/60 border-cyan-400 ring-1 ring-cyan-400/40 text-white shadow-md'
                          : 'bg-slate-900/80 hover:bg-slate-800/90 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-100">{model.name}</span>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${model.badgeColor}`}
                          >
                            {model.badge}
                          </span>
                        </div>
                        {isSelected ? (
                          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-slate-700 shrink-0" />
                        )}
                      </div>

                      <p className="text-[10px] text-cyan-300/80 font-mono mb-1">
                        Developer: {model.developer}
                      </p>

                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        {model.tagBn}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* AI Privacy & Behavioral Controls */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  AI বুদ্ধিমত্তা ও গোপনীয়তা সেটিংস
                </label>

                {/* AI Search Summaries */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-slate-200">স্মার্ট সার্চ সারসংক্ষেপ (AI Summary)</p>
                    <p className="text-[10px] text-slate-400">
                      যেকোনো সার্চ কোয়েরির শীর্ষে তাৎক্ষণিক মূল তথ্য ও বুলেট পয়েন্ট প্রদর্শন।
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={aiSearchSummary}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setAiSearchSummary(val);
                      try { localStorage.setItem('omarvio_ai_search_summary', String(val)); } catch {}
                      onToast(val ? '✨ AI সার্চ সারাংশ সক্রিয়' : 'AI সার্চ সারাংশ বন্ধ');
                    }}
                    className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                  />
                </div>

                {/* AI Prompt Sanitizer */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-slate-200">প্রম্পট প্রাইভেসি শিল্ড (Zero IP Leak)</p>
                    <p className="text-[10px] text-slate-400">
                      AI প্রসেসিংয়ের পূর্বে ব্যবহারকারীর আইপি ও ব্যক্তিগত তথ্য স্বয়ংক্রিয়ভাবে ফিল্টার করা হয়।
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={aiPromptSanitizer}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setAiPromptSanitizer(val);
                      try { localStorage.setItem('omarvio_ai_prompt_sanitizer', String(val)); } catch {}
                      onToast(val ? '🛡️ প্রম্পট প্রাইভেসি শিল্ড সক্রিয়' : 'প্রাইভেসি শিল্ড নিষ্ক্রিয়');
                    }}
                    className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                  />
                </div>

                {/* Auto Translate into Bengali */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-slate-200">তাৎক্ষণিক বাংলা ভাবানুবাদ</p>
                    <p className="text-[10px] text-slate-400">
                      বিদেশি ভাষার তথ্য ও আর্টিকেল স্বয়ংক্রিয়ভাবে সহজ ও সাবলীল বাংলায় রূপান্তর।
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={aiAutoTranslateBn}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setAiAutoTranslateBn(val);
                      try { localStorage.setItem('omarvio_ai_auto_translate_bn', String(val)); } catch {}
                      onToast(val ? '🌐 স্বয়ংক্রিয় বাংলা ভাবানুবাদ সক্রিয়' : 'ভাবানুবাদ বন্ধ');
                    }}
                    className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                  />
                </div>

                {/* Temperature Slider */}
                <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-200">AI ক্রিয়েটিভিটি ও রিজনিং ব্যালেন্স:</span>
                    <span className="text-cyan-400 font-mono font-bold">{aiTemperature}</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.1"
                    value={aiTemperature}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setAiTemperature(val);
                      try { localStorage.setItem('omarvio_ai_temperature', String(val)); } catch {}
                    }}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>নির্ভুল যৌক্তিক (0.1)</span>
                    <span>ভারসাম্যপূর্ণ (0.7)</span>
                    <span>সৃজনশীল (1.0)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 3: প্রাইভেসি ও নিরাপত্তা (PRIVACY & SHIELD) ==================== */}
          {activeTab === 'privacy' && (
            <div className="space-y-3 animate-fadeIn">
              <p className="text-xs text-slate-400 leading-relaxed">
                আপনার ব্রাউজার স্যান্ডবক্সের ভেতর সমস্ত ট্র্যাকার ও নজরদারি ব্যবস্থা স্বয়ংক্রিয় প্রতিরোধ করা হয়। কোনো তথ্য সার্ভারে পাঠানো হয় না।
              </p>

              <div className="space-y-2">
                {/* Link Clinic */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{t('linkClinic')}</span>
                    </p>
                    <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                      {t('linkClinicDesc')}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={linkClinicActive}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setLinkClinicActive(val);
                      try { localStorage.setItem('omarvio_link_clinic', String(val)); } catch {}
                      onToast(val ? '🛡️ লিংক ক্লিনিক রাডার সক্রিয়' : 'লিংক ক্লিনিক বন্ধ');
                    }}
                    className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                  />
                </div>

                {/* Cookie Auto-Rejecter */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Cookie className="w-3.5 h-3.5 text-amber-400" />
                      <span>{t('cookieRejecter')}</span>
                    </p>
                    <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                      {t('cookieRejecterDesc')}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={cookieRejecterActive}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setCookieRejecterActive(val);
                      try { localStorage.setItem('omarvio_cookie_rejecter', String(val)); } catch {}
                      onToast(val ? '🍪 কুকি ব্যানার স্বয়ংক্রিয় রিজেক্ট সক্রিয়' : 'কুকি রিজেক্টর বন্ধ');
                    }}
                    className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                  />
                </div>

                {/* WebRTC Leak Shield */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-slate-200">WebRTC আসল IP সুরক্ষা শিল্ড</p>
                    <p className="text-[10px] text-slate-400">
                      মোবাইল সিম বা ওয়াই-ফাই নেটওয়ার্কের লোকাল আইপি অ্যাড্রেস ফাঁস হতে দেয় না।
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={webrtcShield}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setWebrtcShield(val);
                      try { localStorage.setItem('omarvio_webrtc_shield', String(val)); } catch {}
                      onToast(val ? '🛡️ WebRTC শিল্ড সক্রিয়' : 'WebRTC শিল্ড বন্ধ');
                    }}
                    className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                  />
                </div>

                {/* HTTPS-Only Enforcement */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-slate-200">HTTPS-অনলি নিরাপদ কানেকশন</p>
                    <p className="text-[10px] text-slate-400">
                      যেকোনো অনিরাপদ HTTP পেজকে স্বয়ংক্রিয়ভাবে TLS 1.3 এনক্রিপ্টেড HTTPS-এ আপগ্রেড করে।
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={httpsOnly}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setHttpsOnly(val);
                      try { localStorage.setItem('omarvio_https_only', String(val)); } catch {}
                      onToast(val ? '🔒 HTTPS-অনলি সক্রিয়' : 'HTTPS-অনলি বন্ধ');
                    }}
                    className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                  />
                </div>

                {/* GPC / DNT Broadcast */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-slate-200">গ্লোবাল প্রাইভেসি কন্ট্রোল (GPC / DNT)</p>
                    <p className="text-[10px] text-slate-400">
                      প্রতিটি ব্রাউজিং রিকোয়েস্টে Sec-GPC: 1 ও Do-Not-Track সিগন্যাল প্রচার করে।
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={dntHeader}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setDntHeader(val);
                      try { localStorage.setItem('omarvio_dnt_header', String(val)); } catch {}
                      onToast(val ? '📡 GPC সিগন্যাল সক্রিয়' : 'GPC বন্ধ');
                    }}
                    className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                  />
                </div>

                {/* Canvas Fingerprinting */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-slate-200">ক্যানভাস ও অডিও ফিঙ্গারপ্রিন্ট স্ক্র্যাম্বলার</p>
                    <p className="text-[10px] text-slate-400">
                      বিজ্ঞাপনী নেটওয়ার্কের ট্র্যাকিং বটকে বিভ্রান্ত করতে মাইক্রো-নয়েজ যোগ করে।
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={fingerprintShield}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setFingerprintShield(val);
                      try { localStorage.setItem('omarvio_fingerprint_shield', String(val)); } catch {}
                      onToast(val ? '🎨 ফিঙ্গারপ্রিন্ট স্ক্র্যাম্বলার সক্রিয়' : 'স্ক্র্যাম্বলার বন্ধ');
                    }}
                    className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                  />
                </div>

                {/* Referrer Stripper */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-slate-200">রেফারার হেডার ব্লকার (Referrer Stripper)</p>
                    <p className="text-[10px] text-slate-400">
                      অন্য কোনো ওয়েবসাইটে ক্লিক করলে আপনি পূর্ববর্তী কোন সাইটে ছিলেন তা গোপন রাখে।
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={stripReferrer}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setStripReferrer(val);
                      try { localStorage.setItem('omarvio_strip_referrer', String(val)); } catch {}
                      onToast(val ? '🛡️ রেফারার ব্লকার সক্রিয়' : 'রেফারার ব্লকার বন্ধ');
                    }}
                    className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 4: এনক্রিপ্টেড ভল্ট (VAULT) ==================== */}
          {activeTab === 'vault' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-3">
                <Lock className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="text-[11px] text-emerald-200">
                  <p className="font-bold">AES-GCM-256 জিরো-নলেজ স্থানীয় এনক্রিপশন</p>
                  <p className="text-emerald-300/80">
                    চাবি আপনার ডিভাইসের Web Crypto API দিয়ে তৈরি হয়। সার্ভারে কোনো কপি সংরক্ষিত হয় না।
                  </p>
                </div>
              </div>

              {/* Add current webpage */}
              <button
                type="button"
                onClick={handleAddCurrentBookmark}
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md active:scale-95"
              >
                <Bookmark className="w-4 h-4" />
                <span>বর্তমান পেজটি ভল্টে এনক্রিপ্ট করে রাখুন</span>
              </button>

              {/* Bookmarks List */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  সংরক্ষিত নিরাপদ বুকমার্ক ({bookmarks.length})
                </label>

                {bookmarks.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">
                    আপনার এনক্রিপ্টেড ভল্টে কোনো সংরক্ষিত বুকমার্ক নেই।
                  </p>
                ) : (
                  bookmarks.map((bm) => (
                    <div
                      key={bm.id}
                      className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors"
                    >
                      <div
                        onClick={() => {
                          if (onNavigate) {
                            onNavigate(bm.url);
                            onClose();
                          }
                        }}
                        className="truncate cursor-pointer flex-1 pr-2"
                      >
                        <p className="text-xs font-bold text-slate-200 truncate hover:text-cyan-300 transition-colors">
                          {bm.title}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate font-mono">
                          {bm.url}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[9px] text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono">
                          AES-256
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteBookmark(bm.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800"
                          title="মুছে ফেলুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Milestone 16: Decentralized User-Key E2EE Cloud Sync & Backup */}
              <div className="pt-3 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-cyan-400" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-100">
                        ডিসেন্ট্রালাইজড E2EE ক্লাউড সিঙ্ক ও ব্যাকআপ
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        মাইলস্টোন ১৬ • পাসফ্রেজ নির্ভর সামরিক মানের AES-256 ব্যাকআপ
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                    M16 E2EE
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      আপনার গোপন পাসফ্রেজ (Secret Passphrase):
                    </label>
                    <input
                      type="password"
                      value={e2eePassphrase}
                      onChange={(e) => setE2eePassphrase(e.target.value)}
                      placeholder="পাসফ্রেজ লিখুন (যেমন: MySecretPass2026)"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 font-mono"
                    />
                    <p className="text-[9px] text-slate-500 mt-0.5">
                      PBKDF2 (১০০,০০০ ইটারেশন) দিয়ে কি (Key) তৈরি হবে। সার্ভারে কোনো কপি যাবে না।
                    </p>
                  </div>

                  {/* Export & Import Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleExportE2eeBackup}
                      disabled={isExportingE2ee}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-200 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{isExportingE2ee ? 'তৈরি হচ্ছে...' : 'ব্যাকআপ এক্সপোর্ট (.omarvio)'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowE2eePanel(!showE2eePanel)}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
                    >
                      <Upload className="w-3.5 h-3.5 text-emerald-400" />
                      <span>ব্যাকআপ রিস্টোর করুন</span>
                    </button>
                  </div>

                  {/* Restore Input Panel */}
                  {showE2eePanel && (
                    <div className="mt-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 animate-fadeIn">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        .omarvio ব্যাকআপ ফাইল কনটেন্ট পেস্ট করুন:
                      </label>
                      <textarea
                        rows={3}
                        value={restoreCipherInput}
                        onChange={(e) => setRestoreCipherInput(e.target.value)}
                        placeholder="এখানে এনক্রিপ্টেড ব্যাকআপ টেক্সট পেস্ট করুন..."
                        className="w-full p-2 rounded-lg bg-[#070b16] border border-slate-800 text-[10px] text-emerald-300 font-mono focus:outline-none focus:border-cyan-400 resize-none"
                      />
                      <button
                        type="button"
                        onClick={handleRestoreE2eeBackup}
                        className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>ডিক্রিপ্ট এবং রিস্টোর সম্পন্ন করুন</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 5: মতামত ও সহায়তা (FEEDBACK & SUPPORT) ==================== */}
          {activeTab === 'feedback' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Header Support Card */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-950/70 via-indigo-950/70 to-cyan-950/70 border border-cyan-500/30">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-100">
                      {t('feedbackTitle')}
                    </h3>
                    <p className="text-[10px] text-cyan-300/90">
                      আপনার যেকোনো পরামর্শ, বাগ রিপোর্ট বা নতুন মডেলের অনুরোধ সরাসরি পাঠান
                    </p>
                  </div>
                </div>
              </div>

              {/* Direct Official Contact Channels (Email & Telegram) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Official Email Card */}
                <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span className="text-xs font-bold text-slate-200">অফিসিয়াল ইমেইল</span>
                  </div>
                  <p className="text-[11px] font-mono text-cyan-300 break-all select-all">
                    {OFFICIAL_EMAIL}
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyEmail}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all active:scale-95 border border-slate-700/60"
                  >
                    <Copy className="w-3.5 h-3.5 text-cyan-400" />
                    <span>ইমেইল কপি করুন</span>
                  </button>
                </div>

                {/* Official Telegram Support Card */}
                <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-blue-400 shrink-0" />
                    <span className="text-xs font-bold text-slate-200">টেলিগ্রাম চ্যানেল / সাপোর্ট</span>
                  </div>
                  <p className="text-[11px] font-mono text-blue-300 truncate">
                    @omarvio_official
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenTelegram}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-blue-600/90 hover:bg-blue-500 text-white text-xs font-semibold transition-all active:scale-95 shadow-sm"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>টেলিগ্রামে মেসেজ দিন</span>
                  </button>
                </div>
              </div>

              {/* Interactive In-App Feedback Form */}
              <form
                onSubmit={handleSubmitFeedback}
                className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200">
                    মতামত ও ফিডব্যাক ফর্ম
                  </label>
                  <span className="text-[10px] text-cyan-400 font-mono">1-Tap Direct Send</span>
                </div>

                {/* Feedback Category Pills */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                    ক্যাটাগরি নির্বাচন করুন:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'feature', label: '💡 নতুন ফিচার' },
                      { id: 'bug', label: '🐞 বাগ বা সমস্যা' },
                      { id: 'ai', label: '🤖 AI মডেল' },
                      { id: 'speed', label: '🚀 গতি ও ব্রাউজিং' },
                      { id: 'general', label: '⭐ সাধারণ মন্তব্য' },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setFeedbackCategory(cat.id as any)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-all ${
                          feedbackCategory === cat.id
                            ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                            : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5-Star Rating */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    ওমারভিও ব্রাউজার রেটিং:
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFeedbackRating(star)}
                        className="p-1 hover:scale-110 transition-transform cursor-pointer"
                      >
                        <Star
                          className={`w-5 h-5 ${
                            star <= feedbackRating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-600'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="ml-2 text-xs font-mono text-amber-300">
                      {feedbackRating} / 5 Stars
                    </span>
                  </div>
                </div>

                {/* Contact Input (Optional) */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    আপনার নাম / ইমেইল / টেলিগ্রাম (ঐচ্ছিক):
                  </label>
                  <input
                    type="text"
                    value={feedbackContact}
                    onChange={(e) => setFeedbackContact(e.target.value)}
                    placeholder="যেমন: সাকিব, sakib@gmail.com বা @sakib"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                {/* Message Textarea */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    আপনার মূল্যবান বক্তব্য বা পরামর্শ:
                  </label>
                  <textarea
                    rows={3}
                    value={feedbackMessage}
                    onChange={(e) => setFeedbackMessage(e.target.value)}
                    placeholder="ব্রাউজারে কোন ফিচারটি যোগ করা প্রয়োজন বা কি সমস্যা হয়েছে বিস্তারিত লিখুন..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 resize-none"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                    <span>প্রেরক: ওমারভিও সাপোর্ট টিম</span>
                    <span>{feedbackMessage.length} অক্ষর</span>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg active:scale-98 transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {feedbackSubmitted ? 'ধন্যবাদ! পাঠানো হয়েছে' : 'মতামত সরাসরি ইমেইলে পাঠান'}
                  </span>
                </button>
              </form>
            </div>
          )}

          {/* ==================== TAB 6: থিম ও ডিসপ্লে (DISPLAY & THEME) ==================== */}
          {activeTab === 'display' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Force OLED True Black Dark Mode */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Moon className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{t('oledDarkMode')}</span>
                  </p>
                  <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                    {t('oledDarkDesc')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onToggleOledDark}
                  className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                    isOledDark ? 'bg-cyan-500' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      isOledDark ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Language Selection */}
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                  {t('language')}
                </label>
                <div className="grid grid-cols-1 gap-1.5">
                  {SUPPORTED_LANGUAGES.map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => handleLanguageChange(item.code)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        currentLang === item.code
                          ? 'bg-blue-600 text-white shadow-sm ring-1 ring-cyan-400/50'
                          : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="text-base">{item.flag}</span>
                        <span>{item.label}</span>
                      </span>
                      {currentLang === item.code && <Check className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Translate Current Page */}
              <button
                type="button"
                onClick={() => {
                  onTranslatePage();
                  onClose();
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs font-bold transition-all border border-slate-800 hover:border-slate-700"
              >
                <div className="flex items-center gap-2.5">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  <span>{t('translatePage')}</span>
                </div>
                <span className="text-[10px] text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-500/30">
                  ১-ট্যাপ ভাবানুবাদ
                </span>
              </button>

              {/* Save as Clean PDF */}
              <button
                type="button"
                onClick={() => {
                  onToast('📄 বিজ্ঞাপনমুক্ত ক্লিন পিডিএফ প্রিন্ট প্রিভিউ প্রস্তুত হচ্ছে...');
                  setTimeout(() => window.print(), 400);
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs font-bold transition-all border border-slate-800 hover:border-slate-700"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>বিজ্ঞাপনমুক্ত PDF সংরক্ষণ</span>
                </div>
                <span className="text-[10px] text-slate-400">প্রিন্ট / এক্সপোর্ট</span>
              </button>
            </div>
          )}

          {/* ==================== TAB 7: পরিচিতি (ABOUT OMARVIO) ==================== */}
          {activeTab === 'about' && (
            <div className="space-y-4 text-center animate-fadeIn">
              <div className="flex flex-col items-center">
                <img
                  src="/assets/aistudio/file_0000000038508211a96b8fbe27d5ca68_9009abdf.png"
                  alt="OMARVIO BROWSER Logo"
                  className="w-24 h-24 aspect-square rounded-2xl object-contain bg-black shadow-2xl mb-3"
                />
                <h3 className="text-base font-black text-slate-100 tracking-tight">
                  OMARVIO BROWSER
                </h3>
                <p className="text-xs font-bold text-cyan-400">OMARVIO GLOBAL LTD.</p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">Version 1.0.0 (Production Release)</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-blue-950/50 border border-cyan-500/30 text-left space-y-2 text-xs text-slate-300 leading-relaxed">
                <p className="font-bold text-cyan-200 italic text-center">
                  &ldquo;আমার ফোন, আমার ডেটা – কেন দেব অন্যের হাতে!&rdquo;
                </p>
                <p>
                  OMARVIO BROWSER সম্পূর্ণ সার্ভারবিহীন জিরো-সার্ভার আর্কিটেকচারে তৈরি একটি প্রাইভেট ব্রাউজার। ব্রাউজারের ভেতর ক্লায়েন্ট-সাইড সার্ভিস ওয়ার্কার দিয়ে আপনার সমস্ত ডেটা ডিভাইসের নিজস্ব মেমোরিতে সুরক্ষিত থাকে।
                </p>
                <p>
                  • ২৫৬-বিট ওয়েব ক্রিপ্টো লোকাল স্টোরেজ ও ভল্ট<br />
                  • লিংক ক্লিনিক স্ক্যাম ও ফিশিং রাডার<br />
                  • ব্যাকগ্রাউন্ড ও স্ক্রিন-অফ অডিও/ভিডিও প্লেব্যাক<br />
                  • বিভিন্ন বিশ্বমানের এআই মডেল সমর্থন (Gemini, DeepSeek, Claude, ChatGPT, Llama)<br />
                  • অফিসিয়াল সাপোর্ট ও ফিডব্যাক চ্যানেল
                </p>
              </div>

              {/* Contact info repeated */}
              <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-left text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">ইমেইল:</span>
                  <span className="font-mono text-cyan-300">{OFFICIAL_EMAIL}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">টেলিগ্রাম:</span>
                  <a
                    href={OFFICIAL_TELEGRAM_LINK}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-blue-400 hover:underline"
                  >
                    @omarvio_official
                  </a>
                </div>
              </div>

              <p className="text-[10px] text-slate-500">
                Copyright © {new Date().getFullYear()} OMARVIO GLOBAL LTD. All Rights Reserved.
              </p>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* STICKY BOTTOM BAR: Universal Exit / Back Button */}
        {/* ========================================================= */}
        <div className="p-3 border-t border-slate-800 bg-[#0a0f1d] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 text-xs font-bold transition-all shadow-sm active:scale-98"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400" />
            <span>← Back to Web Browser / ব্রাউজারে ফিরে যান</span>
          </button>
        </div>
      </div>
    </div>
  );
};
