/**
 * RelatedProducts — منتجات قد تعجبك
 * Same-category first (seeded shuffle), then the rest of the catalog with infinite scroll.
 */

import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import useSWR from 'swr';
import { useCart } from '../context/CartContext';
import { useFavorites } from '../context/FavoritesContext';
import { mapStorefrontProduct } from '../utils/mapStorefrontProduct';
import { useProductsInfinite } from '../hooks/useProducts';
import { appendRankedProducts, rankProductsBySeed } from '../utils/productListingSort';
import { ensureShuffleSeed } from '../utils/listingSessionMemory';
import * as api from '../services/api';
import ProductVerticalSection from './ProductVerticalSection';
import InfiniteScrollTrigger from './InfiniteScrollTrigger';

const MAX_RELATED_CATEGORIES = 3;
const CATEGORY_PAGE_SIZE = 48;

async function fetchCategoryBatch(names) {
  const lists = await Promise.all(
    names.map((categoryName) =>
      api.getProducts({ categoryName, pageSize: CATEGORY_PAGE_SIZE }).catch(() => []),
    ),
  );
  const seen = new Set();
  return lists.flat().filter((p) => {
    const id = String(p.id);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

const RelatedProducts = React.memo(({ categoryName, categoryNames, currentId }) => {
  const { addToCart } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();

  const names = (categoryNames?.length ? categoryNames : categoryName ? [categoryName] : [])
    .filter(Boolean)
    .slice(0, MAX_RELATED_CATEGORIES);
  const namesKey = names.join('|');
  const seed = ensureShuffleSeed(`related-${currentId || 'x'}-${namesKey || 'all'}`);

  const { data: categoryProducts, isLoading: catLoading } = useSWR(
    namesKey ? ['related-category-batch', namesKey] : null,
    () => fetchCategoryBatch(names),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    },
  );

  const {
    data: catalogRaw = [],
    isLoading: catalogLoading,
    isLoadingMore,
    isReachingEnd,
    setSize,
  } = useProductsInfinite({ memoryKey: `related-catalog-${currentId || 'x'}` });

  const restOrderIdsRef = useRef([]);
  const relatedSeedRef = useRef(seed);
  useEffect(() => {
    if (relatedSeedRef.current !== seed) {
      relatedSeedRef.current = seed;
      restOrderIdsRef.current = [];
    }
  }, [seed]);

  const related = useMemo(() => {
    const excludeId = String(currentId || '');
    const catPool = (categoryProducts || []).filter((p) => String(p.id) !== excludeId);
    const catIds = new Set(catPool.map((p) => String(p.id)));
    const restPool = (catalogRaw || []).filter(
      (p) => String(p.id) !== excludeId && !catIds.has(String(p.id)),
    );

    // Category batch is one-shot; catalog pages must append without reshuffling prior rows.
    const { products: restOrdered, orderedIds } = appendRankedProducts(
      restPool,
      `${seed}-rest`,
      restOrderIdsRef.current,
    );
    restOrderIdsRef.current = orderedIds;

    const ordered = [
      ...rankProductsBySeed(catPool, seed),
      ...restOrdered,
    ];

    return ordered.map((p) => ({ ...mapStorefrontProduct(p), isFavorite: isFavorite(p.id) }));
  }, [categoryProducts, catalogRaw, currentId, seed, isFavorite]);

  const sourcePool = useMemo(() => {
    const map = new Map();
    for (const p of categoryProducts || []) map.set(String(p.id), p);
    for (const p of catalogRaw || []) map.set(String(p.id), p);
    return map;
  }, [categoryProducts, catalogRaw]);

  const handleQuickAdd = useCallback(
    (p) => {
      const original = sourcePool.get(String(p.id));
      if (original) addToCart(original, 1);
    },
    [sourcePool, addToCart],
  );

  const handleFavoriteToggle = useCallback(
    (p) => {
      const original = sourcePool.get(String(p.id));
      if (original) toggleFavorite(original);
    },
    [sourcePool, toggleFavorite],
  );

  const handleLoadMore = useCallback(() => {
    setSize((s) => s + 1);
  }, [setSize]);

  const initialLoading =
    (Boolean(namesKey) && catLoading && !categoryProducts) ||
    (catalogLoading && catalogRaw.length === 0);
  const showSection = initialLoading || related.length > 0 || isLoadingMore;

  if (!showSection) return null;

  return (
    <div>
      <ProductVerticalSection
        title="منتجات قد تعجبك"
        products={related}
        isLoading={initialLoading}
        isLoadingMore={isLoadingMore}
        loadingCount={6}
        animateEntrance
        onFavorite={handleFavoriteToggle}
        onQuickAdd={handleQuickAdd}
      />
      <InfiniteScrollTrigger
        onIntersect={handleLoadMore}
        isLoadingMore={isLoadingMore || initialLoading}
        isReachingEnd={isReachingEnd}
      />
    </div>
  );
});

RelatedProducts.displayName = 'RelatedProducts';

export default RelatedProducts;
