import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

const CartContext = createContext(null);

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};

const CART_KEY = 'cart_items_v2';
const LEGACY_CART_KEY = 'cart_items';

function splitCompositeId(productId) {
  if (typeof productId !== 'string' || !productId.includes('::')) {
    return { baseProductId: productId || null, variantId: null };
  }
  const [baseProductId, variantId] = productId.split('::');
  return { baseProductId: baseProductId || null, variantId: variantId || null };
}

/** Migrate legacy cart rows that encoded variant in `productId` / title suffix. */
function normalizeCartItem(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const productId = raw.productId;
  const { baseProductId: splitBase, variantId: splitVariant } = splitCompositeId(productId);
  const baseProductId = raw.baseProductId || splitBase || productId;
  const variantId = raw.variantId || splitVariant || null;
  const compositeId =
    variantId && baseProductId && !String(productId).includes('::')
      ? `${baseProductId}::${variantId}`
      : productId;

  let title = raw.title || '';
  let options = raw.options && typeof raw.options === 'object' ? raw.options : null;

  // Strip legacy "Title (Black - M)" if options present or we can parse
  if (!options && typeof title === 'string') {
    const match = title.match(/^(.*)\s+\(([^)]+)\)\s*$/);
    if (match && variantId) {
      title = match[1];
      const parts = match[2].split(/\s*-\s*/).map((s) => s.trim()).filter(Boolean);
      if (parts.length) {
        options = parts.reduce((acc, part, i) => {
          acc[`خيار ${i + 1}`] = part;
          return acc;
        }, {});
      }
    }
  }

  return {
    ...raw,
    productId: compositeId,
    baseProductId,
    variantId,
    options,
    title,
    slug: raw.slug || null,
  };
}

function loadCart() {
  try {
    const rawV2 = localStorage.getItem(CART_KEY);
    if (rawV2) {
      const parsed = JSON.parse(rawV2);
      return Array.isArray(parsed) ? parsed.map(normalizeCartItem).filter(Boolean) : [];
    }
    const rawLegacy = localStorage.getItem(LEGACY_CART_KEY);
    if (rawLegacy) {
      const parsed = JSON.parse(rawLegacy);
      const migrated = Array.isArray(parsed) ? parsed.map(normalizeCartItem).filter(Boolean) : [];
      localStorage.setItem(CART_KEY, JSON.stringify(migrated));
      return migrated;
    }
    return [];
  } catch {
    return [];
  }
}

function resolveBrandName(product) {
  return product.brand?.name || product.brandName || null;
}

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(loadCart);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

  const addToCart = useCallback((product, quantity = 1) => {
    setItems((prev) => {
      const { baseProductId: splitBase, variantId: splitVariant } = splitCompositeId(product.id);
      const baseProductId = product.baseProductId || splitBase || product.id;
      const variantId = product.variantId ?? splitVariant ?? null;
      const productId =
        variantId && baseProductId
          ? `${baseProductId}::${variantId}`
          : product.id;

      const options =
        product.options && typeof product.options === 'object'
          ? product.options
          : null;

      const existing = prev.find((i) => i.productId === productId);
      if (existing) {
        const newQty = Math.min(existing.quantity + quantity, product.stockQuantity || 9999);
        return prev.map((i) =>
          i.productId === productId
            ? {
                ...i,
                quantity: newQty,
                stockQuantity: product.stockQuantity,
                brandName: resolveBrandName(product) || i.brandName,
                description: product.description || i.description || null,
                categoryName: product.categoryName || i.categoryName || null,
                baseProductId,
                variantId,
                options: options || i.options || null,
                title: product.title || i.title,
                slug: product.slug || i.slug || null,
                price: product.price != null ? Number(product.price) : i.price,
                discountPrice:
                  product.discountPrice != null && product.discountPrice !== ''
                    ? Number(product.discountPrice)
                    : i.discountPrice ?? null,
              }
            : i,
        );
      }
      const cappedQty = Math.min(quantity, product.stockQuantity || 9999);
      return [
        ...prev,
        {
          productId,
          baseProductId,
          variantId,
          options,
          slug: product.slug || null,
          brandName: resolveBrandName(product),
          title: product.title,
          description: product.description || null,
          categoryName: product.categoryName || null,
          price: product.price != null ? Number(product.price) : 0,
          discountPrice:
            product.discountPrice != null && product.discountPrice !== ''
              ? Number(product.discountPrice)
              : null,
          currency: product.currency,
          imageUrl: product.imageUrl || product.mainImageUrl,
          mainImageUrl: product.mainImageUrl,
          stockQuantity: product.stockQuantity || 9999,
          quantity: cappedQty,
        },
      ];
    });
  }, []);

  const removeFromCart = useCallback((productId) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const updateQuantity = useCallback((productId, quantity) => {
    if (quantity < 1) {
      setItems((prev) => prev.filter((i) => i.productId !== productId));
      return;
    }
    setItems((prev) =>
      prev.map((i) => {
        if (i.productId !== productId) return i;
        const maxQty = i.stockQuantity || 9999;
        return { ...i, quantity: Math.min(quantity, maxQty) };
      }),
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const cartCount = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items],
  );

  const cartTotal = useMemo(
    () => items.reduce((sum, i) => sum + (i.discountPrice ?? i.price) * i.quantity, 0),
    [items],
  );

  const value = useMemo(
    () => ({
      items,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      cartCount,
      cartTotal,
    }),
    [items, addToCart, removeFromCart, updateQuantity, clearCart, cartCount, cartTotal],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};
