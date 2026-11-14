/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OMARVIO BROWSER - Module M1 Brave Search API Adapter
 * Uses official Brave Search API when key is available; falls back gracefully.
 */

import { SearchEngineAdapter, SearchResultItem } from './types';
import { duckduckgoAdapter } from './duckduckgoAdapter';
import { getSearchSecrets } from '../../config/env';

export const braveAdapter: SearchEngineAdapter = {
  id: 'brave',
  name: 'Brave Search',
  async search(query: string, page = 1, lang = 'en'): Promise<SearchResultItem[]> {
    const { braveApiKey: key } = getSearchSecrets();

    if (key) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      try {
        const offset = page - 1;
        const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&offset=${offset}`;

        const res = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip',
            'X-Subscription-Token': key,
          },
          signal: controller.signal,
        });

        if (res.ok) {
          const data = await res.json();
          if (data.web && Array.isArray(data.web.results)) {
            return data.web.results.map((item: any) => {
              const u = item.url || '';
              let category: 'all' | 'news' | 'wiki' | 'tech' | 'video' = 'all';
              if (u.includes('wikipedia.org')) category = 'wiki';
              else if (u.includes('youtube.com') || u.includes('youtu.be')) category = 'video';
              else if (u.includes('github.com') || u.includes('stackoverflow.com')) category = 'tech';
              else if (u.includes('news')) category = 'news';

              return {
                title: item.title || '',
                url: u,
                displayUrl: item.profile?.name || u,
                snippet: item.description || '',
                category,
              };
            });
          }
        }
      } catch (err) {
        // Fallback on timeout or API rate limit
      } finally {
        clearTimeout(timeout);
      }
    }

    // Graceful fallback to DuckDuckGo
    return duckduckgoAdapter.search(query, page, lang);
  },
};
