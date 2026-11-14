/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OMARVIO BROWSER - Cloudflare Pages Search Suggestions (/api/suggest)
 */

export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const q = (url.searchParams.get('q') || '').trim();

  if (!q) {
    return new Response(JSON.stringify({ suggestions: [] }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  try {
    const googleSuggestUrl = `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(q)}`;
    const r = await fetch(googleSuggestUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      },
    });

    if (r.ok) {
      const data: any = await r.json();
      if (Array.isArray(data) && Array.isArray(data[1])) {
        return new Response(JSON.stringify({ suggestions: data[1].slice(0, 8) }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=300',
          },
        });
      }
    }
  } catch {}

  // Fallback heuristic suggestions
  const fallback = [
    `${q} - Private Search`,
    `${q} youtube`,
    `${q} wikipedia`,
    `${q} bangla news`,
  ];

  return new Response(JSON.stringify({ suggestions: fallback }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
};
