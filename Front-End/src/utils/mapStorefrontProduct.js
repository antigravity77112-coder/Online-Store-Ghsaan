import * as api from '../services/api';

/** Local branded placeholder — no third-party image CDN. */
export const FALLBACK_IMAGE = '/product-placeholder.svg';

/**
 * Maps an API product to the storefront card/grid shape.
 * Ratings and review counts are included only when provided by the API.
 */
export function mapStorefrontProduct(p) {
  const rawImage =
    p.imageUrl
    || p.mainImageUrl
    || p.images?.[0]?.url
    || FALLBACK_IMAGE;
  const mapped = {
    id: p.id,
    slug: p.slug || p.id,
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
