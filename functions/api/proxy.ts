/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OMARVIO BROWSER - Cloudflare Pages Edge Proxy Function (/api/proxy)
 * Runs directly on Cloudflare Edge Workers network with zero cold start.
 * Strips X-Frame-Options, CSP, and CORS, and injects OmarVio in-tab navigation bridge.
 */

interface Env {
  OMARVIO_KV?: any;
  OMARVIO_DB?: any;
  OMARVIO_BUCKET?: any;
  AI?: any;
  APP_NAME?: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request } = context;
  const urlObj = new URL(request.url);
  let targetUrl = urlObj.searchParams.get('url');

  if (!targetUrl && request.method === 'POST') {
    try {
      const body = await request.json() as any;
      targetUrl = body?.url;
    } catch {}
  }

  if (!targetUrl) {
    return new Response('Missing url query parameter', { status: 400 });
  }

  // Unwrap any recursive nested proxy query
  if (targetUrl.includes('/api/proxy?url=')) {
    try {
      const u = new URL(targetUrl, 'http://localhost');
      const unwrapped = u.searchParams.get('url');
      if (unwrapped) targetUrl = unwrapped;
    } catch {}
  }

  // Auto-normalize scheme
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = `https://${targetUrl}`;
  }

  // Optimize platforms to lightweight mobile web variants and unwrap redirects
  try {
    const u = new URL(targetUrl);
    const host = u.hostname.toLowerCase();

    // DuckDuckGo: route to pure HTML version (guarantees 100% iframe/WebView compatibility without Webpack errors)
    if (host === 'duckduckgo.com' || host === 'www.duckduckgo.com') {
      u.hostname = 'html.duckduckgo.com';
      if (!u.pathname || u.pathname === '/') {
        if (u.searchParams.has('q')) {
          u.pathname = '/html/';
        }
      }
      targetUrl = u.toString();
    } else if (host === 'youtube.com' || host === 'www.youtube.com' || host === 'm.m.youtube.com') {
      u.hostname = 'm.youtube.com';
      targetUrl = u.toString();
    } else if (host === 'facebook.com' || host === 'www.facebook.com' || host === 'm.m.facebook.com' || host === 'www.m.facebook.com') {
      u.hostname = 'm.facebook.com';
      targetUrl = u.toString();
    } else if (host === 'wikipedia.org' || host === 'www.wikipedia.org' || host === 'm.m.wikipedia.org') {
      u.hostname = 'm.wikipedia.org';
      targetUrl = u.toString();
    }

    // Auto-unwrap search redirects (Google /url?q=, DuckDuckGo /l/?uddg=, Facebook l.php?u=)
    if (host.includes('google.') && u.pathname.startsWith('/url')) {
      const realTarget = u.searchParams.get('q') || u.searchParams.get('url');
      if (realTarget && (realTarget.startsWith('http://') || realTarget.startsWith('https://'))) {
        targetUrl = realTarget;
      }
    } else if (host.includes('duckduckgo.com') && (u.searchParams.has('uddg') || u.pathname.startsWith('/l/'))) {
      const uddg = u.searchParams.get('uddg');
      if (uddg) {
        try {
          const decoded = decodeURIComponent(uddg);
          if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
            targetUrl = decoded;
          }
        } catch {}
      }
    } else if (host.includes('facebook.com') && (u.pathname.includes('/flx/warn/') || u.pathname.includes('/l.php'))) {
      const uParam = u.searchParams.get('u');
      if (uParam) {
        try {
          const decoded = decodeURIComponent(uParam);
          if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
            targetUrl = decoded;
          }
        } catch {}
      }
    }
  } catch {}

  try {
    const response = await fetch(targetUrl, {
      method: request.method === 'POST' ? 'POST' : 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Linux; Android 15; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
        'Accept':
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,bn;q=0.8',
        'Upgrade-Insecure-Requests': '1',
      },
      redirect: 'follow',
    });

    const finalUrl = response.url || targetUrl;
    const contentType = response.headers.get('content-type') || 'text/html';

    // Clone response headers and delete ALL framing/decoding blockers
    const newHeaders = new Headers(response.headers);
    newHeaders.delete('X-Frame-Options');
    newHeaders.delete('Content-Security-Policy');
    newHeaders.delete('Content-Security-Policy-Report-Only');
    newHeaders.delete('Cross-Origin-Opener-Policy');
    newHeaders.delete('Cross-Origin-Embedder-Policy');
    newHeaders.delete('Cross-Origin-Resource-Policy');
    newHeaders.delete('Content-Encoding');
    newHeaders.delete('Content-Length');
    newHeaders.delete('Transfer-Encoding');
    newHeaders.delete('Clear-Site-Data');
    newHeaders.delete('Report-To');
    newHeaders.delete('NEL');
    newHeaders.set('Access-Control-Allow-Origin', '*');
    newHeaders.set('X-Omarvio-Edge', 'Cloudflare-Workers-2026');

    const finalHost = (() => {
      try {
        return new URL(finalUrl).hostname.toLowerCase();
      } catch {
        return '';
      }
    })();

    // Reader Mode JSON extraction (?reader=1): strips sidebars, ads, nav, and footers
    if (urlObj.searchParams.get('reader') === '1' && (contentType.includes('text/html') || contentType.includes('application/xhtml+xml'))) {
      const rawHtml = await response.text();
      const titleM = rawHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const ogTitleM = rawHtml.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
      const cleanTitle = ((ogTitleM?.[1] || titleM?.[1] || finalHost).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()) || finalHost;
      const cleanedHtml = rawHtml
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
        .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
        .replace(/<iframe[\s\S]*?<\/iframe>/gi, ' ')
        .replace(/<form[\s\S]*?<\/form>/gi, ' ')
        .replace(/<(header|footer|nav|aside)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
        .replace(
          /<(div|section)\b[^>]*(?:id|class)=["'][^"']*(?:sidebar|footer|navbar|cookie|consent|advert|adsense|ad-box|ad-banner|ad-container|sponsored|promo|newsletter|social-share|related-post|comments|popup|overlay-ad)[^"']*["'][^>]*>[\s\S]*?<\/\1>/gi,
          ' '
        );
      const articleM = cleanedHtml.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
      const mainM = cleanedHtml.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
      const targetRegion =
        articleM && articleM[1].replace(/<[^>]+>/g, '').trim().length > 250
          ? articleM[1]
          : mainM && mainM[1].replace(/<[^>]+>/g, '').trim().length > 250
          ? mainM[1]
          : cleanedHtml;
      const seenBlocks = new Set<string>();
      const blocks: string[] = [];
      for (const m of targetRegion.matchAll(/<(h1|h2|h3|p|blockquote|li)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
        const tag = m[1].toLowerCase();
        const txt = m[2].replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/\s+/g, ' ').trim();
        if (!txt) continue;
        if ((tag === 'p' || tag === 'li') && txt.length < 24) continue;
        if ((tag === 'h1' || tag === 'h2' || tag === 'h3') && (txt.length < 4 || txt === cleanTitle)) continue;
        const key = txt.toLowerCase();
        if (seenBlocks.has(key)) continue;
        seenBlocks.add(key);
        if (tag === 'h1' || tag === 'h2') blocks.push(`## ${txt}`);
        else if (tag === 'h3') blocks.push(`### ${txt}`);
        else if (tag === 'blockquote') blocks.push(`> ${txt}`);
        else blocks.push(txt);
      }
      const textContent =
        blocks.length > 0
          ? blocks.slice(0, 80).join('\n\n')
          : targetRegion.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 7000);
      return new Response(
        JSON.stringify({ title: cleanTitle, url: finalUrl, content: textContent }),
        { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    if (contentType.includes('text/html') || contentType.includes('application/xhtml+xml')) {
      let html = await response.text();

      // Smart Hub for YouTube non-embed pages (channels, @handles, playlists, search) & strict walled-garden SPAs
      const isYouTubePage =
        finalHost === 'm.youtube.com' || finalHost === 'www.youtube.com' || finalHost === 'youtube.com';
      const isWalledGardenSpa =
        finalHost.endsWith('facebook.com') ||
        finalHost.endsWith('instagram.com') ||
        finalHost.endsWith('tiktok.com') ||
        finalHost === 'x.com' ||
        finalHost === 'twitter.com' ||
        finalHost === 'www.twitter.com';

      if (isYouTubePage && !finalUrl.includes('/embed/')) {
        const ogTitle =
          (html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
            html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ||
            'YouTube Channel / Page')
            .replace(/ - YouTube$/i, '')
            .replace(/&amp;/g, '&');
        const ogDesc = (html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1] || '').replace(/&amp;/g, '&');
        const ogImg = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] || '';

        const seenVids = new Set<string>();
        const videos: Array<{ id: string; title: string }> = [];
        const vidRegex = /"videoId"\s*:\s*"([a-zA-Z0-9_-]{11})"[\s\S]{0,600}?"title"\s*:\s*\{[^}]*?"text"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g;
        let m: RegExpExecArray | null;
        while ((m = vidRegex.exec(html)) !== null && videos.length < 16) {
          if (!seenVids.has(m[1])) {
            seenVids.add(m[1]);
            videos.push({ id: m[1], title: m[2].replace(/\\"/g, '"').replace(/\\u0026/g, '&') });
          }
        }
        if (videos.length === 0) {
          const simpleIds = html.matchAll(/"videoId"\s*:\s*"([a-zA-Z0-9_-]{11})"/g);
          for (const sm of simpleIds) {
            if (!seenVids.has(sm[1]) && videos.length < 12) {
              seenVids.add(sm[1]);
              videos.push({ id: sm[1], title: `${ogTitle} — Video` });
            }
          }
        }

        const esc = (s: string) =>
          String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c));

        const videoCardsHtml = videos
          .map(
            (v) => `
            <a class="vcard" href="https://www.youtube.com/watch?v=${esc(v.id)}" onclick="event.preventDefault(); openYt('${esc(v.id)}');">
              <img src="https://i.ytimg.com/vi/${esc(v.id)}/hqdefault.jpg" loading="lazy" alt="">
              <div class="vinfo">
                <div class="vtitle">${esc(v.title)}</div>
                <div class="vmeta">▶️ ওমারভিও বিজ্ঞাপনমুক্ত প্লেয়ারে দেখুন</div>
              </div>
            </a>`
          )
          .join('');

        return new Response(
          `<!DOCTYPE html>
          <html lang="bn">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>${esc(ogTitle)} — OMARVIO YouTube Hub</title>
            <style>
              body { background: #070913; color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 16px; }
              .wrap { max-width: 720px; margin: 0 auto; }
              .hero { display: flex; gap: 14px; align-items: center; background: #0e1427; border: 1px solid rgba(56,189,248,0.28); border-radius: 20px; padding: 16px; margin-bottom: 16px; }
              .avatar { width: 64px; height: 64px; border-radius: 16px; object-fit: cover; background: #000; flex-shrink: 0; }
              h1 { margin: 0 0 4px; font-size: 18px; color: #fff; }
              p { margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5; }
              .actions { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
              .btn { flex: 1; min-width: 180px; text-align: center; background: linear-gradient(135deg, #10b981, #06b6d4); color: #020617; font-weight: 800; font-size: 13px; padding: 11px 14px; border-radius: 12px; text-decoration: none; }
              .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
              .vcard { display: flex; flex-direction: column; background: #0e1220; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; text-decoration: none; color: inherit; }
              .vcard img { width: 100%; aspect-ratio: 16/9; object-fit: cover; background: #000; }
              .vinfo { padding: 10px 12px; }
              .vtitle { font-size: 13px; font-weight: 700; color: #f1f5f9; line-height: 1.4; margin-bottom: 4px; }
              .vmeta { font-size: 11px; color: #38bdf8; font-weight: 600; }
            </style>
          </head>
          <body>
            <div class="wrap">
              <div class="hero">
                ${ogImg ? `<img class="avatar" src="${esc(ogImg)}" alt="">` : ''}
                <div>
                  <h1>${esc(ogTitle)}</h1>
                  <p>${esc(ogDesc || finalUrl)}</p>
                </div>
              </div>
              <div class="actions">
                <a class="btn" href="${esc(finalUrl)}" target="_blank" rel="noopener noreferrer">সরাসরি YouTube অ্যাপ / ব্রাউজারে খুলুন (১০০% কাজ করবে)</a>
              </div>
              ${videos.length > 0 ? `<div class="grid">${videoCardsHtml}</div>` : '<p style="text-align:center;color:#94a3b8;padding:20px 0;">ভিডিও দেখতে উপরের সরাসরি বাটনে ট্যাপ করুন অথবা ভিডিও লিংক সার্চ করুন।</p>'}
            </div>
            <script>
              try { window.parent.postMessage({ type: 'OMARVIO_PROXY_READY', url: ${JSON.stringify(finalUrl)} }, '*'); } catch(e) {}
              function openYt(id) {
                var watchUrl = 'https://www.youtube.com/watch?v=' + id;
                try { window.parent.postMessage({ type: 'OMARVIO_NAVIGATE', url: watchUrl }, '*'); } catch(e) {}
              }
            </script>
          </body>
          </html>`,
          { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Access-Control-Allow-Origin': '*' } }
        );
      }

      if (isWalledGardenSpa) {
        const ogTitle =
          (html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
            html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ||
            finalHost)
            .replace(/&amp;/g, '&');
        const ogDesc = (html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1] || '').replace(/&amp;/g, '&');
        const ogImg = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] || '';
        const esc = (s: string) =>
          String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c));
        return new Response(
          `<!DOCTYPE html>
          <html lang="bn">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>${esc(ogTitle)}</title>
            <style>
              body { background: #070a14; color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; text-align: center; }
              .card { max-width: 460px; width: 100%; background: #0d1226; border: 1px solid rgba(6,182,212,0.35); border-radius: 24px; padding: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.65); }
              .thumb { width: 100%; max-height: 190px; object-fit: cover; border-radius: 14px; margin-bottom: 14px; background: #000; }
              h2 { margin: 0 0 8px; font-size: 18px; font-weight: 800; color: #f8fafc; }
              p { font-size: 13px; color: #94a3b8; line-height: 1.55; margin: 0 0 18px; }
              .btn { display: block; width: 100%; box-sizing: border-box; background: linear-gradient(135deg, #10b981, #06b6d4); color: #020617; font-weight: 800; font-size: 13px; padding: 12px 18px; border-radius: 14px; text-decoration: none; margin-bottom: 10px; }
              .btn-sec { background: #1e293b; color: #cbd5e1; border: 1px solid #334155; }
            </style>
          </head>
          <body>
            <div class="card">
              ${ogImg ? `<img class="thumb" src="${esc(ogImg)}" alt="">` : ''}
              <h2>${esc(ogTitle)}</h2>
              <p>${esc(ogDesc || 'নিরাপত্তা ও লগইন সেশনের জন্য এই সোশ্যাল সাইটটি সরাসরি আপনার ব্রাউজার বা ওমারভিও নেটিভ অ্যাপে ওপেন করাই সবচেয়ে দ্রুত ও নির্ভরযোগ্য।')}</p>
              <a class="btn" href="${esc(finalUrl)}" target="_blank" rel="noopener noreferrer">সরাসরি ওপেন করুন (১০০% কাজ করবে)</a>
              <a class="btn btn-sec" href="/api/download-apk" target="_blank" rel="noopener">অ্যান্ড্রয়েড নেটিভ APK ডাউনলোড করুন</a>
            </div>
            <script>try { window.parent.postMessage({ type: 'OMARVIO_PROXY_READY', url: ${JSON.stringify(finalUrl)} }, '*'); } catch(e) {}</script>
          </body>
          </html>`,
          { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Access-Control-Allow-Origin': '*' } }
        );
      }

      // Detect strict bot-protection / Cloudflare / WAF blocks (403/401/429/503) so user never hits a broken error
      const isBotChallenge =
        response.status === 403 ||
        response.status === 401 ||
        response.status === 429 ||
        response.status === 503 ||
        /just a moment\.\.\.|cf-browser-verification|attention required! \| cloudflare/i.test(html.slice(0, 4000));

      if (isBotChallenge) {
        return new Response(
          `<!DOCTYPE html>
          <html lang="bn">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>OMARVIO Smart Direct Open</title>
            <style>
              body { background: #070a14; color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; text-align: center; }
              .card { max-width: 460px; width: 100%; background: #0d1226; border: 1px solid rgba(6,182,212,0.35); border-radius: 24px; padding: 26px; box-shadow: 0 20px 40px rgba(0,0,0,0.65); }
              .icon { width: 54px; height: 54px; background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.4); border-radius: 18px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 14px; font-size: 24px; }
              h2 { margin: 0 0 8px; font-size: 18px; font-weight: 800; color: #f8fafc; }
              p { font-size: 13px; color: #94a3b8; line-height: 1.55; margin: 0 0 18px; }
              .url { background: #050814; border: 1px solid rgba(255,255,255,0.1); padding: 8px 12px; border-radius: 12px; font-family: monospace; font-size: 11px; color: #38bdf8; word-break: break-all; margin-bottom: 18px; text-align: left; }
              .btn { display: block; width: 100%; box-sizing: border-box; background: linear-gradient(135deg, #10b981, #06b6d4); color: #020617; font-weight: 800; font-size: 13px; padding: 12px 18px; border-radius: 14px; text-decoration: none; margin-bottom: 10px; }
              .btn-sec { background: #1e293b; color: #cbd5e1; border: 1px solid #334155; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="icon">🚀</div>
              <h2>সরাসরি ওয়েবসাইট ওপেন করুন</h2>
              <p>এই সাইটটি ক্লাউড সার্ভার প্রক্সির বদলে আপনার ফোনের আসল ক্রোমিয়াম ইঞ্জিন থেকে সরাসরি কানেকশন চায়। নিচের বাটনে ট্যাপ করলে কোনো বাধা ছাড়াই ১০০% খুলবে:</p>
              <div class="url">${finalUrl}</div>
              <a class="btn" href="${finalUrl}" target="_blank" rel="noopener noreferrer">সরাসরি ওপেন করুন (১০০% কাজ করবে)</a>
              <a class="btn btn-sec" href="/api/download-apk" target="_blank" rel="noopener">অ্যান্ড্রয়েড নেটিভ APK ইনস্টল করুন (সব সাইট অটো চলে)</a>
            </div>
            <script>try { window.parent.postMessage({ type: 'OMARVIO_PROXY_READY', url: ${JSON.stringify(finalUrl)} }, '*'); } catch(e) {}</script>
          </body>
          </html>`,
          {
            status: 200,
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }

      // 1. Remove restrictive meta tags and prevent automatic refresh/redirect traps
      html = html.replace(
        /<meta[^>]+http-equiv=["']?(content-security-policy|x-frame-options|refresh)["']?[^>]*>/gi,
        ''
      );

      // 2. Inject <base href="...">
      const baseTag = `<base href="${finalUrl}">`;
      if (/<head[^>]*>/i.test(html)) {
        html = html.replace(/<head[^>]*>/i, `$&${baseTag}`);
      } else {
        html = `${baseTag}${html}`;
      }

      // 3. Inject OmarVio navigation interceptor & anti-ad/anti-popup script
      const interceptor = `
        <style>
          html {
            -webkit-overflow-scrolling: touch !important;
            touch-action: pan-x pan-y pinch-zoom !important;
            overscroll-behavior-y: contain !important;
          }
          .ytp-ad-module, .ytp-ad-player-overlay, .ytp-ad-text, .video-ads, .ad-container, .ad-interrupting,
          div[id*="google_ads"], div[class*="ad-box"], div[class*="sponsor"], iframe[src*="doubleclick"],
          iframe[src*="adservice"], .fb-ad, .sponsored_ad, .ad-banner, .interstitial-ad, .overlay-ad,
          div[class*="popup-banner"], div[id*="cookie-banner"], div[class*="consent-modal"] {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            width: 0 !important;
            opacity: 0 !important;
            pointer-events: none !important;
          }
        </style>
        <script>
          (function() {
            var realParent = window.parent;
            var speculativeUrl = null;
            try {
              if (realParent && realParent !== window) {
                realParent.postMessage({ type: 'OMARVIO_PROXY_READY', url: ${JSON.stringify(finalUrl)} }, '*');
              }
            } catch(e) {}
            try {
              if (navigator && navigator.serviceWorker) {
                navigator.serviceWorker.register = function() { return Promise.resolve({}); };
              }
            } catch(e) {}

            function enforceSelfNavigation() {
              try {
                var targets = document.querySelectorAll('a[target], form[target], area[target]');
                for (var i = 0; i < targets.length; i++) {
                  var t = targets[i].getAttribute('target');
                  if (t && t !== '_self') {
                    targets[i].setAttribute('target', '_self');
                    targets[i].target = '_self';
                  }
                }
              } catch(e) {}
            }
            enforceSelfNavigation();
            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', enforceSelfNavigation);
            }

            try {
              window.open = function(url) {
                if (url && typeof url === 'string' && !url.startsWith('javascript:')) {
                  try {
                    var absoluteUrl = new URL(url, document.baseURI || window.location.href).href;
                    if (realParent && realParent !== window) {
                      realParent.postMessage({ type: 'OMARVIO_NAVIGATE', url: absoluteUrl }, '*');
                    }
                    window.location.href = '/api/proxy?url=' + encodeURIComponent(absoluteUrl);
                  } catch(err) {
                    if (realParent && realParent !== window) {
                      realParent.postMessage({ type: 'OMARVIO_NAVIGATE', url: url }, '*');
                    }
                  }
                }
                return null;
              };
              window.alert = function() {};
              window.confirm = function() { return true; };
              // Anti-frame-busting: prevent child page from redirecting the top browser window
              try {
                Object.defineProperty(window, 'top', { get: function() { return window.self; } });
              } catch(e) {}
            } catch(e) {}

            // Passive touch listener for pre-click speculative resolution
            document.addEventListener('touchstart', function(e) {
              try {
                var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
                if (a) {
                  var raw = a.getAttribute('href') || a.href || '';
                  if (raw && !raw.startsWith('#') && !raw.startsWith('javascript:')) {
                    a.target = '_self';
                    a.setAttribute('target', '_self');
                    speculativeUrl = new URL(raw, document.baseURI || window.location.href).href;
                  }
                }
              } catch(err) {}
            }, { passive: true, capture: true });

            // Intercept link clicks and guarantee immediate in-app navigation without white screen
            document.addEventListener('click', function(e) {
              var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
              if (a) {
                var rawHref = a.getAttribute('href') || a.href || '';
                if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('javascript:')) return;
                
                a.setAttribute('target', '_self');
                a.target = '_self';
                e.preventDefault();
                e.stopPropagation();

                var target = speculativeUrl;
                if (!target) {
                  try {
                    target = new URL(rawHref, document.baseURI || window.location.href).href;
                  } catch(err) {
                    target = a.href || rawHref;
                  }
                }
                // Neutralize intent:// links that try to escape to Chrome
                if (target.startsWith('intent:') || target.startsWith('market:')) {
                  var fb = target.match(/browser_fallback_url=([^;&]+)/i);
                  if (fb) {
                    target = decodeURIComponent(fb[1]);
                  } else {
                    var sc = target.match(/scheme=([^;&]+)/i);
                    if (sc) {
                      target = sc[1] + '://' + target.replace(/^intent:\/\//, '').split('#')[0];
                    } else {
                      return;
                    }
                  }
                }

                // Intercept in-app downloads so they are saved directly in OmarVio's Downloads Hub
                var cleanPath = target.split('?')[0].split('#')[0].toLowerCase();
                var isDl = a.hasAttribute('download') || /\.(pdf|zip|rar|tar|gz|7z|apk|mp3|m4a|wav|aac|mp4|webm|mkv|mov|avi|docx?|xlsx?|pptx?|epub|txt|csv)$/i.test(cleanPath);
                if (isDl) {
                  var dlName = a.getAttribute('download') || cleanPath.split('/').pop() || 'downloaded_file';
                  if (realParent && realParent !== window) {
                    realParent.postMessage({ type: 'OMARVIO_DOWNLOAD', url: target, filename: dlName }, '*');
                    return;
                  }
                }

                try {
                  if (realParent && realParent !== window) {
                    realParent.postMessage({ type: 'OMARVIO_NAVIGATE', url: target }, '*');
                  }
                  window.location.href = '/api/proxy?url=' + encodeURIComponent(target);
                } catch(err) {
                  if (realParent && realParent !== window) {
                    realParent.postMessage({ type: 'OMARVIO_NAVIGATE', url: a.href || rawHref }, '*');
                  }
                  window.location.href = '/api/proxy?url=' + encodeURIComponent(a.href || rawHref);
                }
              }
            }, true);

            // 5. Intercept form submissions
            document.addEventListener('submit', function(e) {
              var form = e.target;
              if (form) {
                form.setAttribute('target', '_self');
                form.target = '_self';
                var action = form.getAttribute('action') || '';
                var method = (form.getAttribute('method') || 'GET').toUpperCase();
                try {
                  var formData = new FormData(form);
                  var params = new URLSearchParams();
                  formData.forEach(function(val, key) {
                    if (typeof val === 'string') params.append(key, val);
                  });
                  var qTerm = params.get('q') || params.get('query') || params.get('p');
                  if (qTerm) {
                    e.preventDefault();
                    e.stopPropagation();
                    var searchDest = 'https://www.google.com/search?q=' + encodeURIComponent(qTerm);
                    if (realParent && realParent !== window) {
                      realParent.postMessage({ type: 'OMARVIO_NAVIGATE', url: searchDest }, '*');
                    }
                    window.location.href = '/api/proxy?url=' + encodeURIComponent(searchDest);
                    return;
                  }
                  if (method === 'GET' && action) {
                    var resolvedAction = new URL(action, document.baseURI || window.location.href);
                    resolvedAction.search = params.toString();
                    e.preventDefault();
                    e.stopPropagation();
                    if (realParent && realParent !== window) {
                      realParent.postMessage({ type: 'OMARVIO_NAVIGATE', url: resolvedAction.href }, '*');
                    }
                    window.location.href = '/api/proxy?url=' + encodeURIComponent(resolvedAction.href);
                  }
                } catch(err) {}
              }
            }, true);

            // 6. WebView Memory Optimization: Purge Back-Forward Cache (bfcache) on Tab Sleep
            window.addEventListener('message', function(e) {
              if (e.data && e.data.type === 'OMARVIO_PURGE_BFCACHE') {
                try {
                  var mediaEls = document.querySelectorAll('video, audio');
                  for (var mi = 0; mi < mediaEls.length; mi++) {
                    try {
                      mediaEls[mi].pause();
                      mediaEls[mi].removeAttribute('src');
                      mediaEls[mi].load();
                    } catch(mErr) {}
                  }
                  var canvases = document.querySelectorAll('canvas');
                  for (var ci = 0; ci < canvases.length; ci++) {
                    try { canvases[ci].width = 1; canvases[ci].height = 1; } catch(cErr) {}
                  }
                  if (typeof window.dispatchEvent === 'function') {
                    try {
                      var ev = new PageTransitionEvent('pagehide', { persisted: false });
                      window.dispatchEvent(ev);
                    } catch(pErr) {}
                  }
                } catch(err) {}
              }
            });

            // 7. Safeguard history.pushState & replaceState inside proxy frame
            try {
              var origPushState = window.history.pushState;
              var origReplaceState = window.history.replaceState;
              window.history.pushState = function(state, title, url) {
                try {
                  if (url && typeof url === 'string' && !url.startsWith('/api/proxy')) {
                    var resolved = new URL(url, document.baseURI || '${finalUrl}').href;
                    if (realParent && realParent !== window) {
                      realParent.postMessage({ type: 'OMARVIO_NAVIGATE', url: resolved }, '*');
                    }
                    return origPushState.call(window.history, state, title, '/api/proxy?url=' + encodeURIComponent(resolved));
                  }
                  return origPushState.apply(window.history, arguments);
                } catch(e) {}
              };
              window.history.replaceState = function(state, title, url) {
                try {
                  if (url && typeof url === 'string' && !url.startsWith('/api/proxy')) {
                    var resolved = new URL(url, document.baseURI || '${finalUrl}').href;
                    return origReplaceState.call(window.history, state, title, '/api/proxy?url=' + encodeURIComponent(resolved));
                  }
                  return origReplaceState.apply(window.history, arguments);
                } catch(e) {}
              };
            } catch(hErr) {}
          })();
        </script>
      `;

      if (/<\/head>/i.test(html)) {
        html = html.replace(/<\/head>/i, `${interceptor}</head>`);
      } else if (/<\/body>/i.test(html)) {
        html = html.replace(/<\/body>/i, `${interceptor}</body>`);
      } else {
        html = `${html}${interceptor}`;
      }

      newHeaders.set('Content-Type', 'text/html; charset=utf-8');
      return new Response(html, {
        status: response.status,
        headers: newHeaders,
      });
    }

    // Stream binary assets (CSS, JS, images, audio, video)
    return new Response(response.body, {
      status: response.status,
      headers: newHeaders,
    });
  } catch (err: any) {
    return new Response(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><title>OMARVIO Edge</title><style>body{background:#070a14;color:#e2e8f0;font-family:sans-serif;text-align:center;padding:30px;}</style></head><body><h2>ওয়েবসাইট কানেকশন রিকভারি</h2><p>টার্গেট সার্ভারে সংযোগ সফল হয়নি।</p><p style="color:#38bdf8">${targetUrl}</p><button onclick="window.location.reload()" style="background:#06b6d4;color:#040817;padding:10px 20px;border-radius:12px;font-weight:bold;border:none;cursor:pointer">পুনরায় লোড করুন</button></body></html>`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    );
  }
};
