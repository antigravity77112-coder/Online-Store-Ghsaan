import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://www.gisaah.com';
// Use SITEMAP_API_URL if provided, otherwise fallback to the production API.
// This prevents Vercel builds from failing to connect to localhost.
const API_URL = process.env.SITEMAP_API_URL || 'https://gisaah-store.vercel.app/api';

const PUBLIC_DIR = path.join(__dirname, 'public');

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
  const key = String(category.slug || category.name || category.nameEn || '').trim();
  if (!isCanonicalSlug(key)) return null;
  return `${BASE_URL}/category/${encodeURIComponent(key)}`;
}

function brandLoc(brand) {
  if (!isCanonicalSlug(brand.slug)) return null;
  return `${BASE_URL}/brand/${encodeURIComponent(brand.slug.trim())}`;
}

function scentLoc(scent) {
  if (!isCanonicalSlug(scent.slug)) return null;
  return `${BASE_URL}/scents/${encodeURIComponent(scent.slug.trim())}`;
}

async function fetchJson(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const text = await res.text();
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    return null;
  }
}

async function fetchProducts() {
  const data = await fetchJson(`${API_URL}/products?pageSize=1000`);
  if (!data) return [];
  const items = Array.isArray(data) ? data : data.items || data.products || [];
  return items.filter((p) => p.status !== 'Hidden' && p.status !== 'Draft' && !p.isHidden);
}

async function fetchCategories() {
  const data = await fetchJson(`${API_URL}/categories`);
  return Array.isArray(data) ? data : [];
}

async function fetchBrands() {
  const data = await fetchJson(`${API_URL}/brands`);
  return Array.isArray(data) ? data : [];
}

async function fetchScents() {
  const data = await fetchJson(`${API_URL}/scents`);
  if (!data) return [];
  const items = Array.isArray(data) ? data : data.items || data.scents || [];
  return items.filter((s) => s.isActive !== false);
}

function formatDate(date) {
  return new Date(date || Date.now()).toISOString().split('T')[0];
}

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function generateSitemap() {
  console.log('Generating sitemap...');

  const today = formatDate(new Date());

  // Align with backend seoController STATIC_PAGES
  const staticPages = [
    { url: '/', priority: 1.0, changefreq: 'daily' },
    { url: '/products', priority: 0.9, changefreq: 'daily' },
    { url: '/categories', priority: 0.9, changefreq: 'weekly' },
    { url: '/scents', priority: 0.8, changefreq: 'weekly' },
    { url: '/branches', priority: 0.7, changefreq: 'monthly' },
    { url: '/about', priority: 0.7, changefreq: 'monthly' },
    { url: '/contact', priority: 0.7, changefreq: 'monthly' },
    { url: '/privacy-policy', priority: 0.5, changefreq: 'yearly' },
  ];

  let sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
`;

  for (const page of staticPages) {
    sitemapXml += `  <url>
    <loc>${BASE_URL}${page.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority.toFixed(1)}</priority>
  </url>
`;
  }

  const categories = await fetchCategories();
  let categoryCount = 0;
  for (const category of categories) {
    const loc = categoryLoc(category);
    if (!loc) continue;
    categoryCount += 1;
    sitemapXml += `  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
  }

  const brands = await fetchBrands();
  let brandCount = 0;
  for (const brand of brands) {
    const loc = brandLoc(brand);
    if (!loc) continue;
    brandCount += 1;
    sitemapXml += `  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
  }

  const scents = await fetchScents();
  let scentCount = 0;
  for (const scent of scents) {
    const loc = scentLoc(scent);
    if (!loc) continue;
    scentCount += 1;
    sitemapXml += `  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
  }

  const products = await fetchProducts();
  let productCount = 0;
  for (const product of products) {
    const productUrl = productLoc(product);
    if (!productUrl) continue;
    productCount += 1;
    const updatedAt = product.updatedAt ? formatDate(new Date(product.updatedAt)) : today;

    sitemapXml += `  <url>
    <loc>${productUrl}</loc>
    <lastmod>${updatedAt}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>`;

    const imageUrl = product.mainImageUrl || product.imageUrl;
    if (imageUrl) {
      sitemapXml += `
    <image:image>
      <image:loc>${escapeXml(imageUrl)}</image:loc>
      <image:title>${escapeXml(product.title)}</image:title>
    </image:image>`;
    }

    sitemapXml += `
  </url>
`;
  }

  sitemapXml += `</urlset>`;

  if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  }

  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), sitemapXml);
  console.log(
    `✅ Sitemap generated: ${staticPages.length} static + ${categoryCount} categories + ${brandCount} brands + ${scentCount} scents + ${productCount} products = ${staticPages.length + categoryCount + brandCount + scentCount + productCount} URLs`
  );

  const sitemapIndexXml = `<?xml version="1.0" encoding="UTF-8"?>
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
</sitemapindex>
`;
  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap-index.xml'), sitemapIndexXml);
  console.log('✅ sitemap-index.xml generated (public locs).');

  const robotsTxt = `User-agent: *
Allow: /

# Disallow user-specific & auth pages
Disallow: /admin
Disallow: /seller
Disallow: /profile
Disallow: /my-orders
Disallow: /cart
Disallow: /auth
Disallow: /api/

# Bingbot
User-agent: Bingbot
Allow: /
Disallow: /admin
Disallow: /seller
Disallow: /profile
Disallow: /my-orders
Disallow: /cart
Disallow: /auth

# Yandex
User-agent: YandexBot
Allow: /
Disallow: /admin
Disallow: /seller
Disallow: /profile
Disallow: /my-orders
Disallow: /cart
Disallow: /auth

# Sitemaps — public proxied URL only (not under /api/)
Sitemap: ${BASE_URL}/sitemap.xml

# Host directive (Yandex)
Host: ${BASE_URL}
`;

  fs.writeFileSync(path.join(PUBLIC_DIR, 'robots.txt'), robotsTxt);
  console.log('✅ robots.txt generated.');
}

generateSitemap().catch(console.error);
