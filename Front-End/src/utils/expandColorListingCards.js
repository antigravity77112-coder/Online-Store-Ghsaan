/**
 * Shein-style listing expansion: one storefront face per distinct Color value.
 * Size and other variant dims stay on the PDP.
 */

const COLOR_SLUG_RE = /^(color|colour|لون)$/i;
const COLOR_NAME_RE = /لون|color|colour/i;

export function isColorAttribute(attr) {
  const slug = attr?.categoryAttribute?.slug || attr?.slug || '';
  const name = attr?.categoryAttribute?.name || attr?.name || '';
  return COLOR_SLUG_RE.test(String(slug)) || COLOR_NAME_RE.test(String(name));
}

function colorValueOf(variant) {
  const attrs = variant?.attributes || [];
  for (const attr of attrs) {
    if (!isColorAttribute(attr)) continue;
    const value = attr.value != null ? String(attr.value).trim() : '';
    if (value) return value;
  }
  return null;
}

function pickRepresentativeVariant(variants) {
  const withImageAndStock = variants.find(
    (v) => v.imageUrl && Number(v.stockQuantity) > 0,
  );
  if (withImageAndStock) return withImageAndStock;
  const withImage = variants.find((v) => v.imageUrl);
  if (withImage) return withImage;
  const inStock = variants.find((v) => Number(v.stockQuantity) > 0);
  return inStock || variants[0];
}

function buildColorSwatches(byColor) {
  return [...byColor.entries()].map(([color, variants]) => {
    const rep = pickRepresentativeVariant(variants);
    const stock = variants.reduce((sum, v) => sum + (Number(v.stockQuantity) || 0), 0);
    return {
      color,
      variantId: rep?.id || null,
      imageUrl: rep?.imageUrl || null,
      inStock: stock > 0,
      stockQuantity: stock,
      price: rep?.price != null ? Number(rep.price) : null,
      discountPrice: rep?.discountPrice != null ? Number(rep.discountPrice) : null,
    };
  });
}

/**
 * Expand API products into listing faces (one per color when a Color attr exists).
 * @param {object[]} products
 * @returns {object[]} product-shaped faces with listingVariantId / colorSwatches
 */
export function expandColorListingCards(products = []) {
  const faces = [];

  for (const product of products || []) {
    if (!product) continue;
    const variants = Array.isArray(product.variants) ? product.variants : [];
    const byColor = new Map();

    for (const variant of variants) {
      const color = colorValueOf(variant);
      if (!color) continue;
      if (!byColor.has(color)) byColor.set(color, []);
      byColor.get(color).push(variant);
    }

    if (byColor.size === 0) {
      faces.push({
        ...product,
        productId: product.id,
        listingVariantId: null,
        colorValue: null,
        colorSwatches: [],
      });
      continue;
    }

    const swatches = buildColorSwatches(byColor);
    const productImage =
      product.imageUrl || product.mainImageUrl || product.images?.[0]?.url || null;

    for (const [color, colorVariants] of byColor.entries()) {
      const rep = pickRepresentativeVariant(colorVariants);
      const stock = colorVariants.reduce(
        (sum, v) => sum + (Number(v.stockQuantity) || 0),
        0,
      );
      const faceImage = rep?.imageUrl || productImage;
      faces.push({
        ...product,
        // Unique listing key for React / layoutId; favorites use productId.
        id: `${product.id}::${encodeURIComponent(color)}`,
        productId: product.id,
        listingVariantId: rep?.id || null,
        colorValue: color,
        colorSwatches: swatches,
        imageUrl: faceImage,
        mainImageUrl: faceImage,
        price: rep?.price != null ? Number(rep.price) : product.price,
        discountPrice:
          rep?.discountPrice != null ? Number(rep.discountPrice) : product.discountPrice,
        remainingStock: stock,
        stockQuantity: stock,
        hasVariants: true,
      });
    }
  }

  return faces;
}
