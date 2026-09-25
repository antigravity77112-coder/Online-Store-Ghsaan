import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { getOptimizedImageUrl, getRawCloudinaryUrl, IMAGE_WIDTHS } from '../../utils/cloudinaryUrl';
import { useFormatDisplayPrice } from '../../context/CurrencyContext';

export interface Product {
  id: string | number;
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

export const ProductCard: React.FC<ProductCardProps> = React.memo(({
  product,
  isLoading = false,
  compact = false,
  priority = false,
  onFavorite,
}) => {
  const formatPrice = useFormatDisplayPrice();
  const [isFavoriteLocal, setIsFavoriteLocal] = useState(product?.isFavorite ?? false);
  const [useRawImage, setUseRawImage] = useState(false);

  React.useEffect(() => {
    if (product?.isFavorite !== undefined) {
      setIsFavoriteLocal(product.isFavorite);
    }
  }, [product?.isFavorite]);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newState = !isFavoriteLocal;
    setIsFavoriteLocal(newState);
    if (product) {
      onFavorite?.(product, newState);
    }
  };

  if (isLoading || !product) {
    return <MarketplaceSkeleton compact={compact} />;
  }

  const {
    title,
    image,
    price,
    currency,
    currencySymbol,
    originalPrice,
    badge,
    isPromoted,
    isTrending,
    discountPrice,
    promotionLabel,
    remainingStock,
    stockQuantity,
    showStock = true,
  } = product;

  const leftInStock = remainingStock != null
    ? Number(remainingStock)
    : (stockQuantity != null ? Number(stockQuantity) : null);

  const productPath = `/product/${product.slug || product.id}`;
  const numPrice = Number(price) || 0;
  const numDiscountPrice = (discountPrice !== undefined && discountPrice !== null && String(discountPrice) !== '')
    ? Number(discountPrice)
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
  const rawImage = getRawCloudinaryUrl(image);
  const imageSrc = useRawImage ? rawImage : getOptimizedImageUrl(rawImage, IMAGE_WIDTHS.GRID_CARD);
  const imageSrcSet = useRawImage ? undefined : [360, IMAGE_WIDTHS.GRID_CARD, IMAGE_WIDTHS.GRID_CARD_RETINA]
    .map((w) => `${getOptimizedImageUrl(rawImage, w)} ${w}w`)
    .join(', ');
  const imageSizes = '(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 16vw';

  return (
    <article className="group flex flex-col h-full bg-white dark:bg-stone-900 rounded-md border border-stone-200/90 dark:border-stone-700/80 overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className={`relative w-full overflow-hidden bg-white dark:bg-stone-900 border-b border-stone-100 dark:border-stone-800 ${imageAspect}`}>
        <Link
          to={productPath}
          className="absolute inset-0 z-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold-500/40"
          aria-label={`عرض ${title}`}
        >
          <img
            src={imageSrc}
            srcSet={imageSrcSet}
            sizes={useRawImage ? undefined : imageSizes}
            alt=""
            width={IMAGE_WIDTHS.GRID_CARD}
            height={Math.round(IMAGE_WIDTHS.GRID_CARD * (compact ? 5 / 4 : 1))}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transform-none"
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            decoding="async"
            onError={() => { if (!useRawImage) setUseRawImage(true); }}
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
        <Link
          to={productPath}
          className="text-[11px] sm:text-xs font-normal text-stone-700 dark:text-stone-300 line-clamp-2 leading-[1.3] hover:text-[#e6533d] dark:hover:text-[#ff7a62] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40 rounded-sm"
        >
          {title}
        </Link>

        <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5 gap-y-0 min-w-0">
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
