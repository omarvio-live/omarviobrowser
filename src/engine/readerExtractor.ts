/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OMARVIO BROWSER - Distraction-Free Reading Mode Content Extractor
 * Strips sidebars, ads, navigation chrome, popups, and footers from webpages.
 */

export interface ExtractedReaderArticle {
  title: string;
  url: string;
  content: string;
}

const NOISE_SELECTOR = [
  'script',
  'style',
  'noscript',
  'iframe',
  'svg',
  'canvas',
  'form',
  'header',
  'footer',
  'nav',
  'aside',
  '[role="banner"]',
  '[role="navigation"]',
  '[role="complementary"]',
  '[role="contentinfo"]',
  '[aria-hidden="true"]',
  '[id*="sidebar" i]',
  '[class*="sidebar" i]',
  '[id*="footer" i]',
  '[class*="footer" i]',
  '[id*="navbar" i]',
  '[class*="navbar" i]',
  '[id*="cookie" i]',
  '[class*="cookie" i]',
  '[id*="consent" i]',
  '[class*="consent" i]',
  '[id*="google_ads" i]',
  '[class*="ad-box" i]',
  '[class*="ad-banner" i]',
  '[class*="ad-container" i]',
  '[class*="sponsored" i]',
  '[class*="promo" i]',
  '[class*="newsletter" i]',
  '[class*="social-share" i]',
  '[class*="related-post" i]',
  '[id*="comments" i]',
  '[class*="comment-list" i]',
  '[class*="popup" i]',
  '[class*="overlay-ad" i]',
].join(',');

export function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lsquo;|&rsquo;/gi, "'")
    .replace(/&ldquo;|&rdquo;/gi, '"')
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–')
    .replace(/&#(\d+);/g, (_m, dec) => {
      const code = Number(dec);
      return Number.isFinite(code) ? String.fromCodePoint(code) : '';
    })
    .replace(/&#x([0-9a-f]+);/gi, (_m, hex) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : '';
    });
}

/**
 * Instant 0ms extraction from a live same-origin iframe Document.
 */
export function extractReadableArticleFromDocument(
  doc: Document,
  currentUrl: string
): ExtractedReaderArticle | null {
  try {
    if (!doc || !doc.body) return null;

    const fallbackTitle = (() => {
      try {
        return new URL(currentUrl).hostname.replace(/^www\./i, '');
      } catch {
        return 'Article';
      }
    })();

    const h1Text = doc.querySelector('article h1, main h1, h1')?.textContent?.trim();
    const rawTitle = (h1Text || doc.title || fallbackTitle).replace(/\s+/g, ' ').trim();

    const clone = doc.body.cloneNode(true) as HTMLElement;
    clone.querySelectorAll(NOISE_SELECTOR).forEach((el) => el.remove());

    const preferredRoot =
      (clone.querySelector('article') as HTMLElement | null) ||
      (clone.querySelector('[role="main"]') as HTMLElement | null) ||
      (clone.querySelector('main') as HTMLElement | null) ||
      (clone.querySelector('.article-body, .post-content, .entry-content, .story-body') as HTMLElement | null) ||
      clone;

    const blocks: string[] = [];
    const seen = new Set<string>();
    const elements = preferredRoot.querySelectorAll('h1, h2, h3, p, blockquote, li');

    elements.forEach((el) => {
      const tag = el.tagName.toLowerCase();
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text) return;

      if (tag === 'p' && text.length < 24) return;
      if (tag === 'li' && text.length < 28) return;
      if ((tag === 'h1' || tag === 'h2' || tag === 'h3') && (text.length < 4 || text === rawTitle)) {
        return;
      }

      const key = text.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);

      if (tag === 'h1' || tag === 'h2') {
        blocks.push(`## ${text}`);
      } else if (tag === 'h3') {
        blocks.push(`### ${text}`);
      } else if (tag === 'blockquote') {
        blocks.push(`> ${text}`);
      } else {
        blocks.push(text);
      }
    });

    const content = blocks.slice(0, 80).join('\n\n').trim();
    if (content.length < 120) {
      const plain = (preferredRoot.textContent || '').replace(/\s+/g, ' ').trim();
      if (plain.length < 120) return null;
      return {
        title: rawTitle,
        url: currentUrl,
        content: plain.slice(0, 7000),
      };
    }

    return {
      title: rawTitle,
      url: currentUrl,
      content,
    };
  } catch {
    return null;
  }
}

/**
 * Regex/HTML string extractor for Node Express (/api/proxy?reader=1) when iframe DOM isn't available.
 */
export function extractReadableArticleFromHtml(
  rawHtml: string,
  finalUrl: string
): ExtractedReaderArticle {
  let finalHost = 'Web Article';
  try {
    finalHost = new URL(finalUrl).hostname.replace(/^www\./i, '');
  } catch {}

  const titleMatch = rawHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const ogTitleMatch = rawHtml.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  const rawTitle = decodeHtmlEntities(
    (ogTitleMatch?.[1] || titleMatch?.[1] || finalHost).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
  ) || finalHost;

  let cleaned = rawHtml
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

  // Prefer <article> or <main> region when substantial
  const articleMatch = cleaned.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
  const mainMatch = cleaned.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  const candidate =
    articleMatch && articleMatch[1].replace(/<[^>]+>/g, '').trim().length > 250
      ? articleMatch[1]
      : mainMatch && mainMatch[1].replace(/<[^>]+>/g, '').trim().length > 250
      ? mainMatch[1]
      : cleaned;

  const seen = new Set<string>();
  const blocks: string[] = [];

  for (const match of candidate.matchAll(/<(h1|h2|h3|p|blockquote|li)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const tag = match[1].toLowerCase();
    const text = decodeHtmlEntities(match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    if (!text) continue;

    if ((tag === 'p' || tag === 'li') && text.length < 24) continue;
    if ((tag === 'h1' || tag === 'h2' || tag === 'h3') && (text.length < 4 || text === rawTitle)) continue;

    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    if (tag === 'h1' || tag === 'h2') {
      blocks.push(`## ${text}`);
    } else if (tag === 'h3') {
      blocks.push(`### ${text}`);
    } else if (tag === 'blockquote') {
      blocks.push(`> ${text}`);
    } else {
      blocks.push(text);
    }
  }

  const content =
    blocks.length > 0
      ? blocks.slice(0, 80).join('\n\n')
      : decodeHtmlEntities(candidate.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()).slice(0, 7000);

  return {
    title: rawTitle,
    url: finalUrl,
    content,
  };
}
