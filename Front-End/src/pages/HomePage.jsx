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
import { useCategories } from '../hooks/useProducts';
import { useHomeProducts } from '../hooks/useHomeProducts';
import { mapStorefrontProduct } from '../utils/mapStorefrontProduct';

const SECTION_PREVIEW_COUNT = 6;
const FEED_COUNT = 24;

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
  // Scents hidden from storefront for clients — admin still manages them.

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

  const showSkeleton = productsLoading;

  const mapWithFavorites = useCallback(
    (list) =>
      list.map((p) => ({
        ...mapStorefrontProduct(p),
        isFavorite: isFavorite(p.id),
      })),
    [isFavorite],
  );

  const handleFavoriteToggle = useCallback(
    (p) => {
      const originalProduct = catalogProducts.find((prod) => String(prod.id) === String(p.id));
      if (originalProduct) toggleFavorite(originalProduct);
    },
    [catalogProducts, toggleFavorite],
  );

  const offersTitle = homeSections.bestSellers?.title || 'تخفيضات سريعة';

  const feedProducts = useMemo(() => {
    const usedIds = new Set();
    const merged = [];

    const pushUnique = (list) => {
      for (const product of list || []) {
        const id = String(product.id);
        if (usedIds.has(id)) continue;
        usedIds.add(id);
        merged.push(product);
        if (merged.length >= FEED_COUNT) return true;
      }
      return merged.length >= FEED_COUNT;
    };

    if (pushUnique(featuredOffers)) return mapWithFavorites(merged);
    if (pushUnique(newArrivals)) return mapWithFavorites(merged);
    if (pushUnique(featuredProducts)) return mapWithFavorites(merged);

    for (const section of categorySections) {
      if (pushUnique(section.products)) return mapWithFavorites(merged);
    }

    pushUnique(catalogProducts);
    return mapWithFavorites(merged.slice(0, FEED_COUNT));
  }, [
    catalogProducts,
    categorySections,
    featuredOffers,
    newArrivals,
    featuredProducts,
    mapWithFavorites,
  ]);

  return (
    <Layout homeMarketplace>
      <BrandIntroOverlay />
      <SEO title="الصفحة الرئيسية" />

      <div className="bg-white dark:bg-stone-950">
        <HeroSection />
        <HomeServiceBar
          shippingSubtitle={shippingOfferText.trim() || 'على الطلبات المؤهلة'}
        />

        {homeSections.categories?.visible !== false && (
          <CategoryIconGrid
            categories={categories}
            isLoading={categoriesLoading}
          />
        )}

        <div className="px-2 sm:px-4 lg:px-8 max-w-7xl mx-auto pt-2 pb-4 md:pb-10 space-y-2 sm:space-y-3">
          <PromoBannerMosaic placement="promo_home" maxTiles={3} />

          {productsError && (
            <div className="rounded-sm border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
              تعذر تحميل المنتجات حالياً: {productsError.message || 'حدث خطأ غير متوقع'}
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
            />
          )}

          {trendingProducts.length > 0 && homeSections.trending?.visible !== false && (
            <ProductVerticalSection
              title={homeSections.trending?.title || 'تريندات'}
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
            isLoading={showSkeleton}
            loadingCount={FEED_COUNT}
            onFavorite={handleFavoriteToggle}
            viewAllHref="/products"
          />
        </div>
      </div>
    </Layout>
  );
};

export default HomePage;
