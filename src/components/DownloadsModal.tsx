/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Download,
  FileText,
  Music,
  Video,
  Trash2,
  FolderOpen,
  ArrowLeft,
  Play,
  Pause,
  X,
} from 'lucide-react';
import { getLocalDownloads, removeLocalDownload, SavedDownloadItem } from '../engine/mediaSaver';
import { subscribeDownloadObserver } from '../engine/proxy';

export type DownloadedItem = SavedDownloadItem;

interface DownloadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDocument: (item: DownloadedItem) => void;
  onToast: (msg: string) => void;
}

export const DownloadsModal: React.FC<DownloadsModalProps> = ({
  isOpen,
  onClose,
  onOpenDocument,
  onToast,
}) => {
  const [items, setItems] = useState<DownloadedItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'video' | 'audio' | 'doc'>('all');
  const [playingId, setPlayingId] = useState<string | null>(null);

  // Load saved items on open
  useEffect(() => {
    if (isOpen) {
      setItems(getLocalDownloads());
    } else {
      setPlayingId(null);
    }
  }, [isOpen]);

  // Hook directly into browser's native download observer
  useEffect(() => {
    const unsubscribe = subscribeDownloadObserver((capturedItem) => {
      setItems((prev) => [capturedItem, ...prev.filter((i) => i.id !== capturedItem.id)]);
      if (isOpen) {
        onToast(`📥 ওমারভিও ডাউনলোড হিস্ট্রিতে সংরক্ষিত হয়েছে: ${capturedItem.title}`);
      }
    });
    return unsubscribe;
  }, [isOpen, onToast]);

  if (!isOpen) return null;

  const filtered = items.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'video') return item.type === 'video';
    if (filter === 'audio') return item.type === 'audio';
    if (filter === 'doc') return item.type === 'pdf' || item.type === 'doc';
    return true;
  });

  const handleDelete = (id: string) => {
    const updated = removeLocalDownload(id);
    setItems(updated);
    if (playingId === id) setPlayingId(null);
    onToast('🗑️ ফাইলটি অফলাইন স্টোরেজ থেকে মুছে ফেলা হয়েছে');
  };

  const handlePlayToggle = (item: DownloadedItem) => {
    if (playingId === item.id) {
      setPlayingId(null);
    } else {
      setPlayingId(item.id);
      onToast(`▶️ প্লে হচ্ছে: ${item.title}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col p-4 animate-fadeIn select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-950 border border-blue-500/40 flex items-center justify-center text-cyan-400">
            <Download className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5 flex-wrap">
              <span>Downloads & Offline Hub</span>
              <span className="text-[10px] text-cyan-400 font-medium px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-500/30">
                {items.length} Files
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[9px] font-bold text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                নেটিভ অবজারভার সক্রিয়
              </span>
            </h3>
            <p className="text-[10px] text-slate-400">
              Saved videos, audio, and offline documents (100% In-App)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white text-xs font-bold transition-all border border-slate-700 shadow-sm active:scale-95"
        >
          <ArrowLeft className="w-4 h-4 text-cyan-400" />
          <span>Back</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 py-3 border-b border-slate-800/60 overflow-x-auto no-scrollbar">
        {(['all', 'video', 'audio', 'doc'] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setFilter(type)}
            className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              filter === type
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            {type === 'doc' ? 'PDF & Docs' : type}
          </button>
        ))}
      </div>

      {/* Files List */}
      <div className="flex-1 overflow-y-auto py-3 space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            এই ক্যাটাগরিতে কোনো ডাউনলোড করা ফাইল নেই।
          </div>
        ) : (
          filtered.map((file) => {
            const isPlaying = playingId === file.id;
            return (
              <div
                key={file.id}
                className="flex flex-col p-3 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors gap-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 text-cyan-400">
                      {file.type === 'video' && <Video className="w-5 h-5" />}
                      {file.type === 'audio' && <Music className="w-5 h-5" />}
                      {(file.type === 'pdf' || file.type === 'doc') && (
                        <FileText className="w-5 h-5" />
                      )}
                    </div>

                    <div className="truncate">
                      <p className="text-xs font-bold text-slate-200 truncate">{file.title}</p>
                      <p className="text-[10px] text-slate-400">
                        {file.size} · {file.date}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {file.type === 'pdf' || file.type === 'doc' ? (
                      <button
                        type="button"
                        onClick={() => {
                          onOpenDocument(file);
                          onClose();
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors cursor-pointer"
                      >
                        <FolderOpen className="w-3.5 h-3.5" /> Read
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handlePlayToggle(file)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                          isPlaying
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                        }`}
                      >
                        {isPlaying ? (
                          <>
                            <Pause className="w-3.5 h-3.5" /> Pause
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5" /> Play
                          </>
                        )}
                      </button>
                    )}

                    <a
                      href={file.url}
                      download={file.title}
                      className="p-1.5 text-slate-400 hover:text-cyan-400 rounded-lg hover:bg-slate-800 transition-colors"
                      title="Save to device storage"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>

                    <button
                      type="button"
                      onClick={() => handleDelete(file.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Inline Player preview if playing */}
                {isPlaying && (
                  <div className="w-full pt-2 border-t border-slate-800/80">
                    {file.type === 'video' ? (
                      <video
                        src={file.url}
                        controls
                        autoPlay
                        className="w-full rounded-xl max-h-48 bg-black object-contain"
                      />
                    ) : (
                      <audio src={file.url} controls autoPlay className="w-full h-8" />
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Sticky Bottom Back Button */}
      <div className="pt-2 border-t border-slate-800">
        <button
          type="button"
          onClick={onClose}
          className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 text-xs font-bold transition-all shadow-sm active:scale-98 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-cyan-400" />
          <span>← Back to Browser / ব্রাউজারে ফিরে যান</span>
        </button>
      </div>
    </div>
  );
};
