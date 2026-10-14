import { useMemo, useRef } from 'react';
import { appendRankedProducts, sortProducts } from '../utils/productListingSort';

/**
 * Client-side listing order. With shuffleSeed, default order is deterministic until F5.
 * Infinite scroll: already-visible items stay put; new pages append at the bottom.
 *
 * @param {Array} products
 * @param {string} sortOrder
 * @param {string|number} [shuffleSeed] - from useProductsInfinite session memory
 */
export function useListingProducts(products, sortOrder = 'default', shuffleSeed = '') {
  const seedRef = useRef(shuffleSeed);
  if (shuffleSeed) seedRef.current = shuffleSeed;

  const orderIdsRef = useRef([]);
  const sortRef = useRef(sortOrder);
  const seedUsedRef = useRef(seedRef.current);

  // Reset stable order when sort mode or shuffle seed identity changes (new listing).
  if (sortRef.current !== sortOrder || seedUsedRef.current !== (seedRef.current || shuffleSeed)) {
    sortRef.current = sortOrder;
    seedUsedRef.current = seedRef.current || shuffleSeed;
    orderIdsRef.current = [];
  }

  return useMemo(() => {
    const list = products || [];

    if (sortOrder !== 'default') {
      orderIdsRef.current = [];
      return sortProducts(list, sortOrder);
    }

    const seed = seedRef.current || shuffleSeed;
    if (!seed) {
      // Unseeded: still append-stable so load-more does not reshuffle the whole grid.
      const { products: ordered, orderedIds } = appendRankedProducts(
        list,
        '',
        orderIdsRef.current,
      );
      // appendRankedProducts with empty seed uses shuffleProducts for newcomers only
      orderIdsRef.current = orderedIds;
      return ordered;
    }

    const { products: ordered, orderedIds } = appendRankedProducts(
      list,
      seed,
      orderIdsRef.current,
    );
    orderIdsRef.current = orderedIds;
    return ordered;
  }, [products, sortOrder, shuffleSeed]);
}
