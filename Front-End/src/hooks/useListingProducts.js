import { useMemo, useRef } from 'react';
import { appendRankedProducts, sortProducts } from '../utils/productListingSort';
import { getListingMemory, setListingMemory } from '../utils/listingSessionMemory';

/**
 * Client-side listing order. With shuffleSeed, default order is deterministic until F5.
 * Infinite scroll: already-visible items stay put; new pages append at the bottom.
 * On Back remount, restores saved orderedIds so the grid matches the pre-product order
 * (full-page re-rank would otherwise reshuffle vs append-stable browsing).
 *
 * @param {Array} products
 * @param {string} sortOrder
 * @param {string|number} [shuffleSeed] - from useProductsInfinite session memory
 * @param {string} [listingKey] - session memory key for orderedIds persistence
 */
export function useListingProducts(products, sortOrder = 'default', shuffleSeed = '', listingKey = '') {
  const seedRef = useRef(shuffleSeed);
  if (shuffleSeed) seedRef.current = shuffleSeed;

  const listingKeyRef = useRef(listingKey);
  listingKeyRef.current = listingKey || '';

  const orderIdsRef = useRef([]);
  const sortRef = useRef(sortOrder);
  const seedUsedRef = useRef(seedRef.current);
  const keyUsedRef = useRef(listingKey || '');
  const hydratedKeyRef = useRef('');

  // Reset stable order when listing identity, sort, or seed changes.
  if (
    sortRef.current !== sortOrder
    || seedUsedRef.current !== (seedRef.current || shuffleSeed)
    || keyUsedRef.current !== (listingKey || '')
  ) {
    sortRef.current = sortOrder;
    seedUsedRef.current = seedRef.current || shuffleSeed;
    keyUsedRef.current = listingKey || '';
    orderIdsRef.current = [];
    hydratedKeyRef.current = '';
  }

  // One-time hydrate of saved order for this listingKey (Back remount).
  if (
    listingKey
    && sortOrder === 'default'
    && hydratedKeyRef.current !== listingKey
    && orderIdsRef.current.length === 0
  ) {
    const saved = getListingMemory(listingKey)?.orderedIds;
    if (Array.isArray(saved) && saved.length > 0) {
      orderIdsRef.current = saved.map(String);
    }
    hydratedKeyRef.current = listingKey;
  }

  return useMemo(() => {
    const list = products || [];

    if (sortOrder !== 'default') {
      orderIdsRef.current = [];
      if (listingKeyRef.current) {
        setListingMemory(listingKeyRef.current, { orderedIds: [] });
      }
      return sortProducts(list, sortOrder);
    }

    const seed = seedRef.current || shuffleSeed;
    const { products: ordered, orderedIds } = appendRankedProducts(
      list,
      seed || '',
      orderIdsRef.current,
    );
    orderIdsRef.current = orderedIds;

    if (listingKeyRef.current && orderedIds.length > 0) {
      setListingMemory(listingKeyRef.current, { orderedIds });
    }

    return ordered;
  }, [products, sortOrder, shuffleSeed]);
}
