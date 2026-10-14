/**
 * Server-inject store media from DB (SystemSetting) into HTML.
 * Bots / View Source / tab favicon never wait for React.
 *
 * Fields: logoUrl, logoDarkUrl, faviconUrl, ogImageUrl
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

const OG_MARKER = '<!--OG_SHARE_META-->';
const FAVICON_MARKER = '<!--SITE_FAVICON-->';

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
        if (text.includes('<div id="root"') || text.includes(OG_MARKER) || text.includes('og:title')) {
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

function escapeJson(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
}

function toAbsoluteUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  const base = SITE_ORIGIN.replace(/\/$/, '');
  return `${base}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`;
}

/** Telegram/WhatsApp prefer ~1200×630; DB uploads are often square. */
function toShareImage(url) {
  const abs = toAbsoluteUrl(url);
  if (!abs) return null;
  // Only Cloudinary supports on-the-fly crop transforms; R2/relative URLs pass through.
  if (!abs.includes('res.cloudinary.com/') || !abs.includes('/upload/')) return abs;
  if (/\/upload\/[^/]*w_1200/.test(abs)) return abs;
  return abs.replace('/upload/', '/upload/w_1200,h_630,c_fill,f_jpg,q_auto/');
}

function guessImageType(url) {
  const lower = String(url || '').toLowerCase();
  if (lower.includes('.svg')) return 'image/svg+xml';
  if (lower.includes('.webp')) return 'image/webp';
  if (lower.includes('.jpg') || lower.includes('.jpeg')) return 'image/jpeg';
  if (lower.includes('.ico')) return 'image/x-icon';
  return 'image/png';
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

function replaceJsonLdLogo(html, logoUrl) {
  if (!logoUrl) return html;
  return html.replace(
    /("logo"\s*:\s*")[^"]*(")/,
    `$1${escapeJson(logoUrl)}$2`,
  );
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
    let faviconUrl = null;
    let logoUrl = null;

    try {
      const config = await fetchSiteConfig();
      ogImage = toShareImage(config?.seo?.ogImageUrl || config?.media?.ogImageUrl);
      ogTitle = config?.seo?.ogTitle || config?.seo?.title || config?.brand?.siteName || null;
      ogDescription = config?.seo?.ogDescription || config?.seo?.description || null;
      siteName = config?.brand?.siteName || config?.seo?.title || null;
      faviconUrl = toAbsoluteUrl(config?.media?.faviconUrl);
      logoUrl = toAbsoluteUrl(config?.media?.logoUrl);
    } catch {
      // Serve SPA shell even if config is temporarily unavailable.
    }

    const headerPath = req.headers['x-original-pathname'] || req.headers['x-middleware-request-x-original-pathname'];
    let queryPath = null;
    try {
      const rawUrl = typeof req.url === 'string' ? req.url : '/';
      const q = new URL(rawUrl, SITE_ORIGIN).searchParams.get('__path');
      if (q) queryPath = q;
    } catch {
      // ignore
    }
    const pathOnly = typeof req.url === 'string' ? req.url.split('?')[0] : '/';
    let pagePath = headerPath || queryPath || pathOnly || '/';
    if (!pagePath || pagePath === '/api/spa-meta') pagePath = '/';
    if (!pagePath.startsWith('/')) pagePath = `/${pagePath}`;
    const requestUrl = `${SITE_ORIGIN.replace(/\/$/, '')}${pagePath}`;

    html = replaceMetaContent(html, 'property', 'og:title', ogTitle);
    html = replaceMetaContent(html, 'property', 'og:description', ogDescription);
    html = replaceMetaContent(html, 'property', 'og:site_name', siteName);
    html = replaceMetaContent(html, 'property', 'og:url', requestUrl);
    html = replaceMetaContent(html, 'name', 'twitter:title', ogTitle);
    html = replaceMetaContent(html, 'name', 'twitter:description', ogDescription);
    html = replaceMetaContent(html, 'name', 'description', ogDescription);

    // Favicon from DB (tab / link icon) — strip hard-coded local icon links first
    html = html.replace(/<link[^>]+rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]*>\s*/gi, '');
    const faviconHref = faviconUrl || `${SITE_ORIGIN.replace(/\/$/, '')}/favicon.png`;
    const faviconType = guessImageType(faviconHref);
    const faviconBlock = [
      `<link rel="icon" type="${escapeAttr(faviconType)}" href="${escapeAttr(faviconHref)}" />`,
      `<link rel="shortcut icon" href="${escapeAttr(faviconHref)}" />`,
      `<link rel="apple-touch-icon" href="${escapeAttr(faviconHref)}" />`,
    ].join('\n  ');

    if (html.includes(FAVICON_MARKER)) {
      html = html.replace(FAVICON_MARKER, faviconBlock);
    } else {
      html = html.replace('</head>', `  ${faviconBlock}\n</head>`);
    }

    // Organization logo in JSON-LD from DB
    if (logoUrl) {
      html = replaceJsonLdLogo(html, logoUrl);
    }

    // Drop static twitter:card so we do not emit duplicates
    html = html.replace(/<meta\s+name=["']twitter:card["'][^>]*>\s*/gi, '');

    const ogBlock = ogImage
      ? [
          `<meta property="og:image" content="${escapeAttr(ogImage)}" />`,
          `<meta property="og:image:secure_url" content="${escapeAttr(ogImage)}" />`,
          `<meta property="og:image:type" content="image/jpeg" />`,
          `<meta property="og:image:alt" content="${escapeAttr(ogTitle || siteName || 'Share')}" />`,
          `<meta property="og:image:width" content="1200" />`,
          `<meta property="og:image:height" content="630" />`,
          `<meta name="twitter:card" content="summary_large_image" />`,
          `<meta name="twitter:image" content="${escapeAttr(ogImage)}" />`,
        ].join('\n  ')
      : [
          '<!-- OG image: none in database (SystemSetting.ogImageUrl) -->',
          `<meta name="twitter:card" content="summary" />`,
        ].join('\n  ');

    if (html.includes(OG_MARKER)) {
      html = html.replace(OG_MARKER, ogBlock);
    } else {
      html = html.replace('</head>', `  ${ogBlock}\n</head>`);
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    res.end(html);
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end(err?.message || 'spa-meta failed');
  }
}
