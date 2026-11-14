/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OMARVIO BROWSER - Module M1 DuckDuckGo Isolated Search Adapter
 */

import { SearchEngineAdapter, SearchResultItem } from './types';

export const duckduckgoAdapter: SearchEngineAdapter = {
  id: 'duckduckgo',
  name: 'DuckDuckGo',
  async search(query: string, page = 1, lang = 'en'): Promise<SearchResultItem[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    try {
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': lang === 'bn' ? 'bn,en;q=0.8' : 'en-US,en;q=0.9,bn;q=0.8',
        },
        signal: controller.signal,
      });

      const html = await response.text();
      const blocks = html.split(/class=\"result\s+results_links/);
      const results: SearchResultItem[] = [];

      for (const b of blocks.slice(1, 15)) {
        const titleMatch = b.match(/<a[^>]*class=\"result__a\"[^>]*>([\s\S]*?)<\/a>/);
        const snippetMatch = b.match(/<a class=\"result__snippet\"[^>]*>([\s\S]*?)<\/a>/);
        const urlMatch = b.match(/class=\"result__snippet\"[^>]*href=\"([^\"]+)\"/);

        if (urlMatch) {
          let cleanUrl = urlMatch[1];
          const m = cleanUrl.match(/uddg=([^&]+)/);
          if (m) {
            try {
              cleanUrl = decodeURIComponent(m[1]);
            } catch {}
          }

          let title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '';
          let snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : '';

          let displayUrl = cleanUrl;
          try {
            const parsed = new URL(cleanUrl);
            displayUrl = `${parsed.hostname}${parsed.pathname !== '/' ? parsed.pathname : ''}`;
          } catch {}

          if (title && cleanUrl.startsWith('http')) {
            results.push({
              title,
              url: cleanUrl,
              displayUrl,
              snippet,
              category: categorizeUrl(cleanUrl, title),
            });
          }
        }
      }

      // If DuckDuckGo yielded no results or was challenged, query Bing directly
      if (results.length === 0) {
        const bingResults = await fetchBingResults(query, lang);
        if (bingResults.length > 0) {
          return bingResults;
        }
      }

      // If still empty, query Wikipedia OpenSearch API
      if (results.length === 0) {
        const wikiResults = await fetchWikipediaResults(query, lang);
        if (wikiResults.length > 0) {
          return wikiResults;
        }
      }

      return results;
    } catch {
      // In case of timeout or network error, fallback to Bing & Wikipedia
      const bingResults = await fetchBingResults(query, lang);
      if (bingResults.length > 0) return bingResults;
      return fetchWikipediaResults(query, lang);
    } finally {
      clearTimeout(timeout);
    }
  },
};

function categorizeUrl(url: string, title: string): 'all' | 'news' | 'wiki' | 'tech' | 'video' | 'image' | 'doc' {
  const lower = url.toLowerCase();
  const lowerTitle = title.toLowerCase();

  if (
    lower.endsWith('.pdf') ||
    lower.endsWith('.doc') ||
    lower.endsWith('.docx') ||
    lower.endsWith('.ppt') ||
    lower.endsWith('.pptx') ||
    lowerTitle.includes('[pdf]')
  ) {
    return 'doc';
  }
  if (lower.includes('youtube.com') || lower.includes('youtu.be') || lower.includes('vimeo.com')) {
    return 'video';
  }
  if (
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.png') ||
    lower.endsWith('.webp')
  ) {
    return 'image';
  }
  if (lower.includes('wikipedia.org') || lower.includes('britannica.com')) {
    return 'wiki';
  }
  if (
    lower.includes('news') ||
    lower.includes('prothomalo.com') ||
    lower.includes('bbc.com') ||
    lower.includes('bdnews24.com') ||
    lower.includes('reuters.com')
  ) {
    return 'news';
  }
  if (lower.includes('github.com') || lower.includes('stackoverflow.com')) {
    return 'tech';
  }
  return 'all';
}

async function fetchBingResults(query: string, lang = 'bn'): Promise<SearchResultItem[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=${lang === 'bn' ? 'bn' : 'en'}`, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': lang === 'bn' ? 'bn,en-US;q=0.8' : 'en-US,en;q=0.9',
      },
    });
    clearTimeout(timeout);
    const html = await res.text();
    const items: SearchResultItem[] = [];
    const blocks = html.split('<li class="b_algo"');

    for (const b of blocks.slice(1, 15)) {
      const titleMatch = b.match(/<h2[^>]*><a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a><\/h2>/);
      if (!titleMatch) continue;
      let rawUrl = titleMatch[1];
      const title = titleMatch[2].replace(/<[^>]+>/g, '').trim();

      // Unwrap Bing tracking redirect into destination website
      const cleanHref = rawUrl.replace(/&amp;/g, '&');
      const uMatch = cleanHref.match(/[?&]u=([^&]+)/);
      if (uMatch) {
        let b64 = uMatch[1];
        if (b64.startsWith('a1')) b64 = b64.slice(2);
        try {
          rawUrl = Buffer.from(b64, 'base64').toString('utf8');
        } catch {}
      }

      const snipMatch = b.match(/<p class="b_lineclamp[^"]*"[^>]*>([\s\S]*?)<\/p>/) || b.match(/<p[^>]*>([\s\S]*?)<\/p>/);
      const snippet = snipMatch ? snipMatch[1].replace(/<[^>]+>/g, '').trim() : '';

      let displayUrl = rawUrl;
      try {
        const parsed = new URL(rawUrl);
        displayUrl = `${parsed.hostname}${parsed.pathname !== '/' ? parsed.pathname : ''}`;
      } catch {}

      if (title && rawUrl.startsWith('http')) {
        items.push({
          title,
          url: rawUrl,
          displayUrl,
          snippet,
          category: categorizeUrl(rawUrl, title),
        });
      }
    }
    return items;
  } catch {
    return [];
  }
}

async function fetchWikipediaResults(query: string, lang = 'bn'): Promise<SearchResultItem[]> {
  try {
    const wikiLang = lang === 'bn' ? 'bn' : 'en';
    const res = await fetch(`https://${wikiLang}.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=8&namespace=0&format=json`);
    const data = await res.json();
    const titles: string[] = data[1] || [];
    const snippets: string[] = data[2] || [];
    const urls: string[] = data[3] || [];

    const items: SearchResultItem[] = [];
    for (let i = 0; i < titles.length; i++) {
      if (urls[i] && titles[i]) {
        items.push({
          title: titles[i],
          url: urls[i],
          displayUrl: `${wikiLang}.wikipedia.org`,
          snippet: snippets[i] || `উইকিপিডিয়া নিবন্ধ: ${titles[i]}`,
          category: 'wiki',
        });
      }
    }
    return items;
  } catch {
    return [];
  }
}
