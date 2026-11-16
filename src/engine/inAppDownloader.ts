/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OMARVIO BROWSER - 100% In-App Blob & Storage Downloader Engine
 * Keeps all downloads strictly inside OmarVio without leaking to external Chrome!
 * Copyright (c) OMARVIO GLOBAL LTD.
 * Slogan: "My Phone, My Data – Why Surrender It To Others!"
 */

import { addLocalDownload, SavedDownloadItem } from './mediaSaver';
import { notifyDownloadCaptured } from './proxy';
import { registerDownloadInAndroid } from './nativeBridge';

export interface InAppDownloadResult {
  success: boolean;
  message: string;
  item?: SavedDownloadItem;
  blobUrl?: string;
}

/**
 * Downloads a web file or media stream directly into OmarVio's internal Blob vault
 * using CORS + server /api/proxy-download fallback so downloads stay inside Omarvio.
 */
export const downloadFileInApp = async (
  fileUrl: string,
  preferredName?: string,
  type?: 'pdf' | 'doc' | 'audio' | 'video'
): Promise<InAppDownloadResult> => {
  if (!fileUrl) {
    return { success: false, message: '⚠️ ডাউনলোডের জন্য কোনো লিংক পাওয়া যায়নি' };
  }

  try {
    let filename = preferredName || '';
    if (!filename) {
      try {
        const u = new URL(fileUrl, window.location.origin);
        const segments = u.pathname.split('/');
        filename = segments[segments.length - 1] || 'downloaded_file';
      } catch {
        filename = `file_${Date.now()}`;
      }
    }

    let determinedType: 'pdf' | 'doc' | 'audio' | 'video' = type || 'doc';
    const lowerName = filename.toLowerCase();
    if (lowerName.endsWith('.pdf')) determinedType = 'pdf';
    else if (lowerName.match(/\.(mp3|m4a|wav|ogg|aac)$/)) determinedType = 'audio';
    else if (lowerName.match(/\.(mp4|webm|mkv|mov)$/)) determinedType = 'video';
    else if (lowerName.match(/\.(txt|md|csv|json|html|docx?|xlsx?|apk)$/)) determinedType = 'doc';

    let blobUrl = fileUrl;
    let sizeStr = 'Saved In-App';

    const tryFetchBlob = async (target: string): Promise<Blob | null> => {
      try {
        const response = await fetch(target, { mode: 'cors' });
        if (response.ok) {
          return await response.blob();
        }
      } catch {}
      return null;
    };

    // 1. Try direct fetch first, then proxy-download fallback so CORS never breaks in-app storage
    let blob = await tryFetchBlob(fileUrl);
    if (!blob && typeof window !== 'undefined' && /^https?:\/\//i.test(fileUrl)) {
      const proxied = `/api/proxy-download?url=${encodeURIComponent(fileUrl)}&filename=${encodeURIComponent(filename)}`;
      blob = await tryFetchBlob(proxied);
    }

    if (blob) {
      blobUrl = URL.createObjectURL(blob);
      const sizeBytes = blob.size;
      if (sizeBytes < 1024 * 1024) {
        sizeStr = `${Math.max(0.1, sizeBytes / 1024).toFixed(1)} KB`;
      } else {
        sizeStr = `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
      }
    } else {
      sizeStr = 'In-App Link';
    }

    // 2. Save to OmarVio's Internal Downloads Hub + Notify Observers + Sync with Android Shell
    const newItem: SavedDownloadItem = {
      id: `dl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: filename,
      type: determinedType,
      size: sizeStr,
      date: 'আজকে (ইন-অ্যাপ)',
      url: blobUrl,
    };

    addLocalDownload(newItem);
    notifyDownloadCaptured(newItem);
    registerDownloadInAndroid(fileUrl, filename, determinedType);

    return {
      success: true,
      message: `📥 ওমারভিও ডাউনলোড হাব-এ সংরক্ষিত হয়েছে: ${filename}`,
      item: newItem,
      blobUrl,
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: `ডাউনলোড ত্রুটি: ${(err as Error)?.message || 'ফাইল সেভ করা সম্ভব হয়নি'}`,
    };
  }
};

/**
 * Saves a clean webpage or article as an offline document in OmarVio
 */
export const saveWebpageArticleOffline = (
  title: string,
  url: string,
  content: string
): InAppDownloadResult => {
  const cleanTitle = title.trim() || 'Offline_Article';
  const filename = `${cleanTitle.replace(/[^a-zA-Z0-9_\u0980-\u09FF]/g, '_')}.txt`;

  const blob = new Blob([`${cleanTitle}\nউৎস: ${url}\nতারিখ: ${new Date().toLocaleString()}\n\n${content}`], {
    type: 'text/plain;charset=utf-8',
  });
  const blobUrl = URL.createObjectURL(blob);

  const newItem: SavedDownloadItem = {
    id: `dl-article-${Date.now()}`,
    title: filename,
    type: 'doc',
    size: `${(blob.size / 1024).toFixed(1)} KB`,
    date: 'আজকে (ইন-অ্যাপ)',
    url: blobUrl,
  };

  addLocalDownload(newItem);
  notifyDownloadCaptured(newItem);

  return {
    success: true,
    message: `📄 আর্টিকেলটি ওমারভিও অফলাইন হাব-এ সেভ হয়েছে!`,
    item: newItem,
    blobUrl,
  };
};
