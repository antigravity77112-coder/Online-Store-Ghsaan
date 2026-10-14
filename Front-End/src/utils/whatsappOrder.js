/**
 * Helpers for WhatsApp order handoff (cart + product detail).
 */

export function normalizeWhatsAppUrl(raw) {
  let baseWhatsappUrl = String(raw || '').trim();
  if (!baseWhatsappUrl) return '';

  if (!baseWhatsappUrl.startsWith('http')) {
    const linkDigits = baseWhatsappUrl.replace(/\D/g, '');
    if (linkDigits) {
      baseWhatsappUrl = `https://wa.me/${linkDigits.startsWith('967') ? linkDigits : `967${linkDigits}`}`;
    } else {
      return '';
    }
  }
  return baseWhatsappUrl;
}

/** Up to 4 labeled contacts from site config (+ legacy whatsapp / phone). */
export function resolveWhatsAppContacts(contact = {}) {
  const list = [];
  const seen = new Set();

  const push = (label, url) => {
    const normalized = normalizeWhatsAppUrl(url);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    list.push({
      label: (label && String(label).trim()) || `واتساب ${list.length + 1}`,
      url: normalized,
    });
  };

  if (Array.isArray(contact.whatsappContacts)) {
    for (const item of contact.whatsappContacts) {
      if (!item) continue;
      push(item.label, item.url);
      if (list.length >= 4) break;
    }
  }

  if (list.length === 0 && contact.whatsapp) {
    push('خدمة العملاء', contact.whatsapp);
  }

  if (list.length === 0 && contact.phone) {
    const phoneDigits = String(contact.phone).replace(/[^\d]/g, '');
    if (phoneDigits) {
      const e164 = phoneDigits.startsWith('967') ? phoneDigits : `967${phoneDigits}`;
      push('خدمة العملاء', `https://wa.me/${e164}`);
    }
  }

  return list.slice(0, 4);
}

export function resolveWhatsAppBaseUrl(contactPhone = '', contactWhatsapp = '', contact = null) {
  if (contact && typeof contact === 'object') {
    const primary = resolveWhatsAppContacts(contact)[0];
    if (primary?.url) return primary.url;
  }

  const phone = String(contactPhone || '').trim();
  const phoneDigits = phone.replace(/[^\d]/g, '');
  const phoneE164 = phoneDigits
    ? (phoneDigits.startsWith('967') ? phoneDigits : `967${phoneDigits}`)
    : '';

  let baseWhatsappUrl = normalizeWhatsAppUrl(contactWhatsapp);

  if (!baseWhatsappUrl && phoneE164) {
    baseWhatsappUrl = `https://wa.me/${phoneE164}`;
  }

  return baseWhatsappUrl;
}

export function buildWhatsAppUrl(baseUrl, message) {
  if (!baseUrl) return '';

  try {
    const url = new URL(baseUrl);
    url.searchParams.set('text', message);
    return url.toString();
  } catch {
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}text=${encodeURIComponent(message)}`;
  }
}

export function buildProductPageUrl(origin, item) {
  const slug = item.slug || item.baseProductId || (item.productId?.includes('::')
    ? item.productId.split('::')[0]
    : item.productId);
  return `${origin}/product/${encodeURIComponent(slug)}`;
}

function formatItemOptions(item) {
  if (!item?.options || typeof item.options !== 'object') return [];
  return Object.entries(item.options).filter(([, v]) => v != null && v !== '');
}

const formatAmount = (value, currencySymbol) =>
  `${Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${currencySymbol}`.trim();

/** Original and discounted unit price; discount is null when the item is not on sale. */
function itemPrices(item) {
  const price = Number(item.price) || 0;
  const discount = item.discountPrice != null && item.discountPrice !== ''
    ? Number(item.discountPrice)
    : null;
  const onSale = discount != null && !Number.isNaN(discount) && discount < price;
  return { price, discount: onSale ? discount : null };
}

/**
 * @param {object} [coupon]
 * @param {string} [coupon.couponCode]
 * @param {number} [coupon.discountPercent]
 * @param {number} [coupon.discountAmount]
 * @param {number} [coupon.subtotalBeforeCoupon]
 */
export function buildCartWhatsAppMessage(
  items,
  cartTotal,
  shippingAddress,
  currencySymbol = '',
  coupon = null,
) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  let message = 'مرحباً، أود طلب المنتجات التالية:\n\n';
  let originalTotal = 0;

  items.forEach((item, index) => {
    const { price, discount } = itemPrices(item);
    originalTotal += price * item.quantity;
    message += `${index + 1}. ${item.title}\n`;
    const opts = formatItemOptions(item);
    opts.forEach(([key, value]) => {
      message += `   ${key}: ${value}\n`;
    });
    message += `   سعر المنتج: ${formatAmount(price, currencySymbol)}\n`;
    if (discount != null) {
      message += `   سعر الخصم: ${formatAmount(discount, currencySymbol)}\n`;
    }
    message += `   الكمية: ${item.quantity}\n`;
    message += `   الرابط: ${buildProductPageUrl(origin, item)}\n\n`;
  });

  const hasCoupon = Boolean(
    coupon?.couponCode
    && Number(coupon.discountAmount) > 0.009,
  );

  if (hasCoupon) {
    const subtotal = Number(
      coupon.subtotalBeforeCoupon != null ? coupon.subtotalBeforeCoupon : cartTotal,
    );
    const finalTotal = Number(
      coupon.totalAfter != null
        ? coupon.totalAfter
        : Math.max(0, subtotal - Number(coupon.discountAmount)),
    );
    const couponLabel = coupon.discountType === 'Amount'
      ? `كوبون ${coupon.couponCode} — خصم بمبلغ ثابت`
      : `كوبون ${coupon.couponCode} — خصم ${coupon.discountPercent}%`;
    message += `المجموع قبل الكوبون: ${formatAmount(subtotal, currencySymbol)}\n`;
    message += `${couponLabel}\n`;
    message += `خصم الكوبون: ${formatAmount(coupon.discountAmount, currencySymbol)}\n`;
    message += `الإجمالي النهائي: ${formatAmount(finalTotal, currencySymbol)}\n`;
  } else {
    const savings = originalTotal - cartTotal;
    message += `الإجمالي: ${formatAmount(originalTotal, currencySymbol)}\n`;
    if (savings > 0.009) {
      message += `الخصم: ${formatAmount(savings, currencySymbol)}\n`;
      message += `بعد الخصم: ${formatAmount(cartTotal, currencySymbol)}\n`;
    }
  }

  if (shippingAddress?.trim()) {
    message += `العنوان: ${shippingAddress.trim()}\n`;
  }

  message += 'طريقة الطلب: واتساب';
  return message;
}

/**
 * `price` is the unit price the customer pays; pass `originalPrice` when it is discounted
 * so the message shows both «سعر المنتج» and «سعر الخصم».
 */
export function buildProductWhatsAppMessage({
  title,
  quantity = 1,
  price,
  originalPrice = null,
  currencySymbol = '',
  variantLabel = '',
  options = null,
  productUrl = '',
}) {
  let message = 'مرحباً! أود طلب المنتج التالي:\n\n';
  message += `المنتج: ${title}\n`;
  const optEntries =
    options && typeof options === 'object'
      ? Object.entries(options).filter(([, v]) => v != null && v !== '')
      : [];
  if (optEntries.length) {
    optEntries.forEach(([key, value]) => {
      message += `${key}: ${value}\n`;
    });
  } else if (variantLabel) {
    message += `الخيار: ${variantLabel}\n`;
  }
  const { price: unitOriginal, discount } = itemPrices({
    price: originalPrice != null ? originalPrice : price,
    discountPrice: originalPrice != null ? price : null,
  });
  const unitFinal = discount ?? unitOriginal;
  message += `سعر المنتج: ${formatAmount(unitOriginal, currencySymbol)}\n`;
  if (discount != null) {
    message += `سعر الخصم: ${formatAmount(discount, currencySymbol)}\n`;
  }
  message += `الكمية: ${quantity}\n`;
  if (quantity > 1 || discount != null) {
    message += `الإجمالي: ${formatAmount(unitOriginal * quantity, currencySymbol)}\n`;
    if (discount != null) {
      message += `بعد الخصم: ${formatAmount(unitFinal * quantity, currencySymbol)}\n`;
    }
  }
  if (productUrl) {
    message += `الرابط: ${productUrl}\n`;
  }
  message += '\nطريقة الطلب: واتساب';
  return message;
}

