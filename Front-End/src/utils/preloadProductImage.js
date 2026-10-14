import { getOptimizedImageUrl, IMAGE_WIDTHS } from './cloudinaryUrl';

/** Dedupes <link rel=preload> / Image() warmups for the same delivery URL. */
const warmed = new Set();

/**
 * Warm the detail-sized product image before navigation (pointerdown intent).
 * Safe with CF resizing off (still warms the same URL the PDP will request).
 */
export function preloadProductDetailImage(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return;
  if (typeof document === 'undefined') return;

  const href = getOptimizedImageUrl(rawUrl, IMAGE_WIDTHS.DETAIL);
  if (!href || warmed.has(href)) return;
  warmed.add(href);

  try {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = href;
    document.head.appendChild(link);
  } catch {
    /* ignore */
  }

  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = href;
  } catch {
    /* ignore */
  }
}

/**
 * Resolve raw image URL from a product listing <a> (data attr or nested img).
 */
export function readProductImageFromAnchor(anchor) {
  if (!anchor || typeof anchor.getAttribute !== 'function') return '';
  const fromData = anchor.getAttribute('data-product-image');
  if (fromData) return fromData;
  const article = typeof anchor.closest === 'function' ? anchor.closest('article') : null;
  const scope = article || anchor;
  const img = scope.querySelector?.('img[data-product-image], img');
  if (img?.getAttribute?.('data-product-image')) {
    return img.getAttribute('data-product-image') || '';
  }
  return '';
}
