/**
 * RelatedProducts — منتجات قد تعجبك (شبكة عمودية)
 */

import React, { useMemo, useCallback } from 'react';
import useSWR from 'swr';
import { useCart } from '../context/CartContext';
import { useFavorites } from '../context/FavoritesContext';
import { mapStorefrontProduct } from '../utils/mapStorefrontProduct';
import * as api from '../services/api';
import ProductVerticalSection from './ProductVerticalSection';

const MAX_RELATED_CATEGORIES = 3;

async function fetchRelated(names) {
  const lists = await Promise.all(
    names.map((categoryName) => api.getProducts({ categoryName, pageSize: 12 }).catch(() => [])),
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

  const names = (categoryNames?.length ? categoryNames : [categoryName])
    .filter(Boolean)
    .slice(0, MAX_RELATED_CATEGORIES);
  const namesKey = names.join('|');

  const { data: products, isLoading } = useSWR(
    namesKey ? ['related-products', namesKey] : null,
    () => fetchRelated(names),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    },
  );

  const related = useMemo(() => {
    if (!products?.length) return [];
    return products
      .filter((p) => String(p.id) !== String(currentId))
      .slice(0, 8)
      .map((p) => ({ ...mapStorefrontProduct(p), isFavorite: isFavorite(p.id) }));
  }, [products, currentId, isFavorite]);

  const handleQuickAdd = useCallback(
    (p) => {
      const original = products?.find((prod) => String(prod.id) === String(p.id));
      if (original) addToCart(original, 1);
    },
    [products, addToCart],
  );

  const handleFavoriteToggle = useCallback(
    (p) => {
      const original = products?.find((prod) => String(prod.id) === String(p.id));
      if (original) toggleFavorite(original);
    },
    [products, toggleFavorite],
  );

  if (!isLoading && !related.length) return null;

  return (
    <ProductVerticalSection
      title="منتجات قد تعجبك"
      products={related}
      isLoading={isLoading}
      loadingCount={6}
      onFavorite={handleFavoriteToggle}
      onQuickAdd={handleQuickAdd}
    />
  );
});

RelatedProducts.displayName = 'RelatedProducts';
export default RelatedProducts;
