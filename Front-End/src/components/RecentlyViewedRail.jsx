import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getRecentlyViewed } from '../utils/recentlyViewed';
import { mapStorefrontProduct } from '../utils/mapStorefrontProduct';
import { ProductCard } from './HighConversionGrid/ProductCard';
import { VERTICAL_PRODUCT_GRID_CLASS } from './HighConversionGrid/productGridClasses';
import { useCart } from '../context/CartContext';
import { useFavorites } from '../context/FavoritesContext';
import { buildListingCartPayload, canQuickAddFromCard } from '../utils/listingCart';

/**
 * “شاهدت مؤخراً” — localStorage-backed Shein-style rail.
 */
export default function RecentlyViewedRail({
  title = 'شاهدت مؤخراً',
  excludeId = null,
  limit = 8,
  className = '',
}) {
  const [entries, setEntries] = useState([]);
  const { addToCart } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();

  useEffect(() => {
    setEntries(getRecentlyViewed({ excludeId, limit }));
  }, [excludeId, limit]);

  const products = useMemo(
    () =>
      entries.map((e) =>
        mapStorefrontProduct({
          id: e.id,
          productId: e.id,
          slug: e.slug,
          title: e.title,
          imageUrl: e.imageUrl,
          price: e.price,
          discountPrice: e.discountPrice,
          currency: e.currency,
          hasVariants: false,
        }),
      ),
    [entries],
  );

  if (products.length === 0) return null;

  return (
    <section className={`pt-2 ${className}`} aria-label={title}>
      <div className="mb-2 px-0.5 flex items-center justify-between">
        <h2 className="text-sm sm:text-base font-extrabold text-stone-900 dark:text-white leading-[1.45]">
          {title}
        </h2>
        <Link
          to="/products"
          className="text-[11px] font-bold text-stone-500 hover:text-[#e6533d]"
        >
          تسوق المزيد
        </Link>
      </div>
      <div className={VERTICAL_PRODUCT_GRID_CLASS}>
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={{ ...product, isFavorite: isFavorite(product.productId || product.id) }}
            compact
            onFavorite={(p) => {
              toggleFavorite({
                id: p.productId || p.id,
                title: p.title,
                imageUrl: p.image,
                price: p.price,
                currency: p.currency,
              });
            }}
            onQuickAdd={(face) => {
              if (!canQuickAddFromCard(face)) return;
              const payload = buildListingCartPayload(face);
              if (payload) addToCart(payload, 1);
            }}
          />
        ))}
      </div>
    </section>
  );
}
