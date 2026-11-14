/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OMARVIO BROWSER - Cloudflare Pages Edge Search Gateway Function (/api/search)
 * Module M1: Multi-engine support, KV cache, 3-second timeout, normalized output.
 */

interface Env {
  KV_BINDING?: any;
  OMARVIO_KV?: any;
  KV?: any;
  GOOGLE_CSE_KEY?: string;
  GOOGLE_CSE_CX?: string;
  BRAVE_API_KEY?: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const kv = env.KV_BINDING || env.OMARVIO_KV || env.KV;
  const urlObj = new URL(request.url);
  const q = (urlObj.searchParams.get('q') || '').trim();
  const engine = (urlObj.searchParams.get('engine') || 'google').toLowerCase();
  const page = parseInt(urlObj.searchParams.get('page') || '1', 10);
  const isBengali = /[\u0980-\u09FF]/.test(q);
  const lang = urlObj.searchParams.get('lang') || (isBengali ? 'bn' : 'en');

  const startMs = Date.now();

  if (!q) {
    return new Response(
      JSON.stringify({
        engine,
        query: '',
        results: [],
        meta: { page: 1, tookMs: 0 },
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }

  const cacheKey = `search_v2_${engine}_${page}_${encodeURIComponent(q.toLowerCase())}`;

  // 1. Check Cloudflare KV Cache
  if (kv) {
    try {
      const cached = await kv.get(cacheKey, 'json');
      if (cached) {
        return new Response(JSON.stringify(cached), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'X-Omarvio-KV-Cache': 'HIT',
          },
        });
      }
    } catch {}
  }

  try {
    let results: Array<{ title: string; url: string; displayUrl: string; snippet: string; category?: string; thumbnail?: string }> = [];

    // DuckDuckGo Isolated HTML fetcher
    const fetchDuckDuckGo = async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      try {
        const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
        const r = await fetch(ddgUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': lang === 'bn' ? 'bn,en;q=0.8' : 'en-US,en;q=0.9,bn;q=0.8',
          },
          signal: controller.signal,
        });
        const html = await r.text();
        const blocks = html.split(/class=\"result\s+results_links/);
        const ddgItems: typeof results = [];

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
            const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '';
            const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : '';
            if (title && cleanUrl.startsWith('http')) {
              let category = 'all';
              let thumbnail: string | undefined;
              const lower = cleanUrl.toLowerCase();
              const lowerTitle = title.toLowerCase();

              if (
                lower.endsWith('.pdf') ||
                lower.endsWith('.doc') ||
                lower.endsWith('.docx') ||
                lower.endsWith('.ppt') ||
                lower.endsWith('.pptx') ||
                lowerTitle.includes('[pdf]')
              ) {
                category = 'doc';
              } else if (
                lower.endsWith('.jpg') ||
                lower.endsWith('.jpeg') ||
                lower.endsWith('.png') ||
                lower.endsWith('.webp') ||
                lower.includes('unsplash.com') ||
                lower.includes('imgur.com')
              ) {
                category = 'image';
                thumbnail = cleanUrl;
              } else if (cleanUrl.includes('wikipedia.org')) {
                category = 'wiki';
              } else if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) {
                category = 'video';
                const ytMatch = cleanUrl.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/);
                if (ytMatch) {
                  thumbnail = `https://i.ytimg.com/vi/${ytMatch[1]}/hqdefault.jpg`;
                }
              } else if (cleanUrl.includes('github.com')) {
                category = 'tech';
              } else if (cleanUrl.includes('news')) {
                category = 'news';
              }

              let displayUrl = cleanUrl;
              try {
                displayUrl = new URL(cleanUrl).hostname;
              } catch {}

              ddgItems.push({ title, url: cleanUrl, displayUrl, snippet, category, thumbnail });
            }
          }
        }
        return ddgItems;
      } finally {
        clearTimeout(timeout);
      }
    };

    results = await fetchDuckDuckGo();

    // If DuckDuckGo yielded no results on edge IP, fallback to Bing & Wikipedia
    if (results.length === 0) {
      try {
        const bingRes = await fetch(
          `https://www.bing.com/search?q=${encodeURIComponent(q)}&setlang=${lang === 'bn' ? 'bn' : 'en'}`,
          {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
          }
        );
        const bingHtml = await bingRes.text();
        const blocks = bingHtml.split('<li class="b_algo"');
        for (const b of blocks.slice(1, 15)) {
          const titleMatch = b.match(/<h2[^>]*><a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a><\/h2>/);
          if (!titleMatch) continue;
          let rawUrl = titleMatch[1];
          const title = titleMatch[2].replace(/<[^>]+>/g, '').trim();

          const cleanHref = rawUrl.replace(/&amp;/g, '&');
          const uMatch = cleanHref.match(/[?&]u=([^&]+)/);
          if (uMatch) {
            let b64 = uMatch[1];
            if (b64.startsWith('a1')) b64 = b64.slice(2);
            try {
              const binStr = atob(b64.replace(/-/g, '+').replace(/_/g, '/'));
              const bytes = new Uint8Array(binStr.length);
              for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
              rawUrl = new TextDecoder().decode(bytes);
            } catch {}
          }

          const snipMatch = b.match(/<p class="b_lineclamp[^"]*"[^>]*>([\s\S]*?)<\/p>/) || b.match(/<p[^>]*>([\s\S]*?)<\/p>/);
          const snippet = snipMatch ? snipMatch[1].replace(/<[^>]+>/g, '').trim() : '';

          let displayUrl = rawUrl;
          try {
            displayUrl = new URL(rawUrl).hostname;
          } catch {}

          if (title && rawUrl.startsWith('http')) {
            results.push({ title, url: rawUrl, displayUrl, snippet, category: 'all' });
          }
        }
      } catch {}
    }

    if (results.length === 0) {
      try {
        const wikiLang = lang === 'bn' ? 'bn' : 'en';
        const wRes = await fetch(
          `https://${wikiLang}.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(q)}&limit=8&namespace=0&format=json`
        );
        const wData: any = await wRes.json();
        const titles: string[] = wData[1] || [];
        const snippets: string[] = wData[2] || [];
        const urls: string[] = wData[3] || [];
        for (let i = 0; i < titles.length; i++) {
          if (urls[i] && titles[i]) {
            results.push({
              title: titles[i],
              url: urls[i],
              displayUrl: `${wikiLang}.wikipedia.org`,
              snippet: snippets[i] || `উইকিপিডিয়া নিবন্ধ: ${titles[i]}`,
              category: 'wiki',
            });
          }
        }
      } catch {}
    }

    const payload = {
      engine,
      query: q,
      results,
      meta: {
        page,
        tookMs: Date.now() - startMs,
      },
    };

    // Save to Cloudflare KV Cache (600s TTL)
    if (kv && results.length > 0) {
      try {
        await kv.put(cacheKey, JSON.stringify(payload), { expirationTtl: 600 });
      } catch {}
    }

    return new Response(JSON.stringify(payload), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        engine,
        query: q,
        results: [],
        meta: { page, tookMs: Date.now() - startMs, error: err.message },
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
};
