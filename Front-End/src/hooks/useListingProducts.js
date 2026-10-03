import { useMemo, useRef } from 'react';
import { rankProductsBySeed, shuffleProducts, sortProducts } from '../utils/productListingSort';

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
    return rankProductsBySeed(list, seed);
  }, [products, sortOrder, shuffleSeed]);
}
