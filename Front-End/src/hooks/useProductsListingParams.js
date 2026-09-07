import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * URL-backed search + sort for /products.
 * Committed search lives in ?search=; draft is local until Enter/submit.
 */
export function useProductsListingParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const committedSearch = searchParams.get('search') || '';
  const offersOnly = searchParams.get('offers') === 'true' || searchParams.get('promoted') === 'true';
  const trendingOnly = searchParams.get('trending') === 'true';
  const sortOrder = searchParams.get('sort') || 'default';
  const categoryFilter = searchParams.get('category') || '';

  const [draftSearch, setDraftSearch] = useState(committedSearch);

  useEffect(() => {
    setDraftSearch(committedSearch);
  }, [committedSearch]);

  const updateParams = useCallback((mutate, { replace = true } = {}) => {
    const next = new URLSearchParams(searchParams);
    mutate(next);
    setSearchParams(next, { replace });
  }, [searchParams, setSearchParams]);

  const commitSearch = useCallback((value, { replace = true } = {}) => {
    const trimmed = (value ?? '').trim();
    const next = new URLSearchParams(searchParams);
    if (trimmed) next.set('search', trimmed);
    else next.delete('search');
    setSearchParams(next, { replace });
  }, [searchParams, setSearchParams]);

  const commitSearchNow = useCallback(() => {
    commitSearch(draftSearch, { replace: true });
  }, [draftSearch, commitSearch]);

  const clearSearch = useCallback(() => {
    setDraftSearch('');
    commitSearch('', { replace: true });
  }, [commitSearch]);

  const setSortOrder = useCallback((value) => {
    updateParams((next) => {
      if (value && value !== 'default') next.set('sort', value);
      else next.delete('sort');
    }, { replace: true });
  }, [updateParams]);

  const setCategoryFilter = useCallback((name) => {
    updateParams((next) => {
      if (name && name !== 'الكل') next.set('category', name);
      else next.delete('category');
    }, { replace: true });
  }, [updateParams]);

  const clearAllFilters = useCallback(() => {
    setDraftSearch('');
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  const clearOffersFilter = useCallback(() => {
    updateParams((next) => {
      next.delete('offers');
      next.delete('promoted');
    }, { replace: true });
  }, [updateParams]);

  const clearTrendingFilter = useCallback(() => {
    updateParams((next) => {
      next.delete('trending');
    }, { replace: true });
  }, [updateParams]);

  return {
    committedSearch,
    draftSearch,
    setDraftSearch,
    commitSearchNow,
    clearSearch,
    offersOnly,
    trendingOnly,
    sortOrder,
    categoryFilter,
    setSortOrder,
    setCategoryFilter,
    clearAllFilters,
    clearOffersFilter,
    clearTrendingFilter,
    searchParams,
    setSearchParams,
  };
}
