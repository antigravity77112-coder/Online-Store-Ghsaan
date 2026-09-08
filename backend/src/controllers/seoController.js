/**
 * seoController.js — Dynamic SEO Endpoints
 *
 * Generates XML sitemaps, robots.txt, and RSS feed on demand.
 * Results are cached in memory for 15 minutes to avoid DB pressure
 * from search engine crawlers.
 *
 * Endpoints:
 *   GET /api/seo/sitemap.xml            — Full sitemap
 *   GET /api/seo/sitemap-index.xml      — Sitemap index (public locs)
 *   GET /api/seo/sitemap-products.xml   — Products-only sitemap
 *   GET /api/seo/sitemap-categories.xml — Categories sitemap
 *   GET /api/seo/sitemap-brands.xml     — Brands sitemap
 *   GET /api/seo/sitemap-scents.xml     — Scents sitemap
 *   GET /api/seo/sitemap-static.xml     — Static pages sitemap
 *   GET /api/seo/robots.txt             — robots.txt
 *   GET /api/seo/rss.xml                — RSS 2.0 feed
 */

const prisma = require('../prismaClient');

const BASE_URL = 'https://www.gisaah.com';
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

// Simple in-memory cache
const cache = {};

function getCache(key) {
  const entry = cache[key];
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    delete cache[key];
    return null;
  }
  return entry.value;
}

function setCache(key, value) {
  cache[key] = { value, timestamp: Date.now() };
}

function formatDate(date) {
  if (!date) return new Date().toISOString().split('T')[0];
  return new Date(date).toISOString().split('T')[0];
}

function urlEntry({ loc, lastmod, changefreq, priority, image }) {
  let xml = `  <url>\n    <loc>${escapeXml(loc)}</loc>\n`;
  if (lastmod) xml += `    <lastmod>${lastmod}</lastmod>\n`;
  if (changefreq) xml += `    <changefreq>${changefreq}</changefreq>\n`;
  if (priority !== undefined) xml += `    <priority>${Number(priority).toFixed(1)}</priority>\n`;
  if (image?.url) {
    xml += `    <image:image>\n      <image:loc>${escapeXml(image.url)}</image:loc>\n`;
    if (image.title) xml += `      <image:title>${escapeXml(image.title)}</image:title>\n`;
    xml += `    </image:image>\n`;
  }
  xml += `  </url>\n`;
  return xml;
}

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isCanonicalSlug(slug) {
  const value = String(slug || '').trim();
  return value.length > 0 && !UUID_REGEX.test(value);
}

function productLoc(product) {
  if (!isCanonicalSlug(product.slug)) return null;
  return `${BASE_URL}/product/${encodeURIComponent(product.slug.trim())}`;
}

/** Prefer storefront canonical: /category/{slug || name} — never UUID */
function categoryLoc(category) {
  const slug = String(category.slug || '').trim();
  if (isCanonicalSlug(slug)) {
    return `${BASE_URL}/category/${encodeURIComponent(slug)}`;
  }
  const name = String(category.name || '').trim();
  if (isCanonicalSlug(name)) {
    return `${BASE_URL}/category/${encodeURIComponent(name)}`;
  }
  return null;
}

function brandLoc(brand) {
  if (!isCanonicalSlug(brand.slug)) return null;
  return `${BASE_URL}/brand/${encodeURIComponent(brand.slug.trim())}`;
}

function scentLoc(scent) {
  if (!isCanonicalSlug(scent.slug)) return null;
  return `${BASE_URL}/scents/${encodeURIComponent(scent.slug.trim())}`;
}

async function fetchProducts() {
  return prisma.product.findMany({
    where: { status: 'Active' },
    select: {
      id: true,
      title: true,
      slug: true,
      updatedAt: true,
      createdAt: true,
      images: { where: { isPrimary: true }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
  });
}

async function fetchCategories() {
  return prisma.category.findMany({
    where: { isActive: true },
    select: { slug: true, name: true, updatedAt: true },
  });
}

async function fetchBrands() {
  return prisma.brand.findMany({
    select: { slug: true, name: true, updatedAt: true },
    orderBy: { name: 'asc' },
  });
}

async function fetchScents() {
  return prisma.scent.findMany({
    where: { isActive: true },
    select: { slug: true, name: true, updatedAt: true },
    orderBy: { sortOrder: 'asc' },
  });
}

const STATIC_PAGES = [
  { url: '/', priority: 1.0, changefreq: 'daily' },
  { url: '/products', priority: 0.9, changefreq: 'daily' },
  { url: '/categories', priority: 0.9, changefreq: 'weekly' },
  { url: '/scents', priority: 0.8, changefreq: 'weekly' },
  { url: '/branches', priority: 0.7, changefreq: 'monthly' },
  { url: '/about', priority: 0.7, changefreq: 'monthly' },
  { url: '/contact', priority: 0.7, changefreq: 'monthly' },
  { url: '/privacy-policy', priority: 0.5, changefreq: 'yearly' },
];

function sendXml(res, xml, maxAge = 900) {
  res.set('Content-Type', 'application/xml; charset=utf-8');
  res.set('Cache-Control', `public, max-age=${maxAge}`);
  return res.send(xml);
}

function buildUrlset(entries, { withImages = false } = {}) {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"`;
  if (withImages) {
    xml += `\n        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"`;
  }
  xml += `>\n`;
  for (const entry of entries) {
    xml += urlEntry(entry);
  }
  xml += `</urlset>`;
  return xml;
}

// ── GET /api/seo/sitemap.xml ──────────────────────────────────────────────────
async function getSitemap(req, res) {
  const cached = getCache('sitemap');
  if (cached) return sendXml(res, cached);

  const today = formatDate(new Date());
  const [products, categories, brands, scents] = await Promise.all([
    fetchProducts(),
    fetchCategories(),
    fetchBrands(),
    fetchScents(),
  ]);

  const entries = [];

  for (const page of STATIC_PAGES) {
    entries.push({
      loc: `${BASE_URL}${page.url}`,
      lastmod: today,
      changefreq: page.changefreq,
      priority: page.priority,
    });
  }

  for (const cat of categories) {
    const loc = categoryLoc(cat);
    if (!loc) continue;
    entries.push({
      loc,
      lastmod: formatDate(cat.updatedAt),
      changefreq: 'weekly',
      priority: 0.8,
    });
  }

  for (const brand of brands) {
    const loc = brandLoc(brand);
    if (!loc) continue;
    entries.push({
      loc,
      lastmod: formatDate(brand.updatedAt),
      changefreq: 'weekly',
      priority: 0.7,
    });
  }

  for (const scent of scents) {
    const loc = scentLoc(scent);
    if (!loc) continue;
    entries.push({
      loc,
      lastmod: formatDate(scent.updatedAt),
      changefreq: 'weekly',
      priority: 0.7,
    });
  }

  for (const product of products) {
    const loc = productLoc(product);
    if (!loc) continue;
    entries.push({
      loc,
      lastmod: formatDate(product.updatedAt),
      changefreq: 'weekly',
      priority: 0.8,
      image: product.images?.[0]?.url
        ? { url: product.images[0].url, title: product.title }
        : null,
    });
  }

  const xml = buildUrlset(entries, { withImages: true });
  setCache('sitemap', xml);
  return sendXml(res, xml);
}

// ── GET /api/seo/sitemap-index.xml ───────────────────────────────────────────
async function getSitemapIndex(req, res) {
  const today = formatDate(new Date());
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${BASE_URL}/sitemap-static.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${BASE_URL}/sitemap-categories.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${BASE_URL}/sitemap-brands.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${BASE_URL}/sitemap-scents.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${BASE_URL}/sitemap-products.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
</sitemapindex>`;

  return sendXml(res, xml);
}

// ── GET /api/seo/sitemap-products.xml ────────────────────────────────────────
async function getSitemapProducts(req, res) {
  const cached = getCache('sitemap-products');
  if (cached) return sendXml(res, cached);

  const products = await fetchProducts();
  const entries = [];

  for (const product of products) {
    const loc = productLoc(product);
    if (!loc) continue;
    entries.push({
      loc,
      lastmod: formatDate(product.updatedAt),
      changefreq: 'weekly',
      priority: 0.8,
      image: product.images?.[0]?.url
        ? { url: product.images[0].url, title: product.title }
        : null,
    });
  }

  const xml = buildUrlset(entries, { withImages: true });
  setCache('sitemap-products', xml);
  return sendXml(res, xml);
}

// ── GET /api/seo/sitemap-categories.xml ──────────────────────────────────────
async function getSitemapCategories(req, res) {
  const cached = getCache('sitemap-categories');
  if (cached) return sendXml(res, cached);

  const categories = await fetchCategories();
  const entries = [];

  for (const cat of categories) {
    const loc = categoryLoc(cat);
    if (!loc) continue;
    entries.push({
      loc,
      lastmod: formatDate(cat.updatedAt),
      changefreq: 'weekly',
      priority: 0.8,
    });
  }

  const xml = buildUrlset(entries);
  setCache('sitemap-categories', xml);
  return sendXml(res, xml);
}

// ── GET /api/seo/sitemap-brands.xml ──────────────────────────────────────────
async function getSitemapBrands(req, res) {
  const cached = getCache('sitemap-brands');
  if (cached) return sendXml(res, cached);

  const brands = await fetchBrands();
  const entries = [];

  for (const brand of brands) {
    const loc = brandLoc(brand);
    if (!loc) continue;
    entries.push({
      loc,
      lastmod: formatDate(brand.updatedAt),
      changefreq: 'weekly',
      priority: 0.7,
    });
  }

  const xml = buildUrlset(entries);
  setCache('sitemap-brands', xml);
  return sendXml(res, xml);
}

// ── GET /api/seo/sitemap-scents.xml ──────────────────────────────────────────
async function getSitemapScents(req, res) {
  const cached = getCache('sitemap-scents');
  if (cached) return sendXml(res, cached);

  const scents = await fetchScents();
  const entries = [];

  for (const scent of scents) {
    const loc = scentLoc(scent);
    if (!loc) continue;
    entries.push({
      loc,
      lastmod: formatDate(scent.updatedAt),
      changefreq: 'weekly',
      priority: 0.7,
    });
  }

  const xml = buildUrlset(entries);
  setCache('sitemap-scents', xml);
  return sendXml(res, xml);
}

// ── GET /api/seo/sitemap-static.xml ──────────────────────────────────────────
async function getSitemapStatic(req, res) {
  const today = formatDate(new Date());
  const entries = STATIC_PAGES.map((page) => ({
    loc: `${BASE_URL}${page.url}`,
    lastmod: today,
    changefreq: page.changefreq,
    priority: page.priority,
  }));

  return sendXml(res, buildUrlset(entries), 3600);
}

// ── GET /api/seo/robots.txt ───────────────────────────────────────────────────
async function getRobots(req, res) {
  const robotsTxt = `User-agent: *
Allow: /

Disallow: /admin
Disallow: /seller
Disallow: /profile
Disallow: /my-orders
Disallow: /cart
Disallow: /auth
Disallow: /api/

# Sitemaps — public proxied URL only (not under /api/)
Sitemap: ${BASE_URL}/sitemap.xml

# Host directive (Yandex)
Host: ${BASE_URL}
`;

  res.set('Content-Type', 'text/plain; charset=utf-8');
  res.set('Cache-Control', 'public, max-age=86400');
  return res.send(robotsTxt);
}

// ── GET /api/seo/rss.xml ─────────────────────────────────────────────────────
async function getRss(req, res) {
  const cached = getCache('rss');
  if (cached) {
    res.set('Content-Type', 'application/rss+xml; charset=utf-8');
    return res.send(cached);
  }

  const products = await prisma.product.findMany({
    where: { status: 'Active' },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      price: true,
      currency: true,
      createdAt: true,
      images: { where: { isPrimary: true }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const now = new Date().toUTCString();
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Smart Shopper | المتسوق الذكي — أحدث المنتجات</title>
    <link>${BASE_URL}</link>
    <description>أحدث المنتجات في المتسوق الذكي</description>
    <language>ar</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${BASE_URL}/api/seo/rss.xml" rel="self" type="application/rss+xml"/>
`;

  for (const product of products) {
    const loc = productLoc(product);
    if (!loc) continue;
    const pubDate = new Date(product.createdAt).toUTCString();
    const description = (product.description || '').substring(0, 300);

    xml += `    <item>
      <title>${escapeXml(product.title)}</title>
      <link>${loc}</link>
      <guid isPermaLink="true">${loc}</guid>
      <description>${escapeXml(description)}</description>
      <pubDate>${pubDate}</pubDate>
`;
    if (product.images?.[0]?.url) {
      xml += `      <enclosure url="${escapeXml(product.images[0].url)}" type="image/jpeg" length="0"/>\n`;
    }
    xml += `    </item>\n`;
  }

  xml += `  </channel>\n</rss>`;

  setCache('rss', xml);
  res.set('Content-Type', 'application/rss+xml; charset=utf-8');
  res.set('Cache-Control', 'public, max-age=900');
  return res.send(xml);
}

// ── GET /api/seo/redirect/product/:uuid ──────────────────────────────────────
// Server-side 301 redirect: UUID-based product URL → slug-based canonical URL.
async function redirectProductByUuid(req, res) {
  const { uuid } = req.params;

  if (!UUID_REGEX.test(uuid)) {
    return res.status(400).json({ error: 'Invalid UUID format' });
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id: uuid },
      select: { slug: true },
    });

    if (!product || !product.slug) {
      return res.redirect(301, `${BASE_URL}/`);
    }

    return res.redirect(301, `${BASE_URL}/product/${encodeURIComponent(product.slug)}`);
  } catch (err) {
    console.error('UUID redirect error:', err);
    return res.redirect(302, `${BASE_URL}/`);
  }
}

module.exports = {
  getSitemap,
  getSitemapIndex,
  getSitemapProducts,
  getSitemapCategories,
  getSitemapBrands,
  getSitemapScents,
  getSitemapStatic,
  getRobots,
  getRss,
  redirectProductByUuid,
};
