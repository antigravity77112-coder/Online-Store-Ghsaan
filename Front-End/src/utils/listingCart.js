import { listingProductId } from './mapStorefrontProduct';

/**
 * Build a cart payload from a mapped listing card (optionally with active swatch overrides).
 */
export function buildListingCartPayload(card, overrides = {}) {
  if (!card) return null;
  const productId = listingProductId(card);
  const variantId =
    overrides.listingVariantId !== undefined
      ? overrides.listingVariantId
      : (card.listingVariantId || null);
  const colorValue =
    overrides.colorValue !== undefined ? overrides.colorValue : (card.colorValue || null);
  const image = overrides.image || card.image;
  const price = overrides.price != null ? overrides.price : card.price;
  const discountPrice =
    overrides.discountPrice !== undefined ? overrides.discountPrice : card.discountPrice;
  const stock =
    overrides.remainingStock != null
      ? overrides.remainingStock
      : (card.remainingStock ?? card.stockQuantity ?? 9999);

  return {
    id: variantId ? `${productId}::${variantId}` : productId,
    baseProductId: productId,
    variantId,
    options: colorValue ? { لون: colorValue } : null,
    title: card.title,
    slug: card.slug || null,
    price: price != null ? Number(price) : 0,
    discountPrice: discountPrice != null && discountPrice !== '' ? Number(discountPrice) : null,
    currency: card.currency || 'USD',
    imageUrl: image,
    mainImageUrl: image,
    stockQuantity: Number(stock) || 9999,
    description: card.description || null,
    hasVariants: Boolean(card.hasVariants),
  };
}

/**
 * True when the card face can be added without opening PDP.
 * Color faces (listingVariantId) and simple products qualify.
 * Variant products without a resolved face go to PDP.
 */
export function canQuickAddFromCard(card) {
  if (!card) return false;
  if (!card.hasVariants) return true;
  return Boolean(card.listingVariantId);
}
