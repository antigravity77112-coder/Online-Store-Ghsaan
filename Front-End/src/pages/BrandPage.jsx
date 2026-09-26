import React, { useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Home, ChevronLeft, Package, Crown } from 'lucide-react';
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
import { mapStorefrontProduct } from '../utils/mapStorefrontProduct';
import { sortProducts } from '../utils/productListingSort';
import { getOptimizedImageUrl, IMAGE_WIDTHS } from '../utils/cloudinaryUrl';

const BrandPage = () => {
  const { slug } = useParams();
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

  const { data: brand, error: brandError, isLoading: brandLoading } = useSWR(
    slug ? ['brand', slug] : null,
    () => api.getBrandBySlug(slug),
  );

  const { data: products = [], isLoading: productsLoading } = useSWR(
    brand?.id ? ['brand-products', brand.id] : null,
    () => api.getProductsByBrand(brand.id),
  );

  const loading = brandLoading || (!!brand?.id && productsLoading && products.length === 0);
  const error = brandError?.message || '';

  const filteredProducts = useMemo(() => {
    let result = products;
    if (committedSearch.trim()) {
      const q = committedSearch.trim().toLowerCase();
      result = result.filter((p) => p.title?.toLowerCase().includes(q));
    }
    return sortProducts(result, sortOrder);
  }, [products, committedSearch, sortOrder]);

  const mappedGridProducts = useMemo(() => (
    filteredProducts.map((p) => {
      const mapped = mapStorefrontProduct(p);
      mapped.isFavorite = isFavorite(p.id);
      return mapped;
    })
  ), [filteredProducts, isFavorite]);

  const handleQuickAdd = useCallback((p) => {
    const originalProduct = products.find((prod) => String(prod.id) === String(p.id));
    if (originalProduct) {
      addToCart(originalProduct, 1);
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
  }, [products, addToCart, notifyQuickAdd]);

  const handleFavoriteToggle = useCallback((p) => {
    const originalProduct = products.find((prod) => String(prod.id) === String(p.id));
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

  if (error || !brand) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-20">
          <div className="bg-red-50 border border-red-200 rounded-3xl p-10 flex flex-col items-center text-center max-w-2xl mx-auto">
            <AlertCircle className="w-16 h-16 text-red-500 mb-4" aria-hidden="true" />
            <h2 className="text-2xl font-bold text-red-700 mb-2">تعذر العثور على العلامة التجارية</h2>
            <p className="text-red-500 mb-8">{error}</p>
            <Link to="/" className="px-6 py-3 min-h-[44px] bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors">
              العودة للرئيسية
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO
        title={brand.name}
        description={brand.description || `تصفح أحدث منتجات ${brand.name} في المتسوق الذكي.`}
        image={brand.logoUrl}
      />

      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <Breadcrumbs
            compact
            items={[
              { name: 'الرئيسية', url: '/' },
              { name: 'العلامات', url: '/brands' },
              { name: brand.name },
            ]}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 py-8 sm:py-10 border-b border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row items-center gap-6 text-center md:text-right"
          >
            <div className="w-24 h-24 md:w-36 md:h-36 bg-transparent p-1 shrink-0 flex items-center justify-center">
              {brand.logoUrl ? (
                <img
                  src={getOptimizedImageUrl(brand.logoUrl, IMAGE_WIDTHS.THUMBNAIL)}
                  alt={brand.name}
                  width={144}
                  height={144}
                  className="max-w-full max-h-full object-contain"
                  loading="eager"
                />
              ) : (
                <Crown className="w-12 h-12 text-slate-300 dark:text-slate-600" aria-hidden="true" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-2">
                {brand.name}
              </h1>
              {brand.description && (
                <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base max-w-2xl mx-auto md:mx-0 leading-relaxed line-clamp-3">
                  {brand.description}
                </p>
              )}
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-gold-50 dark:bg-gold-900/20 border border-gold-100 dark:border-gold-800/50 text-gold-700 dark:text-gold-400 rounded-xl text-sm font-bold">
                <Package className="w-4 h-4" aria-hidden="true" />
                {products.length} منتجات متاحة
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:pb-12">
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-4">
          منتجات {brand.name}
        </h2>

        <ListingSearchField
          value={draftSearch}
          onChange={setDraftSearch}
          onClear={clearSearch}
          onSubmit={commitSearchNow}
          placeholder={`ابحث في منتجات ${brand.name}...`}
          className="mb-3"
        />

        <ProductListingToolbar
          productCount={filteredProducts.length}
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
              ? `لم نعثر على منتجات تطابق بحثك في ${brand.name}.`
              : 'سنقوم بإضافة منتجات لهذه العلامة التجارية قريباً.'}
            searchTerm={committedSearch.trim() || undefined}
            onClear={committedSearch.trim() ? clearSearch : undefined}
          />
        )}
      </main>
      <QuickAddFeedback visible={quickAddVisible} message={quickAddMessage} />
    </Layout>
  );
};

export default BrandPage;
