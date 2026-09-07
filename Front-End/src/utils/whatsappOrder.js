/**
 * Helpers for WhatsApp order handoff (cart + product detail).
 */

export function resolveWhatsAppBaseUrl(contactPhone = '', contactWhatsapp = '') {
  const phone = String(contactPhone || '').trim();
  const phoneDigits = phone.replace(/[^\d]/g, '');
  const phoneE164 = phoneDigits
    ? (phoneDigits.startsWith('967') ? phoneDigits : `967${phoneDigits}`)
    : '';

  let baseWhatsappUrl = String(contactWhatsapp || '').trim();

  if (baseWhatsappUrl && !baseWhatsappUrl.startsWith('http')) {
    const linkDigits = baseWhatsappUrl.replace(/\D/g, '');
    if (linkDigits) {
      baseWhatsappUrl = `https://wa.me/${linkDigits.startsWith('967') ? linkDigits : `967${linkDigits}`}`;
    }
  }

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

export function buildCartWhatsAppMessage(items, cartTotal, shippingAddress, currencySymbol = '') {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  let message = 'مرحباً، أود طلب المنتجات التالية:\n\n';

  items.forEach((item, index) => {
    message += `${index + 1}. ${item.title}\n`;
    const opts = formatItemOptions(item);
    opts.forEach(([key, value]) => {
      message += `   ${key}: ${value}\n`;
    });
    message += `   الكمية: ${item.quantity}\n`;
    message += `   السعر: ${item.price.toLocaleString('en-US')} ${currencySymbol}\n`;
    message += `   الرابط: ${buildProductPageUrl(origin, item)}\n\n`;
  });

  message += `الإجمالي: ${cartTotal.toLocaleString('en-US')} ${currencySymbol}\n`;

  if (shippingAddress?.trim()) {
    message += `العنوان: ${shippingAddress.trim()}\n`;
  }

  message += 'طريقة الطلب: واتساب';
  return message;
}

export function buildProductWhatsAppMessage({
  title,
  quantity = 1,
  price,
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
  message += `الكمية: ${quantity}\n`;
  message += `السعر: ${Number(price).toLocaleString('en-US')} ${currencySymbol}\n`;
  if (productUrl) {
    message += `الرابط: ${productUrl}\n`;
  }
  message += '\nطريقة الطلب: واتساب';
  return message;
}

