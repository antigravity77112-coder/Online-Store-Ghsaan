/**
 * analytics.js — GA4 Enhanced E-Commerce Event Tracking
 *
 * EN: Utility functions for sending GA4 e-commerce events.
 *     Uses the global gtag() function injected by Google Analytics.
 *     All events follow the GA4 enhanced e-commerce data model.
 *
 * AR: دوال مساعدة لإرسال أحداث التجارة الإلكترونية المحسّنة لـ GA4.
 *     تستخدم دالة gtag() العامة المحقونة بواسطة Google Analytics.
 */

const CURRENCY_ISO_MAP = {
  YER_Sanaa: 'YER',
  YER_Aden: 'YER',
  USD: 'USD',
  SAR: 'SAR',
  EUR: 'EUR',
  1: 'YER', 2: 'YER', 3: 'USD', 4: 'SAR', 5: 'EUR',
};

function getGtag() {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    return window.gtag;
  }
  return null;
}

function mapCurrency(currency) {
  return CURRENCY_ISO_MAP[currency] || 'YER';
}

function mapProductToItem(product, index = 0) {
  return {
    item_id: product.id || product.slug,
    item_name: product.title,
    item_category: product.categoryName || '',
    price: Number(product.discountPrice || product.price || 0),
    currency: mapCurrency(product.currency),
    index,
    item_brand: 'GISAAH',
    quantity: product.quantity || 1,
  };
}

/**
 * Track when a user views a product detail page
 */
export function trackViewItem(product) {
  const gtag = getGtag();
  if (!gtag || !product) return;

  gtag('event', 'view_item', {
    currency: mapCurrency(product.currency),
    value: Number(product.discountPrice || product.price || 0),
    items: [mapProductToItem(product)],
  });
}

/**
 * Track when a user adds a product to cart
 */
export function trackAddToCart(product, quantity = 1) {
  const gtag = getGtag();
  if (!gtag || !product) return;

  gtag('event', 'add_to_cart', {
    currency: mapCurrency(product.currency),
    value: Number(product.discountPrice || product.price || 0) * quantity,
    items: [{ ...mapProductToItem(product), quantity }],
  });
}

/**
 * Track when a user removes a product from cart
 */
export function trackRemoveFromCart(product, quantity = 1) {
  const gtag = getGtag();
  if (!gtag || !product) return;

  gtag('event', 'remove_from_cart', {
    currency: mapCurrency(product.currency),
    value: Number(product.discountPrice || product.price || 0) * quantity,
    items: [{ ...mapProductToItem(product), quantity }],
  });
}

/**
 * Track when a user views a product listing (category/search results)
 */
export function trackViewItemList(products, listName = 'All Products') {
  const gtag = getGtag();
  if (!gtag || !products?.length) return;

  gtag('event', 'view_item_list', {
    item_list_name: listName,
    items: products.slice(0, 20).map((p, i) => mapProductToItem(p, i)),
  });
}

/**
 * Track a search query
 */
export function trackSearch(searchTerm) {
  const gtag = getGtag();
  if (!gtag || !searchTerm) return;

  gtag('event', 'search', {
    search_term: searchTerm,
  });
}

/**
 * Track checkout initiation
 */
export function trackBeginCheckout(items, totalValue, currency = 'YER') {
  const gtag = getGtag();
  if (!gtag) return;

  gtag('event', 'begin_checkout', {
    currency,
    value: totalValue,
    items: items.map((item, i) => mapProductToItem(item, i)),
  });
}

/**
 * Track a completed purchase
 */
export function trackPurchase(order) {
  const gtag = getGtag();
  if (!gtag || !order) return;

  gtag('event', 'purchase', {
    transaction_id: order.id,
    value: Number(order.totalAmount || 0),
    currency: mapCurrency(order.currency),
    items: (order.items || []).map((item, i) => mapProductToItem(item, i)),
  });
}
