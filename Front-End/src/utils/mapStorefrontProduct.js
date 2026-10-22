import * as api from '../services/api';
import { expandColorListingCards } from './expandColorListingCards';

/** Local branded placeholder — no third-party image CDN. */
export const FALLBACK_IMAGE = '/product-placeholder.svg';

/**
 * Maps an API product (or expanded color face) to the storefront card/grid shape.
 * Ratings and review counts are included only when provided by the API.
 */
export function mapStorefrontProduct(p) {
  const productId = p.productId || p.id;
  const listingVariantId = p.listingVariantId || null;
  const slug = p.slug || productId;
  const rawImage =
    p.imageUrl
    || p.mainImageUrl
    || p.images?.[0]?.url
    || p.image
    || FALLBACK_IMAGE;

  const href = listingVariantId
    ? `/product/${encodeURIComponent(slug)}?variant=${encodeURIComponent(listingVariantId)}`
    : `/product/${encodeURIComponent(slug)}`;

  const mapped = {
    id: p.id,
    productId,
    listingVariantId,
    colorValue: p.colorValue || null,
    colorSwatches: Array.isArray(p.colorSwatches) ? p.colorSwatches : [],
    href,
    slug,
    title: p.title,
    description: p.description || null,
    image: rawImage,
    price: p.price != null ? Number(p.price) : undefined,
    currency: p.currency,
    currencySymbol: api.CurrencySymbol[p.currency] || 'ريال',
    badge: p.condition === 'New' ? null : p.condition === 'Used' ? 'Sale' : 'Local',
    isPromoted: p.isPromoted || false,
    isTrending: p.isTrending || false,
    discountPrice: p.discountPrice ? Number(p.discountPrice) : undefined,
    promotionLabel: p.promotionLabel || undefined,
    stockQuantity: p.stockQuantity != null ? Number(p.stockQuantity) : undefined,
    remainingStock: p.remainingStock != null
      ? Number(p.remainingStock)
      : (p.stockQuantity != null ? Number(p.stockQuantity) : undefined),
    hasVariants: Boolean(p.hasVariants),
    showStock: p.showStock !== false,
  };

  if (p.rating != null) mapped.rating = p.rating;
  if (p.reviewCount != null) mapped.reviewCount = p.reviewCount;

  return mapped;
}

/**
 * Expand color variants into Shein-style listing faces, then map for cards.
 * @param {object[]} products raw API products
 * @param {{ isFavorite?: (productId: string) => boolean }} [opts]
 */
export function mapListingProducts(products, { isFavorite } = {}) {
  return expandColorListingCards(products || []).map((face) => {
    const mapped = mapStorefrontProduct(face);
    if (typeof isFavorite === 'function') {
      mapped.isFavorite = isFavorite(mapped.productId);
    }
    return mapped;
  });
}

/** Resolve parent product id from a mapped card or composite listing id. */
export function listingProductId(cardOrId) {
  if (cardOrId && typeof cardOrId === 'object') {
    return String(cardOrId.productId || cardOrId.id || '');
  }
  const raw = String(cardOrId || '');
  const sep = raw.indexOf('::');
  return sep === -1 ? raw : raw.slice(0, sep);
}
