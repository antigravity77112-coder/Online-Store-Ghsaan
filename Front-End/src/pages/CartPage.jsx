import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight, ShoppingCart, Loader2, MapPin, AlertCircle, AlertTriangle, TicketPercent, X } from 'lucide-react';
import Layout from '../components/Layout';
import SEO from '../components/SEO';
import OrderMethodSelector from '../components/OrderMethodSelector';
import WhatsAppGlyph from '../components/WhatsAppGlyph';
import DiscoveryLinks from '../components/listing/DiscoveryLinks';
import { useCart } from '../context/CartContext';
import { useSiteConfig } from '../context/SiteConfigContext';
import { useCurrency } from '../context/CurrencyContext';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';
import { getOptimizedImageUrl, IMAGE_WIDTHS } from '../utils/cloudinaryUrl';
import {
  resolveWhatsAppBaseUrl,
  buildWhatsAppUrl,
  buildCartWhatsAppMessage,
} from '../utils/whatsappOrder';

const ADDRESS_FIELD_ID = 'cart-shipping-address';
const ADDRESS_ERROR_ID = 'cart-address-error';

function mapCartCurrency(currency) {
  const map = { YER_Sanaa: 'YER', YER_Aden: 'YER', USD: 'USD', SAR: 'SAR', EUR: 'EUR' };
  return map[currency] || 'YER';
}

const CartPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { items, removeFromCart, updateQuantity, clearCart, cartTotal, cartCount } = useCart();
  const { preferredCurrency, formatPrice, convertAmount } = useCurrency();
  const { isAuthenticated } = useAuth();

  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutDone, setCheckoutDone] = useState(false);
  const [error, setError] = useState('');
  const [addressTouched, setAddressTouched] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [couponApplying, setCouponApplying] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponMessage, setCouponMessage] = useState('');
  const { config } = useSiteConfig();
  const contactPhone = config.contact?.phone || '';
  const contactWhatsapp = config.contact?.whatsapp || '';

  const checkoutSectionRef = useRef(null);
  const addressRef = useRef(null);
  const idempotencyKeyRef = useRef(null);

  const [checkoutForm, setCheckoutForm] = useState({
    shippingAddress: '',
  });

  const currencySymbol = items[0] ? (api.CurrencySymbol[items[0].currency] || 'ريال') : '';
  const currencyCode = items[0] ? mapCartCurrency(items[0].currency) : 'YER';
  const displayTotal = useMemo(
    () => items.reduce(
      (sum, item) => sum + convertAmount(item.discountPrice ?? item.price, item.currency) * item.quantity,
      0,
    ),
    [items, convertAmount],
  );
  const displayOriginalTotal = useMemo(
    () => items.reduce(
      (sum, item) => sum + convertAmount(Math.max(item.price, item.discountPrice ?? 0), item.currency) * item.quantity,
      0,
    ),
    [items, convertAmount],
  );
  const displayDiscount = Math.max(0, displayOriginalTotal - displayTotal);
  const hasCartDiscount = displayDiscount > 0.009;
  const couponPricing = appliedCoupon?.pricing || null;
  const finalDisplayTotal = couponPricing
    ? convertAmount(couponPricing.totalAfter, items[0]?.currency || 'YER_Sanaa')
    : displayTotal;
  const displayTotalLabel = formatPrice(finalDisplayTotal, preferredCurrency);
  const addressInvalid = addressTouched && !checkoutForm.shippingAddress.trim();

  const handleApplyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) {
      setCouponMessage(t('cart.couponRequired', 'أدخل كود الكوبون'));
      return;
    }
    setCouponApplying(true);
    setCouponMessage('');
    try {
      const result = await api.validateCoupon({ code, cartSubtotal: cartTotal });
      if (!result?.ok) {
        setAppliedCoupon(null);
        setCouponMessage(result?.message || t('cart.couponInvalid', 'الكوبون غير صالح'));
        return;
      }
      setAppliedCoupon(result);
      setCouponMessage(result.message || t('cart.couponApplied', 'تم تطبيق الكوبون'));
    } catch (err) {
      setAppliedCoupon(null);
      setCouponMessage(err.message || t('cart.couponInvalid', 'الكوبون غير صالح'));
    } finally {
      setCouponApplying(false);
    }
  };

  const clearCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponMessage('');
  };

  const scrollToCheckout = useCallback(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    checkoutSectionRef.current?.scrollIntoView({
      behavior: prefersReduced ? 'auto' : 'smooth',
      block: 'start',
    });
  }, []);

  const openCheckout = useCallback(() => {
    setShowCheckout(true);
    requestAnimationFrame(scrollToCheckout);
  }, [scrollToCheckout]);

  const handleCheckout = async () => {
    setAddressTouched(true);

    if (!checkoutForm.shippingAddress.trim()) {
      setError(t('cart.addressRequired'));
      addressRef.current?.focus();
      scrollToCheckout();
      return;
    }

    const couponCode = appliedCoupon?.coupon?.code || null;

    if (couponCode && !isAuthenticated) {
      setError(t('cart.couponLoginRequired', 'سجّل الدخول لتطبيق الكوبون على الطلب'));
      navigate('/auth', { state: { from: '/cart' } });
      return;
    }

    setCheckoutLoading(true);
    setError('');

    try {
      let couponForMessage = null;

      if (couponCode) {
        if (!idempotencyKeyRef.current && typeof crypto !== 'undefined' && crypto.randomUUID) {
          idempotencyKeyRef.current = crypto.randomUUID();
        }
        const order = await api.createOrder(
          {
            shippingAddress: checkoutForm.shippingAddress.trim(),
            paymentMethod: 'COD',
            couponCode,
            items: items.map((item) => ({
              productId: item.baseProductId || String(item.productId).split('::')[0],
              quantity: item.quantity,
            })),
          },
          { idempotencyKey: idempotencyKeyRef.current },
        );
        couponForMessage = {
          couponCode: order.couponCode || couponCode,
          discountType: order.discountType
            || appliedCoupon?.coupon?.discountType
            || appliedCoupon?.pricing?.discountType
            || 'Percent',
          discountPercent: order.discountPercent ?? appliedCoupon?.coupon?.discountPercent,
          discountAmount: Number(order.discountAmount ?? appliedCoupon?.pricing?.discountAmount ?? 0),
          subtotalBeforeCoupon: Number(order.subtotalBeforeDiscount ?? cartTotal),
          totalAfter: Number(order.totalAmount ?? appliedCoupon?.pricing?.totalAfter ?? cartTotal),
        };
      }

      const message = buildCartWhatsAppMessage(
        items,
        cartTotal,
        checkoutForm.shippingAddress,
        currencySymbol,
        couponForMessage,
      );

      const baseWhatsappUrl = resolveWhatsAppBaseUrl(contactPhone, contactWhatsapp);
      const whatsappTarget = buildWhatsAppUrl(baseWhatsappUrl, message);

      if (!whatsappTarget) {
        setError(t('cart.whatsappUnavailable'));
        setCheckoutLoading(false);
        return;
      }

      window.open(whatsappTarget, '_blank');

      setCheckoutDone(true);
      clearCart();
      clearCoupon();
      idempotencyKeyRef.current = null;
    } catch (err) {
      setError(err.message || 'حدث خطأ أثناء إرسال الطلب');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleAddressFocus = (e) => {
    if (window.innerWidth >= 1024) return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTimeout(() => {
      e.target.scrollIntoView({ block: 'center', behavior: prefersReduced ? 'auto' : 'smooth' });
    }, 300);
  };

  if (checkoutDone) {
    return (
      <Layout>
        <SEO title={t('cart.successTitle')} noIndex />
        <div className="max-w-2xl mx-auto px-4 py-24 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="w-24 h-24 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-8"
          >
            <WhatsAppGlyph className="w-12 h-12 text-[#25D366]" aria-hidden="true" />
          </motion.div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-3">{t('cart.successTitle')}</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8 text-lg">{t('cart.successDesc')}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {contactPhone && (
              <a
                href={(() => {
                  const phone = (contactPhone || '').replace(/\D/g, '');
                  const e164 = phone ? (phone.startsWith('967') ? phone : `967${phone}`) : '';
                  const base = e164 ? `https://wa.me/${e164}` : '';
                  return base ? `${base}?text=${encodeURIComponent('مرحباً! أود الاستفسار عن طلبي.')}` : '#';
                })()}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 min-h-[44px] bg-[#25D366] text-white font-bold rounded-xl hover:bg-[#1fb855] transition-colors flex items-center justify-center gap-2"
              >
                <WhatsAppGlyph className="w-5 h-5" aria-hidden="true" />
                {t('common.contactUs')}
              </a>
            )}
            <Link
              to="/"
              className="px-6 py-3 min-h-[44px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center"
            >
              {t('common.continueShopping')}
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  if (items.length === 0) {
    return (
      <Layout>
        <SEO title={t('cart.title')} noIndex />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 mb-6">
            <ShoppingCart className="w-10 h-10 text-slate-300 dark:text-slate-600" aria-hidden="true" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-200 mb-2">{t('cart.emptyTitle')}</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm leading-relaxed max-w-sm mx-auto">{t('cart.emptyDesc')}</p>
          <Link
            to="/products"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] bg-gold-600 text-white font-bold rounded-xl hover:bg-gold-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40"
          >
            <ArrowRight className="w-5 h-5" aria-hidden="true" />
            {t('common.browseProducts')}
          </Link>
          <DiscoveryLinks className="mt-8" compact />
        </div>
      </Layout>
    );
  }

  const summaryTotals = (
    <div className="space-y-3 text-sm">
      <div className="flex justify-between text-slate-500 dark:text-slate-400">
        <span>{hasCartDiscount ? 'الإجمالي قبل الخصم' : t('cart.subtotal')} ({cartCount})</span>
        <span className="font-semibold text-slate-800 dark:text-white">
          {formatPrice(displayOriginalTotal, preferredCurrency)}
        </span>
      </div>
      {hasCartDiscount && (
        <div className="flex justify-between text-slate-500 dark:text-slate-400">
          <span>خصم المنتجات</span>
          <span className="font-bold text-[#e6533d]" dir="ltr">
            −{formatPrice(displayDiscount, preferredCurrency)}
          </span>
        </div>
      )}
      {couponPricing && (
        <div className="flex justify-between text-slate-500 dark:text-slate-400">
          <span>
            {t('cart.couponDiscount', 'خصم الكوبون')}
            {' '}
            <span className="font-mono text-[11px]" dir="ltr">({appliedCoupon.coupon.code})</span>
          </span>
          <span className="font-bold text-[#e6533d]" dir="ltr">
            −{formatPrice(
              convertAmount(couponPricing.discountAmount, items[0]?.currency || 'YER_Sanaa'),
              preferredCurrency,
            )}
          </span>
        </div>
      )}
      <div className="flex justify-between text-slate-500 dark:text-slate-400">
        <span>{t('common.delivery')}</span>
        <span className="text-slate-600 dark:text-slate-300 font-medium text-xs">{t('cart.shippingNote')}</span>
      </div>
      <hr className="border-slate-100 dark:border-slate-700" />
      <div className="flex justify-between items-baseline">
        <span className="font-bold text-slate-900 dark:text-white text-base">
          {(hasCartDiscount || couponPricing) ? 'الإجمالي النهائي' : t('common.total')}
        </span>
        <span className="font-extrabold text-gold-600 dark:text-gold-400 text-lg">
          {displayTotalLabel}
        </span>
      </div>
    </div>
  );

  const checkoutFormBlock = (
    <div className="space-y-4">
      <p className="text-xs text-slate-500 dark:text-slate-400">{t('cart.checkoutProgress')}</p>

      <div>
        <label htmlFor={ADDRESS_FIELD_ID} className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
          {t('cart.addressLabel')}
        </label>
        <div className="relative">
          <MapPin className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" aria-hidden="true" />
          <textarea
            ref={addressRef}
            id={ADDRESS_FIELD_ID}
            name="shippingAddress"
            value={checkoutForm.shippingAddress}
            onChange={(e) => {
              setCheckoutForm({ ...checkoutForm, shippingAddress: e.target.value });
              setError('');
              if (addressTouched) setAddressTouched(true);
            }}
            onBlur={() => setAddressTouched(true)}
            onFocus={handleAddressFocus}
            placeholder={t('cart.addressPlaceholder')}
            rows={2}
            autoComplete="street-address"
            aria-invalid={addressInvalid || Boolean(error && !checkoutForm.shippingAddress.trim())}
            aria-describedby={addressInvalid || error ? ADDRESS_ERROR_ID : undefined}
            className={`w-full pr-10 pl-4 py-2.5 border rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-gold-500/40 resize-none scroll-mb-32 ${
              addressInvalid || (error && !checkoutForm.shippingAddress.trim())
                ? 'border-red-400 dark:border-red-500'
                : 'border-slate-200 dark:border-slate-600 focus:border-gold-400'
            }`}
          />
        </div>
        {(addressInvalid || (error && !checkoutForm.shippingAddress.trim())) && (
          <p id={ADDRESS_ERROR_ID} role="alert" className="mt-1.5 text-xs text-red-500 font-medium">
            {t('cart.addressRequired')}
          </p>
        )}
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
          {t('cart.couponLabel', 'كود الخصم')}
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={couponInput}
            onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
            dir="ltr"
            placeholder={t('cart.couponPlaceholder', 'SAVE10')}
            className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-mono"
            disabled={Boolean(appliedCoupon)}
          />
          {appliedCoupon ? (
            <button
              type="button"
              onClick={clearCoupon}
              className="min-w-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-500 hover:text-rose-500"
              aria-label={t('cart.couponClear', 'إزالة الكوبون')}
            >
              <X className="w-4 h-4 mx-auto" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleApplyCoupon}
              disabled={couponApplying}
              className="inline-flex items-center gap-1.5 px-3 rounded-xl bg-slate-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-bold min-h-[44px]"
            >
              {couponApplying ? <Loader2 className="w-4 h-4 animate-spin" /> : <TicketPercent className="w-4 h-4" />}
              {t('cart.couponApply', 'تطبيق')}
            </button>
          )}
        </div>
        {couponMessage && (
          <p className={`mt-1.5 text-xs font-medium ${appliedCoupon ? 'text-emerald-600' : 'text-rose-500'}`}>
            {couponMessage}
          </p>
        )}
        <Link to="/coupon-check" className="inline-block mt-1 text-[11px] text-gold-600 hover:underline">
          {t('cart.couponCheckLink', 'التحقق من كوبون')}
        </Link>
      </div>

      <OrderMethodSelector showPaymentOption={false} />

      {error && checkoutForm.shippingAddress.trim() && (
        <div role="alert" className="flex items-center gap-2 text-red-500 text-xs font-medium">
          <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-100 dark:border-slate-700 space-y-1.5">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <span aria-hidden="true">🔒</span>
          {t('cart.trustSecure')}
        </p>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <WhatsAppGlyph className="w-3.5 h-3.5 text-[#25D366] flex-shrink-0" aria-hidden="true" />
          {t('cart.trustWhatsapp')}
        </p>
      </div>

      <button
        type="button"
        onClick={handleCheckout}
        disabled={checkoutLoading}
        aria-busy={checkoutLoading}
        className="hidden lg:flex w-full min-h-[44px] py-3.5 font-bold rounded-xl transition-all shadow-lg disabled:opacity-70 disabled:cursor-not-allowed active:scale-[0.98] items-center justify-center gap-2 bg-[#25D366] text-white hover:bg-[#1fb855] shadow-green-600/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40"
      >
        {checkoutLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
            {t('cart.openingWhatsapp')}
          </>
        ) : (
          <>
            <WhatsAppGlyph className="w-5 h-5" aria-hidden="true" />
            {t('cart.sendWhatsapp')}
          </>
        )}
      </button>
    </div>
  );

  return (
    <Layout>
      <SEO title={t('cart.title')} noIndex />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 pb-28 lg:pb-12">

        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <ShoppingBag className="w-7 h-7 sm:w-8 sm:h-8 text-gold-600 dark:text-gold-400" aria-hidden="true" />
            {t('cart.title')}
          </h1>
          <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            {cartCount} {t('common.products')}
          </span>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 space-y-4">
            <AnimatePresence>
              {items.map((item) => (
                <motion.article
                  key={item.productId}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100, transition: { duration: 0.2 } }}
                  className="group flex bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-gold-200 dark:hover:border-gold-700 transition-all duration-200"
                >
                  <Link
                    to={`/product/${item.slug || item.baseProductId || item.productId}`}
                    className="w-28 sm:w-40 flex-shrink-0 bg-slate-50 dark:bg-slate-800 relative overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40"
                    aria-label={item.title}
                  >
                    <img
                      src={getOptimizedImageUrl(
                        item.imageUrl || item.mainImageUrl || '/product-placeholder.svg',
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
                        <div className="min-w-0">
                          {item.brandName && (
                            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate mb-0.5">
                              {item.brandName}
                            </p>
                          )}
                          <Link
                            to={`/product/${item.slug || item.baseProductId || item.productId}`}
                            className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 line-clamp-2 group-hover:text-gold-600 dark:group-hover:text-gold-400 transition-colors leading-snug focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40 rounded"
                          >
                            {item.title}
                          </Link>
                          {item.options && Object.keys(item.options).length > 0 ? (
                            <ul className="mt-1.5 space-y-0.5">
                              {Object.entries(item.options).map(([key, value]) => (
                                <li key={key} className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                                  <span className="font-semibold text-slate-600 dark:text-slate-300">{key}:</span> {value}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFromCart(item.productId)}
                          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40"
                          aria-label={t('cart.removeItem')}
                        >
                          <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
                        </button>
                      </div>

                      {(item.description || item.categoryName) && (
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mt-1">
                          {item.description || item.categoryName}
                        </p>
                      )}
                    </div>

                    <div className="mt-3 flex items-end justify-between gap-2">
                      <div className="flex flex-col">
                        {item.discountPrice ? (
                          <>
                            <span className="text-base sm:text-lg font-black text-gold-700 dark:text-gold-400 leading-none">
                              {formatPrice(Number(item.discountPrice), item.currency)}
                            </span>
                            <span className="text-xs text-slate-400 line-through mt-0.5">
                              {formatPrice(Number(item.price), item.currency)}
                            </span>
                          </>
                        ) : (
                          <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-none">
                            {formatPrice(item.price, item.currency)}
                          </span>
                        )}

                        <div className="flex items-center gap-1 mt-3">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            className="min-w-[40px] min-h-[40px] rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40"
                            aria-label={t('cart.decreaseQuantity')}
                          >
                            <Minus className="w-4 h-4" aria-hidden="true" />
                          </button>
                          <span className="w-8 text-center font-bold text-slate-800 dark:text-white text-sm" aria-live="polite">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            disabled={item.quantity >= (item.stockQuantity || 9999)}
                            className={`min-w-[40px] min-h-[40px] rounded-lg flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40 ${
                              item.quantity >= (item.stockQuantity || 9999)
                                ? 'bg-bone dark:bg-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed'
                                : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300'
                            }`}
                            aria-label={t('cart.increaseQuantity')}
                          >
                            <Plus className="w-4 h-4" aria-hidden="true" />
                          </button>
                        </div>
                        {item.quantity >= (item.stockQuantity || 9999) && (
                          <div className="flex items-center gap-1 mt-1.5 text-gold-600 dark:text-gold-400">
                            <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                            <span className="text-[11px] font-medium">{t('cart.maxStock', { count: item.stockQuantity })}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>

            <button
              type="button"
              onClick={() => {
                if (window.confirm(t('cart.clearConfirm'))) clearCart();
              }}
              className="mt-3 min-h-[44px] text-sm text-slate-400 hover:text-red-500 font-medium flex items-center gap-1.5 transition-colors px-1"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              {t('cart.clearCart')}
            </button>
          </div>

          <div className="lg:w-[340px]" ref={checkoutSectionRef}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm lg:sticky lg:top-24 scroll-mt-24">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-5">{t('cart.summary')}</h2>

              {summaryTotals}

              <div className="mt-5">
                {!showCheckout ? (
                  <button
                    type="button"
                    onClick={openCheckout}
                    className="w-full min-h-[44px] py-3.5 bg-gold-600 text-white font-bold rounded-xl hover:bg-gold-500 transition-all shadow-lg shadow-gold-600/20 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40"
                  >
                    {t('cart.checkout')}
                  </button>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4 pt-1"
                  >
                    {checkoutFormBlock}
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className="lg:hidden fixed inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-700 px-3 py-2.5"
        style={{ bottom: 'var(--mobile-bottom-nav-offset)' }}
      >
        <div className="flex items-center gap-2 max-w-4xl mx-auto">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-slate-500 dark:text-slate-400">{cartCount} {t('common.products')}</p>
            <p className="text-base font-black text-slate-900 dark:text-white truncate">
              {displayTotalLabel}
            </p>
          </div>
          {!showCheckout ? (
            <button
              type="button"
              onClick={openCheckout}
              className="flex-shrink-0 min-h-[44px] px-4 rounded-xl font-bold text-sm bg-gold-600 text-white hover:bg-gold-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40"
            >
              {t('cart.checkout')}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCheckout}
              disabled={checkoutLoading}
              aria-busy={checkoutLoading}
              className="flex-shrink-0 min-h-[44px] px-4 rounded-xl font-bold text-sm flex items-center gap-2 bg-[#25D366] text-white hover:bg-[#1fb855] disabled:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40"
            >
              {checkoutLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <WhatsAppGlyph className="w-4 h-4" aria-hidden="true" />
              )}
              <span className="truncate max-w-[8rem]">{checkoutLoading ? t('cart.openingWhatsapp') : t('cart.sendWhatsapp')}</span>
            </button>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default CartPage;
