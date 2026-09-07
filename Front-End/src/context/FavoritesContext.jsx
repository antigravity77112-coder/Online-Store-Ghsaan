import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const FavoritesContext = createContext(null);

export const useFavorites = () => {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
};

const STORAGE_KEY = 'favorite_products';

export const FavoritesProvider = ({ children }) => {
  const [favorites, setFavorites] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites]);

  const addFavorite = useCallback((product) => {
    setFavorites(prev => {
      if (prev.some(p => p.id === product.id)) return prev;
      return [...prev, {
        id: product.id,
        slug: product.slug || null,
        title: product.title,
        description: product.description || null,
        price: product.price,
        discountPrice: product.discountPrice ?? null,
        currency: product.currency,
        condition: product.condition,
        categoryName: product.categoryName,
        imageUrl: product.imageUrl || product.mainImageUrl,
        mainImageUrl: product.mainImageUrl,
        stockQuantity: product.stockQuantity,
      }];
    });
  }, []);

  const removeFavorite = useCallback((productId) => {
    setFavorites(prev => prev.filter(p => p.id !== productId));
  }, []);

  const isFavorite = useCallback((productId) => {
    return favorites.some(p => p.id === productId);
  }, [favorites]);

  const toggleFavorite = useCallback((product) => {
    if (isFavorite(product.id)) {
      removeFavorite(product.id);
    } else {
      addFavorite(product);
    }
  }, [isFavorite, removeFavorite, addFavorite]);

  const favoritesCount = favorites.length;

  const value = useMemo(
    () => ({
      favorites,
      addFavorite,
      removeFavorite,
      isFavorite,
      toggleFavorite,
      favoritesCount,
    }),
    [favorites, addFavorite, removeFavorite, isFavorite, toggleFavorite, favoritesCount],
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
};

export default FavoritesContext;
