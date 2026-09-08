/** Canonical public storefront origin (no trailing slash). */
export const STOREFRONT_ORIGIN = 'https://online-store-ghsaan.vercel.app';

/** Absolute storefront URL for a path like `/og-share.png` or `product/x`. */
export function storefrontUrl(path = '/') {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${STOREFRONT_ORIGIN}${normalized === '/' ? '/' : normalized}`;
}

/** True when a URL still points at a previous storefront / domain. */
export function isLegacyStorefrontHost(url) {
  if (typeof url !== 'string' || !url.trim()) return false;
  return /6eeb\.com|gisaah\.com|gisaah-store\.vercel\.app/i.test(url);
}
