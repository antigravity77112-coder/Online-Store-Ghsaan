import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { X, ShoppingBag, Plus, Minus, Trash2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useLocale } from '../context/LocaleContext';
import { useFormatDisplayPrice } from '../context/CurrencyContext';
import { getOptimizedImageUrl, IMAGE_WIDTHS } from '../utils/cloudinaryUrl';

/**
 * Shein-style mini cart slide-over. Opens after add / quick-add.
 */
export default function CartDrawer() {
  const {
    items,
    cartCount,
    cartTotal,
    drawerOpen,
    closeCartDrawer,
    updateQuantity,
    removeFromCart,
  } = useCart();
  const { dir, isRtl } = useLocale();
  const formatPrice = useFormatDisplayPrice();

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') closeCartDrawer();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [drawerOpen, closeCartDrawer]);

  if (!drawerOpen || typeof document === 'undefined') return null;

  const currency = items[0]?.currency;

  return createPortal(
    <div className="fixed inset-0 z-[90]" dir={dir} role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title">
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label="إغلاق السلة"
        onClick={closeCartDrawer}
      />
      <aside
        className={`absolute top-0 bottom-0 flex w-full max-w-md flex-col bg-white dark:bg-stone-950 shadow-2xl ${
          isRtl ? 'left-0 animate-[slideInStart_0.22s_ease-out]' : 'right-0 animate-[slideInEnd_0.22s_ease-out]'
        }`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-stone-100 dark:border-stone-800 px-4 py-3.5 shrink-0">
          <h2 id="cart-drawer-title" className="text-base font-extrabold text-stone-900 dark:text-white inline-flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-gold-600" aria-hidden="true" />
            السلة
            {cartCount > 0 ? (
              <span className="text-xs font-bold text-stone-500">({cartCount})</span>
            ) : null}
          </h2>
          <button
            type="button"
            onClick={closeCartDrawer}
            className="flex h-10 w-10 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <ShoppingBag className="w-10 h-10 text-stone-300" aria-hidden="true" />
              <p className="text-sm text-stone-500">سلتك فارغة</p>
              <button
                type="button"
                onClick={closeCartDrawer}
                className="text-sm font-bold text-gold-700 dark:text-gold-400 hover:underline"
              >
                متابعة التسوق
              </button>
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((item) => {
                const unit = item.discountPrice ?? item.price;
                const img = getOptimizedImageUrl(
                  item.imageUrl || item.mainImageUrl || '/product-placeholder.svg',
                  IMAGE_WIDTHS.THUMBNAIL,
                );
                const optionText = item.options
                  ? Object.values(item.options).filter(Boolean).join(' · ')
                  : null;
                return (
                  <li
                    key={item.productId}
                    className="flex gap-3 rounded-xl border border-stone-100 dark:border-stone-800 p-2.5"
                  >
                    <Link
                      to={item.slug ? `/product/${item.slug}${item.variantId ? `?variant=${item.variantId}` : ''}` : '/cart'}
                      onClick={closeCartDrawer}
                      className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-stone-100 dark:bg-stone-800"
                    >
                      <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-stone-800 dark:text-stone-100 line-clamp-2 leading-snug">
                        {item.title}
                      </p>
                      {optionText ? (
                        <p className="mt-0.5 text-[10px] text-stone-400">{optionText}</p>
                      ) : null}
                      <p className="mt-1 text-sm font-extrabold text-[#e6533d]">
                        {formatPrice(unit, item.currency || currency)}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <div className="inline-flex items-center rounded-lg border border-stone-200 dark:border-stone-700">
                          <button
                            type="button"
                            className="flex h-8 w-8 items-center justify-center text-stone-600"
                            aria-label="إنقاص"
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="min-w-[1.5rem] text-center text-xs font-bold tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            className="flex h-8 w-8 items-center justify-center text-stone-600"
                            aria-label="زيادة"
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.productId)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          aria-label="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {items.length > 0 ? (
          <div className="shrink-0 border-t border-stone-100 dark:border-stone-800 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-stone-600 dark:text-stone-300">الإجمالي</span>
              <span className="font-extrabold text-stone-900 dark:text-white">
                {formatPrice(cartTotal, currency)}
              </span>
            </div>
            <Link
              to="/cart"
              onClick={closeCartDrawer}
              className="flex h-11 w-full items-center justify-center rounded-xl bg-stone-900 dark:bg-white text-sm font-extrabold text-white dark:text-stone-900 hover:bg-[#e6533d] dark:hover:bg-gold-300 transition-colors"
            >
              إتمام الطلب
            </Link>
            <button
              type="button"
              onClick={closeCartDrawer}
              className="w-full py-2 text-xs font-bold text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
            >
              متابعة التسوق
            </button>
          </div>
        ) : null}
      </aside>
      <style>{`
        @keyframes slideInStart { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        @keyframes slideInEnd { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </div>,
    document.body,
  );
}
