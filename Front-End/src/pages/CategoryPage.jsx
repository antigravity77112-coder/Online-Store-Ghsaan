/**
 * CategoryPage — صفحة منتجات القسم
 *
 * EN: Compact ecommerce product listing for /category/:slug.
 *     Dense grid, filter/sort toolbar, horizontal category nav.
 *
 * AR: صفحة منتجات مدمجة لـ /category/:slug.
 *     شبكة كثيفة، شريط فلترة وترتيب، تنقل أفقي بين الأقسام.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import useSWR from 'swr';
import Layout from '../components/Layout';
import SEO from '../components/SEO';
import Breadcrumbs from '../components/Breadcrumbs';
import InfiniteScrollTrigger from '../components/InfiniteScrollTrigger';
import ProductListingToolbar from '../components/ProductListingToolbar';
import ListingSearchField from '../components/listing/ListingSearchField';
import ListingEmptyState from '../components/listing/ListingEmptyState';
import QuickAddFeedback from '../components/QuickAddFeedback';
import BannerRenderer from '../components/BannerRenderer';
import CategorySubcategoryHub from '../components/CategorySubcategoryHub';
import { ProductGrid } from '../components/HighConversionGrid';
import { useCart } from '../context/CartContext';
import { useFavorites } from '../context/FavoritesContext';
import * as api from '../services/api';
import { useProductsInfinite, useCategories } from '../hooks/useProducts';
import { useUrlSearchDraft } from '../hooks/useUrlSearchDraft';
import { useQuickAddFeedback } from '../hooks/useQuickAddFeedback';
import { useListingProducts } from '../hooks/useListingProducts';
import { useListingScrollMemory } from '../hooks/useListingScrollMemory';
import { mapStorefrontProduct } from '../utils/mapStorefrontProduct';

const CategoryPage = () => {
  const { slug } = useParams();
  const { addToCart } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const {
    committedSearch,
    draftSearch,
    setDraftSearch,
    commitSearchNow,
    clearSearch,
  } = useUrlSearchDraft('search');
  const { visible: quickAddVisible, message: quickAddMessage, notify: notifyQuickAdd } = useQuickAddFeedback();

  const [sortOrder, setSortOrder] = useState('default');
  const [showFilters, setShowFilters] = useState(false);
  const [offersOnly, setOffersOnly] = useState(false);
  const [condition, setCondition] = useState('');

  const { data: categoryData, isLoading: categoryLoading } = useSWR(
    slug ? ['categoryBySlug', slug] : null,
    () => api.getCategoryBySlug(slug)
  );

  const { data: allCategories = [] } = useCategories();

  const categoryName = categoryData?.name || '';
  const subcategories = (categoryData?.children || []).filter((c) => c.isActive !== false);
  const parentRef = categoryData?.parent || null;
  const isChildPage = Boolean(categoryData?.parentId || parentRef);

  const siblingCategories = useMemo(() => {
    if (!isChildPage || !allCategories.length) return [];
    const parentId = categoryData?.parentId || parentRef?.id;
    return allCategories.filter(
      (c) => c.isActive !== false && (c.parentId === parentId || c.parent?.id === parentId),
    );
  }, [allCategories, categoryData, isChildPage, parentRef]);

  const hub = useMemo(() => {
    if (subcategories.length > 0 && categoryData) {
      return {
        allHref: `/category/${encodeURIComponent(categoryData.slug || categoryData.name)}`,
        allActive: true,
        items: subcategories,
      };
    }
    if (isChildPage && siblingCategories.length > 0) {
      const parentHref = parentRef
        ? `/category/${encodeURIComponent(parentRef.slug || parentRef.name)}`
        : '/categories';
      return { allHref: parentHref, allActive: false, items: siblingCategories };
    }
    return null;
  }, [subcategories, categoryData, isChildPage, siblingCategories, parentRef]);

  const activeFilterCount = (offersOnly ? 1 : 0) + (condition ? 1 : 0);

  const memoryKey = useMemo(
    () => `category:${slug}|q:${committedSearch}|o:${offersOnly ? 1 : 0}|c:${condition}|sort:${sortOrder}`,
    [slug, committedSearch, offersOnly, condition, sortOrder],
  );

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
    error: productsError
  } = useProductsInfinite({
    categoryName,
    search: committedSearch,
    specialOffers: offersOnly,
    condition,
    enabled: Boolean(categoryName),
    memoryKey,
  });

  const activeProducts = productsError ? [] : (products || []);
  const showSkeleton = (categoryLoading || productsLoading) && activeProducts.length === 0;

  const filteredProducts = useListingProducts(activeProducts, sortOrder, shuffleSeed, listingKey);

  const pagesReady = size >= rememberedSize && !isLoadingMore && filteredProducts.length > 0;
  useListingScrollMemory({
    listingKey,
    ready: filteredProducts.length > 0,
    pagesReady,
  });

  const mappedGridProducts = useMemo(
    () => filteredProducts.map((p) => ({ ...mapStorefrontProduct(p), isFavorite: isFavorite(p.id) })),
    [filteredProducts, isFavorite]
  );

  const handleQuickAdd = useCallback((p) => {
    const original = activeProducts.find((prod) => String(prod.id) === String(p.id));
    if (original) {
      addToCart(original, 1);
    } else {
      addToCart({
        id: p.id,
        title: p.title,
        description: p.description || null,
        categoryName: p.categoryName || null,
        price: p.price,
        currency: p.currency || 'USD',
        mainImageUrl: p.image,
        imageUrl: p.image,
      }, 1);
    }
    notifyQuickAdd();
  }, [activeProducts, addToCart, notifyQuickAdd]);

  const handleFavoriteToggle = useCallback((p) => {
    const original = activeProducts.find((prod) => String(prod.id) === String(p.id));
    if (original) toggleFavorite(original);
  }, [activeProducts, toggleFavorite]);

  const clearFilters = () => {
    setOffersOnly(false);
    setCondition('');
    setShowFilters(false);
    clearSearch();
  };

  const seoTitle = categoryData?.metaTitle || `منتجات ${categoryName}`;
  const seoDescription = categoryData?.metaDescription || `تصفح منتجات قسم ${categoryName} في المتسوق الذكي — تسوق بسهولة وبأفضل الأسعار.`;
  const canonicalKey = categoryData
    ? (categoryData.slug || categoryData.name)
    : slug;
  const canonicalPath = canonicalKey
    ? `/category/${encodeURIComponent(canonicalKey)}`
    : undefined;

  return (
    <Layout>
      <SEO title={seoTitle} description={seoDescription} canonicalPath={canonicalPath} />

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-3 pb-6 md:pb-10 lg:pb-12">
        <Breadcrumbs
          compact
          items={[
            { name: 'الرئيسية', url: '/' },
            { name: 'الفئات', url: '/categories' },
            ...(categoryData?.parent ? [{ name: categoryData.parent.name, url: `/category/${encodeURIComponent(categoryData.parent.slug || categoryData.parent.name)}` }] : []),
            { name: categoryName },
          ]}
        />

        <header className="mb-3">
          <h1 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
            {categoryLoading ? (
              <span className="inline-block w-32 h-5 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            ) : (
              `منتجات ${categoryName}`
            )}
          </h1>
          {!committedSearch.trim() && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {filteredProducts.length} منتج
            </p>
          )}
        </header>

        {hub && (
          <CategorySubcategoryHub
            allHref={hub.allHref}
            allActive={hub.allActive}
            items={hub.items}
            activeSlug={slug}
            activeName={categoryName}
          />
        )}

        <div className="mb-3">
          <ListingSearchField
            value={draftSearch}
            onChange={setDraftSearch}
            onClear={clearSearch}
            onSubmit={commitSearchNow}
            placeholder={`ابحث في ${categoryName}...`}
          />
        </div>

        <BannerRenderer placement="category" className="w-full mb-3" />

        <ProductListingToolbar
          productCount={filteredProducts.length}
          showProductCount={!committedSearch.trim()}
          isValidating={productsValidating && !showSkeleton}
          sortOrder={sortOrder}
          onSortChange={setSortOrder}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters((v) => !v)}
          activeFilterCount={activeFilterCount}
        />

        {showFilters && (
          <div className="mb-3 p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">العروض فقط</span>
              <input
                type="checkbox"
                checked={offersOnly}
                onChange={(e) => setOffersOnly(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-gold-600 focus:ring-gold-500"
              />
            </label>
            <div>
              <label htmlFor="condition-filter" className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                الحالة
              </label>
              <select
                id="condition-filter"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/40"
              >
                <option value="">الكل</option>
                <option value="1">جديد</option>
                <option value="2">مستعمل</option>
              </select>
            </div>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-bold text-gold-600 dark:text-gold-400 hover:underline"
              >
                مسح الفلاتر
              </button>
            )}
          </div>
        )}

        {productsError && (
          <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
            تعذر تحميل المنتجات: {productsError.message || 'حدث خطأ غير متوقع'}
          </div>
        )}

        {showSkeleton ? (
          <ProductGrid isLoading loadingCount={10} variant="listing" compact />
        ) : filteredProducts.length > 0 ? (
          <>
            <ProductGrid
              products={mappedGridProducts}
              isLoadingMore={isLoadingMore}
              onQuickAdd={handleQuickAdd}
              onFavorite={handleFavoriteToggle}
              variant="listing"
              compact
            />

            <InfiniteScrollTrigger
              onIntersect={() => setSize(size + 1)}
              isLoadingMore={isLoadingMore}
              isReachingEnd={isReachingEnd}
            />

            {isReachingEnd && activeProducts.length > 0 && (
              <p className="text-center text-xs text-slate-400 dark:text-slate-500 py-6">
                وصلت إلى نهاية المنتجات في هذا القسم
              </p>
            )}
          </>
        ) : (
          <ListingEmptyState
            title="لا توجد منتجات حالياً"
            description={
              committedSearch.trim() || activeFilterCount > 0
                ? 'جرّب تعديل البحث أو الفلاتر'
                : 'جرّب تصفح قسم آخر'
            }
            searchTerm={committedSearch.trim() || undefined}
            onClear={committedSearch.trim() || activeFilterCount > 0 ? clearFilters : undefined}
            clearLabel="مسح البحث والفلاتر"
            showDiscovery
          />
        )}
      </main>
      <QuickAddFeedback visible={quickAddVisible} message={quickAddMessage} />
    </Layout>
  );
};

export default CategoryPage;
