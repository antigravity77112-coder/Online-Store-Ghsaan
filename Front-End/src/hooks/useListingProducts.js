import { useMemo, useRef } from 'react';
import { shuffleProducts, sortProducts } from '../utils/productListingSort';

/** Stable rank from product id + session shuffle seed (order survives remount / Back). */
function seededRank(id, seed) {
  const str = `${seed}:${id}`;
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Client-side listing order. With shuffleSeed, default order is deterministic until F5.
 *
 * @param {Array} products
 * @param {string} sortOrder
 * @param {string|number} [shuffleSeed] - from useProductsInfinite session memory
 */
export function useListingProducts(products, sortOrder = 'default', shuffleSeed = '') {
  const seedRef = useRef(shuffleSeed);
  if (shuffleSeed) seedRef.current = shuffleSeed;

  return useMemo(() => {
    const list = products || [];

    if (sortOrder !== 'default') {
      return sortProducts(list, sortOrder);
    }

    const seed = seedRef.current || shuffleSeed;
    if (!seed) {
      return shuffleProducts(list);
    }

    // Rank by seed+id so infinite-scroll appends keep relative order of prior items.
    return [...list].sort((a, b) => {
      const ra = seededRank(String(a.id), seed);
      const rb = seededRank(String(b.id), seed);
      if (ra !== rb) return ra - rb;
      return String(a.id).localeCompare(String(b.id));
    });
  }, [products, sortOrder, shuffleSeed]);
}
