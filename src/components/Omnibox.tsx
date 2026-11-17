/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Lock,
  Camera,
  ArrowRight,
  X,
  Globe,
  ExternalLink,
  Mic,
  MicOff,
} from 'lucide-react';
import {
  getSanitizedSearchUrl,
  getPrivacyFilterSettings,
  getAdblockStats,
} from '../engine/adblocker';
import { getLanguage } from '../engine/i18n';
import { useBrowserEvent } from '../engine/eventBus';

interface OmniboxProps {
  currentUrl: string;
  isLoading: boolean;
  onNavigate: (targetUrl: string) => void;
  onOpenLens?: () => void;
  onOpenSearchOverlay?: () => void;
  onOpenSiteControls?: () => void;
}

const SPEECH_LOCALE_MAP: Record<string, string> = {
  bn: 'bn-BD',
  hi: 'hi-IN',
  ar: 'ar-SA',
  es: 'es-ES',
  en: 'en-US',
};

export const Omnibox: React.FC<OmniboxProps> = ({
  currentUrl,
  isLoading,
  onNavigate,
  onOpenLens,
  onOpenSearchOverlay,
  onOpenSiteControls,
}) => {
  const [inputValue, setInputValue] = useState(currentUrl);
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);
  const [httpsOnlyActive, setHttpsOnlyActive] = useState<boolean>(
    () => getPrivacyFilterSettings().httpsOnlyMode
  );
  const [shieldActive, setShieldActive] = useState<boolean>(() => {
    const s = getPrivacyFilterSettings();
    return s.aggressiveTrackerBlocking || s.adsFiltering;
  });
  const [blockedTotal, setBlockedTotal] = useState<number>(() => {
    const st = getAdblockStats();
    return st.trackersBlocked + st.adsDestroyed;
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const statusTimerRef = useRef<number | null>(null);

  useBrowserEvent(
    'PRIVACY_SETTINGS_UPDATED',
    React.useCallback((settings) => {
      setHttpsOnlyActive(settings.httpsOnlyMode);
      setShieldActive(settings.aggressiveTrackerBlocking || settings.adsFiltering);
    }, [])
  );

  useBrowserEvent(
    'BLOCKED_STAT_UPDATED',
    React.useCallback((st) => {
      setBlockedTotal(st.trackersBlocked + st.adsDestroyed);
    }, [])
  );

  useEffect(() => {
    if (!isFocused && !isListening) {
      setInputValue(currentUrl);
    }
  }, [currentUrl, isFocused, isListening]);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort?.();
      } catch {}
      if (statusTimerRef.current) {
        window.clearTimeout(statusTimerRef.current);
      }
    };
  }, []);

  const showTemporaryVoiceStatus = (msg: string, duration = 2600) => {
    if (statusTimerRef.current) {
      window.clearTimeout(statusTimerRef.current);
    }
    setVoiceStatus(msg);
    statusTimerRef.current = window.setTimeout(() => {
      setVoiceStatus(null);
    }, duration);
  };

  const navigateFromQuery = (rawQuery: string) => {
    const query = rawQuery.trim();
    if (!query) return;

    let target = query;
    const lowered = query.toLowerCase();
    if (lowered === 'google' || lowered === 'google.com') {
      target = 'https://google.com';
    } else if (!query.includes('.') || query.includes(' ')) {
      target = getSanitizedSearchUrl(query);
    } else {
      if (!query.startsWith('http://') && !query.startsWith('https://')) {
        target = `https://${query}`;
      }
      try {
        const parsed = new URL(target);
        target = `${parsed.protocol}//${parsed.hostname.toLowerCase()}${
          parsed.pathname === '/' && !query.endsWith('/') ? '' : parsed.pathname
        }${parsed.search}${parsed.hash}`;
      } catch {}
    }
    onNavigate(target);
  };

  const handleToggleVoiceSearch = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsListening(false);
      setVoiceStatus(null);
      return;
    }

    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      showTemporaryVoiceStatus(
        getLanguage() === 'bn'
          ? 'এই ব্রাউজারে ভয়েস সার্চ সমর্থিত নয়'
          : 'Voice search unavailable on this browser'
      );
      return;
    }

    try {
      const recognition = new SpeechRecognitionCtor();
      const activeLang = getLanguage();
      recognition.lang = SPEECH_LOCALE_MAP[activeLang] || 'en-US';
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.continuous = false;

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceStatus(activeLang === 'bn' ? 'শুনছি... কথা বলুন' : 'Listening... Speak now');
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const piece = event.results[i]?.[0]?.transcript || '';
          if (event.results[i].isFinal) {
            finalTranscript += piece;
          } else {
            interim += piece;
          }
        }

        const displayTranscript = (finalTranscript || interim).trim();
        if (displayTranscript) {
          setInputValue(displayTranscript);
          setVoiceStatus(displayTranscript);
        }

        if (finalTranscript.trim()) {
          setIsListening(false);
          setSuggestions([]);
          setVoiceStatus(null);
          navigateFromQuery(finalTranscript.trim());
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        const errCode = event?.error || '';
        if (errCode === 'not-allowed' || errCode === 'service-not-allowed') {
          showTemporaryVoiceStatus(
            activeLang === 'bn' ? 'মাইক্রোফোন অনুমতি দিন' : 'Microphone permission denied'
          );
        } else if (errCode === 'no-speech') {
          showTemporaryVoiceStatus(
            activeLang === 'bn' ? 'কোনো কথা শোনা যায়নি' : 'No speech detected'
          );
        } else {
          showTemporaryVoiceStatus(
            activeLang === 'bn' ? 'ভয়েস সার্চ ব্যর্থ হয়েছে' : 'Voice search error'
          );
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
      showTemporaryVoiceStatus('Microphone unavailable');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    if (val.trim().length > 1) {
      const q = val.trim();
      const list: string[] = [];
      if (!q.includes('.')) {
        list.push(`${q} - Private Search`);
        list.push(`${q} youtube`);
        list.push(`${q} wikipedia`);
        list.push(`${q} bangla news`);
      } else {
        list.push(q.startsWith('http') ? q : `https://${q}`);
      }
      setSuggestions(list);
    } else {
      setSuggestions([]);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = inputValue.trim();
    if (!query) return;

    setIsFocused(false);
    setSuggestions([]);
    if (inputRef.current) inputRef.current.blur();
    navigateFromQuery(query);
  };

  const handleSelectSuggestion = (suggestion: string) => {
    const clean = suggestion.replace(' - Private Search', '');
    setInputValue(clean);
    setIsFocused(false);
    setSuggestions([]);
    navigateFromQuery(clean);
  };

  return (
    <div className="relative w-full z-30">
      <form
        onSubmit={handleSubmit}
        className={`w-full flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl sm:rounded-full transition-all duration-200 border ${
          isListening
            ? 'bg-slate-900 border-rose-500/80 shadow-lg shadow-rose-950/40 ring-1 ring-rose-500/40'
            : isFocused
            ? 'bg-slate-900/95 border-cyan-400/80 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-400/30'
            : 'bg-slate-900/80 hover:bg-slate-900 border-slate-700/60 hover:border-slate-600'
        }`}
      >
        {/* Security Indicator (Interactive Site Controls with Real-Time Event Bus State) */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onOpenSiteControls?.();
          }}
          title={
            shieldActive
              ? `Site security & shields active (${blockedTotal} blocked · ${httpsOnlyActive ? 'HTTPS-Only' : 'Standard'})`
              : 'Site security controls (Shields paused)'
          }
          className={`flex items-center gap-1 pl-1 pr-1.5 py-0.5 rounded-full transition-colors cursor-pointer shrink-0 ${
            currentUrl.startsWith('http://')
              ? 'text-amber-400 hover:bg-amber-950/50'
              : shieldActive
              ? 'text-cyan-400 hover:bg-cyan-950/50'
              : 'text-slate-400 hover:bg-slate-800'
          }`}
        >
          <Lock
            className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${
              currentUrl.startsWith('http://')
                ? 'text-amber-400'
                : shieldActive
                ? 'text-emerald-400'
                : 'text-slate-400'
            }`}
          />
          <span className="hidden md:inline-block text-[10px] font-semibold tracking-wider">
            {currentUrl.startsWith('http://') ? 'HTTP' : httpsOnlyActive ? 'HTTPS' : 'SECURE'}
          </span>
        </button>

        {/* Omnibox Input */}
        <div
          onClick={() => {
            if (onOpenSearchOverlay && !isListening) {
              onOpenSearchOverlay();
            }
          }}
          className="relative flex-1 flex items-center min-w-0 cursor-pointer"
        >
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => {
              if (onOpenSearchOverlay && !isListening) {
                inputRef.current?.blur();
                onOpenSearchOverlay();
                return;
              }
              setIsFocused(true);
              if (inputValue === currentUrl) {
                inputRef.current?.select();
              }
            }}
            onBlur={() => {
              setTimeout(() => {
                setIsFocused(false);
                setSuggestions([]);
              }, 200);
            }}
            placeholder={
              isListening
                ? 'Listening for voice search...'
                : 'Search privately or enter URL...'
            }
            className="w-full bg-transparent text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none px-1 py-0.5 font-sans selection:bg-cyan-500/30 truncate"
          />
        </div>

        {/* Clear Button */}
        {inputValue && isFocused && (
          <button
            type="button"
            onClick={() => {
              setInputValue('');
              inputRef.current?.focus();
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded-full transition-colors touch-manipulation shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Hands-Free Voice-to-Text Search Button (Web Speech API) */}
        <button
          type="button"
          onClick={handleToggleVoiceSearch}
          title={isListening ? 'Stop voice search' : 'Voice search (Hands-free)'}
          aria-label={isListening ? 'Stop voice search' : 'Start voice search'}
          className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors shrink-0 touch-manipulation cursor-pointer ${
            isListening
              ? 'bg-rose-600 text-white animate-pulse shadow-md shadow-rose-600/40'
              : 'text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/40'
          }`}
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        {/* Camera Lens Icon - hidden when typing */}
        {onOpenLens && !inputValue && !isListening && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenLens();
            }}
            title="Omarvio Privacy Lens & QR/Barcode Scanner"
            className="hidden xs:flex p-1.5 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/40 rounded-full transition-colors shrink-0 touch-manipulation cursor-pointer"
          >
            <Camera className="w-4 h-4" />
          </button>
        )}

        {/* Quick In-App Search Navigate */}
        <button
          type="button"
          onClick={() => {
            const q = inputValue.trim();
            const target = q ? getSanitizedSearchUrl(q) : 'https://www.google.com';
            onNavigate(target);
          }}
          className="hidden sm:flex p-1.5 text-cyan-400 hover:text-white hover:bg-cyan-950/40 rounded-full transition-colors shrink-0 touch-manipulation cursor-pointer"
          title="In-App Search Navigation"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </button>

        {/* Secure In-App Frame Navigate / Submit button */}
        <button
          type="submit"
          className="w-8 h-8 flex items-center justify-center text-slate-100 hover:text-white bg-blue-600 hover:bg-blue-500 rounded-full transition-colors shadow-sm shrink-0 touch-manipulation active:scale-95 cursor-pointer"
          title="Search / Go"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      {/* Voice Recognition Live Status Pill */}
      {voiceStatus && (
        <div className="absolute top-full left-0 right-0 mt-1.5 px-3 py-2 rounded-xl bg-slate-900/95 border border-cyan-500/40 shadow-xl flex items-center justify-between gap-2 z-50 backdrop-blur-md">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isListening ? 'bg-rose-500 animate-ping' : 'bg-cyan-400'
              }`}
            />
            <span className="text-xs text-slate-100 truncate">{voiceStatus}</span>
          </div>
          {isListening && (
            <button
              type="button"
              onClick={handleToggleVoiceSearch}
              className="text-[11px] font-semibold text-rose-300 hover:text-rose-200 px-2 py-0.5 rounded bg-rose-950/60 shrink-0 cursor-pointer"
            >
              Stop
            </button>
          )}
        </div>
      )}

      {/* Progress Bar */}
      {isLoading && (
        <div className="absolute -bottom-1 left-3 right-3 h-0.5 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 w-1/3 animate-pulse rounded-full" />
        </div>
      )}

      {/* Instant Suggestions Dropdown */}
      {isFocused && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden py-1 z-50 backdrop-blur-md">
          {suggestions.map((item, idx) => (
            <div
              key={idx}
              onMouseDown={() => handleSelectSuggestion(item)}
              className="px-4 py-2 hover:bg-cyan-950/40 text-sm text-slate-200 hover:text-cyan-300 flex items-center justify-between cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2.5 truncate">
                {item.startsWith('http') ? (
                  <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
                ) : (
                  <Search className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                <span className="truncate">{item}</span>
              </div>
              <span className="text-[10px] text-slate-500 shrink-0 pl-2">Select ↵</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
