const STORAGE_KEY = 'gisaah_recently_viewed_v1';
const MAX_ITEMS = 18;

function readRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRaw(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_ITEMS)));
  } catch {
    /* quota / private mode */
  }
}

/**
 * Push a product snapshot after PDP view (most-recent first).
 * @param {{ id: string, slug?: string, title?: string, imageUrl?: string, price?: number, discountPrice?: number, currency?: string }} product
 */
export function pushRecentlyViewed(product) {
  if (!product?.id || typeof window === 'undefined') return;
  const id = String(product.id);
  const entry = {
    id,
    slug: product.slug || id,
    title: product.title || '',
    imageUrl: product.imageUrl || product.mainImageUrl || product.images?.[0]?.url || '',
    price: product.price != null ? Number(product.price) : undefined,
    discountPrice: product.discountPrice != null ? Number(product.discountPrice) : undefined,
    currency: product.currency || 'USD',
    viewedAt: Date.now(),
  };
  const next = [entry, ...readRaw().filter((p) => String(p.id) !== id)];
  writeRaw(next);
}

/** @returns {typeof entry[]} */
export function getRecentlyViewed({ excludeId = null, limit = 12 } = {}) {
  const list = readRaw();
  const filtered = excludeId
    ? list.filter((p) => String(p.id) !== String(excludeId))
    : list;
  return filtered.slice(0, limit);
}
