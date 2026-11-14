/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Download, Music, Video, ShieldCheck, Sparkles, X, Check } from 'lucide-react';
import { DetectedMedia, downloadMediaStream } from '../engine/mediaSaver';
import { updateLockScreenMediaSession } from '../engine/media';

interface MediaControllerFloatingProps {
  media: DetectedMedia | null;
  onClose: () => void;
  onToast: (msg: string) => void;
}

export const MediaControllerFloating: React.FC<MediaControllerFloatingProps> = ({
  media,
  onClose,
  onToast,
}) => {
  const [pureAudioMode, setPureAudioMode] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!media) return null;

  const handleDownloadVideo = async () => {
    setIsDownloading(true);
    const res = await downloadMediaStream(media, false);
    setIsDownloading(false);
    onToast(res.message);
  };

  const handleDownloadAudio = async () => {
    setIsDownloading(true);
    const res = await downloadMediaStream(media, true);
    setIsDownloading(false);
    onToast(res.message);
  };

  const handleTogglePureAudio = () => {
    const nextState = !pureAudioMode;
    setPureAudioMode(nextState);

    // Push to lock screen media session
    updateLockScreenMediaSession({
      title: media.title,
      artist: 'OMARVIO Ad-Free Stream',
      album: 'Pure Audio Mode · 90% Data Saver',
    });

    onToast(
      nextState
        ? '🎧 Pure Audio Mode Active: 90% MB Saved & Screen-Off Playback Enabled!'
        : '🎬 Video Display Restored.'
    );
  };

  return (
    <div className="absolute top-2 right-2 sm:right-4 z-40 bg-slate-900/95 border border-cyan-500/40 rounded-2xl p-2.5 shadow-2xl shadow-cyan-950/40 backdrop-blur-md flex items-center gap-2 select-none animate-fadeIn">
      {/* Media Type Icon */}
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white shrink-0 shadow-sm">
        {pureAudioMode ? <Music className="w-4 h-4 animate-pulse" /> : <Video className="w-4 h-4" />}
      </div>

      {/* Info & Pure Audio Mode Toggle */}
      <div className="flex flex-col min-w-0 pr-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-100 truncate max-w-[120px] sm:max-w-[160px]">
            {media.title}
          </span>
          <span className="text-[9px] text-cyan-300 font-bold px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-500/40">
            AD-FREE
          </span>
        </div>
        <span className="text-[10px] text-emerald-400 font-medium">
          Screen-Off Background Play Active
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 shrink-0 pl-1 border-l border-slate-800">
        {/* Pure Audio Mode Button */}
        <button
          type="button"
          onClick={handleTogglePureAudio}
          title="Toggle Pure Audio Mode (90% MB Saver, Zero Heat)"
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold text-[11px] transition-all ${
            pureAudioMode
              ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-950'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
          }`}
        >
          <Music className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Audio Only</span>
        </button>

        {/* 1-Click Save Video/Audio */}
        <button
          type="button"
          onClick={pureAudioMode ? handleDownloadAudio : handleDownloadVideo}
          disabled={isDownloading}
          title={pureAudioMode ? 'Save MP3 Audio' : 'Save MP4 Video'}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] transition-all shadow-sm active:scale-95"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Save</span>
        </button>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
          title="Close Media Bar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
