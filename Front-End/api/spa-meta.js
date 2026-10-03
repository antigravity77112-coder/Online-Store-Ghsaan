/**
 * Server-inject Open Graph / Twitter image from DB (SystemSetting.ogImageUrl).
 * Facebook / WhatsApp / View Source never run React Helmet — they need HTML tags here.
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const BACKEND_API =
  process.env.SPA_META_API_URL ||
  process.env.SITEMAP_API_URL ||
  'https://online-store-ghsaan-66wk.vercel.app/api';

const SITE_ORIGIN =
  process.env.PUBLIC_SITE_URL ||
  process.env.PUBLIC_URL ||
  'https://online-store-ghsaan.vercel.app';

const MARKER = '<!--OG_SHARE_META-->';

function loadIndexHtmlFromDisk() {
  const candidates = [
    join(process.cwd(), 'dist', 'index.html'),
    join(process.cwd(), 'index.html'),
    join(process.cwd(), '..', 'dist', 'index.html'),
  ];
  for (const filePath of candidates) {
    if (existsSync(filePath)) return readFileSync(filePath, 'utf8');
  }
  return null;
}

async function loadIndexHtml(req) {
  try {
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const proto = req.headers['x-forwarded-proto'] || 'https';
    if (host) {
      const res = await fetch(`${proto}://${host}/index.html`, {
        headers: { Accept: 'text/html' },
      });
      if (res.ok) {
        const text = await res.text();
        if (text.includes('<div id="root"') || text.includes(MARKER) || text.includes('og:title')) {
          return text;
        }
      }
    }
  } catch {
    // fall through to disk
  }
  return loadIndexHtmlFromDisk();
}

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function toAbsoluteImage(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  const base = SITE_ORIGIN.replace(/\/$/, '');
  return `${base}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`;
}

function replaceMetaContent(html, attrName, attrValue, content) {
  if (!content) return html;
  const re = new RegExp(
    `(<meta[^>]+${attrName}=["']${attrValue}["'][^>]*content=["'])([^"']*)(["'][^>]*>)`,
    'i',
  );
  if (re.test(html)) {
    return html.replace(re, `$1${escapeAttr(content)}$3`);
  }
  return html;
}

async function fetchSiteConfig() {
  const res = await fetch(`${BACKEND_API.replace(/\/$/, '')}/config`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`config ${res.status}`);
  return res.json();
}

export default async function handler(req, res) {
  try {
    let html = await loadIndexHtml(req);
    if (!html) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('index.html not found');
      return;
    }

    let ogImage = null;
    let ogTitle = null;
    let ogDescription = null;
    let siteName = null;

    try {
      const config = await fetchSiteConfig();
      ogImage = toAbsoluteImage(config?.seo?.ogImageUrl || config?.media?.ogImageUrl);
      ogTitle = config?.seo?.ogTitle || config?.seo?.title || config?.brand?.siteName || null;
      ogDescription = config?.seo?.ogDescription || config?.seo?.description || null;
      siteName = config?.brand?.siteName || config?.seo?.title || null;
    } catch {
      // Serve SPA shell even if config is temporarily unavailable.
    }

    const pathOnly = typeof req.url === 'string' ? req.url.split('?')[0] : '/';
    const pagePath = !pathOnly || pathOnly === '/api/spa-meta' ? '/' : pathOnly;
    const requestUrl = `${SITE_ORIGIN.replace(/\/$/, '')}${pagePath}`;

    html = replaceMetaContent(html, 'property', 'og:title', ogTitle);
    html = replaceMetaContent(html, 'property', 'og:description', ogDescription);
    html = replaceMetaContent(html, 'property', 'og:site_name', siteName);
    html = replaceMetaContent(html, 'property', 'og:url', requestUrl);
    html = replaceMetaContent(html, 'name', 'twitter:title', ogTitle);
    html = replaceMetaContent(html, 'name', 'twitter:description', ogDescription);
    html = replaceMetaContent(html, 'name', 'description', ogDescription);

    const ogBlock = ogImage
      ? [
          `<meta property="og:image" content="${escapeAttr(ogImage)}" />`,
          `<meta property="og:image:alt" content="${escapeAttr(ogTitle || siteName || 'Share')}" />`,
          `<meta property="og:image:width" content="1200" />`,
          `<meta property="og:image:height" content="630" />`,
          `<meta name="twitter:card" content="summary_large_image" />`,
          `<meta name="twitter:image" content="${escapeAttr(ogImage)}" />`,
        ].join('\n  ')
      : '<!-- OG image: none in database (SystemSetting.ogImageUrl) -->';

    if (html.includes(MARKER)) {
      html = html.replace(MARKER, ogBlock);
    } else if (ogImage) {
      html = html.replace('</head>', `  ${ogBlock}\n</head>`);
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.end(html);
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end(err?.message || 'spa-meta failed');
  }
}
