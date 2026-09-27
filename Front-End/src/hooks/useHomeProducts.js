import { useMemo, useRef } from 'react';
import useSWR from 'swr';
import * as api from '../services/api';

const SECTION_COUNT = 8;
const CATEGORY_CAROUSEL_COUNT = 10;
const MIN_PRODUCTS_PER_SECTION = 3;
const MAX_CATEGORY_SECTIONS = 5;
const CATALOG_POOL_SIZE = SECTION_COUNT * 4;

function partitionFeaturedProducts(products, sectionCount = SECTION_COUNT) {
  const pools = new Map();

  for (const p of products) {
    const cat = p.categoryName || String(p.categoryId || 'other');
    if (!pools.has(cat)) pools.set(cat, []);
    pools.get(cat).push(p);
  }

  const diverseCandidates = [];
  const categoryKeys = [...pools.keys()];
  let hasMore = true;

  while (diverseCandidates.length < sectionCount && hasMore) {
    hasMore = false;
    for (const cat of categoryKeys) {
      const pool = pools.get(cat);
      if (pool?.length) {
        diverseCandidates.push(pool.shift());
        hasMore = true;
        if (diverseCandidates.length >= sectionCount) break;
      }
    }
  }

  return [...diverseCandidates, ...products];
}

function buildCategorySectionsFromCatalog(catalog, categories) {
  const byCategory = new Map();

  for (const product of catalog) {
    const names = product.categoryNames?.length ? product.categoryNames : [product.categoryName];
    for (const catName of names) {
      if (!catName) continue;
      if (!byCategory.has(catName)) byCategory.set(catName, []);
      byCategory.get(catName).push(product);
    }
  }

  const orderedNames = categories.length > 0
    ? categories.map((c) => c.name).filter((name) => byCategory.has(name))
    : [...byCategory.keys()].sort((a, b) => a.localeCompare(b, 'ar'));

  return orderedNames
    .map((name) => {
      const meta = categories.find((c) => c.name === name);
      const products = (byCategory.get(name) || []).slice(0, CATEGORY_CAROUSEL_COUNT);
      if (products.length < MIN_PRODUCTS_PER_SECTION) return null;

      return {
        id: meta?.id || name,
        name,
        slug: meta?.slug,
        products,
      };
    })
    .filter(Boolean)
    .slice(0, MAX_CATEGORY_SECTIONS);
}

function shuffleOnce(list) {
  const next = [...list];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

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

/**
 * Targeted parallel product fetches for the homepage sections.
 * Cross-section deduplication prevents the same SKU appearing in multiple rails.
 */
export function useHomeProducts(categories = []) {
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
    data: catalogProducts,
    error: catalogError,
    isLoading: catalogLoading,
  } = useSWR('home-products-catalog', () =>
    api.getProducts({ pageSize: CATALOG_POOL_SIZE }),
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

  const catalog = catalogProducts || [];
  const mountSeedRef = useRef(null);
  if (mountSeedRef.current == null) mountSeedRef.current = Math.random();
  const shuffleKey = `${mountSeedRef.current}|${catalog.map((p) => p.id).join('|')}`;
  const shuffledRef = useRef({ key: '', list: [] });
  if (shuffleKey && shuffledRef.current.key !== shuffleKey) {
    shuffledRef.current = { key: shuffleKey, list: shuffleOnce(catalog) };
  }
  const shuffledCatalog = shuffleKey ? shuffledRef.current.list : catalog;
  const error = offersError || catalogError || trendingError;

  const {
    featuredOffers,
    newArrivals,
    featuredProducts,
    trending,
    categorySections,
  } = useMemo(() => {
    const usedIds = new Set();

    const onOffer = (offersProducts || []).length
      ? offersProducts
      : catalog.filter((p) => p.isPromoted || p.discountPrice);

    const offers = shuffleOnce(takeUniqueProducts(onOffer, SECTION_COUNT, usedIds));

    const trendingList = shuffleOnce(takeUniqueProducts(
      (trendingProducts || []).length
        ? trendingProducts
        : catalog.filter((p) => p.isTrending),
      SECTION_COUNT,
      usedIds,
    ));

    const sortedNew = [...catalog].sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
    );
    const arrivals = shuffleOnce(takeUniqueProducts(sortedNew, SECTION_COUNT, usedIds));

    const featuredCandidates = partitionFeaturedProducts(
      shuffledCatalog.filter((p) => !usedIds.has(String(p.id))),
      SECTION_COUNT * 2,
    );
    const featured = shuffleOnce(takeUniqueProducts(featuredCandidates, SECTION_COUNT, usedIds));

    const rawCategorySections = buildCategorySectionsFromCatalog(shuffledCatalog, categories);
    const catSections = rawCategorySections
      .map((section) => ({
        ...section,
        products: shuffleOnce(takeUniqueProducts(section.products, CATEGORY_CAROUSEL_COUNT, usedIds)),
      }))
      .filter((s) => s.products.length >= MIN_PRODUCTS_PER_SECTION);

    return {
      featuredOffers: offers,
      newArrivals: arrivals,
      featuredProducts: featured,
      trending: trendingList,
      categorySections: catSections,
    };
  }, [offersProducts, trendingProducts, catalog, shuffledCatalog, categories]);

  const isLoading =
    (offersLoading && !offersProducts) ||
    (catalogLoading && !catalogProducts) ||
    (trendingLoading && !trendingProducts);

  return {
    /** Promoted / special-offer products — not sales-ranked data */
    featuredOffers,
    /** @deprecated use featuredOffers — kept for admin config key compatibility */
    bestSellers: featuredOffers,
    newArrivals,
    featuredProducts,
    trendingProducts: trending,
    categorySections,
    catalogProducts: shuffledCatalog,
    isLoading,
    error,
  };
}
