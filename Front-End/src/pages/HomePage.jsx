/**
 * HomePage — الصفحة الرئيسية (نمط Shein — منتجات عمودية)
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import SEO from '../components/SEO';
import BrandIntroOverlay from '../components/BrandIntroOverlay';
import CategoryIconGrid from '../components/CategoryIconGrid';
import HeroSection from '../components/HeroSection';
import PromoBannerMosaic from '../components/PromoBannerMosaic';
import ProductVerticalSection from '../components/ProductVerticalSection';
import HomeServiceBar from '../components/HomeServiceBar';
import HomeProductFeed from '../components/HomeProductFeed';
import { useFavorites } from '../context/FavoritesContext';
import { useSiteConfig } from '../context/SiteConfigContext';
import { useCategories, useProductsInfinite } from '../hooks/useProducts';
import { useHomeProducts } from '../hooks/useHomeProducts';
import { useListingProducts } from '../hooks/useListingProducts';
import { useListingScrollMemory } from '../hooks/useListingScrollMemory';
import { mapStorefrontProduct } from '../utils/mapStorefrontProduct';

const SECTION_PREVIEW_COUNT = 6;
const FEED_PAGE_SIZE = 15;

const HomePage = () => {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { config } = useSiteConfig();

  const shippingOfferText = config.content?.shippingOfferText || '';
  const homeSections = config.homepage?.sections || {};

  useEffect(() => {
    if (window.location.search.includes('scrollTo=categories')) {
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      setTimeout(() => {
        const el = document.getElementById('categories-section');
        if (el) {
          el.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' });
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }, 100);
    }
  }, []);

  const { data: categories, isLoading: categoriesLoading } = useCategories();

  const {
    featuredOffers,
    newArrivals,
    featuredProducts,
    trendingProducts,
    categorySections,
    catalogProducts,
    isLoading: productsLoading,
    error: productsError,
  } = useHomeProducts(categories);

  const {
    data: feedRaw = [],
    isLoading: feedLoading,
    isLoadingMore: feedLoadingMore,
    isReachingEnd: feedReachingEnd,
    size: feedSize,
    setSize: setFeedSize,
    listingKey: feedListingKey,
    shuffleSeed: feedShuffleSeed,
    rememberedSize: feedRememberedSize,
    error: feedError,
  } = useProductsInfinite({});

  const showSkeleton = productsLoading;

  const mapWithFavorites = useCallback(
    (list) =>
      list.map((p) => ({
        ...mapStorefrontProduct(p),
        isFavorite: isFavorite(p.id),
      })),
    [isFavorite],
  );

  const shuffledFeed = useListingProducts(feedRaw || [], 'default', feedShuffleSeed);
  const feedProducts = useMemo(
    () => mapWithFavorites(shuffledFeed),
    [shuffledFeed, mapWithFavorites],
  );

  const feedPagesReady = feedSize >= feedRememberedSize && !feedLoadingMore && feedProducts.length > 0;
  useListingScrollMemory({
    listingKey: feedListingKey,
    ready: feedProducts.length > 0,
    pagesReady: feedPagesReady,
  });

  const handleFavoriteToggle = useCallback(
    (p) => {
      const fromFeed = (feedRaw || []).find((prod) => String(prod.id) === String(p.id));
      const fromCatalog = catalogProducts.find((prod) => String(prod.id) === String(p.id));
      const originalProduct = fromFeed || fromCatalog;
      if (originalProduct) toggleFavorite(originalProduct);
    },
    [feedRaw, catalogProducts, toggleFavorite],
  );

  const offersTitle = homeSections.bestSellers?.title || 'تخفيضات سريعة';

  return (
    <Layout homeMarketplace>
      <BrandIntroOverlay />
      <SEO title="الصفحة الرئيسية" />

      <div className="bg-white dark:bg-stone-950">
        <HeroSection />

        <div className="mx-auto max-w-7xl space-y-3 px-3 pt-3 sm:px-4 lg:px-8">
          <HomeServiceBar
            shippingSubtitle={shippingOfferText.trim() || 'على الطلبات المؤهلة'}
          />

          {homeSections.categories?.visible !== false && (
            <CategoryIconGrid
              categories={categories}
              isLoading={categoriesLoading}
            />
          )}
        </div>

        <div className="mx-auto max-w-7xl space-y-3 px-3 pb-4 pt-3 sm:px-4 lg:px-8 md:pb-10">
          <PromoBannerMosaic placement="promo_home" maxTiles={3} />

          {(productsError || feedError) && (
            <div className="rounded-sm border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
              تعذر تحميل المنتجات حالياً: {(productsError || feedError)?.message || 'حدث خطأ غير متوقع'}
            </div>
          )}

          {featuredOffers.length > 0 && homeSections.bestSellers?.visible !== false && (
            <ProductVerticalSection
              variant="flash"
              title={offersTitle}
              viewAllHref="/products?promoted=true"
              products={mapWithFavorites(featuredOffers)}
              isLoading={showSkeleton}
              loadingCount={SECTION_PREVIEW_COUNT}
              limit={SECTION_PREVIEW_COUNT}
              onFavorite={handleFavoriteToggle}
              priorityCount={4}
            />
          )}

          {newArrivals.length > 0 && homeSections.newArrivals?.visible !== false && (
            <ProductVerticalSection
              title={homeSections.newArrivals?.title || 'وصل حديثاً'}
              viewAllHref="/products?sort=newest"
              products={mapWithFavorites(newArrivals)}
              isLoading={showSkeleton}
              loadingCount={SECTION_PREVIEW_COUNT}
              limit={SECTION_PREVIEW_COUNT}
              onFavorite={handleFavoriteToggle}
              priorityCount={featuredOffers.length > 0 ? 0 : 4}
            />
          )}

          {trendingProducts.length > 0 && homeSections.trending?.visible !== false && (
            <ProductVerticalSection
              title={homeSections.trending?.title || 'ترندات'}
              viewAllHref="/products?trending=true"
              products={mapWithFavorites(trendingProducts)}
              isLoading={showSkeleton}
              loadingCount={SECTION_PREVIEW_COUNT}
              limit={SECTION_PREVIEW_COUNT}
              onFavorite={handleFavoriteToggle}
            />
          )}

          {featuredProducts.length > 0 && homeSections.featured?.visible !== false && (
            <ProductVerticalSection
              title={homeSections.featured?.title || 'منتجات مميزة'}
              viewAllHref="/products"
              products={mapWithFavorites(featuredProducts)}
              isLoading={showSkeleton}
              loadingCount={SECTION_PREVIEW_COUNT}
              limit={SECTION_PREVIEW_COUNT}
              onFavorite={handleFavoriteToggle}
            />
          )}

          {categorySections.length > 0 && (
            <section className="space-y-2" aria-label="منتجات حسب الفئة">
              {categorySections.slice(0, 2).map((section) => (
                <ProductVerticalSection
                  key={section.id}
                  title={section.name}
                  viewAllHref={
                    section.slug
                      ? `/category/${encodeURIComponent(section.slug || section.name)}`
                      : `/category/${encodeURIComponent(section.name)}`
                  }
                  products={mapWithFavorites(section.products)}
                  isLoading={showSkeleton}
                  loadingCount={SECTION_PREVIEW_COUNT}
                  limit={SECTION_PREVIEW_COUNT}
                  onFavorite={handleFavoriteToggle}
                />
              ))}
            </section>
          )}

          <HomeProductFeed
            title="قد يعجبك"
            products={feedProducts}
            isLoading={feedLoading && feedProducts.length === 0}
            isLoadingMore={feedLoadingMore}
            isReachingEnd={feedReachingEnd}
            onLoadMore={() => setFeedSize(feedSize + 1)}
            loadingCount={FEED_PAGE_SIZE}
            onFavorite={handleFavoriteToggle}
            viewAllHref="/products"
          />
        </div>
      </div>
    </Layout>
  );
};

export default HomePage;
