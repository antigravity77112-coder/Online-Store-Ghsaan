import { useMemo } from 'react';
import useSWR from 'swr';
import * as api from '../services/api';
import { rankProductsBySeed } from '../utils/productListingSort';
import { ensureShuffleSeed } from '../utils/listingSessionMemory';

const SECTION_COUNT = 8;
const CATEGORY_CAROUSEL_COUNT = 10;
const MIN_PRODUCTS_PER_SECTION = 3;
const MAX_CATEGORY_SECTIONS = 5;
/** Dedicated newest window — sorted by createdAt client-side (API default is promo-first). */
const NEWEST_FETCH_SIZE = SECTION_COUNT * 3;
const HOME_SECTIONS_SEED_KEY = 'home-sections';

function takeUniqueProducts(candidates, count, usedIds) {
  const result = [];
  for (const p of candidates || []) {
    const id = String(p.id);
    if (usedIds.has(id)) continue;
    result.push(p);
    usedIds.add(id);
    if (result.length >= count) break;
  }
  return result;
}

function byCreatedAtDesc(a, b) {
  return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
}

/**
 * Targeted parallel product fetches for homepage rails.
 * Each section has its own API query — not one shared catalog pool.
 * Cross-section deduplication prevents the same SKU in multiple rails.
 */
export function useHomeProducts(categories = []) {
  const activeCategories = useMemo(
    () => (categories || []).filter((c) => c?.isActive !== false && c?.name).slice(0, MAX_CATEGORY_SECTIONS),
    [categories],
  );
  const categoryKey = activeCategories.map((c) => c.id || c.name).join('|');

  const {
    data: offersProducts,
    error: offersError,
    isLoading: offersLoading,
  } = useSWR('home-products-offers', () =>
    api.getProducts({ specialOffers: true, pageSize: SECTION_COUNT }),
  {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  },
  );

  const {
    data: trendingProducts,
    error: trendingError,
    isLoading: trendingLoading,
  } = useSWR('home-products-trending', () =>
    api.getProducts({ trending: true, pageSize: SECTION_COUNT }),
  {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  },
  );

  const {
    data: newestProducts,
    error: newestError,
    isLoading: newestLoading,
  } = useSWR('home-products-newest', () =>
    api.getProducts({ pageSize: NEWEST_FETCH_SIZE }),
  {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  },
  );

  const {
    data: featuredPool,
    error: featuredError,
    isLoading: featuredLoading,
  } = useSWR('home-products-featured', () =>
    api.getProducts({ pageSize: SECTION_COUNT * 2 }),
  {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  },
  );

  const {
    data: categoryResults,
    error: categoryError,
    isLoading: categoryLoading,
  } = useSWR(
    categoryKey ? ['home-products-by-category', categoryKey] : null,
    () =>
      Promise.all(
        activeCategories.map(async (cat) => {
          const products = await api.getProducts({
            categoryName: cat.name,
            pageSize: CATEGORY_CAROUSEL_COUNT,
          });
          return {
            id: cat.id || cat.name,
            name: cat.name,
            slug: cat.slug,
            products: products || [],
          };
        }),
      ),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    },
  );

  const sessionSeed = ensureShuffleSeed(HOME_SECTIONS_SEED_KEY);

  const error = offersError || trendingError || newestError || featuredError || categoryError;

  const {
    featuredOffers,
    newArrivals,
    featuredProducts,
    trending,
    categorySections,
    sectionProducts,
  } = useMemo(() => {
    const rank = (list) => rankProductsBySeed(list, sessionSeed);
    const usedIds = new Set();

    const offers = takeUniqueProducts(rank(offersProducts || []), SECTION_COUNT, usedIds);

    const trendingList = takeUniqueProducts(rank(trendingProducts || []), SECTION_COUNT, usedIds);

    const sortedNewest = [...(newestProducts || [])].sort(byCreatedAtDesc);
    const arrivals = takeUniqueProducts(rank(sortedNewest), SECTION_COUNT, usedIds);

    const featured = takeUniqueProducts(rank(featuredPool || []), SECTION_COUNT, usedIds);

    const catSections = (categoryResults || [])
      .map((section) => ({
        ...section,
        products: takeUniqueProducts(rank(section.products), CATEGORY_CAROUSEL_COUNT, usedIds),
      }))
      .filter((s) => s.products.length >= MIN_PRODUCTS_PER_SECTION);

    const allSection = [
      ...offers,
      ...trendingList,
      ...arrivals,
      ...featured,
      ...catSections.flatMap((s) => s.products),
    ];

    return {
      featuredOffers: offers,
      newArrivals: arrivals,
      featuredProducts: featured,
      trending: trendingList,
      categorySections: catSections,
      sectionProducts: allSection,
    };
  }, [
    offersProducts,
    trendingProducts,
    newestProducts,
    featuredPool,
    categoryResults,
    sessionSeed,
  ]);

  const isLoading =
    (offersLoading && !offersProducts) ||
    (trendingLoading && !trendingProducts) ||
    (newestLoading && !newestProducts) ||
    (featuredLoading && !featuredPool) ||
    (Boolean(categoryKey) && categoryLoading && !categoryResults);

  return {
    /** Promoted / special-offer products — not sales-ranked data */
    featuredOffers,
    /** @deprecated use featuredOffers — kept for admin config key compatibility */
    bestSellers: featuredOffers,
    newArrivals,
    featuredProducts,
    trendingProducts: trending,
    categorySections,
    /** Flat list of products shown in home rails (for favorite toggle lookup). */
    catalogProducts: sectionProducts,
    isLoading,
    error,
  };
}
