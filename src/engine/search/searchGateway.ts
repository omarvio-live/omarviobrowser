/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OMARVIO BROWSER - Module M1 Search Gateway Dispatcher
 * Normalized responses, 3s provider timeout, 10-minute cache, auto-fallback.
 */

import { SearchEngineAdapter, SearchResponse, SearchResultItem } from './types';
import { duckduckgoAdapter } from './duckduckgoAdapter';
import { googleAdapter } from './googleAdapter';
import { braveAdapter } from './braveAdapter';

const adapters: Record<string, SearchEngineAdapter> = {
  duckduckgo: duckduckgoAdapter,
  google: googleAdapter,
  brave: braveAdapter,
};

// 10-minute in-memory LRU search cache
interface CacheRecord {
  data: SearchResponse;
  expires: number;
}
const searchCache = new Map<string, CacheRecord>();

function getCacheKey(engine: string, query: string, page: number, lang: string): string {
  return `${engine}:${lang}:${page}:${query.toLowerCase().trim()}`;
}

export async function executeGatewaySearch(
  engineId = 'google',
  query: string,
  page = 1,
  lang = 'bn'
): Promise<SearchResponse> {
  const cleanQ = query.trim();
  if (!cleanQ) {
    return {
      engine: engineId,
      query: '',
      results: [],
      meta: { page: 1, tookMs: 0 },
    };
  }

  const cacheKey = getCacheKey(engineId, cleanQ, page, lang);
  const now = Date.now();
  const cached = searchCache.get(cacheKey);
  if (cached && cached.expires > now) {
    return {
      ...cached.data,
      meta: {
        ...cached.data.meta,
        cached: true,
      },
    };
  }

  const startMs = Date.now();
  const primaryAdapter = adapters[engineId] || adapters.google || duckduckgoAdapter;
  let results: SearchResultItem[] = [];
  let fallbackUsed = false;

  try {
    results = await primaryAdapter.search(cleanQ, page, lang);
  } catch (err) {
    // Primary failed
  }

  // Auto-fallback to duckduckgo if primary yielded no results
  if ((!results || results.length === 0) && primaryAdapter.id !== 'duckduckgo') {
    try {
      results = await duckduckgoAdapter.search(cleanQ, page, lang);
      fallbackUsed = true;
    } catch (e) {
      results = [];
    }
  }

  const response: SearchResponse = {
    engine: primaryAdapter.id,
    query: cleanQ,
    results,
    meta: {
      page,
      tookMs: Date.now() - startMs,
      fallbackUsed,
      cached: false,
    },
  };

  // Cache for 10 minutes
  if (results.length > 0) {
    searchCache.set(cacheKey, {
      data: response,
      expires: now + 10 * 60 * 1000,
    });
    // Evict oldest if cache exceeds 150 items
    if (searchCache.size > 150) {
      const firstKey = searchCache.keys().next().value;
      if (firstKey) searchCache.delete(firstKey);
    }
  }

  return response;
}

/**
 * Autocomplete suggestions endpoint helper
 */
export async function fetchSearchSuggestions(query: string, engine = 'google'): Promise<string[]> {
  const cleanQ = query.trim();
  if (!cleanQ) return [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2000);

  try {
    const url = `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(cleanQ)}`;
    const res = await fetch(url, { signal: controller.signal });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && Array.isArray(data[1])) {
        return data[1].slice(0, 8);
      }
    }
  } catch {
  } finally {
    clearTimeout(timeout);
  }

  return [];
}
