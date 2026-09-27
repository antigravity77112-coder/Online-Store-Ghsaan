import { useMemo, useRef } from 'react';
import { shuffleProducts, sortProducts } from '../utils/productListingSort';

/**
 * Listing order that reshuffles on full remount (page refresh / navigation remount),
 * while keeping already-shown items stable when infinite-scroll pages append.
 */
export function useListingProducts(products, sortOrder = 'default') {
  const orderRef = useRef([]);

  return useMemo(() => {
    const list = products || [];

    if (sortOrder !== 'default') {
      orderRef.current = [];
      return sortProducts(list, sortOrder);
    }

    const byId = new Map(list.map((p) => [String(p.id), p]));
    const idSet = new Set(byId.keys());

    let ordered = orderRef.current.filter((id) => idSet.has(id));
    const overlap = ordered.length;
    // Filter/search swap: almost nothing overlaps → reshuffle from scratch
    if (idSet.size > 0 && overlap / idSet.size < 0.2) {
      ordered = [];
    }

    const known = new Set(ordered);
    const newcomers = [...idSet].filter((id) => !known.has(id));
    if (newcomers.length) {
      ordered = [...ordered, ...shuffleProducts(newcomers)];
    }

    orderRef.current = ordered;
    return ordered.map((id) => byId.get(id)).filter(Boolean);
  }, [products, sortOrder]);
}
