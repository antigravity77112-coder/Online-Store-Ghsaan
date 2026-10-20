import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ArrowRight, Trash2, ShoppingBag } from 'lucide-react';
import Layout from '../components/Layout';
import QuickAddFeedback from '../components/QuickAddFeedback';
import { getOptimizedImageUrl, IMAGE_WIDTHS } from '../utils/cloudinaryUrl';
import { useFavorites } from '../context/FavoritesContext';
import { useCart } from '../context/CartContext';
import { useQuickAddFeedback } from '../hooks/useQuickAddFeedback';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useFormatDisplayPrice } from '../context/CurrencyContext';

const FavoritesPage = () => {
  const formatPrice = useFormatDisplayPrice();
  const { favorites, removeFavorite } = useFavorites();
  const { addToCart } = useCart();
  const reduceMotion = useReducedMotion();
  const { visible: quickAddVisible, message: quickAddMessage, notify: notifyQuickAdd } = useQuickAddFeedback();

  const handleAddToCart = useCallback((product) => {
    addToCart({ ...product }, 1);
    notifyQuickAdd();
  }, [addToCart, notifyQuickAdd]);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 mb-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
              <div className="p-2 bg-gold-100 dark:bg-gold-900/30 rounded-xl">
                <Heart className="w-6 h-6 text-gold-600 dark:text-gold-400" fill="currentColor" aria-hidden="true" />
              </div>
              المفضلة
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
              {favorites.length > 0 ? `${favorites.length} منتج محفوظ` : 'لم تحفظ أي منتجات بعد'}
            </p>
          </div>
          <Link
            to="/products"
            className="hidden sm:inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-gold-600 transition-colors min-h-[44px]"
          >
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
            تصفح المنتجات
          </Link>
        </div>

        {favorites.length > 0 ? (
          <AnimatePresence mode="popLayout">
            <motion.div
              className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={reduceMotion ? undefined : { opacity: 1 }}
            >
              {favorites.map((product) => {
                const productUrl = `/product/${product.slug || product.id}`;
                return (
                  <motion.article
                    key={product.id}
                    layout={!reduceMotion}
                    initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                    animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                    exit={reduceMotion ? undefined : { opacity: 0, scale: 0.98 }}
                    className="group flex bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-gold-200 dark:hover:border-gold-700 transition-all duration-200"
                  >
                    <Link
                      to={productUrl}
                      className="w-28 sm:w-40 flex-shrink-0 bg-slate-50 dark:bg-slate-800 relative overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40"
                      aria-label={`عرض ${product.title}`}
                    >
                      <img
                        src={getOptimizedImageUrl(
                          product.imageUrl || product.mainImageUrl || '/product-placeholder.svg',
                          IMAGE_WIDTHS.GRID_CARD,
                        )}
                        alt=""
                        width={160}
                        height={160}
                        className="w-full h-full min-h-[7rem] sm:min-h-[10rem] object-contain p-1 transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none"
                        loading="lazy"
                      />
                    </Link>

                    <div className="flex-1 p-3 sm:p-4 flex flex-col justify-between min-w-0">
                      <div>
                        <div className="flex justify-between items-start gap-2 mb-1.5">
                          <Link
                            to={productUrl}
                            className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 line-clamp-2 group-hover:text-gold-600 dark:group-hover:text-gold-400 transition-colors leading-snug focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40 rounded"
                          >
                            {product.title}
                          </Link>

                          <button
                            type="button"
                            onClick={() => removeFavorite(product.id)}
                            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40"
                            aria-label="إزالة من المفضلة"
                          >
                            <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
                          </button>
                        </div>

                        {(product.description || product.categoryName) && (
                          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mt-1">
                            {product.description || product.categoryName}
                          </p>
                        )}
                      </div>

                      <div className="mt-3 flex items-end justify-between gap-2">
                        <div className="flex flex-col">
                          {product.discountPrice ? (
                            <>
                              <span className="text-base sm:text-lg font-black text-gold-700 dark:text-gold-400 leading-none">
                                {formatPrice(Number(product.discountPrice), product.currency)}
                              </span>
                              <span className="text-xs text-slate-400 line-through mt-0.5">
                                {formatPrice(Number(product.price), product.currency)}
                              </span>
                            </>
                          ) : (
                            <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-none">
                              {formatPrice(Number(product.price), product.currency)}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAddToCart(product)}
                          className="min-h-[44px] px-3 sm:px-4 bg-gold-600 text-white text-xs sm:text-sm font-bold rounded-xl hover:bg-gold-500 transition-colors flex items-center gap-1.5 flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40"
                          aria-label={`إضافة ${product.title} للسلة`}
                        >
                          <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
                          <span className="hidden sm:inline">أضف للسلة</span>
                        </button>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gold-50 dark:bg-gold-900/20 mb-6">
              <Heart className="w-8 h-8 text-gold-300 dark:text-gold-600" aria-hidden="true" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">لا توجد منتجات في المفضلة</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6 text-sm">
              اضغط على أيقونة القلب في أي منتج لحفظه هنا والعودة إليه لاحقاً.
            </p>
            <Link
              to="/products"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] bg-gold-600 text-white font-bold rounded-xl hover:bg-gold-500 transition-colors"
            >
              <ShoppingBag className="w-5 h-5" aria-hidden="true" />
              تصفح المنتجات
            </Link>
          </div>
        )}
      </div>
      <QuickAddFeedback visible={quickAddVisible} message={quickAddMessage} />
    </Layout>
  );
};

export default FavoritesPage;
