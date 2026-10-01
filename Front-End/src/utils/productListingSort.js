/**
 * Shared client-side product sort for listing pages.
 */

/** Deterministic PRNG from a float seed in [0, 1). */
export function createSeededRandom(seed) {
  let s = Math.floor((Number(seed) || Math.random()) * 1e9) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Fisher–Yates shuffle (new array). Optional random() for seeded shuffles. */
export function shuffleProducts(products, random = Math.random) {
  const result = [...(products || [])];
  const rand = typeof random === 'function' ? random : Math.random;
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
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
