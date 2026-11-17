/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OMARVIO BROWSER - Module M2 Own Ad-Free Search Results Engine
 * Native high-speed, ad-free web results from user-selected engine (Google, DuckDuckGo, Brave, Bing)
 * Categorized Search System (Google-Style):
 * - All (সব)
 * - Images (ছবি) with Responsive Grid, Lightbox Preview, and Direct In-App Download
 * - Docs (ডকুমেন্ট) with PDF/DOCX badging, Smart Reader, and Direct Download
 * - Videos (ভিডিও) with Thumbnails & In-App Zero-Ad Theater Player
 * - News (সংবাদ), Wiki (উইকিপিডিয়া), Tech (টেক)
 * 100% Ad-Free, Zero Tracker Injection, Sub-100ms Skeleton Feedback.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  ExternalLink,
  BookOpen,
  Globe,
  ArrowRight,
  RefreshCw,
  Share2,
  Newspaper,
  BookMarked,
  Code2,
  Video,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  Image as ImageIcon,
  FileText,
  Download,
  X,
  Play,
  Maximize2,
  FileDown,
  Sparkles,
  Bot,
  ChevronUp,
  AlertCircle,
} from 'lucide-react';
import { SearchResultItem } from '../engine/search/types';
import { SEARCH_ENGINES, SearchEngineOption, SearchEngineSelectorModal } from './SearchEngineSelectorModal';
import { downloadFileInApp } from '../engine/inAppDownloader';
import { runOmarvioAiChat, getSavedAiSettings } from '../engine/aiClient';

interface SearchResultsViewProps {
  query: string;
  initialEngine?: string;
  onNavigate: (url: string) => void;
  onOpenReaderMode?: (title: string, url: string, content: string) => void;
  onShare?: (title: string, url: string) => void;
}

type SearchCategory = 'all' | 'image' | 'doc' | 'video' | 'news' | 'wiki' | 'tech';

function cleanQueryTerm(raw: string): string {
  if (!raw) return '';
  try {
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      const u = new URL(raw);
      const q = u.searchParams.get('q') || u.searchParams.get('query') || u.searchParams.get('p');
      if (q) return q.trim();
    }
  } catch {}
  return raw.replace(/^search:(ai:)?/i, '').trim();
}

function getOfficialEngineUrl(engineId: string, q: string, isRaw = false): string {
  const encoded = encodeURIComponent(q.trim());
  const rawSuffix = isRaw ? '&raw=1' : '';
  switch (engineId) {
    case 'google':
      return `https://www.google.com/search?q=${encoded}${rawSuffix}`;
    case 'duckduckgo':
      return `https://duckduckgo.com/?q=${encoded}${rawSuffix}`;
    case 'brave':
      return `https://search.brave.com/search?q=${encoded}${rawSuffix}`;
    case 'bing':
      return `https://www.bing.com/search?q=${encoded}${rawSuffix}`;
    case 'startpage':
      return `https://www.startpage.com/sp/search?query=${encoded}${rawSuffix}`;
    case 'ecosia':
      return `https://www.ecosia.org/search?q=${encoded}${rawSuffix}`;
    default:
      return `https://www.google.com/search?q=${encoded}${rawSuffix}`;
  }
}

export const SearchResultsView: React.FC<SearchResultsViewProps> = ({
  query,
  initialEngine,
  onNavigate,
  onOpenReaderMode,
  onShare,
}) => {
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('all');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [extraCategoryResults, setExtraCategoryResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [isEngineModalOpen, setIsEngineModalOpen] = useState(false);

  // Modal Lightbox state for images
  const [previewImage, setPreviewImage] = useState<SearchResultItem | null>(null);

  // In-app Video Theater player state
  const [theaterVideo, setTheaterVideo] = useState<{ id: string; title: string; url: string } | null>(null);

  // Live Gemini AI Search Summary state
  const [aiSummary, setAiSummary] = useState<string>('');
  const [aiSummaryModel, setAiSummaryModel] = useState<string>('');
  const [aiSummaryLoading, setAiSummaryLoading] = useState<boolean>(false);
  const [aiSummaryError, setAiSummaryError] = useState<string | null>(null);
  const [aiSummaryCollapsed, setAiSummaryCollapsed] = useState<boolean>(false);
  const [aiSummaryNonce, setAiSummaryNonce] = useState<number>(0);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const [currentEngineId, setCurrentEngineId] = useState<string>(() => {
    if (initialEngine && SEARCH_ENGINES.some((e) => e.id === initialEngine)) {
      return initialEngine;
    }
    if (typeof window !== 'undefined') {
      return localStorage.getItem('omarvio_search_engine') || 'google';
    }
    return 'google';
  });

  const cleanQ = cleanQueryTerm(query);
  const [searchInput, setSearchInput] = useState(cleanQ);

  useEffect(() => {
    if (initialEngine && SEARCH_ENGINES.some((e) => e.id === initialEngine)) {
      setCurrentEngineId(initialEngine);
    }
  }, [initialEngine]);

  const currentEngineObj: SearchEngineOption =
    SEARCH_ENGINES.find((e) => e.id === currentEngineId) || SEARCH_ENGINES[1];

  const handleSelectEngine = (engineId: string) => {
    setCurrentEngineId(engineId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('omarvio_search_engine', engineId);
    }
  };

  // 1. Fetch primary live search results via M1 Search Gateway
  useEffect(() => {
    if (!cleanQ) return;
    setSearchInput(cleanQ);
    setIsLoading(true);
    setExtraCategoryResults([]);

    const isBengali = /[\u0980-\u09FF]/.test(cleanQ);
    const lang = isBengali ? 'bn' : 'en';

    const url = `/api/search?engine=${encodeURIComponent(currentEngineId)}&q=${encodeURIComponent(cleanQ)}&lang=${lang}`;

    fetch(url)
      .then((res) => (res.ok ? res.json() : { results: [] }))
      .then((data) => {
        if (data && Array.isArray(data.results)) {
          setResults(data.results);
        } else {
          setResults([]);
        }
      })
      .catch(() => {
        setResults([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [cleanQ, currentEngineId]);

  // 1b. Live Gemini AI Search Summary (when enabled in AI settings)
  const aiSettingsSnapshot = getSavedAiSettings();
  useEffect(() => {
    if (!cleanQ || isLoading) return;
    const saved = getSavedAiSettings();
    if (!saved.searchSummary) {
      setAiSummary('');
      setAiSummaryError(null);
      setAiSummaryLoading(false);
      return;
    }

    let cancelled = false;
    setAiSummaryLoading(true);
    setAiSummaryError(null);

    const snippets = results
      .slice(0, 5)
      .map((r, i) => `${i + 1}. ${r.title} (${r.displayUrl}): ${r.snippet || ''}`)
      .join('\n');

    runOmarvioAiChat({
      prompt: `Search query: "${cleanQ}"\nProvide a concise, factual summary with 3-4 bullet points helping the user understand this topic right away.${snippets ? `\n\nTop search snippets for grounding:\n${snippets}` : ''}`,
      model: saved.model,
      reasoningLevel: saved.reasoningLevel,
      autoTranslateBn: saved.autoTranslateBn,
      sanitizePrompt: saved.sanitizePrompt,
    })
      .then((res) => {
        if (cancelled) return;
        setAiSummary(res.text);
        setAiSummaryModel(res.modelUsed);
      })
      .catch((err) => {
        if (cancelled) return;
        setAiSummary('');
        setAiSummaryError(err instanceof Error ? err.message : 'AI সারসংক্ষেপ তৈরি করা যায়নি।');
      })
      .finally(() => {
        if (!cancelled) setAiSummaryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cleanQ, isLoading, aiSummaryNonce, results]);

  // 2. Dynamic Auto-Enrichment when user selects Images or Docs and current results are sparse
  useEffect(() => {
    if (!cleanQ) return;

    if (activeCategory === 'image') {
      const existingImages = results.filter((r) => r.category === 'image' || !!r.thumbnail);
      if (existingImages.length < 5) {
        // Fetch Wikimedia / Wikipedia open high-res images for rich Google-like Image Grid
        const wikiMediaUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrsearch=${encodeURIComponent(cleanQ)}&gsrlimit=12&prop=pageimages|extracts&piprop=thumbnail&pithumbsize=600&pilimit=12`;
        fetch(wikiMediaUrl)
          .then((r) => r.json())
          .then((wikiData) => {
            if (wikiData?.query?.pages) {
              const fetched: SearchResultItem[] = [];
              Object.values(wikiData.query.pages).forEach((page: any) => {
                if (page.thumbnail?.source) {
                  fetched.push({
                    title: page.title || cleanQ,
                    url: `https://en.wikipedia.org/?curid=${page.pageid}`,
                    displayUrl: 'wikipedia.org',
                    snippet: page.extract || 'High-resolution web image',
                    category: 'image',
                    thumbnail: page.thumbnail.source,
                  });
                }
              });
              if (fetched.length > 0) {
                setExtraCategoryResults(fetched);
              }
            }
          })
          .catch(() => {});
      }
    } else if (activeCategory === 'doc') {
      const existingDocs = results.filter((r) => r.category === 'doc');
      if (existingDocs.length < 3) {
        // Fetch targeted filetype:pdf query via Gateway
        const docQueryUrl = `/api/search?engine=${encodeURIComponent(currentEngineId)}&q=${encodeURIComponent(cleanQ + ' filetype:pdf')}`;
        fetch(docQueryUrl)
          .then((r) => (r.ok ? r.json() : { results: [] }))
          .then((data) => {
            if (data?.results && Array.isArray(data.results)) {
              const docItems: SearchResultItem[] = data.results.map((item: any) => ({
                ...item,
                category: 'doc',
              }));
              if (docItems.length > 0) {
                setExtraCategoryResults(docItems);
              }
            }
          })
          .catch(() => {});
      }
    }
  }, [activeCategory, cleanQ, results, currentEngineId]);

  // Combined Results Filtered by Category
  const activeItems = useMemo(() => {
    const combined = [...results, ...extraCategoryResults];
    // Deduplicate by URL
    const seen = new Set<string>();
    const unique = combined.filter((item) => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });

    if (activeCategory === 'all') return results;
    if (activeCategory === 'image') {
      return unique.filter((item) => item.category === 'image' || !!item.thumbnail);
    }
    if (activeCategory === 'doc') {
      return unique.filter((item) => {
        const u = (item.url || '').toLowerCase();
        const t = (item.title || '').toLowerCase();
        return (
          item.category === 'doc' ||
          u.endsWith('.pdf') ||
          u.endsWith('.doc') ||
          u.endsWith('.docx') ||
          u.endsWith('.ppt') ||
          u.endsWith('.pptx') ||
          t.includes('[pdf]')
        );
      });
    }
    if (activeCategory === 'video') {
      return unique.filter((item) => {
        const u = (item.url || '').toLowerCase();
        return (
          item.category === 'video' ||
          u.includes('youtube.com') ||
          u.includes('youtu.be') ||
          u.includes('vimeo.com')
        );
      });
    }
    return unique.filter((item) => item.category === activeCategory);
  }, [results, extraCategoryResults, activeCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    onNavigate(getOfficialEngineUrl(currentEngineId, searchInput.trim()));
  };

  const handleCopyLink = (url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
      showToast('📋 লিংক কপি করা হয়েছে');
    } catch {}
  };

  const handleDownload = async (url: string, title?: string, type?: 'pdf' | 'doc' | 'audio' | 'video', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    showToast('📥 ডাউনলোড শুরু হচ্ছে...');
    const res = await downloadFileInApp(url, title, type);
    showToast(res.message);
  };

  const extractYtId = (targetUrl: string): string | null => {
    try {
      if (targetUrl.includes('youtube.com/watch?v=')) {
        return targetUrl.split('v=')[1]?.split('&')[0] || null;
      }
      if (targetUrl.includes('youtu.be/')) {
        return targetUrl.split('youtu.be/')[1]?.split('?')[0] || null;
      }
      if (targetUrl.includes('youtube.com/shorts/')) {
        return targetUrl.split('shorts/')[1]?.split('?')[0] || null;
      }
      if (targetUrl.includes('youtube.com/embed/')) {
        return targetUrl.split('embed/')[1]?.split('?')[0] || null;
      }
    } catch {}
    return null;
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#070913] text-slate-100 overflow-y-auto scrollbar-none touch-manipulation">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-cyan-950/95 border border-cyan-500/50 text-cyan-200 text-xs font-semibold shadow-2xl backdrop-blur-md animate-fade-in flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Search Header */}
      <div className="sticky top-0 z-20 w-full bg-[#0a0d1a]/95 backdrop-blur-md border-b border-neutral-800/80 px-3 sm:px-4 pt-2.5 pb-1 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 mb-2">
          {/* Active Search Engine Branding Badge & Switcher */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEngineModalOpen(true)}
              title={`বর্তমান ইঞ্জিন: ${currentEngineObj.name} (ক্লিক করে পরিবর্তন করুন)`}
              className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-white transition-all cursor-pointer select-none active:scale-95"
            >
              <span className="scale-75 origin-left shrink-0">{currentEngineObj.logo}</span>
              <span className="text-xs sm:text-sm font-bold tracking-tight">{currentEngineObj.name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 font-medium">
              বিজ্ঞাপনমুক্ত
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="hidden sm:inline">১০০% ট্র্যাকারমুক্ত ও সুরক্ষিত</span>
          </div>
        </div>

        {/* Omnibar-style Search Box */}
        <form onSubmit={handleSearchSubmit} className="max-w-4xl mx-auto flex items-center gap-2 mb-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-full bg-[#131728] border border-neutral-700/80 focus-within:border-cyan-400 transition-all shadow-inner">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={`${currentEngineObj.name}-এ সার্চ করুন (যেমন: ছবি, পিডিএফ, খবর)...`}
              className="flex-1 bg-transparent text-xs sm:text-sm text-slate-100 placeholder-slate-500 outline-none"
            />
            {isLoading && (
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin shrink-0" />
            )}
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs shadow-sm active:scale-95 transition-all cursor-pointer shrink-0 touch-manipulation"
          >
            সার্চ
          </button>
        </form>

        {/* Google-Style Categorized Tabs: All, Images, Docs, Videos, News, Wiki, Tech */}
        <div className="max-w-4xl mx-auto flex items-center gap-2 overflow-x-auto scrollbar-none text-xs border-t border-neutral-800/60 pt-1.5">
          {[
            { id: 'all', label: 'All (সব)', icon: Search, color: 'text-cyan-400' },
            { id: 'image', label: 'ছবি (Images)', icon: ImageIcon, color: 'text-amber-400' },
            { id: 'doc', label: 'ডকুমেন্ট (Docs)', icon: FileText, color: 'text-rose-400' },
            { id: 'video', label: 'ভিডিও (Videos)', icon: Video, color: 'text-red-400' },
            { id: 'news', label: 'সংবাদ (News)', icon: Newspaper, color: 'text-emerald-400' },
            { id: 'wiki', label: 'উইকিপিডিয়া', icon: BookMarked, color: 'text-sky-400' },
            { id: 'tech', label: 'টেক (Tech)', icon: Code2, color: 'text-purple-400' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategory(tab.id as SearchCategory)}
                className={`pb-1.5 px-2.5 font-semibold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  isActive
                    ? 'border-cyan-400 text-cyan-300 font-bold'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-300' : tab.color}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Results Body */}
      <div className="max-w-4xl w-full mx-auto px-3 sm:px-4 py-3 space-y-3">
        {/* Live Gemini AI Smart Summary Card */}
        {aiSettingsSnapshot.searchSummary && activeCategory === 'all' && (aiSummaryLoading || aiSummary || aiSummaryError) && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#0e172c] via-[#0c1324] to-[#0a1a24] border border-cyan-500/35 shadow-lg space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-100">OMARVIO AI স্মার্ট সারসংক্ষেপ</span>
                    {aiSummaryModel && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/90 border border-cyan-500/30 text-cyan-300 font-mono truncate">
                        {aiSummaryModel}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!aiSummaryLoading && (
                  <button
                    type="button"
                    onClick={() => setAiSummaryNonce((n) => n + 1)}
                    title="পুনরায় সারসংক্ষেপ তৈরি করুন"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800/80 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setAiSummaryCollapsed((v) => !v)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
                >
                  {aiSummaryCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {!aiSummaryCollapsed && (
              <>
                {aiSummaryLoading && (
                  <div className="flex items-center gap-2 text-xs text-cyan-300 py-1">
                    <Bot className="w-4 h-4 animate-pulse shrink-0" />
                    <span>Gemini AI এই বিষয়ের মূল তথ্য বিশ্লেষণ করছে...</span>
                  </div>
                )}
                {!aiSummaryLoading && aiSummaryError && (
                  <div className="flex items-center justify-between gap-2 text-xs text-amber-300 bg-amber-950/40 border border-amber-500/30 rounded-xl px-3 py-2">
                    <span className="flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{aiSummaryError}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setAiSummaryNonce((n) => n + 1)}
                      className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-bold text-[11px] shrink-0 cursor-pointer"
                    >
                      আবার চেষ্টা করুন
                    </button>
                  </div>
                )}
                {!aiSummaryLoading && !aiSummaryError && aiSummary && (
                  <div className="text-xs sm:text-[13px] text-slate-200 leading-relaxed whitespace-pre-wrap select-text">
                    {aiSummary}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Skeleton Loading State (< 100ms instant feedback) */}
        {isLoading && results.length === 0 && (
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="p-4 rounded-2xl bg-[#0e1220] border border-neutral-800/80 animate-pulse space-y-2.5"
              >
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-slate-800" />
                  <div className="w-24 h-3 rounded bg-slate-800" />
                </div>
                <div className="w-3/4 h-4 rounded bg-slate-700/80" />
                <div className="w-full h-3 rounded bg-slate-800/60" />
                <div className="w-2/3 h-3 rounded bg-slate-800/60" />
              </div>
            ))}
          </div>
        )}

        {/* Empty Results Placeholder */}
        {!isLoading && activeItems.length === 0 && (
          <div className="py-12 text-center space-y-2">
            <p className="text-slate-300 font-semibold text-sm">
              {activeCategory === 'image'
                ? 'কোনো ছবি পাওয়া যায়নি'
                : activeCategory === 'doc'
                ? 'কোনো ডকুমেন্ট বা পিডিএফ পাওয়া যায়নি'
                : 'কোনো ফলাফল পাওয়া যায়নি'}
            </p>
            <p className="text-slate-500 text-xs">অন্য কোনো কি-ওয়ার্ড দিয়ে পুনরায় অনুসন্ধান করুন।</p>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW A: DEDICATED GOOGLE-STYLE IMAGE SEARCH GRID                          */}
        {/* ========================================================================= */}
        {activeCategory === 'image' && activeItems.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-1">
              <span>ছবির ফলাফল ({activeItems.length})</span>
              <span className="text-cyan-400">ট্যাপ করে পূর্ণ সাইজে দেখুন ও সেভ করুন</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {activeItems.map((item, idx) => {
                const imgSource = item.thumbnail || item.url;
                return (
                  <div
                    key={`img-${item.url}-${idx}`}
                    onClick={() => setPreviewImage(item)}
                    className="group relative rounded-2xl bg-[#0e1220] border border-neutral-800 hover:border-cyan-500/50 overflow-hidden cursor-pointer transition-all hover:scale-[1.02] active:scale-95 shadow-md flex flex-col"
                  >
                    {/* Image Viewport */}
                    <div className="w-full aspect-square bg-slate-900 overflow-hidden relative">
                      <img
                        src={imgSource}
                        alt={item.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          // Fallback to placeholder if thumbnail fails
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2">
                        <span className="text-[10px] text-white/90 font-mono truncate max-w-[80%]">
                          {item.displayUrl || 'image'}
                        </span>
                        <div className="w-6 h-6 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center shadow">
                          <Maximize2 className="w-3 h-3" />
                        </div>
                      </div>
                    </div>

                    {/* Image Title & Quick Action Footer */}
                    <div className="p-2 flex flex-col justify-between flex-1 bg-[#0b0e1b]">
                      <h4 className="text-[11px] font-medium text-slate-200 line-clamp-2 leading-tight group-hover:text-cyan-300">
                        {item.title}
                      </h4>
                      <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-neutral-800/60 text-[10px]">
                        <span className="text-slate-400 font-mono truncate max-w-[60%]">
                          {item.displayUrl || 'web'}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleDownload(imgSource, item.title, 'doc', e)}
                          title="ছবি ডাউনলোড করুন"
                          className="p-1 rounded-lg hover:bg-slate-800 text-cyan-400 hover:text-white transition-colors cursor-pointer"
                        >
                          <Download className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW B: DEDICATED GOOGLE-STYLE DOCUMENT & PDF SEARCH CARDS                */}
        {/* ========================================================================= */}
        {activeCategory === 'doc' && activeItems.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-1">
              <span>ডকুমেন্ট ও গবেষণা পেপারের তালিকা ({activeItems.length})</span>
              <span className="text-rose-400">পিডিএফ ক্লিন রিডার ও অফলাইন সেভ সমর্থিত</span>
            </div>

            {activeItems.map((item, idx) => {
              const isPdf = item.url.toLowerCase().endsWith('.pdf') || item.title.toLowerCase().includes('[pdf]');
              return (
                <div
                  key={`doc-${item.url}-${idx}`}
                  onClick={() => onNavigate(item.url)}
                  className="p-3.5 sm:p-4 rounded-2xl bg-[#0e1220] hover:bg-[#141a2e] border border-neutral-800 hover:border-rose-500/50 transition-all shadow-md group cursor-pointer touch-manipulation active:scale-[0.99]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                        isPdf
                          ? 'bg-rose-950/90 text-rose-300 border border-rose-500/40'
                          : 'bg-blue-950/90 text-blue-300 border border-blue-500/40'
                      }`}>
                        <FileText className="w-3 h-3" />
                        <span>{isPdf ? 'PDF ডকুমেন্ট' : 'ডকুমেন্ট'}</span>
                      </span>
                      <span className="text-xs text-slate-400 font-mono truncate">
                        {item.displayUrl || item.url}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDownload(item.url, item.title, isPdf ? 'pdf' : 'doc', e)}
                      className="px-2 py-1 rounded-lg bg-rose-950 hover:bg-rose-900 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                    >
                      <FileDown className="w-3.5 h-3.5 text-rose-400" />
                      <span>ডাউনলোড</span>
                    </button>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-rose-300 group-hover:text-rose-200 group-hover:underline line-clamp-2 leading-snug mb-1">
                    {item.title}
                  </h3>

                  {item.snippet && (
                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-2 mb-3 font-sans">
                      {item.snippet}
                    </p>
                  )}

                  <div className="flex items-center gap-2 pt-2 border-t border-neutral-800/60 text-xs">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate(item.url);
                      }}
                      className="px-3 py-1 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-300 hover:text-white transition-all text-[11px] flex items-center gap-1 cursor-pointer active:scale-95"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>ওয়েবে পড়ুন</span>
                    </button>

                    {onOpenReaderMode && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenReaderMode(item.title, item.url, item.snippet);
                        }}
                        className="px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all text-[11px] flex items-center gap-1 cursor-pointer active:scale-95"
                      >
                        <BookOpen className="w-3 h-3 text-cyan-400" />
                        <span>স্মার্ট রিডার</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => handleCopyLink(item.url, e)}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-neutral-800 text-slate-400 text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {copiedUrl === item.url ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">কপি হয়েছে</span>
                        </>
                      ) : (
                        <span>লিংক কপি</span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW C: DEDICATED GOOGLE-STYLE VIDEO CARDS VIEW                           */}
        {/* ========================================================================= */}
        {activeCategory === 'video' && activeItems.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-1">
              <span>ভিডিও তালিকা ({activeItems.length})</span>
              <span className="text-red-400">ট্যাপ করলেই বিজ্ঞাপনমুক্ত থিয়েটারে প্লে হবে</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeItems.map((item, idx) => {
                const ytId = extractYtId(item.url);
                const thumb = item.thumbnail || (ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : null);
                return (
                  <div
                    key={`vid-${item.url}-${idx}`}
                    onClick={() => {
                      if (ytId) {
                        setTheaterVideo({ id: ytId, title: item.title, url: item.url });
                      } else {
                        onNavigate(item.url);
                      }
                    }}
                    className="p-2.5 rounded-2xl bg-[#0e1220] hover:bg-[#141a2e] border border-neutral-800 hover:border-red-500/50 transition-all flex flex-col gap-2 cursor-pointer group shadow-md"
                  >
                    <div className="w-full aspect-video rounded-xl bg-black relative overflow-hidden shrink-0">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={item.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-600">
                          <Video className="w-10 h-10" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/10 transition-colors">
                        <div className="w-9 h-9 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Play className="w-4 h-4 fill-white ml-0.5" />
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-100 group-hover:text-red-300 line-clamp-2 leading-snug">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                        {item.snippet || item.displayUrl}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW D: ALL / NEWS / WIKI / TECH STANDARD SEARCH LIST                     */}
        {/* ========================================================================= */}
        {activeCategory !== 'image' && activeCategory !== 'doc' && activeCategory !== 'video' && (
          <div className="space-y-3">
            {activeItems.map((item, idx) => (
              <div
                key={`${item.url}-${idx}`}
                onClick={() => onNavigate(item.url)}
                className="p-3.5 sm:p-4 rounded-2xl bg-[#0e1220] hover:bg-[#141a2e] active:bg-[#182038] border border-neutral-800 hover:border-cyan-500/50 transition-all shadow-md group cursor-pointer touch-manipulation active:scale-[0.99]"
              >
                {/* Header: Favicon & Domain */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="text-xs text-slate-400 font-mono truncate">
                      {item.displayUrl || item.url}
                    </span>
                  </div>
                  <span className="text-[10px] text-cyan-400 font-medium px-2 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-800/50">
                    নিরাপদ
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-sm sm:text-base font-bold text-blue-400 group-hover:text-blue-300 group-hover:underline line-clamp-2 leading-snug mb-1">
                  {item.title}
                </h3>

                {/* Snippet */}
                {item.snippet && (
                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-2 mb-3 font-sans">
                    {item.snippet}
                  </p>
                )}

                {/* Quick Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-neutral-800/60 text-xs">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate(item.url);
                    }}
                    className="px-3 py-1 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-300 hover:text-white hover:bg-cyan-900 transition-all font-medium text-[11px] flex items-center gap-1 cursor-pointer touch-manipulation active:scale-95"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>ওপেন করুন</span>
                  </button>

                  {onOpenReaderMode && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenReaderMode(item.title, item.url, item.snippet);
                      }}
                      className="px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all text-[11px] flex items-center gap-1 cursor-pointer touch-manipulation active:scale-95"
                    >
                      <BookOpen className="w-3 h-3 text-cyan-400" />
                      <span>স্মার্ট রিডার</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => handleCopyLink(item.url, e)}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-neutral-800 text-slate-400 hover:text-slate-200 text-[11px] flex items-center gap-1 transition-colors cursor-pointer touch-manipulation"
                    title="Copy URL"
                  >
                    {copiedUrl === item.url ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">কপি হয়েছে</span>
                      </>
                    ) : (
                      <span>লিংক কপি</span>
                    )}
                  </button>

                  {onShare && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onShare(item.title, item.url);
                      }}
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer ml-auto touch-manipulation"
                      title="Share result"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Switch to official search engine web page link */}
        <div className="py-6 text-center border-t border-neutral-800/80 mt-6">
          <p className="text-xs text-slate-400 mb-2">অফিসিয়াল ইঞ্জিন থেকে সরাসরি ব্রাউজ করতে চান?</p>
          <button
            type="button"
            onClick={() => onNavigate(getOfficialEngineUrl(currentEngineId, cleanQ, true))}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/90 border border-slate-700 hover:border-cyan-400 text-xs font-semibold text-cyan-300 hover:text-white transition-all cursor-pointer active:scale-95"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>অফিসিয়াল {currentEngineObj.name} ওয়েব পেজে যান</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: IMAGE LIGHTBOX FULL PREVIEW & DOWNLOAD MODAL                     */}
      {/* ========================================================================= */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-3xl w-full max-h-[90vh] bg-[#0c1020] border border-cyan-500/40 rounded-3xl overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-3.5 bg-[#080b16] border-b border-neutral-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <h3 className="text-xs sm:text-sm font-bold text-white truncate">
                  {previewImage.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Image Display */}
            <div className="flex-1 bg-black flex items-center justify-center p-2 overflow-hidden min-h-[250px] max-h-[60vh]">
              <img
                src={previewImage.thumbnail || previewImage.url}
                alt={previewImage.title}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            </div>

            {/* Modal Actions Footer */}
            <div className="p-3.5 bg-[#080b16] border-t border-neutral-800 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-slate-400 font-mono truncate max-w-[200px]">
                {previewImage.displayUrl || previewImage.url}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownload(previewImage.thumbnail || previewImage.url, previewImage.title, 'doc')}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 text-slate-950 font-bold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>ছবি সেভ করুন</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPreviewImage(null);
                    onNavigate(previewImage.url);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>মূল পেজে যান</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: IN-APP ZERO-AD VIDEO THEATER MODAL                               */}
      {/* ========================================================================= */}
      {theaterVideo && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-6 animate-fade-in"
          onClick={() => setTheaterVideo(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-[#0c1020] border border-red-500/40 rounded-3xl overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-3 bg-[#080b16] border-b border-neutral-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <h3 className="text-xs sm:text-sm font-bold text-white truncate">
                  {theaterVideo.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setTheaterVideo(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 1080p Zero-Ad Embed */}
            <div className="w-full aspect-video bg-black">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${theaterVideo.id}?autoplay=1&enablejsapi=1&rel=0&modestbranding=1`}
                title={theaterVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full border-none bg-black"
              />
            </div>

            {/* Footer */}
            <div className="p-3 bg-[#080b16] border-t border-neutral-800 flex items-center justify-between text-xs">
              <span className="text-[10px] text-cyan-400 font-mono">
                🛡️ ওমারভিও জিরো-অ্যাড থিয়েটার
              </span>
              <button
                type="button"
                onClick={() => {
                  setTheaterVideo(null);
                  onNavigate(theaterVideo.url);
                }}
                className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>ইউটিউব পেজে যান</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Engine Selector Dialog */}
      <SearchEngineSelectorModal
        isOpen={isEngineModalOpen}
        currentEngine={currentEngineId}
        onSelectEngine={handleSelectEngine}
        onClose={() => setIsEngineModalOpen(false)}
      />
    </div>
  );
};
