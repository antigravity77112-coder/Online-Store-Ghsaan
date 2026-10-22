import React, { useLayoutEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useNavigationType } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Plus } from 'lucide-react';
import { canQuickAddFromCard } from '../../utils/listingCart';
import {
  getRawCloudinaryUrl,
  getResponsiveCloudinarySources,
  IMAGE_WIDTHS,
  RESPONSIVE_SIZES,
  RESPONSIVE_WIDTHS,
} from '../../utils/cloudinaryUrl';
import { preloadProductDetailImage } from '../../utils/preloadProductImage';
import {
  clearLastHeroProductId,
  getLastHeroProductId,
  setLastHeroProductId,
} from '../../utils/listingSessionMemory';
import { useFormatDisplayPrice } from '../../context/CurrencyContext';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { FALLBACK_IMAGE } from '../../utils/mapStorefrontProduct';

export interface ColorSwatch {
  color: string;
  variantId?: string | null;
  imageUrl?: string | null;
  inStock?: boolean;
  stockQuantity?: number;
  price?: number | null;
  discountPrice?: number | null;
}

export interface Product {
  id: string | number;
  productId?: string | number;
  listingVariantId?: string | null;
  colorValue?: string | null;
  colorSwatches?: ColorSwatch[];
  href?: string;
  slug?: string | number;
  title: string;
  image: string;
  price: number;
  currency?: string;
  currencySymbol?: string;
  originalPrice?: number;
  rating?: number;
  reviewCount?: number;
  badge?: 'Sale' | 'Local' | null;
  description?: string | null;
  isFavorite?: boolean;
  isPromoted?: boolean;
  isTrending?: boolean;
  discountPrice?: number;
  promotionLabel?: string;
  stockQuantity?: number;
  remainingStock?: number;
  hasVariants?: boolean;
  /** false → hide the "متبقي N" count (out-of-stock is always shown). */
  showStock?: boolean;
}

interface ProductCardProps {
  product?: Product;
  isLoading?: boolean;
  compact?: boolean;
  /** Above-the-fold cards load eagerly with high fetch priority. */
  priority?: boolean;
  onQuickAdd?: (product: Product) => void;
  /** @deprecated Navigation uses internal Link when slug/id is present */
  onClick?: (product: Product) => void;
  onFavorite?: (product: Product, isFavorite: boolean) => void;
}

function MarketplaceSkeleton({ compact }: { compact: boolean }) {
  return (
    <article className="flex flex-col h-full bg-white dark:bg-stone-900 rounded-md border border-stone-200 dark:border-stone-700 overflow-hidden">
      <div className={`bg-stone-100 dark:bg-stone-800 w-full border-b border-stone-100 dark:border-stone-800 ${compact ? 'aspect-[4/5]' : 'aspect-square'}`} />
      <div className="px-2 py-2 space-y-1.5">
        <div className="h-2.5 bg-stone-200 dark:bg-stone-800 rounded w-full animate-pulse" />
        <div className="h-3 bg-stone-200 dark:bg-stone-800 rounded w-2/5 animate-pulse" />
      </div>
    </article>
  );
}

function productHref(product: Product, variantId?: string | null) {
  if (variantId) {
    const slug = product.slug || product.productId || product.id;
    return `/product/${encodeURIComponent(String(slug))}?variant=${encodeURIComponent(String(variantId))}`;
  }
  if (product.href) return product.href;
  return `/product/${product.slug || product.productId || product.id}`;
}

export const ProductCard: React.FC<ProductCardProps> = React.memo(({
  product,
  isLoading = false,
  compact = false,
  priority = false,
  onFavorite,
  onQuickAdd,
}) => {
  const formatPrice = useFormatDisplayPrice();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const navigationType = useNavigationType();
  const [isFavoriteLocal, setIsFavoriteLocal] = useState(product?.isFavorite ?? false);
  /** 0 = optimized/srcSet, 1 = stored URL, 2 = stripped raw URL */
  const [imgFallbackStep, setImgFallbackStep] = useState(0);
  /** Only the card the user opens shares layoutId — duplicates hide other covers. */
  const [shareLayout, setShareLayout] = useState(false);

  const swatches = useMemo(
    () => (Array.isArray(product?.colorSwatches) ? product.colorSwatches : []),
    [product?.colorSwatches],
  );

  const [activeColor, setActiveColor] = useState<string | null>(product?.colorValue || null);
  const [activeImage, setActiveImage] = useState(product?.image || FALLBACK_IMAGE);
  const [activeVariantId, setActiveVariantId] = useState<string | null>(
    product?.listingVariantId || null,
  );
  const [activePrice, setActivePrice] = useState(product?.price);
  const [activeDiscount, setActiveDiscount] = useState(product?.discountPrice);

  React.useEffect(() => {
    if (product?.isFavorite !== undefined) {
      setIsFavoriteLocal(product.isFavorite);
    }
  }, [product?.isFavorite]);

  React.useEffect(() => {
    setImgFallbackStep(0);
    setActiveColor(product?.colorValue || null);
    setActiveImage(product?.image || FALLBACK_IMAGE);
    setActiveVariantId(product?.listingVariantId || null);
    setActivePrice(product?.price);
    setActiveDiscount(product?.discountPrice);
  }, [
    product?.id,
    product?.image,
    product?.colorValue,
    product?.listingVariantId,
    product?.price,
    product?.discountPrice,
  ]);

  // On Back, reconnect layoutId before paint so Framer has a matching target (avoids blink).
  useLayoutEffect(() => {
    if (reduceMotion || !product?.id) return undefined;
    if (navigationType !== 'POP') return undefined;
    const lastId = getLastHeroProductId();
    if (lastId == null || String(product.id) !== lastId) return undefined;
    setShareLayout(true);
    const clearTimer = window.setTimeout(() => {
      clearLastHeroProductId(product.id);
    }, 420);
    return () => window.clearTimeout(clearTimer);
  }, [product?.id, navigationType, reduceMotion]);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newState = !isFavoriteLocal;
    setIsFavoriteLocal(newState);
    if (product) {
      onFavorite?.(product, newState);
    }
  };

  const handleQuickAddClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!product) return;
    const face = {
      ...product,
      listingVariantId: activeVariantId,
      colorValue: activeColor,
      image: activeImage,
      price: activePrice ?? product.price,
      discountPrice: activeDiscount,
    };
    if (!canQuickAddFromCard(face) || !onQuickAdd) {
      navigate(productHref(product, activeVariantId));
      return;
    }
    onQuickAdd(face);
  };

  const handleSwatchClick = (e: React.MouseEvent, swatch: ColorSwatch) => {
    e.preventDefault();
    e.stopPropagation();
    if (!swatch?.color) return;
    setActiveColor(swatch.color);
    setActiveVariantId(swatch.variantId || null);
    if (swatch.imageUrl) {
      setActiveImage(swatch.imageUrl);
      setImgFallbackStep(0);
    }
    if (swatch.price != null) setActivePrice(Number(swatch.price));
    if (swatch.discountPrice != null) setActiveDiscount(Number(swatch.discountPrice));
    else if (swatch.price != null) setActiveDiscount(undefined);
  };

  if (isLoading || !product) {
    return <MarketplaceSkeleton compact={compact} />;
  }

  const {
    title,
    currency,
    currencySymbol,
    originalPrice,
    badge,
    isPromoted,
    isTrending,
    promotionLabel,
    remainingStock,
    stockQuantity,
    showStock = true,
  } = product;

  const leftInStock = remainingStock != null
    ? Number(remainingStock)
    : (stockQuantity != null ? Number(stockQuantity) : null);

  const linkTo = productHref(product, activeVariantId);
  const numPrice = Number(activePrice ?? product.price) || 0;
  const numDiscountPrice = (activeDiscount !== undefined && activeDiscount !== null && String(activeDiscount) !== '')
    ? Number(activeDiscount)
    : null;
  const numOriginalPrice = (originalPrice !== undefined && originalPrice !== null)
    ? Number(originalPrice)
    : null;

  const hasDiscount = numDiscountPrice !== null && !Number.isNaN(numDiscountPrice) && numDiscountPrice < numPrice;
  const displayPrice = hasDiscount ? numDiscountPrice : numPrice;
  const compareAt = hasDiscount ? numPrice : (badge === 'Sale' && numOriginalPrice !== null ? numOriginalPrice : null);
  const discountPercentage = hasDiscount
    ? Math.round(((numPrice - numDiscountPrice) / numPrice) * 100)
    : (compareAt ? Math.round(((compareAt - displayPrice) / compareAt) * 100) : 0);

  const priceLabel = formatPrice(displayPrice, currency) || `${displayPrice.toLocaleString('en-US')} ${currencySymbol || ''}`.trim();
  const compareLabel = compareAt != null
    ? (formatPrice(compareAt, currency) || `${compareAt.toLocaleString('en-US')} ${currencySymbol || ''}`.trim())
    : null;

  const imageAspect = compact ? 'aspect-[4/5]' : 'aspect-square';
  const rawImage = getRawCloudinaryUrl(activeImage) || activeImage;
  const optimized = getResponsiveCloudinarySources(activeImage, {
    widths: RESPONSIVE_WIDTHS.GRID,
    sizes: RESPONSIVE_SIZES.GRID,
    fallbackWidth: IMAGE_WIDTHS.GRID_CARD,
  });
  const imageSrc = imgFallbackStep === 0
    ? (optimized.src || activeImage)
    : imgFallbackStep === 1
      ? activeImage
      : rawImage;
  const imageSrcSet = imgFallbackStep === 0 ? optimized.srcSet : undefined;
  const imageSizes = imgFallbackStep === 0 ? optimized.sizes : undefined;

  const onProductIntent = () => {
    if (!reduceMotion) {
      setShareLayout(true);
      setLastHeroProductId(product.id);
    }
    if (activeImage) preloadProductDetailImage(activeImage);
  };

  const showSwatches = swatches.length > 1;

  return (
    <article className="group flex flex-col h-full bg-white dark:bg-stone-900 rounded-md border border-stone-200/90 dark:border-stone-700/80 overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className={`relative w-full overflow-hidden bg-white dark:bg-stone-900 border-b border-stone-100 dark:border-stone-800 ${imageAspect}`}>
        <Link
          to={linkTo}
          data-product-image={activeImage || undefined}
          onPointerDown={onProductIntent}
          className="absolute inset-0 z-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold-500/40"
          aria-label={`عرض ${title}${activeColor ? ` — ${activeColor}` : ''}`}
        >
          <motion.img
            layoutId={shareLayout && !reduceMotion ? `product-hero-${product.id}` : undefined}
            transition={{ type: 'spring', stiffness: 380, damping: 34, mass: 0.85 }}
            src={imageSrc}
            srcSet={imageSrcSet}
            sizes={imageSizes}
            alt=""
            data-product-image={activeImage || undefined}
            width={IMAGE_WIDTHS.GRID_CARD}
            height={Math.round(IMAGE_WIDTHS.GRID_CARD * (compact ? 5 / 4 : 1))}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transform-none"
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            decoding="async"
            onError={() => {
              setImgFallbackStep((step) => (step < 2 ? step + 1 : step));
            }}
          />
        </Link>

        {(hasDiscount && discountPercentage > 0) && (
          <span className="absolute top-0 left-0 z-10 min-w-[28px] px-1 py-0.5 text-[10px] font-extrabold leading-none text-white bg-[#e6533d] rounded-br-sm pointer-events-none">
            -{discountPercentage}%
          </span>
        )}

        {!hasDiscount && (isPromoted || promotionLabel) && (
          <span className="absolute top-0 left-0 z-10 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-white bg-[#e6533d] rounded-br-sm pointer-events-none">
            {promotionLabel || 'عرض'}
          </span>
        )}

        {!hasDiscount && !isPromoted && !promotionLabel && badge === 'Sale' && (
          <span className="absolute top-0 left-0 z-10 px-1.5 py-0.5 text-[9px] font-extrabold text-white bg-[#e6533d] rounded-br-sm pointer-events-none">
            تخفيض
          </span>
        )}

        {isTrending && (
          <span className="absolute bottom-0 left-0 z-10 px-1.5 py-0.5 text-[9px] font-extrabold text-white bg-stone-900 rounded-tr-sm pointer-events-none">
            ترند
          </span>
        )}

        <button
          type="button"
          onClick={handleFavoriteClick}
          aria-pressed={isFavoriteLocal}
          className="absolute top-1.5 right-1.5 z-20 flex items-center justify-center w-7 h-7 rounded-full bg-white/92 text-stone-500 hover:text-rose-500 shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40"
          aria-label={isFavoriteLocal ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
        >
          <Heart
            size={14}
            className={isFavoriteLocal ? 'fill-rose-500 text-rose-500' : ''}
            aria-hidden="true"
          />
        </button>
      </div>

      <div className="flex flex-col flex-grow min-h-0 px-2 py-1.5">
        {showSwatches ? (
          <div
            className="mb-1.5 flex flex-wrap items-center gap-1"
            role="listbox"
            aria-label="الألوان"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {swatches.slice(0, 6).map((swatch) => {
              const selected = activeColor === swatch.color;
              const thumb = swatch.imageUrl;
              return (
                <button
                  key={swatch.color}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  aria-label={swatch.color}
                  title={swatch.color}
                  disabled={swatch.inStock === false}
                  onClick={(e) => handleSwatchClick(e, swatch)}
                  className={`relative h-5 w-5 shrink-0 overflow-hidden rounded-full border transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/50 ${
                    selected
                      ? 'border-stone-900 dark:border-white scale-110 ring-1 ring-offset-1 ring-stone-400 dark:ring-stone-500'
                      : 'border-stone-300 dark:border-stone-600 hover:scale-105'
                  } ${swatch.inStock === false ? 'opacity-35 cursor-not-allowed' : ''}`}
                >
                  {thumb ? (
                    <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                  ) : (
                    <span className="block h-full w-full bg-stone-200 dark:bg-stone-700 text-[7px] font-bold leading-5 text-center text-stone-600 dark:text-stone-300">
                      {String(swatch.color).slice(0, 1)}
                    </span>
                  )}
                </button>
              );
            })}
            {swatches.length > 6 ? (
              <span className="text-[9px] font-semibold text-stone-400">+{swatches.length - 6}</span>
            ) : null}
          </div>
        ) : null}

        <Link
          to={linkTo}
          data-product-image={activeImage || undefined}
          onPointerDown={onProductIntent}
          className="text-[11px] sm:text-xs font-normal text-stone-700 dark:text-stone-300 line-clamp-2 leading-[1.3] hover:text-[#e6533d] dark:hover:text-[#ff7a62] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40 rounded-sm"
        >
          {title}
          {activeColor ? (
            <span className="block text-[10px] text-stone-400 dark:text-stone-500 mt-0.5 font-medium">
              {activeColor}
            </span>
          ) : null}
        </Link>

        <div className="mt-1 flex items-center justify-between gap-2 min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0 min-w-0">
            <span className={`text-sm sm:text-[15px] font-extrabold leading-none ${
              hasDiscount || isPromoted ? 'text-[#e6533d] dark:text-[#ff7a62]' : 'text-stone-900 dark:text-white'
            }`}
            >
              {priceLabel}
            </span>
            {compareLabel && (
              <span className="text-[10px] text-stone-400 dark:text-stone-500 line-through">
                {compareLabel}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleQuickAddClick}
            className="shrink-0 flex items-center justify-center w-7 h-7 rounded-md border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 hover:border-[#e6533d] hover:text-[#e6533d] dark:hover:border-[#ff7a62] dark:hover:text-[#ff7a62] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/50"
            aria-label="إضافة سريعة للسلة"
          >
            <Plus size={15} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>

        {leftInStock != null && !Number.isNaN(leftInStock) && (showStock || leftInStock <= 0) ? (
          <p className={`mt-1 text-[10px] sm:text-[11px] font-semibold leading-none ${
            leftInStock > 0
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-stone-400 dark:text-stone-500'
          }`}
          >
            {leftInStock > 0 ? `متبقي ${leftInStock.toLocaleString('en-US')}` : 'نفد المخزون'}
          </p>
        ) : null}
      </div>
    </article>
  );
});

ProductCard.displayName = 'ProductCard';
