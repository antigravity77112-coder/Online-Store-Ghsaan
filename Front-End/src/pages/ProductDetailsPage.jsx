import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Heart,
  Share2,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  AlertCircle,
  ShoppingCart,
  MessageCircle,
  Minus,
  Plus,
  ChevronDown,
  Truck,
  ShieldCheck,
  Star,
} from "lucide-react";
import Layout from "../components/Layout";
import SEO from "../components/SEO";
import Breadcrumbs from "../components/Breadcrumbs";
import RelatedProducts from "../components/RelatedProducts";
import BannerRenderer from "../components/BannerRenderer";
import * as api from "../services/api";
import { useProduct } from "../hooks/useProducts";
import { useGallerySwipe } from "../hooks/useGallerySwipe";
import { useSiteConfig } from "../context/SiteConfigContext";
import { getOptimizedImageUrl, getRawCloudinaryUrl, getResponsiveCloudinarySources, IMAGE_WIDTHS, RESPONSIVE_SIZES, RESPONSIVE_WIDTHS } from "../utils/cloudinaryUrl";
import { useCart } from "../context/CartContext";
import { useFavorites } from "../context/FavoritesContext";
import { buildProductSchema } from "../utils/structuredData";
import OrderMethodSelector from "../components/OrderMethodSelector";
import {
  resolveWhatsAppBaseUrl,
  buildWhatsAppUrl,
  buildProductWhatsAppMessage,
} from "../utils/whatsappOrder";
import { trackViewItem, trackAddToCart } from "../utils/analytics";
import { useFormatDisplayPrice } from "../context/CurrencyContext";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getVariantLabel(variant) {
  return variant.attributes?.map((a) => a.value).join(" - ") || variant.sku || "متغير";
}

function ProductSkeleton() {
  return (
    <div className="bg-white dark:bg-stone-950 animate-pulse">
      <div className="aspect-[4/5] sm:aspect-square bg-stone-200 dark:bg-stone-800" />
      <div className="px-3 py-4 space-y-3">
        <div className="h-8 w-1/3 bg-stone-200 dark:bg-stone-800 rounded" />
        <div className="h-5 w-full bg-stone-200 dark:bg-stone-800 rounded" />
        <div className="h-4 w-2/3 bg-stone-200 dark:bg-stone-800 rounded" />
        <div className="h-11 w-full bg-stone-200 dark:bg-stone-800 rounded-sm mt-4" />
      </div>
    </div>
  );
}

function CompactStarRating({ rating, reviewCount, onReviewsClick }) {
  const numRating = Number(rating) || 0;
  const full = Math.floor(numRating);
  return (
    <button
      type="button"
      onClick={onReviewsClick}
      className="inline-flex items-center gap-1.5 text-right hover:opacity-80 transition-opacity"
      aria-label="الانتقال إلى التقييمات"
    >
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`w-3.5 h-3.5 ${i <= full ? "text-amber-400 fill-amber-400" : "text-stone-300 dark:text-stone-600"}`}
          />
        ))}
      </div>
      <span className="text-sm font-bold text-stone-800 dark:text-stone-200">{numRating.toFixed(1)}</span>
      {reviewCount > 0 && (
        <span className="text-xs text-stone-400">({Number(reviewCount).toLocaleString()} تقييم)</span>
      )}
    </button>
  );
}

function AccordionSection({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!children) return null;
  return (
    <div className="border-b border-stone-200/90 dark:border-stone-700/80">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-3.5 text-right min-h-[44px]"
      >
        <span className="text-sm font-extrabold text-stone-900 dark:text-white">{title}</span>
        <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="pb-4 text-sm text-stone-600 dark:text-stone-300 leading-relaxed">{children}</div>}
    </div>
  );
}

const ProductDetailsPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const formatPrice = useFormatDisplayPrice();
  const reviewsRef = useRef(null);
  const trackedProductIdRef = useRef(null);

  const { product, isLoading, error, isNotFound } = useProduct(slug);

  const [addedToCart, setAddedToCart] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [descExpanded, setDescExpanded] = useState(false);
  const [brokenGalleryUrls, setBrokenGalleryUrls] = useState(() => new Set());
  const [orderMethod, setOrderMethod] = useState("whatsapp");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const feedbackTimerRef = useRef(null);
  const { config } = useSiteConfig();
  const contactPhone = config.contact?.phone || '';
  const contactWhatsapp = config.contact?.whatsapp || '';
  const shippingOfferText = config.content?.shippingOfferText || '';

  useEffect(() => {
    if (product?.slug && UUID_REGEX.test(slug) && product.slug !== slug) {
      navigate(`/product/${product.slug}`, { replace: true });
    }
  }, [product, slug, navigate]);

  useEffect(() => {
    setAddedToCart(false);
    setSelectedImageIndex(0);
    setBrokenGalleryUrls(new Set());
    setQuantity(1);
    setDescExpanded(false);
    trackedProductIdRef.current = null;
  }, [slug]);

  useEffect(() => {
    if (!product?.id || trackedProductIdRef.current === product.id) return;
    trackedProductIdRef.current = product.id;
    trackViewItem(product);
    if (product.hasVariants && product.variants?.length > 0) {
      setSelectedVariantId(product.variants[0].id);
    } else {
      setSelectedVariantId(null);
    }
  }, [product]);

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [selectedVariantId]);

  const selectedVariant = useMemo(() => {
    if (!product?.variants?.length || !selectedVariantId) return null;
    return product.variants.find((v) => v.id === selectedVariantId) || null;
  }, [product, selectedVariantId]);

  const displayPrice = selectedVariant ? Number(selectedVariant.price) : Number(product?.price || 0);
  const displayDiscount = selectedVariant
    ? (selectedVariant.discountPrice ? Number(selectedVariant.discountPrice) : null)
    : (product?.discountPrice ? Number(product.discountPrice) : null);
  const displayStock = selectedVariant ? selectedVariant.stockQuantity : (product?.stockQuantity || 0);
  const finalPrice = displayDiscount ?? displayPrice;
  const hasDiscount = displayDiscount !== null && displayDiscount < displayPrice;
  const discountPercent = hasDiscount ? Math.round(((displayPrice - displayDiscount) / displayPrice) * 100) : 0;
  const savingsAmount = hasDiscount ? displayPrice - displayDiscount : 0;

  const reviews = product?.reviews || [];
  const hasReviews = reviews.length > 0;
  const reviewCount = hasReviews ? reviews.length : (product?.reviewCount ?? 0);
  const avgRating = hasReviews
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : (product?.rating ?? 0);
  const showRating =
    hasReviews ||
    (product?.rating != null && product.rating > 0) ||
    (product?.reviewCount != null && product.reviewCount > 0);

  const buildCartProduct = () => {
    if (!product) return null;
    if (product.hasVariants && selectedVariant) {
      const label = getVariantLabel(selectedVariant);
      const variantImage = selectedVariant.imageUrl || null;
      return {
        ...product,
        id: `${product.id}::${selectedVariant.id}`,
        price: selectedVariant.price,
        discountPrice: selectedVariant.discountPrice,
        stockQuantity: selectedVariant.stockQuantity,
        title: `${product.title} (${label})`,
        imageUrl: variantImage || product.imageUrl,
        mainImageUrl: variantImage || product.mainImageUrl,
      };
    }
    return product;
  };

  const handleAddToCart = () => {
    const cartProduct = buildCartProduct();
    if (!cartProduct || displayStock <= 0) return;
    addToCart(cartProduct, quantity);
    trackAddToCart(cartProduct, quantity);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2500);
  };

  const showFeedback = (message) => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setFeedbackMessage(message);
    feedbackTimerRef.current = setTimeout(() => {
      setFeedbackMessage("");
      feedbackTimerRef.current = null;
    }, 2800);
  };

  useEffect(() => () => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
  }, []);

  const handleShare = async () => {
    const shareData = {
      title: product?.title || "متجر قصة",
      text: `شاهد هذا المنتج: ${product?.title}`,
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        showFeedback("تمت المشاركة");
      } else {
        await navigator.clipboard.writeText(window.location.href);
        showFeedback("تم نسخ الرابط");
      }
    } catch (err) {
      if (err?.name === "AbortError") return;
    }
  };

  const whatsappMessage = useMemo(() => {
    if (!product) return "";
    const variantLabel = selectedVariant ? getVariantLabel(selectedVariant) : "";
    return buildProductWhatsAppMessage({
      title: product.title,
      quantity,
      price: finalPrice,
      currencySymbol: api.CurrencySymbol[product.currency] || "",
      variantLabel,
      productUrl: typeof window !== "undefined" ? window.location.href : "",
    });
  }, [product, quantity, finalPrice, selectedVariant]);

  const productWhatsAppUrl = useMemo(() => {
    const base = resolveWhatsAppBaseUrl(contactPhone, contactWhatsapp);
    if (!base || !whatsappMessage) return "";
    return buildWhatsAppUrl(base, whatsappMessage);
  }, [contactWhatsapp, contactPhone, whatsappMessage]);

  const scrollToReviews = () => {
    reviewsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const imageCount = useMemo(() => {
    if (!product) return 0;
    if (product.images?.length > 0) return product.images.length;
    return product.imageUrl ? 1 : 1;
  }, [product]);

  const goToPrevImage = useCallback(() => {
    if (imageCount <= 1) return;
    setSelectedImageIndex((i) => (i - 1 + imageCount) % imageCount);
  }, [imageCount]);

  const goToNextImage = useCallback(() => {
    if (imageCount <= 1) return;
    setSelectedImageIndex((i) => (i + 1) % imageCount);
  }, [imageCount]);

  const gallerySwipe = useGallerySwipe({
    onPrev: goToPrevImage,
    onNext: goToNextImage,
    enabled: imageCount > 1,
  });

  const loading = isLoading;
  const notFound = Boolean((isNotFound || (error && !product)) && !isLoading);
  const errorType = isNotFound ? "not_found" : "server_error";

  if (loading) {
    return <Layout homeMarketplace hideMobileHeader><ProductSkeleton /></Layout>;
  }

  if (notFound) {
    return (
      <Layout homeMarketplace hideMobileHeader>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
          <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
          <h2 className="text-xl font-extrabold text-stone-900 dark:text-white mb-2">
            {errorType === "server_error" ? "خطأ في الاتصال" : "المنتج غير موجود"}
          </h2>
          <button
            type="button"
            onClick={() => (errorType === "server_error" ? window.location.reload() : navigate("/"))}
            className="mt-4 px-6 py-2.5 bg-stone-900 text-white font-bold rounded-sm text-sm"
          >
            {errorType === "server_error" ? "إعادة المحاولة" : "العودة للرئيسية"}
          </button>
        </div>
      </Layout>
    );
  }

  const productImages = product.images?.length > 0
    ? product.images.map((img) => img.url)
    : (product.imageUrl ? [product.imageUrl] : ["https://images.unsplash.com/photo-1560472355-536de3962603?w=1000&q=80"]);
  const galleryImages = selectedVariant?.imageUrl
    ? [selectedVariant.imageUrl, ...productImages.filter((url) => url !== selectedVariant.imageUrl)]
    : productImages;

  const safeIndex = Math.min(selectedImageIndex, galleryImages.length - 1);
  const activeImageRawUrl = galleryImages[safeIndex];
  const activeImageSources = brokenGalleryUrls.has(activeImageRawUrl)
    ? { src: getRawCloudinaryUrl(activeImageRawUrl), srcSet: undefined, sizes: undefined }
    : getResponsiveCloudinarySources(activeImageRawUrl, {
        widths: RESPONSIVE_WIDTHS.DETAIL,
        sizes: RESPONSIVE_SIZES.DETAIL,
        fallbackWidth: IMAGE_WIDTHS.DETAIL,
      });

  const handleGalleryImageError = (url) => {
    setBrokenGalleryUrls((prev) => {
      if (prev.has(url)) return prev;
      const next = new Set(prev);
      next.add(url);
      return next;
    });
  };

  const getGalleryThumbUrl = (url) => (
    brokenGalleryUrls.has(url)
      ? getRawCloudinaryUrl(url)
      : getOptimizedImageUrl(url, 120)
  );
  const productSchema = buildProductSchema(product);
  const categorySlug = product.category?.slug || product.categoryName;
  const breadcrumbItems = [
    { name: "الرئيسية", url: "/" },
    { name: "الفئات", url: "/categories" },
    ...(product.categoryName ? [{ name: product.categoryName, url: `/category/${encodeURIComponent(categorySlug)}` }] : []),
    { name: product.title },
  ];

  const trustItems = [
    shippingOfferText ? { icon: Truck, text: shippingOfferText } : null,
    productWhatsAppUrl ? { icon: MessageCircle, text: "دعم سريع عبر واتساب" } : null,
    displayStock > 0 ? { icon: ShieldCheck, text: "متوفر للطلب" } : null,
  ].filter(Boolean);

  const descPreview = product.description?.length > 180 && !descExpanded
    ? `${product.description.slice(0, 180).trim()}...`
    : product.description;

  const purchaseBlock = (
    <div className="flex flex-col px-3 sm:px-0 pt-3 sm:pt-0">
      <div className="mb-2">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5" dir="ltr">
          <span className="text-2xl sm:text-3xl font-extrabold text-[#e6533d] dark:text-[#ff7a62] tracking-tight">
            {formatPrice(finalPrice, product.currency)}
          </span>
          {hasDiscount && (
            <span className="text-sm text-stone-400 line-through">
              {formatPrice(displayPrice, product.currency)}
            </span>
          )}
        </div>
        {hasDiscount && (
          <p className="text-xs font-semibold text-[#e6533d] mt-1">
            وفر {formatPrice(savingsAmount, product.currency)} ({discountPercent}%)
          </p>
        )}
      </div>

      <h1 className="text-sm sm:text-base font-medium text-stone-800 dark:text-stone-200 leading-snug mb-2">
        {product.title}
      </h1>

      <div className="hidden lg:flex items-center gap-1 flex-shrink-0 mb-3">
        <button
          type="button"
          onClick={() => toggleFavorite(product)}
          aria-pressed={isFavorite(product.id)}
          className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full border transition-colors ${
            isFavorite(product.id)
              ? "border-rose-200 text-rose-500 bg-rose-50"
              : "border-stone-200 dark:border-stone-700 text-stone-500 hover:text-rose-500"
          }`}
          aria-label={isFavorite(product.id) ? "إزالة من المفضلة" : "إضافة للمفضلة"}
        >
          <Heart className="w-4 h-4" fill={isFavorite(product.id) ? "currentColor" : "none"} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={handleShare}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full border border-stone-200 dark:border-stone-700 text-stone-500 hover:text-stone-800 transition-colors"
          aria-label="مشاركة"
        >
          <Share2 className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {(showRating) && (
        <div className="mb-3">
          <CompactStarRating rating={avgRating} reviewCount={reviewCount} onReviewsClick={scrollToReviews} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        {hasDiscount && (
          <span className="px-1.5 py-0.5 text-[10px] font-extrabold text-white bg-[#e6533d] rounded-sm">
            -{discountPercent}%
          </span>
        )}
        {displayStock > 0 ? (
          <span className="px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 rounded-sm border border-emerald-200/70">
            متوفر
          </span>
        ) : (
          <span className="px-1.5 py-0.5 text-[10px] font-semibold text-stone-500 bg-stone-100 rounded-sm">
            نفد المخزون
          </span>
        )}
      </div>

      {product.hasVariants && product.variants?.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-extrabold text-stone-900 dark:text-white mb-2">الخيارات</p>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((variant) => {
              const label = getVariantLabel(variant);
              const isSelected = selectedVariantId === variant.id;
              const isOutOfStock = variant.stockQuantity <= 0;
              const vPrice = variant.discountPrice ?? variant.price;
              return (
                <button
                  key={variant.id}
                  type="button"
                  disabled={isOutOfStock}
                  aria-pressed={isSelected}
                  onClick={() => setSelectedVariantId(variant.id)}
                  className={`min-h-[40px] px-3 py-1.5 rounded-sm text-xs font-semibold border transition-all ${
                    isSelected
                      ? "border-stone-900 dark:border-white bg-stone-900 dark:bg-white text-white dark:text-stone-900"
                      : "border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 hover:border-stone-500"
                  } ${isOutOfStock ? "opacity-40 line-through cursor-not-allowed" : ""}`}
                >
                  {label}
                  <span className="block text-[10px] font-medium opacity-80 mt-0.5">
                    {formatPrice(vPrice, product.currency)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-xs font-extrabold text-stone-900 dark:text-white">الكمية</p>
        <div className="inline-flex items-center border border-stone-300 dark:border-stone-600 rounded-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center text-stone-700 hover:bg-stone-50 disabled:opacity-40"
            aria-label="تقليل الكمية"
          >
            <Minus className="w-4 h-4" aria-hidden="true" />
          </button>
          <span className="w-10 text-center text-sm font-bold text-stone-900 dark:text-white" aria-live="polite">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(displayStock || 999, q + 1))}
            disabled={quantity >= displayStock}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center text-stone-700 hover:bg-stone-50 disabled:opacity-40"
            aria-label="زيادة الكمية"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="hidden lg:flex flex-col gap-2 mb-4">
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={displayStock <= 0 || addedToCart}
          className={`w-full min-h-12 px-4 py-2.5 rounded-sm font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            addedToCart
              ? "bg-emerald-600 text-white"
              : displayStock <= 0
                ? "bg-stone-200 text-stone-400 cursor-not-allowed"
                : "bg-stone-900 hover:bg-stone-800 text-white"
          }`}
        >
          {displayStock <= 0 ? (
            "غير متوفر"
          ) : addedToCart ? (
            <><Check className="w-5 h-5 shrink-0" aria-hidden="true" /> تمت الإضافة</>
          ) : (
            <>
              <ShoppingCart className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span>أضف للسلة</span>
              <span className="opacity-80 font-semibold">· {formatPrice(finalPrice * quantity, product.currency)}</span>
            </>
          )}
        </button>
        <OrderMethodSelector value={orderMethod} onChange={setOrderMethod} showPaymentOption={false} />
        {orderMethod === "whatsapp" && productWhatsAppUrl ? (
          <a
            href={productWhatsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-11 rounded-sm font-bold text-sm flex items-center justify-center gap-2 bg-[#25D366] text-white hover:bg-[#1fb855] transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            الطلب عبر واتساب
          </a>
        ) : null}
      </div>

      {trustItems.length > 0 && (
        <div className="grid grid-cols-1 gap-2 py-3 border-y border-stone-100 dark:border-stone-800 mb-4">
          {trustItems.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400">
              <Icon className="w-3.5 h-3.5 text-stone-500 flex-shrink-0" />
              <span>{text}</span>
            </div>
          ))}
        </div>
      )}

      <div className="hidden lg:block">
        <BannerRenderer placement="sidebar" className="w-full" />
      </div>
    </div>
  );

  const galleryBlock = (
    <div className="w-full -mx-3 sm:mx-0">
      <div
        className="relative aspect-[4/5] sm:aspect-square bg-white dark:bg-stone-900 overflow-hidden touch-pan-y"
        {...(galleryImages.length > 1 ? gallerySwipe : {})}
      >
        <img
          src={activeImageSources.src}
          srcSet={activeImageSources.srcSet}
          sizes={activeImageSources.sizes}
          alt={product.title}
          className="w-full h-full object-contain p-3 sm:p-6"
          fetchPriority="high"
          onError={() => handleGalleryImageError(activeImageRawUrl)}
        />

        <div className="absolute top-2 inset-x-2 z-20 flex items-center justify-between pointer-events-none lg:hidden">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="pointer-events-auto min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full bg-white/90 text-stone-700 shadow-sm"
            aria-label="رجوع"
          >
            <ChevronRight className="w-5 h-5" aria-hidden="true" />
          </button>
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <button
              type="button"
              onClick={() => toggleFavorite(product)}
              aria-pressed={isFavorite(product.id)}
              className={`min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full bg-white/90 shadow-sm ${
                isFavorite(product.id) ? "text-rose-500" : "text-stone-600"
              }`}
              aria-label={isFavorite(product.id) ? "إزالة من المفضلة" : "إضافة للمفضلة"}
            >
              <Heart className="w-4 h-4" fill={isFavorite(product.id) ? "currentColor" : "none"} />
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full bg-white/90 text-stone-600 shadow-sm"
              aria-label="مشاركة"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {galleryImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={goToPrevImage}
              className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 min-w-[40px] min-h-[40px] items-center justify-center bg-white/90 rounded-full shadow-sm border border-stone-200"
              aria-label="الصورة السابقة"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={goToNextImage}
              className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 min-w-[40px] min-h-[40px] items-center justify-center bg-white/90 rounded-full shadow-sm border border-stone-200"
              aria-label="الصورة التالية"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1 rounded-full bg-black/35">
              {galleryImages.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImageIndex(idx)}
                  className="min-w-[24px] min-h-[24px] flex items-center justify-center"
                  aria-label={`صورة ${idx + 1}`}
                >
                  <span
                    className={`rounded-full transition-all ${idx === safeIndex ? "w-2 h-2 bg-white" : "w-1.5 h-1.5 bg-white/50"}`}
                  />
                </button>
              ))}
            </div>
            <span className="absolute bottom-3 right-3 text-[10px] font-bold text-white bg-black/40 px-2 py-0.5 rounded-full">
              {safeIndex + 1}/{galleryImages.length}
            </span>
          </>
        )}
      </div>

      {galleryImages.length > 1 && (
        <div className="hidden sm:flex gap-2 mt-2 overflow-x-auto scrollbar-hide px-3 sm:px-0">
          {galleryImages.map((url, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedImageIndex(idx)}
              aria-current={idx === safeIndex ? "true" : undefined}
              className={`flex-shrink-0 w-14 h-14 rounded-sm overflow-hidden border-2 ${
                idx === safeIndex ? "border-stone-900 dark:border-white" : "border-stone-200 opacity-70"
              }`}
            >
              <img
                src={getGalleryThumbUrl(url)}
                alt=""
                className="w-full h-full object-contain bg-white p-1"
                onError={() => handleGalleryImageError(url)}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <Layout homeMarketplace hideMobileHeader>
      <SEO
        title={product.title}
        description={product.description?.substring(0, 160) || `تسوق ${product.title} على متجر قصة.`}
        image={galleryImages[0]}
        type="product"
        canonicalPath={`/product/${product.slug}`}
        jsonLd={[productSchema]}
      />

      <div className="bg-white dark:bg-stone-950 min-h-screen pb-28 lg:pb-12">
        <div className="hidden sm:block max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 pt-3">
          <Breadcrumbs compact items={breadcrumbItems} />
        </div>

        <div className="max-w-6xl mx-auto sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-0 lg:gap-8 lg:items-start lg:pt-4">
            <div className="w-full lg:w-[52%] order-1">{galleryBlock}</div>
            <div className="w-full lg:w-[48%] order-2">{purchaseBlock}</div>
          </div>
        </div>

        <div className="mt-4 px-3 sm:px-6 lg:px-8 max-w-6xl mx-auto">
          {product.description && (
            <div className="mb-4 border-t border-stone-100 dark:border-stone-800 pt-4">
              <h2 className="text-xs font-extrabold text-stone-900 dark:text-white mb-2 uppercase tracking-wide">
                الوصف
              </h2>
              <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed whitespace-pre-line">
                {descPreview}
              </p>
              {product.description.length > 180 && (
                <button
                  type="button"
                  onClick={() => setDescExpanded((v) => !v)}
                  className="mt-2 text-xs font-bold text-stone-700 dark:text-stone-300 underline underline-offset-2"
                >
                  {descExpanded ? "عرض أقل" : "عرض المزيد"}
                </button>
              )}
            </div>
          )}

          <div className="border-t border-stone-100 dark:border-stone-800">
            {product.attributes?.length > 0 && (
              <AccordionSection title="المواصفات">
                <div className="space-y-2">
                  {product.attributes.map((attr, idx) => {
                    const attrName = attr.categoryAttribute?.name || "مواصفة";
                    let displayValue = attr.value;
                    if (attr.categoryAttribute?.type === "BOOLEAN") {
                      displayValue = attr.value === "true" || attr.value === "1" ? "نعم" : "لا";
                    } else if (attr.categoryAttribute?.type === "MULTI_SELECT") {
                      displayValue = attr.value.split(",").join("، ");
                    }
                    return (
                      <div key={attr.id || idx} className="flex justify-between gap-4 text-xs sm:text-sm py-1 border-b border-stone-100 dark:border-stone-800 last:border-0">
                        <span className="text-stone-500">{attrName}</span>
                        <span className="font-medium text-stone-800 dark:text-stone-200 text-left" dir="auto">{displayValue}</span>
                      </div>
                    );
                  })}
                </div>
              </AccordionSection>
            )}
            {shippingOfferText && (
              <AccordionSection title="الشحن والتوصيل">{shippingOfferText}</AccordionSection>
            )}
          </div>

          {showRating && (
            <section ref={reviewsRef} className="mt-6 border-t border-stone-100 dark:border-stone-800 pt-4" id="reviews">
              <h2 className="text-xs font-extrabold text-stone-900 dark:text-white mb-3 uppercase tracking-wide">التقييمات</h2>
              <div className="mb-4">
                <CompactStarRating rating={avgRating} reviewCount={reviewCount} onReviewsClick={() => {}} />
              </div>
              {reviews.length > 0 ? (
                <div className="space-y-2">
                  {reviews.map((review) => (
                    <div key={review.id} className="p-3 rounded-sm border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
                          {review.user?.fullName || "عميل"}
                        </span>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Star key={i} className={`w-3 h-3 ${i <= review.rating ? "text-amber-400 fill-amber-400" : "text-stone-300"}`} />
                          ))}
                        </div>
                      </div>
                      {review.title && <p className="text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">{review.title}</p>}
                      {review.body && <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">{review.body}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-stone-500">لا توجد تقييمات مكتوبة بعد.</p>
              )}
            </section>
          )}
        </div>

        <div className="px-3 sm:px-6 lg:px-8 max-w-6xl mx-auto mt-6">
          <BannerRenderer placement="product" />
        </div>

        {product.categoryName && (
          <div className="px-3 sm:px-6 lg:px-8 max-w-6xl mx-auto mt-6 pb-4">
            <RelatedProducts categoryName={product.categoryName} currentId={product.id} />
          </div>
        )}
      </div>

      <div
        className="lg:hidden fixed inset-x-0 z-40 bg-white dark:bg-stone-950 border-t border-stone-200 dark:border-stone-800 px-3 py-2.5"
        style={{ bottom: "calc(3.75rem + env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center gap-2.5 max-w-6xl mx-auto">
          <button
            type="button"
            onClick={() => toggleFavorite(product)}
            aria-pressed={isFavorite(product.id)}
            className={`flex-shrink-0 w-11 h-11 rounded-sm border flex items-center justify-center ${
              isFavorite(product.id)
                ? "border-rose-200 text-rose-500 bg-rose-50"
                : "border-stone-300 text-stone-600 dark:border-stone-600 dark:text-stone-300"
            }`}
            aria-label="المفضلة"
          >
            <Heart className="w-5 h-5" fill={isFavorite(product.id) ? "currentColor" : "none"} />
          </button>

          <div className="flex-shrink-0 min-w-0 leading-tight">
            <p className="text-[10px] font-medium text-stone-500 dark:text-stone-400">السعر</p>
            <p className="text-sm font-bold text-gold-700 dark:text-gold-400 tabular-nums whitespace-nowrap">
              {formatPrice(finalPrice * quantity, product.currency)}
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={displayStock <= 0 || addedToCart}
            className={`flex-1 min-h-11 px-3 rounded-sm font-bold text-sm flex items-center justify-center gap-1.5 transition-colors ${
              addedToCart
                ? "bg-emerald-600 text-white"
                : displayStock <= 0
                  ? "bg-stone-200 text-stone-400 dark:bg-stone-800 dark:text-stone-500 cursor-not-allowed"
                  : "bg-stone-900 text-white dark:bg-white dark:text-stone-900"
            }`}
          >
            {displayStock <= 0 ? (
              "غير متوفر"
            ) : addedToCart ? (
              <><Check className="w-4 h-4 shrink-0" aria-hidden="true" /> تمت الإضافة</>
            ) : (
              <><ShoppingCart className="w-4 h-4 shrink-0" aria-hidden="true" /> أضف للسلة</>
            )}
          </button>

          {productWhatsAppUrl ? (
            <a
              href={productWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="واتساب"
              className="flex-shrink-0 w-11 h-11 rounded-sm bg-[#25D366] text-white flex items-center justify-center"
            >
              <MessageCircle className="w-5 h-5" />
            </a>
          ) : null}
        </div>
      </div>

      {feedbackMessage ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-[calc(7.5rem+env(safe-area-inset-bottom))] lg:bottom-8 left-1/2 -translate-x-1/2 z-50 max-w-[min(90vw,20rem)] px-4 py-2.5 rounded-sm bg-stone-900/95 text-white text-sm font-medium text-center shadow-lg motion-reduce:transition-none transition-opacity"
        >
          {feedbackMessage}
        </div>
      ) : null}
    </Layout>
  );
};

export default ProductDetailsPage;
