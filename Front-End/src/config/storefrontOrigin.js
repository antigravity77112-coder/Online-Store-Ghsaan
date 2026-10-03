/** Canonical public storefront origin (no trailing slash). */
export const STOREFRONT_ORIGIN = 'https://online-store-ghsaan.vercel.app';

/** Absolute storefront URL for a path like `/favicon.png` or `product/x`. */
export function storefrontUrl(path = '/') {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${STOREFRONT_ORIGIN}${normalized === '/' ? '/' : normalized}`;
}
