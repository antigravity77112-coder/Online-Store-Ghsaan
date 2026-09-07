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

const RelatedProducts = React.memo(({ categoryName, currentId }) => {
  const { addToCart } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();

  const { data: products, isLoading } = useSWR(
    categoryName ? ['related-products', categoryName] : null,
    () => api.getProducts({ categoryName, pageSize: 12 }),
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
