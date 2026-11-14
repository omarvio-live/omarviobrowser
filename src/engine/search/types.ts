/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OMARVIO BROWSER - Module M1 Search Gateway Adapter Types
 */

export interface SearchResultItem {
  title: string;
  url: string;
  displayUrl: string;
  snippet: string;
  category?: 'all' | 'news' | 'wiki' | 'tech' | 'video' | 'image' | 'doc';
  thumbnail?: string;
  mimeType?: string;
  source?: string;
}

export interface SearchResponse {
  engine: string;
  query: string;
  results: SearchResultItem[];
  meta: {
    page: number;
    tookMs: number;
    fallbackUsed?: boolean;
    cached?: boolean;
  };
}

export interface SearchEngineAdapter {
  id: string;
  name: string;
  search(query: string, page?: number, lang?: string): Promise<SearchResultItem[]>;
}
