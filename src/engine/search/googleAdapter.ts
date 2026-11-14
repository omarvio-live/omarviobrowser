/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OMARVIO BROWSER - Module M1 Google Programmable Search API Adapter
 * Uses official JSON API when credentials are provided; falls back gracefully.
 */

import { SearchEngineAdapter, SearchResultItem } from './types';
import { duckduckgoAdapter } from './duckduckgoAdapter';
import { getSearchSecrets } from '../../config/env';

export const googleAdapter: SearchEngineAdapter = {
  id: 'google',
  name: 'Google',
  async search(query: string, page = 1, lang = 'en'): Promise<SearchResultItem[]> {
    const { googleCseKey: key, googleCseCx: cx } = getSearchSecrets();

    if (key && cx) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      try {
        const start = (page - 1) * 10 + 1;
        const apiLang = lang === 'bn' ? 'lang_bn' : 'lang_en';
        const url = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(key)}&cx=${encodeURIComponent(cx)}&q=${encodeURIComponent(query)}&start=${start}&lr=${apiLang}`;

        const res = await fetch(url, { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          if (data.items && Array.isArray(data.items)) {
            return data.items.map((item: any) => {
              const u = item.link || '';
              const lower = u.toLowerCase();
              const lowerTitle = (item.title || '').toLowerCase();
              let category: 'all' | 'news' | 'wiki' | 'tech' | 'video' | 'image' | 'doc' = 'all';
              let thumbnail: string | undefined =
                item.pagemap?.cse_image?.[0]?.src || item.pagemap?.cse_thumbnail?.[0]?.src;

              if (
                lower.endsWith('.pdf') ||
                lower.endsWith('.doc') ||
                lower.endsWith('.docx') ||
                lower.endsWith('.ppt') ||
                lower.endsWith('.pptx') ||
                lowerTitle.includes('[pdf]') ||
                item.fileFormat?.toLowerCase().includes('pdf')
              ) {
                category = 'doc';
              } else if (
                lower.endsWith('.jpg') ||
                lower.endsWith('.jpeg') ||
                lower.endsWith('.png') ||
                lower.endsWith('.webp') ||
                item.mime?.startsWith('image/')
              ) {
                category = 'image';
                thumbnail = thumbnail || u;
              } else if (u.includes('wikipedia.org')) {
                category = 'wiki';
              } else if (u.includes('youtube.com') || u.includes('youtu.be') || u.includes('vimeo.com')) {
                category = 'video';
              } else if (u.includes('github.com') || u.includes('stackoverflow.com')) {
                category = 'tech';
              } else if (u.includes('news')) {
                category = 'news';
              }

              return {
                title: item.title || '',
                url: u,
                displayUrl: item.displayLink || u,
                snippet: item.snippet || '',
                category,
                thumbnail,
              };
            });
          }
        }
      } catch (err) {
        // Fallback on timeout or API error
      } finally {
        clearTimeout(timeout);
      }
    }

    // Graceful fallback to DuckDuckGo adapter
    return duckduckgoAdapter.search(query, page, lang);
  },
};
