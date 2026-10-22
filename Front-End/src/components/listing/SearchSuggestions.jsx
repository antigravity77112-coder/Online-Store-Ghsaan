import React, { useMemo, useCallback } from 'react';
import useSWR from 'swr';
import { Sparkles } from 'lucide-react';
import * as api from '../../services/api';
import { ProductGrid } from '../HighConversionGrid';
import { useFavorites } from '../../context/FavoritesContext';
import { mapListingProducts, listingProductId } from '../../utils/mapStorefrontProduct';
import { useListingProducts } from '../../hooks/useListingProducts';

const SUGGESTION_COUNT = 8;

async function fetchSuggestions() {
  const trending = await api.getProducts({ pageSize: SUGGESTION_COUNT, pageNumber: 1, trending: true });
  if (Array.isArray(trending) && trending.length >= 4) return trending;
  const latest = await api.getProducts({ pageSize: SUGGESTION_COUNT, pageNumber: 1 });
  return Array.isArray(latest) ? latest : [];
}

/** «منتجات قد تعجبك» — shown under an empty search result. */
export default function SearchSuggestions({ className = '' }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { data, isLoading } = useSWR('search-suggestions', fetchSuggestions, {
    revalidateOnFocus: false,
    dedupingInterval: 300000,
  });

  const rawProducts = useMemo(() => data || [], [data]);
  const shuffled = useListingProducts(rawProducts, 'default');
  const products = useMemo(
    () => mapListingProducts(shuffled, { isFavorite }),
    [shuffled, isFavorite],
  );

  const handleFavorite = useCallback((p) => {
    const original = rawProducts.find((prod) => String(prod.id) === listingProductId(p));
    if (original) toggleFavorite(original);
  }, [rawProducts, toggleFavorite]);

  if (!isLoading && products.length === 0) return null;

  return (
    <section className={className} aria-labelledby="search-suggestions-title">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-gold-600" aria-hidden="true" />
        <h2 id="search-suggestions-title" className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
          منتجات قد تعجبك
        </h2>
      </div>
      <ProductGrid
        products={products}
        isLoading={isLoading}
        loadingCount={4}
        variant="listing"
        onFavorite={handleFavorite}
        priorityCount={0}
      />
    </section>
  );
}
