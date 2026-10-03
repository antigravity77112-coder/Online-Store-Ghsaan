/**
 * structuredData.js — JSON-LD Schema Factory Functions
 *
 * EN: Generates structured data (JSON-LD) for Google Rich Results.
 *     Each function returns a plain object ready to be serialized as JSON
 *     and injected via <script type="application/ld+json">.
 *
 * AR: ينشئ بيانات مهيكلة (JSON-LD) لنتائج جوجل الغنية.
 *     كل دالة ترجع كائن جاهز للتسلسل كـ JSON وحقنه عبر <script>.
 */

import { STOREFRONT_ORIGIN, isLegacyStorefrontHost } from '../config/storefrontOrigin';

const BASE_URL = STOREFRONT_ORIGIN;

/**
 * Currency code mapping from internal enum to ISO 4217
 */
const CURRENCY_ISO = {
  YER_Sanaa: 'YER',
  YER_Aden: 'YER',
  USD: 'USD',
  SAR: 'SAR',
  EUR: 'EUR',
  1: 'YER',
  2: 'YER',
  3: 'USD',
  4: 'SAR',
  5: 'EUR',
};

/**
 * Build Product structured data
 *
 * @param {Object} product - Product data from API
 * @returns {Object} JSON-LD Product schema
 */
export function buildProductSchema(product) {
  if (!product) return null;

  const currency = CURRENCY_ISO[product.currency] || 'YER';
  const price = product.discountPrice
    ? Number(product.discountPrice)
    : Number(product.price);
  const availability = product.stockQuantity > 0
    ? 'https://schema.org/InStock'
    : 'https://schema.org/OutOfStock';

  const galleryImages = (product.images || [])
    .map((img) => img?.url)
    .filter(Boolean);
  const schemaImages = galleryImages.length > 0
    ? galleryImages
    : [product.imageUrl || product.mainImageUrl || `${BASE_URL}/Logo.png`].filter(Boolean);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: (product.description || '').substring(0, 500),
    image: schemaImages.length === 1 ? schemaImages[0] : schemaImages,
    sku: product.id,
    brand: {
      '@type': 'Brand',
      name: product.categoryName || 'Smart Shopper',
    },
    offers: {
      '@type': 'Offer',
      url: `${BASE_URL}/product/${product.slug || product.id}`,
      priceCurrency: currency,
      price: price.toFixed(2),
      availability,
      seller: {
        '@type': 'Organization',
        name: 'Smart Shopper | المتسوق الذكي',
      },
      itemCondition: product.condition === 'Used' || product.condition === 2
        ? 'https://schema.org/UsedCondition'
        : 'https://schema.org/NewCondition',
    },
  };

  // Add high price for discount display
  if (product.discountPrice && product.price) {
    schema.offers.highPrice = Number(product.price).toFixed(2);
  }

  return schema;
}

/**
 * Build BreadcrumbList structured data
 *
 * @param {Array<{name: string, url: string}>} items - Breadcrumb items
 * @returns {Object} JSON-LD BreadcrumbList schema
 */
export function buildBreadcrumbSchema(items) {
  if (!items || items.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url ? `${BASE_URL}${item.url}` : undefined,
    })),
  };
}

/**
 * Build Organization structured data
 *
 * @param {Object} siteConfig - Merged public site config (brand, media, seo, contact, social)
 * @returns {Object} JSON-LD Organization schema
 */
export function buildOrganizationSchema(siteConfig = {}) {
  const brand = siteConfig.brand || {};
  const media = siteConfig.media || {};
  const seo = siteConfig.seo || {};
  const contact = siteConfig.contact || {};
  const social = siteConfig.social || {};

  const logoUrl = media.logoUrl || '/Logo_192.png';
  const ogImageRaw = media.ogImageUrl || seo.ogImageUrl || '/og-share.png';
  const ogImage = isLegacyStorefrontHost(ogImageRaw)
    ? '/og-share.png'
    : (typeof ogImageRaw === 'string' && ogImageRaw.trim() ? ogImageRaw.trim() : '/og-share.png');
  const abs = (url) => (url?.startsWith('http') ? url : `${BASE_URL}${url.startsWith('/') ? url : `/${url}`}`);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: brand.siteName || 'Smart Shopper | المتسوق الذكي',
    url: BASE_URL,
    logo: abs(logoUrl),
    image: abs(ogImage),
    description: seo.description || brand.description || 'المتسوق الذكي — متجرك الإلكتروني لمنتجات متنوعة بأسعار منافسة وتجربة تسوق سهلة',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: ['Arabic', 'English'],
    },
    sameAs: [],
  };

  if (contact.phone) {
    schema.contactPoint.telephone = contact.phone;
  }
  if (contact.email) {
    schema.contactPoint.email = contact.email;
  }
  if (social.instagram) schema.sameAs.push(social.instagram);
  if (social.facebook) schema.sameAs.push(social.facebook);
  if (social.twitter) schema.sameAs.push(social.twitter);
  if (social.tiktok) schema.sameAs.push(social.tiktok);
  if (social.youtube) schema.sameAs.push(social.youtube);
  if (social.telegram) schema.sameAs.push(social.telegram);
  if (social.linkedin) schema.sameAs.push(social.linkedin);
  if (social.threads) schema.sameAs.push(social.threads);
  if (contact.whatsapp) schema.sameAs.push(contact.whatsapp);

  return schema;
}

/**
 * Build WebSite structured data with SearchAction (sitelinks search box)
 *
 * @returns {Object} JSON-LD WebSite schema
 */
export function buildWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Smart Shopper | المتسوق الذكي',
    url: BASE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${BASE_URL}/products?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * Build FAQPage structured data
 *
 * @param {Array<{question: string, answer: string}>} faqs
 * @returns {Object} JSON-LD FAQPage schema
 */
export function buildFAQSchema(faqs) {
  if (!faqs || faqs.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

/**
 * Build ItemList structured data (for product listing pages)
 *
 * @param {Array} products - List of products
 * @param {string} listName - Name of the list (e.g., category name)
 * @returns {Object} JSON-LD ItemList schema
 */
export function buildItemListSchema(products, listName = 'منتجات المتسوق الذكي') {
  if (!products || products.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: listName,
    numberOfItems: products.length,
    itemListElement: products.slice(0, 30).map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${BASE_URL}/product/${product.slug || product.id}`,
      name: product.title,
    })),
  };
}
