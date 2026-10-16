/**
 * ProductsPage — صفحة جميع المنتجات
 */

import React, { useMemo, useCallback } from 'react';
import { useNavigate, useNavigationType } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, ShoppingBag,
} from 'lucide-react';
import Layout from '../components/Layout';
import SEO from '../components/SEO';
import QuickAddFeedback from '../components/QuickAddFeedback';
import BannerRenderer from '../components/BannerRenderer';
import InfiniteScrollTrigger from '../components/InfiniteScrollTrigger';
import ProductListingToolbar from '../components/ProductListingToolbar';
import ListingSearchField from '../components/listing/ListingSearchField';
import ListingEmptyState from '../components/listing/ListingEmptyState';
import SearchSimilarBanner from '../components/listing/SearchSimilarBanner';
import DiscoveryLinks from '../components/listing/DiscoveryLinks';
import { ProductGrid } from '../components/HighConversionGrid';
import { useCart } from '../context/CartContext';
import { useFavorites } from '../context/FavoritesContext';
import { useProductsInfinite, useCategories } from '../hooks/useProducts';
import { useProductsListingParams } from '../hooks/useProductsListingParams';
import { useQuickAddFeedback } from '../hooks/useQuickAddFeedback';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useListingProducts } from '../hooks/useListingProducts';
import { useListingScrollMemory } from '../hooks/useListingScrollMemory';
import { isExpectedListingReturn } from '../utils/listingSessionMemory';
import { mapStorefrontProduct } from '../utils/mapStorefrontProduct';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const ProductsPage = () => {
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const { addToCart } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const {
    committedSearch,
    draftSearch,
    setDraftSearch,
    commitSearchNow,
    clearSearch,
    offersOnly,
    trendingOnly,
    sortOrder,
    setSortOrder,
    clearAllFilters,
    clearOffersFilter,
    clearTrendingFilter,
    categoryFilter,
    setCategoryFilter,
  } = useProductsListingParams();

  const activeCategory = categoryFilter || 'الكل';
  const reduceMotion = useReducedMotion();
  const { visible: quickAddVisible, message: quickAddMessage, notify: notifyQuickAdd } = useQuickAddFeedback();

  const {
    data: products,
    isLoading: productsLoading,
    isValidating: productsValidating,
    isLoadingMore,
    isReachingEnd,
    size,
    setSize,
    listingKey,
    shuffleSeed,
    rememberedSize,
    searchMatch,
    error: productsError,
  } = useProductsInfinite({
    specialOffers: offersOnly,
    trending: trendingOnly,
    search: committedSearch,
    categoryName: activeCategory === 'الكل' ? '' : activeCategory,
  });

  const { data: categories } = useCategories();

  const activeProducts = productsError ? [] : (products || []);
  const showSkeleton = productsLoading && activeProducts.length === 0;

  const categoryNames = useMemo(() => (
    ['الكل', ...new Set(
      categories.length > 0
        ? categories.map((c) => c.name)
        : activeProducts.map((p) => p.categoryName).filter(Boolean),
    )]
  ), [categories, activeProducts]);

  // Keep similarity order from the API — do not shuffle «نتائج مشابهة».
  const listingSort = searchMatch === 'similar' && sortOrder === 'default' ? 'relevance' : sortOrder;
  const filteredProducts = useListingProducts(activeProducts, listingSort, shuffleSeed, listingKey);

  const pagesReady = size >= rememberedSize && !isLoadingMore && filteredProducts.length > 0;
  const skipEnterMotion = navigationType === 'POP' || isExpectedListingReturn(listingKey);
  useListingScrollMemory({
    listingKey,
    ready: filteredProducts.length > 0,
    pagesReady,
  });

  const mappedGridProducts = useMemo(() => (
    filteredProducts.map((p) => {
      const mapped = mapStorefrontProduct(p);
      mapped.isFavorite = isFavorite(p.id);
      return mapped;
    })
  ), [filteredProducts, isFavorite]);

  const handleQuickAdd = useCallback((p) => {
    const originalProduct = activeProducts.find((prod) => String(prod.id) === String(p.id));
    if (originalProduct) {
      addToCart(originalProduct, 1);
    } else {
      const fallback = {
        id: p.id,
        title: p.title,
        description: p.description || null,
        categoryName: p.categoryName || null,
        price: p.price,
        currency: p.currency || 'USD',
        mainImageUrl: p.image,
        imageUrl: p.image,
      };
      addToCart(fallback, 1);
    }
    notifyQuickAdd();
  }, [activeProducts, addToCart, notifyQuickAdd]);

  const handleFavoriteToggle = useCallback((p) => {
    const originalProduct = activeProducts.find((prod) => String(prod.id) === String(p.id));
    if (originalProduct) toggleFavorite(originalProduct);
  }, [activeProducts, toggleFavorite]);

  const pageTitle = trendingOnly
    ? 'ترندات'
    : offersOnly
    ? 'العروض الحصرية'
    : committedSearch.trim()
      ? 'نتائج البحث'
      : 'جميع المنتجات';

  const sectionTitle = committedSearch.trim()
    ? searchMatch === 'similar'
      ? `نتائج مشابهة: "${committedSearch.trim()}"`
      : `نتائج: "${committedSearch.trim()}"`
    : trendingOnly
      ? 'ترندات'
      : offersOnly
      ? 'العروض الحصرية'
      : activeCategory === 'الكل' ? 'جميع المنتجات' : activeCategory;

  const hasActiveFilters = Boolean(
    committedSearch.trim() || offersOnly || trendingOnly || activeCategory !== 'الكل' || sortOrder !== 'default',
  );

  return (
    <Layout>
      <SEO title="جميع المنتجات" description="تصفح جميع المنتجات المتاحة في المتسوق الذكي." />
      <main className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 pt-4 pb-12 lg:pb-16">

        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            onClick={() => navigate('/?scrollTo=categories')}
            className="flex items-center justify-center min-w-[44px] min-h-[44px] p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-gold-600 dark:hover:text-gold-400 hover:border-gold-300 dark:hover:border-gold-600 transition-all shadow-sm"
            aria-label="العودة للرئيسية"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gold-100 dark:bg-gold-900/40">
              <ShoppingBag className="w-4.5 h-4.5 text-gold-600 dark:text-gold-400" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {pageTitle}
            </h1>
          </div>
        </div>

        <DiscoveryLinks className="mb-4" compact />

        <section className="mb-4">
          <ListingSearchField
            value={draftSearch}
            onChange={setDraftSearch}
            onClear={clearSearch}
            onSubmit={commitSearchNow}
            placeholder="ابحث عن منتج..."
            inputClassName="py-3 rounded-2xl shadow-sm"
          />
        </section>

        <section className="mb-5">
          <div className="relative w-full overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-bone dark:from-slate-950 to-transparent pointer-events-none z-10" />
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
              {categoryNames.map((name) => {
                const isActive = activeCategory === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setCategoryFilter(name)}
                    className={`relative whitespace-nowrap inline-flex items-center gap-2 px-3.5 py-1.5 min-h-[40px] rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40 border ${
                      isActive
                        ? 'text-white bg-stone-900 dark:bg-stone-100 dark:text-stone-900 border-stone-900 dark:border-stone-100'
                        : 'text-stone-600 dark:text-stone-300 bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700 hover:border-stone-400 dark:hover:border-stone-500'
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <BannerRenderer placement="category" />

        {productsError && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
            تعذر تحميل المنتجات حالياً: {productsError.message || 'حدث خطأ غير متوقع'}
          </div>
        )}

        <div className="flex items-center justify-between mb-3 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
              {sectionTitle}
            </h2>
            {offersOnly && (
              <button
                type="button"
                onClick={clearOffersFilter}
                className="text-xs flex items-center gap-1 bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 px-2.5 py-1 rounded-full hover:bg-rose-200 dark:hover:bg-rose-900/50 transition-colors min-h-[32px]"
              >
                إلغاء الخصومات
              </button>
            )}
            {trendingOnly && (
              <button
                type="button"
                onClick={clearTrendingFilter}
                className="text-xs flex items-center gap-1 bg-stone-100 text-stone-700 dark:bg-stone-800/50 dark:text-stone-300 px-2.5 py-1 rounded-full hover:bg-stone-200 dark:hover:bg-stone-700/50 transition-colors min-h-[32px]"
              >
                إلغاء الترند
              </button>
            )}
          </div>
        </div>

        <ProductListingToolbar
          productCount={filteredProducts.length}
          showProductCount={!committedSearch.trim()}
          isValidating={productsValidating && !showSkeleton}
          sortOrder={sortOrder}
          onSortChange={setSortOrder}
        />

        {showSkeleton ? (
          <ProductGrid isLoading loadingCount={8} variant="listing" />
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredProducts.length > 0 ? (
              <motion.div
                className="w-full"
                variants={reduceMotion || skipEnterMotion ? undefined : containerVariants}
                initial={reduceMotion || skipEnterMotion ? false : 'hidden'}
                animate={reduceMotion || skipEnterMotion ? undefined : 'visible'}
                exit={reduceMotion ? undefined : { opacity: 0 }}
                key={`${activeCategory}-${committedSearch}-${sortOrder}-${trendingOnly ? 'trending' : 'all'}-${searchMatch || 'exact'}`}
              >
                {searchMatch === 'similar' && committedSearch.trim() ? (
                  <SearchSimilarBanner searchTerm={committedSearch.trim()} />
                ) : null}
                <ProductGrid
                  products={mappedGridProducts}
                  isLoadingMore={isLoadingMore}
                  variant="listing"
                  onQuickAdd={handleQuickAdd}
                  onFavorite={handleFavoriteToggle}
                />

                <InfiniteScrollTrigger
                  onIntersect={() => setSize(size + 1)}
                  isLoadingMore={isLoadingMore}
                  isReachingEnd={isReachingEnd}
                />

                {isReachingEnd && activeProducts.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="flex justify-center mt-12 pb-8"
                  >
                    <p className="text-sm sm:text-base font-semibold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 px-6 py-2.5 rounded-full border border-slate-100 dark:border-slate-800 shadow-sm">
                      وصلت إلى نهاية مجموعتنا المختارة بعناية ✨
                    </p>
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <ListingEmptyState
                searchTerm={committedSearch.trim() || undefined}
                description={
                  !committedSearch.trim() && activeCategory !== 'الكل'
                    ? `لم نتمكن من العثور على منتجات في قسم ${activeCategory} حالياً.`
                    : undefined
                }
                onClear={hasActiveFilters ? clearAllFilters : undefined}
                clearLabel="مسح الفلاتر وعرض الكل"
              />
            )}
          </AnimatePresence>
        )}
      </main>
      <QuickAddFeedback visible={quickAddVisible} message={quickAddMessage} />
    </Layout>
  );
};

export default ProductsPage;

