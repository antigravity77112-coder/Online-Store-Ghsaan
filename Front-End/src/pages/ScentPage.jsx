import React, { useMemo, useCallback } from 'react';
import { useParams, Link, useNavigationType } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, Package, Sparkles } from 'lucide-react';
import useSWR from 'swr';
import * as api from '../services/api';
import Layout from '../components/Layout';
import SEO from '../components/SEO';
import Breadcrumbs from '../components/Breadcrumbs';
import ProductListingToolbar from '../components/ProductListingToolbar';
import ListingSearchField from '../components/listing/ListingSearchField';
import ListingEmptyState from '../components/listing/ListingEmptyState';
import QuickAddFeedback from '../components/QuickAddFeedback';
import { ProductGrid } from '../components/HighConversionGrid';
import { useCart } from '../context/CartContext';
import { useFavorites } from '../context/FavoritesContext';
import { useUrlSearchDraft } from '../hooks/useUrlSearchDraft';
import { useQuickAddFeedback } from '../hooks/useQuickAddFeedback';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useListingProducts } from '../hooks/useListingProducts';
import { useListingScrollMemory } from '../hooks/useListingScrollMemory';
import { ensureShuffleSeed, isExpectedListingReturn } from '../utils/listingSessionMemory';
import { mapListingProducts, listingProductId } from '../utils/mapStorefrontProduct';
import { buildListingCartPayload } from '../utils/listingCart';
import { getOptimizedImageUrl, IMAGE_WIDTHS } from '../utils/cloudinaryUrl';

const ScentPage = () => {
  const { slug } = useParams();
  const navigationType = useNavigationType();
  const { addToCart } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const reduceMotion = useReducedMotion();
  const {
    committedSearch,
    draftSearch,
    setDraftSearch,
    commitSearchNow,
    clearSearch,
  } = useUrlSearchDraft('search');
  const { visible: quickAddVisible, message: quickAddMessage, notify: notifyQuickAdd } = useQuickAddFeedback();
  const [sortOrder, setSortOrder] = React.useState('default');

  const { data: scent, error: scentError, isLoading: scentLoading } = useSWR(
    slug ? ['scent', slug] : null,
    () => api.getScentBySlug(slug),
  );

  const { data: products = [], isLoading: productsLoading } = useSWR(
    scent?.id ? ['scent-products', scent.id] : null,
    () => api.getProductsByScent(scent.id),
  );

  const loading = scentLoading || (!!scent?.id && productsLoading && products.length === 0);
  const error = scentError?.message || '';

  const searchedProducts = useMemo(() => {
    if (!committedSearch.trim()) return products;
    const q = committedSearch.trim().toLowerCase();
    return products.filter((p) => p.title?.toLowerCase().includes(q));
  }, [products, committedSearch]);

  const listingKey = useMemo(
    () => `scent|${scent?.id || slug || ''}|search:${committedSearch.trim()}`,
    [scent?.id, slug, committedSearch],
  );
  const shuffleSeed = useMemo(() => ensureShuffleSeed(listingKey), [listingKey]);
  const filteredProducts = useListingProducts(searchedProducts, sortOrder, shuffleSeed, listingKey);

  useListingScrollMemory({
    listingKey,
    ready: filteredProducts.length > 0,
    pagesReady: filteredProducts.length > 0 && !loading,
  });

  const skipEnterMotion = navigationType === 'POP' || isExpectedListingReturn(listingKey);

  const mappedGridProducts = useMemo(
    () => mapListingProducts(filteredProducts, { isFavorite }),
    [filteredProducts, isFavorite],
  );

  const handleQuickAdd = useCallback((p) => {
    const payload = buildListingCartPayload(p);
    if (payload) {
      addToCart(payload, 1);
      notifyQuickAdd();
      return;
    }
    const pid = listingProductId(p);
    const originalProduct = products.find((prod) => String(prod.id) === pid);
    if (originalProduct) {
      addToCart(originalProduct, 1);
    } else {
      addToCart({
        id: pid || p.id,
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
  }, [products, addToCart, notifyQuickAdd]);

  const handleFavoriteToggle = useCallback((p) => {
    const originalProduct = products.find((prod) => String(prod.id) === listingProductId(p));
    if (originalProduct) toggleFavorite(originalProduct);
  }, [products, toggleFavorite]);

  if (loading) {
    return (
      <Layout>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:pb-12">
          <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-6" />
          <ProductGrid isLoading loadingCount={8} variant="listing" />
        </main>
      </Layout>
    );
  }

  if (error || !scent) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-20">
          <div className="bg-red-50 border border-red-200 rounded-3xl p-10 flex flex-col items-center text-center max-w-2xl mx-auto">
            <AlertCircle className="w-16 h-16 text-red-500 mb-4" aria-hidden="true" />
            <h2 className="text-2xl font-bold text-red-700 mb-2">تعذر العثور على الرائحة</h2>
            <p className="text-red-500 mb-8">{error}</p>
            <Link to="/scents" className="px-6 py-3 min-h-[44px] bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors">
              العودة للروائح
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO
        title={scent.name}
        description={scent.description || `اكتشف منتجات ${scent.name} في المتسوق الذكي.`}
        image={scent.imageUrl}
      />

      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <Breadcrumbs
            compact
            items={[
              { name: 'الرئيسية', url: '/' },
              { name: 'الروائح', url: '/scents' },
              { name: scent.name },
            ]}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 py-8 sm:py-10 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={reduceMotion || skipEnterMotion ? false : { opacity: 0, y: 12 }}
            animate={reduceMotion || skipEnterMotion ? undefined : { opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row items-center gap-6 text-center md:text-right"
          >
            <div className="w-24 h-24 md:w-36 md:h-36 bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-100 dark:border-slate-700 p-3 shrink-0 flex items-center justify-center">
              {scent.imageUrl ? (
                <img
                  src={getOptimizedImageUrl(scent.imageUrl, IMAGE_WIDTHS.THUMBNAIL)}
                  alt={scent.name}
                  width={144}
                  height={144}
                  className="max-w-full max-h-full object-contain"
                  loading="eager"
                />
              ) : (
                <Sparkles className="w-12 h-12 text-slate-300 dark:text-slate-600" aria-hidden="true" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-2">{scent.name}</h1>
              {scent.description && (
                <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base max-w-2xl mx-auto md:mx-0 leading-relaxed line-clamp-3">{scent.description}</p>
              )}
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-gold-50 dark:bg-gold-900/20 border border-gold-100 dark:border-gold-800/50 text-gold-700 dark:text-gold-400 rounded-xl text-sm font-bold">
                <Package className="w-4 h-4" aria-hidden="true" />
                {products.length} منتجات
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:pb-12">
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-4">
          عطور {scent.name}
        </h2>

        <ListingSearchField
          value={draftSearch}
          onChange={setDraftSearch}
          onClear={clearSearch}
          onSubmit={commitSearchNow}
          placeholder={`ابحث في عطور ${scent.name}...`}
          className="mb-3"
        />

        <ProductListingToolbar
          productCount={filteredProducts.length}
          showProductCount={!committedSearch.trim()}
          sortOrder={sortOrder}
          onSortChange={setSortOrder}
        />

        {filteredProducts.length > 0 ? (
          <ProductGrid
            products={mappedGridProducts}
            onQuickAdd={handleQuickAdd}
            onFavorite={handleFavoriteToggle}
            variant="listing"
          />
        ) : (
          <ListingEmptyState
            title="لا توجد منتجات حالياً"
            description={committedSearch.trim()
              ? `لم نعثر على عطور تطابق بحثك في ${scent.name}.`
              : 'سنقوم بإضافة عطور لهذه الرائحة قريباً.'}
            searchTerm={committedSearch.trim() || undefined}
            onClear={committedSearch.trim() ? clearSearch : undefined}
          />
        )}
      </main>
      <QuickAddFeedback visible={quickAddVisible} message={quickAddMessage} />
    </Layout>
  );
};

export default ScentPage;
