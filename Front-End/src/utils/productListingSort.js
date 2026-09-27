/**
 * Shared client-side product sort for listing pages.
 */

/** Fisher–Yates shuffle (new array). */
export function shuffleProducts(products) {
  const result = [...(products || [])];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function sortProducts(products, sortOrder = 'default') {
  const result = [...(products || [])];

  if (sortOrder === 'price-asc') {
    result.sort((a, b) => (a.discountPrice || a.price) - (b.discountPrice || b.price));
  } else if (sortOrder === 'price-desc') {
    result.sort((a, b) => (b.discountPrice || b.price) - (a.discountPrice || a.price));
  } else if (sortOrder === 'rating') {
    result.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  } else if (sortOrder === 'newest') {
    result.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : (a.id || 0);
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : (b.id || 0);
      return dateB - dateA;
    });
  } else if (sortOrder === 'trending') {
    result.sort((a, b) => {
      if (a.isTrending && !b.isTrending) return -1;
      if (!a.isTrending && b.isTrending) return 1;
      return 0;
    });
  } else {
    // default: keep API order here — use useListingProducts for refresh shuffle
    result.sort((a, b) => {
      if (a.isPromoted && !b.isPromoted) return -1;
      if (!a.isPromoted && b.isPromoted) return 1;
      if (a.isTrending && !b.isTrending) return -1;
      if (!a.isTrending && b.isTrending) return 1;
      return 0;
    });
  }

  return result;
}
