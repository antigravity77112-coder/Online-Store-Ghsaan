import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Heart,
  Share2,
  ChevronRight,
  Check,
  Loader2,
  AlertCircle,
  ShoppingCart,
  ChevronDown,
  FileText,
  Truck,
  ShieldCheck,
  Star,
  ZoomIn,
} from "lucide-react";
import Layout from "../components/Layout";
import SEO from "../components/SEO";
import Breadcrumbs from "../components/Breadcrumbs";
import RelatedProducts from "../components/RelatedProducts";
import BannerRenderer from "../components/BannerRenderer";
import ProductDescriptionSheet, { buildProductSpecRows } from "../components/ProductDescriptionSheet";
import WhatsAppGlyph from "../components/WhatsAppGlyph";
import ImageLightbox from "../components/ImageLightbox";
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
import { useFormatDisplayPrice } from "../context/CurrencyContext";
import {
  buildOptionGroups,
  findMatchingVariant,
  isValueAvailable,
  isSelectionComplete,
  getVariantOptionsLabelMap,
  formatVariantLabel,
  variantsHaveStructuredAttributes,
} from "../utils/variantOptions";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function ProductSkeleton() {
  return (
    <div className="bg-white dark:bg-stone-950 min-h-screen pb-28 lg:pb-12" aria-busy="true" aria-label="جاري تحميل المنتج">
      <div className="hidden sm:block max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 pt-3">
        <div className="h-3 w-48 rounded skeleton-shimmer" />
      </div>
      <div className="max-w-6xl mx-auto sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-0 lg:gap-8 lg:items-start lg:pt-4">
          <div className="w-full lg:w-[52%]">
            <div className="aspect-[4/5] sm:aspect-square skeleton-shimmer" />
            <div className="hidden sm:flex gap-2 mt-2 px-3 sm:px-0">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="w-14 h-14 rounded-sm skeleton-shimmer flex-shrink-0" />
              ))}
            </div>
          </div>
          <div className="w-full lg:w-[48%] px-3 sm:px-0 pt-4 lg:pt-0 space-y-3">
            <div className="h-5 w-4/5 rounded skeleton-shimmer" />
            <div className="h-4 w-1/3 rounded skeleton-shimmer" />
            <div className="h-9 w-2/5 rounded skeleton-shimmer mt-2" />
            <div className="h-3 w-1/4 rounded skeleton-shimmer" />
            <div className="h-10 w-full rounded-sm skeleton-shimmer mt-4" />
            <div className="h-11 w-full rounded-sm skeleton-shimmer" />
            <div className="space-y-2 pt-4 border-t border-stone-100 dark:border-stone-800">
              <div className="h-3 w-full rounded skeleton-shimmer" />
              <div className="h-3 w-5/6 rounded skeleton-shimmer" />
              <div className="h-3 w-2/3 rounded skeleton-shimmer" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExpandableDescription({ text }) {
  const trimmed = text?.trim() || "";
  const [expanded, setExpanded] = useState(false);
  const [needsToggle, setNeedsToggle] = useState(false);
  const textRef = useRef(null);

  useEffect(() => {
    setExpanded(false);
  }, [trimmed]);

  useEffect(() => {
    const el = textRef.current;
    if (!el || expanded) return undefined;

    const check = () => {
      setNeedsToggle(el.scrollHeight > el.clientHeight + 1);
    };

    check();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(check) : null;
    ro?.observe(el);
    window.addEventListener("resize", check);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", check);
    };
  }, [trimmed, expanded]);

  if (!trimmed) return null;

  return (
    <div className="mt-2">
      <p
        ref={textRef}
        className={`text-sm text-stone-700 dark:text-stone-200 leading-relaxed whitespace-pre-line ${
          expanded ? "" : "line-clamp-3"
        }`}
      >
        {trimmed}
      </p>
      {needsToggle ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-xs font-semibold text-[#e6533d] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40 rounded-sm"
          aria-expanded={expanded}
        >
          {expanded ? "عرض أقل" : "عرض المزيد"}
        </button>
      ) : null}
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
  const [optionSelections, setOptionSelections] = useState({});
  // Quantity is fixed at 1 on the PDP; customers change qty in the cart only.
  const quantity = 1;
  const [descSheetOpen, setDescSheetOpen] = useState(false);
  const [brokenGalleryUrls, setBrokenGalleryUrls] = useState(() => new Set());
  const [heroImageLoaded, setHeroImageLoaded] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
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
    setHeroImageLoaded(false);
    setDescSheetOpen(false);
    setLightboxOpen(false);
    setOptionSelections({});
    setSelectedVariantId(null);
    trackedProductIdRef.current = null;
  }, [slug]);

  useEffect(() => {
    setHeroImageLoaded(false);
  }, [product?.id]);

  useEffect(() => {
    if (!product?.id || trackedProductIdRef.current === product.id) return;
    trackedProductIdRef.current = product.id;
    setOptionSelections({});
    if (product.hasVariants && product.variants?.length > 0) {
      const structured = variantsHaveStructuredAttributes(product.variants);
      if (!structured) {
        setSelectedVariantId(product.variants[0].id);
      } else {
        setSelectedVariantId(null);
      }
    } else {
      setSelectedVariantId(null);
    }
  }, [product]);

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [selectedVariantId]);

  const optionGroups = useMemo(() => {
    if (!product?.variants?.length) return [];
    if (product.optionGroups?.length) return product.optionGroups;
    return buildOptionGroups(product.variants);
  }, [product]);

  const useStructuredPickers = useMemo(
    () => Boolean(product?.hasVariants && variantsHaveStructuredAttributes(product?.variants || [])),
    [product],
  );

  const selectedVariant = useMemo(() => {
    if (!product?.variants?.length) return null;
    if (useStructuredPickers) {
      if (!isSelectionComplete(optionGroups, optionSelections)) return null;
      return findMatchingVariant(product.variants, optionSelections);
    }
    if (!selectedVariantId) return null;
    return product.variants.find((v) => v.id === selectedVariantId) || null;
  }, [product, selectedVariantId, useStructuredPickers, optionGroups, optionSelections]);

  useEffect(() => {
    if (useStructuredPickers) {
      setSelectedVariantId(selectedVariant?.id || null);
    }
  }, [useStructuredPickers, selectedVariant?.id]);

  const selectionIncomplete = Boolean(
    product?.hasVariants &&
      useStructuredPickers &&
      !isSelectionComplete(optionGroups, optionSelections),
  );

  const specRows = useMemo(
    () => buildProductSpecRows(product, { selectedVariant, optionGroups }),
    [product, selectedVariant, optionGroups],
  );

  const hasSpecContent = specRows.length > 0;

  const displayPrice = selectedVariant ? Number(selectedVariant.price) : Number(product?.price || 0);
  const displayDiscount = selectedVariant
    ? (selectedVariant.discountPrice ? Number(selectedVariant.discountPrice) : null)
    : (product?.discountPrice ? Number(product.discountPrice) : null);
  const displayStock = selectedVariant
    ? selectedVariant.stockQuantity
    : (product?.hasVariants ? 0 : (product?.stockQuantity || 0));
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

  const handleOptionSelect = (groupId, value) => {
    setOptionSelections((prev) => {
      const next = { ...prev, [groupId]: value };
      // Clear later groups that become invalid after this change
      const groupIndex = optionGroups.findIndex((g) => g.id === groupId);
      optionGroups.forEach((g, idx) => {
        if (idx <= groupIndex) return;
        if (next[g.id] == null) return;
        if (!isValueAvailable(product.variants, next, g.id, next[g.id], { requireInStock: false })) {
          delete next[g.id];
        }
      });
      return next;
    });
  };

  const buildCartProduct = () => {
    if (!product) return null;
    if (product.hasVariants && selectedVariant) {
      const options = getVariantOptionsLabelMap(selectedVariant);
      const variantImage = selectedVariant.imageUrl || null;
      return {
        ...product,
        id: `${product.id}::${selectedVariant.id}`,
        baseProductId: product.id,
        variantId: selectedVariant.id,
        options,
        price: selectedVariant.price,
        discountPrice: selectedVariant.discountPrice,
        stockQuantity: selectedVariant.stockQuantity,
        title: product.title,
        imageUrl: variantImage || product.imageUrl,
        mainImageUrl: variantImage || product.mainImageUrl,
      };
    }
    return {
      ...product,
      baseProductId: product.id,
      variantId: null,
      options: null,
    };
  };

  const showFeedback = (message) => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setFeedbackMessage(message);
    feedbackTimerRef.current = setTimeout(() => {
      setFeedbackMessage("");
      feedbackTimerRef.current = null;
    }, 2800);
  };

  const handleAddToCart = () => {
    if (selectionIncomplete) {
      showFeedback("يرجى اختيار جميع الخيارات");
      return;
    }
    const cartProduct = buildCartProduct();
    if (!cartProduct || displayStock <= 0) return;
    addToCart(cartProduct, quantity);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2500);
  };

  useEffect(() => () => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
  }, []);

  const handleShare = async () => {
    const shareData = {
      title: product?.title || "المتسوق الذكي",
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
    const options = selectedVariant ? getVariantOptionsLabelMap(selectedVariant) : null;
    const variantLabel = selectedVariant ? formatVariantLabel(selectedVariant) : "";
    return buildProductWhatsAppMessage({
      title: product.title,
      quantity,
      price: finalPrice,
      originalPrice: hasDiscount ? displayPrice : null,
      currencySymbol: api.CurrencySymbol[product.currency] || "",
      variantLabel,
      options,
      productUrl: typeof window !== "undefined" ? window.location.href : "",
    });
  }, [product, quantity, finalPrice, hasDiscount, displayPrice, selectedVariant]);

  const productWhatsAppUrl = useMemo(() => {
    const base = resolveWhatsAppBaseUrl(contactPhone, contactWhatsapp);
    if (!base || !whatsappMessage) return "";
    return buildWhatsAppUrl(base, whatsappMessage);
  }, [contactWhatsapp, contactPhone, whatsappMessage]);

  const scrollToReviews = () => {
    reviewsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const galleryImages = useMemo(() => {
    if (!product) return [];
    const productImages = product.images?.length > 0
      ? product.images.map((img) => img.url)
      : (product.imageUrl ? [product.imageUrl] : ["https://images.unsplash.com/photo-1560472355-536de3962603?w=1000&q=80"]);
    const variantImage = selectedVariant?.imageUrl;
    return variantImage
      ? [variantImage, ...productImages.filter((url) => url !== variantImage)]
      : productImages;
  }, [product, selectedVariant?.imageUrl]);

  const imageAltByUrl = useMemo(() => {
    const map = {};
    for (const img of product?.images || []) {
      if (img.url && img.altText) map[img.url] = img.altText;
    }
    return map;
  }, [product]);

  const imageCount = galleryImages.length;

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

  // Preload current + neighbors so swipe/next doesn't keep showing the previous image.
  useEffect(() => {
    if (!galleryImages.length) return undefined;
    const idxs = new Set([
      selectedImageIndex,
      (selectedImageIndex + 1) % galleryImages.length,
      (selectedImageIndex - 1 + galleryImages.length) % galleryImages.length,
    ]);
    const loaders = [...idxs].map((idx) => {
      const url = galleryImages[idx];
      if (!url) return null;
      const img = new Image();
      img.src = getOptimizedImageUrl(url, IMAGE_WIDTHS.DETAIL);
      return img;
    });
    return () => {
      loaders.forEach((img) => {
        if (img) img.src = '';
      });
    };
  }, [galleryImages, selectedImageIndex]);

  const loading = Boolean(isLoading || (!product && !error && !isNotFound));
  const notFound = Boolean((isNotFound || (error && !product)) && !loading);
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

  const safeIndex = Math.min(selectedImageIndex, Math.max(galleryImages.length - 1, 0));
  const activeImageRawUrl = galleryImages[safeIndex];

  const handleGalleryImageError = (url) => {
    setBrokenGalleryUrls((prev) => {
      if (prev.has(url)) return prev;
      const next = new Set(prev);
      next.add(url);
      return next;
    });
  };

  const getGallerySources = (url) => (
    brokenGalleryUrls.has(url)
      ? { src: getRawCloudinaryUrl(url), srcSet: undefined, sizes: undefined }
      : getResponsiveCloudinarySources(url, {
          widths: RESPONSIVE_WIDTHS.DETAIL,
          sizes: RESPONSIVE_SIZES.DETAIL,
          fallbackWidth: IMAGE_WIDTHS.DETAIL,
        })
  );

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
    productWhatsAppUrl ? { icon: WhatsAppGlyph, text: "دعم سريع عبر واتساب" } : null,
    displayStock > 0 ? { icon: ShieldCheck, text: "متوفر للطلب" } : null,
  ].filter(Boolean);

  const purchaseBlock = (
    <div className="flex flex-col px-3 sm:px-0 pt-3 sm:pt-0">
      <div className="mb-3">
        <h1 className="text-base sm:text-lg font-extrabold text-stone-900 dark:text-white leading-snug">
          {product.title}
        </h1>

        <div className="mt-2.5">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#e6533d] dark:text-[#ff7a62] tracking-tight tabular-nums">
              {formatPrice(finalPrice, product.currency)}
            </span>
            {hasDiscount && (
              <span className="text-sm text-stone-400 line-through tabular-nums">
                {formatPrice(displayPrice, product.currency)}
              </span>
            )}
          </div>
          {hasDiscount && (
            <p className="text-xs font-semibold text-[#e6533d] mt-1">
              وفر {formatPrice(savingsAmount, product.currency)} ({discountPercent}%)
            </p>
          )}
          <ExpandableDescription text={product.description} />
        </div>
      </div>

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
        {selectionIncomplete ? (
          <span className="px-1.5 py-0.5 text-[10px] font-semibold text-stone-500 bg-stone-100 rounded-sm">
            اختر الخيارات
          </span>
        ) : displayStock > 0 ? (
          <span className="px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 rounded-sm border border-emerald-200/70">
            {product.showStock !== false
              ? `متبقي ${Number(displayStock).toLocaleString("en-US")}`
              : "متوفر"}
          </span>
        ) : (
          <span className="px-1.5 py-0.5 text-[10px] font-semibold text-stone-500 bg-stone-100 rounded-sm">
            نفد المخزون
          </span>
        )}
      </div>

      {product.hasVariants && product.variants?.length > 0 && (
        <div className="mb-4 space-y-4">
          {useStructuredPickers && optionGroups.length > 0 ? (
            optionGroups.map((group) => (
              <div key={group.id}>
                <p className="text-xs font-extrabold text-stone-900 dark:text-white mb-2">
                  {group.name}
                  {optionSelections[group.id] ? (
                    <span className="font-semibold text-stone-500 mr-1">: {optionSelections[group.id]}</span>
                  ) : null}
                </p>
                <div className="flex flex-wrap gap-2" role="listbox" aria-label={group.name}>
                  {group.values.map((value) => {
                    const isSelected = optionSelections[group.id] === value;
                    const available = isValueAvailable(
                      product.variants,
                      optionSelections,
                      group.id,
                      value,
                      { requireInStock: true },
                    );
                    const exists = isValueAvailable(
                      product.variants,
                      optionSelections,
                      group.id,
                      value,
                      { requireInStock: false },
                    );
                    const isDisabled = !available;
                    const isOos = exists && !available;
                    return (
                      <button
                        key={`${group.id}-${value}`}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        disabled={isDisabled}
                        onClick={() => handleOptionSelect(group.id, value)}
                        className={`min-h-[40px] min-w-[40px] px-3 py-1.5 rounded-sm text-xs font-semibold border transition-all ${
                          isSelected
                            ? "border-stone-900 dark:border-white bg-stone-900 dark:bg-white text-white dark:text-stone-900"
                            : "border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 hover:border-stone-500"
                        } ${isDisabled ? "opacity-40 cursor-not-allowed line-through" : ""} ${
                          isOos ? "decoration-stone-400" : ""
                        }`}
                      >
                        {value}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div>
              <p className="text-xs font-extrabold text-stone-900 dark:text-white mb-2">الخيارات</p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((variant) => {
                  const label = formatVariantLabel(variant);
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
          {selectionIncomplete ? (
            <p className="text-[11px] text-stone-500">اختر جميع الخيارات للمتابعة</p>
          ) : null}
        </div>
      )}

      {product ? (
        <button
          type="button"
          onClick={() => setDescSheetOpen(true)}
          className="mb-4 w-full flex items-center justify-between gap-3 border-y border-stone-100 dark:border-stone-800 py-3.5 text-right min-h-[48px]"
        >
          <span className="inline-flex items-center gap-2 text-sm font-extrabold text-stone-900 dark:text-white leading-[1.45]">
            <FileText className="w-4 h-4 text-stone-500" aria-hidden="true" />
            المواصفات
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-stone-500">
            عرض التفاصيل
            <ChevronDown className="w-4 h-4 -rotate-90" aria-hidden="true" />
          </span>
        </button>
      ) : null}

      <div className="hidden lg:flex flex-col gap-2 mb-4">
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={(!selectionIncomplete && displayStock <= 0) || addedToCart}
          className={`w-full min-h-12 px-4 py-2.5 rounded-sm font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            addedToCart
              ? "bg-emerald-600 text-white"
              : selectionIncomplete
                ? "bg-stone-900 hover:bg-stone-800 text-white"
                : displayStock <= 0
                  ? "bg-stone-200 text-stone-400 cursor-not-allowed"
                  : "bg-stone-900 hover:bg-stone-800 text-white"
          }`}
        >
          {selectionIncomplete ? (
            "اختر الخيارات"
          ) : displayStock <= 0 ? (
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
            <WhatsAppGlyph className="w-4 h-4" />
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

      <BannerRenderer placement="sidebar" className="w-full mb-4" />
    </div>
  );

  const galleryBlock = (
    <div className="w-full">
      <div
        className={`relative aspect-[4/5] sm:aspect-square bg-white dark:bg-stone-900 overflow-hidden touch-pan-y ${
          galleryImages.length > 1 ? "cursor-grab active:cursor-grabbing select-none" : ""
        }`}
        {...(galleryImages.length > 1 ? gallerySwipe : {})}
      >
        {!heroImageLoaded && (
          <div
            className="absolute inset-0 z-[2] skeleton-shimmer pointer-events-none"
            aria-hidden="true"
          />
        )}
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="absolute inset-0 w-full h-full cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold-500/60"
          aria-label="عرض الصورة بملء الشاشة"
        >
          {galleryImages.map((url, idx) => {
            const sources = getGallerySources(url);
            const isActive = idx === safeIndex;
            const isNear = Math.abs(idx - safeIndex) <= 1
              || (safeIndex === 0 && idx === galleryImages.length - 1)
              || (safeIndex === galleryImages.length - 1 && idx === 0);
            if (!isActive && !isNear && idx > 2) return null;
            return (
              <img
                key={`${url}-${idx}`}
                src={sources.src}
                srcSet={sources.srcSet}
                sizes={sources.sizes}
                alt={isActive ? (imageAltByUrl[url] || product.title) : ''}
                aria-hidden={!isActive}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ease-out ${
                  isActive && heroImageLoaded ? 'opacity-100 z-[1]' : 'opacity-0 z-0 pointer-events-none'
                }`}
                fetchPriority={isActive || idx === 0 ? 'high' : 'low'}
                loading={isActive || isNear || idx < 2 ? 'eager' : 'lazy'}
                decoding="async"
                draggable={false}
                onLoad={() => {
                  if (isActive) setHeroImageLoaded(true);
                }}
                onError={() => {
                  handleGalleryImageError(url);
                  if (isActive) setHeroImageLoaded(true);
                }}
              />
            );
          })}
        </button>
        <span className="pointer-events-none absolute bottom-3 left-3 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-black/40 text-white" aria-hidden="true">
          <ZoomIn className="w-4 h-4" />
        </span>

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
        description={product.description?.substring(0, 160) || `تسوق ${product.title} على المتسوق الذكي.`}
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

        <div className="px-3 sm:px-6 lg:px-8 max-w-6xl mx-auto">
          <BannerRenderer placement="product" className="w-full mt-4" />
        </div>

        <div className="mt-4 px-3 sm:px-6 lg:px-8 max-w-6xl mx-auto">
          {shippingOfferText ? (
            <div className="border-t border-stone-100 dark:border-stone-800">
              <AccordionSection title="الشحن والتوصيل">{shippingOfferText}</AccordionSection>
            </div>
          ) : null}

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

        {(product.categoryName || product.categoryNames?.length) && (
          <div className="px-3 sm:px-6 lg:px-8 max-w-6xl mx-auto mt-6 pb-4">
            <RelatedProducts
              categoryName={product.categoryName}
              categoryNames={product.categoryNames}
              currentId={product.id}
            />
          </div>
        )}
      </div>

      <div
        className="lg:hidden fixed inset-x-0 z-40 bg-white dark:bg-stone-950 border-t border-stone-200 dark:border-stone-800 px-3 py-2.5"
        style={{ bottom: 'var(--mobile-bottom-nav-offset)' }}
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
            disabled={(!selectionIncomplete && displayStock <= 0) || addedToCart}
            className={`flex-1 min-h-11 px-3 rounded-sm font-bold text-sm flex items-center justify-center gap-1.5 transition-colors ${
              addedToCart
                ? "bg-emerald-600 text-white"
                : selectionIncomplete
                  ? "bg-stone-900 text-white dark:bg-white dark:text-stone-900"
                  : displayStock <= 0
                    ? "bg-stone-200 text-stone-400 dark:bg-stone-800 dark:text-stone-500 cursor-not-allowed"
                    : "bg-stone-900 text-white dark:bg-white dark:text-stone-900"
            }`}
          >
            {selectionIncomplete ? (
              "اختر الخيارات"
            ) : displayStock <= 0 ? (
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
              <WhatsAppGlyph className="w-5 h-5" />
            </a>
          ) : null}
        </div>
      </div>

      {feedbackMessage ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-[var(--mobile-product-toast-offset)] left-1/2 z-50 max-w-[min(90vw,20rem)] -translate-x-1/2 rounded-sm bg-stone-900/95 px-4 py-2.5 text-center text-sm font-medium text-white shadow-lg transition-opacity motion-reduce:transition-none lg:bottom-8"
        >
          {feedbackMessage}
        </div>
      ) : null}

      <ProductDescriptionSheet
        open={descSheetOpen}
        onClose={() => setDescSheetOpen(false)}
        rows={specRows}
      />

      <ImageLightbox
        open={lightboxOpen}
        images={galleryImages}
        index={safeIndex}
        onIndexChange={setSelectedImageIndex}
        onClose={() => setLightboxOpen(false)}
        altByUrl={imageAltByUrl}
        fallbackAlt={product.title}
      />
    </Layout>
  );
};

export default ProductDetailsPage;
