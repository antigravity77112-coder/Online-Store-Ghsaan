import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Formats a product attribute value for display in the description sheet.
 */
export function formatAttributeDisplayValue(attr) {
  if (!attr) return '';
  const type = attr.categoryAttribute?.type;
  const value = attr.value;
  if (value == null || value === '') return '';
  if (type === 'BOOLEAN') {
    return value === 'true' || value === '1' || value === true ? 'نعم' : 'لا';
  }
  if (type === 'MULTI_SELECT') {
    return String(value).split(',').map((s) => s.trim()).filter(Boolean).join('، ');
  }
  return String(value);
}

/**
 * Build key/value rows for the product description sheet.
 * Includes core fields, selected options, all option groups, and product attributes.
 */
export function buildProductSpecRows(product, { selectedVariant = null, optionGroups = [] } = {}) {
  if (!product) return [];
  const rows = [];
  const seen = new Set();

  const push = (label, value) => {
    if (!label || value == null || value === '') return;
    const key = `${label}::${value}`;
    if (seen.has(key)) return;
    seen.add(key);
    rows.push({ label, value: String(value) });
  };

  const brandName = product.brand?.name || product.brandName;
  push('البراند', brandName);
  push('التصنيف', product.categoryName || product.category?.name);

  const conditionLabel =
    product.condition === 'New' || product.condition === 1 || product.condition === '1'
      ? 'جديد'
      : product.condition === 'Used' || product.condition === 2 || product.condition === '2'
        ? 'مستعمل'
        : product.condition === 'Refurbished' || product.condition === 3 || product.condition === '3'
          ? 'مجدد'
          : null;
  push('الحالة', conditionLabel);

  const sku = selectedVariant?.sku || product.sku;
  push('SKU', sku);
  push('كود المنتج', product.id ? String(product.id).slice(0, 8).toUpperCase() : null);

  // Selected variant options first (current pick)
  if (selectedVariant?.attributes?.length) {
    for (const attr of selectedVariant.attributes) {
      const label = attr.categoryAttribute?.name;
      const value = formatAttributeDisplayValue(attr);
      push(label, value);
    }
  }

  // All available option groups (Color / Size values on the product)
  const groups =
    (Array.isArray(optionGroups) && optionGroups.length
      ? optionGroups
      : product.optionGroups) || [];
  for (const group of groups) {
    if (!group?.name || !Array.isArray(group.values) || !group.values.length) continue;
    // Skip if we already pushed the selected single value for this group name
    const alreadySelected = selectedVariant?.attributes?.some(
      (a) => a.categoryAttribute?.name === group.name,
    );
    if (!alreadySelected) {
      push(group.name, group.values.join('، '));
    } else {
      push(`${group.name} (المتاح)`, group.values.join('، '));
    }
  }

  // Admin-entered product attributes (material, dimensions, etc.)
  if (Array.isArray(product.attributes)) {
    for (const attr of product.attributes) {
      const label = attr.categoryAttribute?.name || 'مواصفة';
      const value = formatAttributeDisplayValue(attr);
      push(label, value);
    }
  }

  if (Array.isArray(product.scents) && product.scents.length > 0) {
    push(
      'الروائح',
      product.scents.map((s) => s.name).filter(Boolean).join('، '),
    );
  }

  const price = selectedVariant
    ? (selectedVariant.discountPrice ?? selectedVariant.price)
    : (product.discountPrice ?? product.price);
  if (price != null && price !== '') {
    push('السعر', String(price));
  }

  const stock = selectedVariant
    ? selectedVariant.stockQuantity
    : product.remainingStock != null
      ? product.remainingStock
      : product.stockQuantity;
  if (stock != null && stock !== '') {
    push('الكمية المتبقية', String(stock));
  }

  return rows;
}

/**
 * Bottom-sheet / modal listing all product specs (SHEIN-style الوصف).
 */
export default function ProductDescriptionSheet({
  open,
  onClose,
  title = 'الوصف',
  description = '',
  rows = [],
}) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  const hasRows = rows.length > 0;
  const hasDescription = Boolean(description?.trim());

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="product-desc-title">
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label="إغلاق"
        onClick={onClose}
      />
      <div className="relative w-full sm:max-w-md max-h-[85vh] bg-white dark:bg-stone-900 rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
        <div className="relative flex items-center justify-center px-4 py-3.5 border-b border-stone-100 dark:border-stone-800 shrink-0">
          <h2 id="product-desc-title" className="text-base font-extrabold text-stone-900 dark:text-white">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="absolute left-3 top-1/2 -translate-y-1/2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
            aria-label="إغلاق الوصف"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {hasRows ? (
            <ul className="divide-y divide-stone-100 dark:divide-stone-800">
              {rows.map((row, idx) => (
                <li
                  key={`${row.label}-${idx}`}
                  className="grid grid-cols-[minmax(0,1fr)_1px_minmax(0,1.15fr)] gap-x-3 py-3.5 text-sm items-start"
                >
                  <span className="text-stone-500 dark:text-stone-400 text-right">{row.label}</span>
                  <span
                    className="self-stretch w-px bg-stone-900 dark:bg-stone-100"
                    aria-hidden="true"
                  />
                  <span className="font-medium text-stone-900 dark:text-stone-100 text-right break-words">
                    {row.value}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          {hasDescription ? (
            <div className={`${hasRows ? 'mt-2 border-t border-stone-100 dark:border-stone-800 pt-4' : 'pt-3'} pb-2`}>
              <p className="text-xs font-bold text-stone-500 mb-2">الوصف التفصيلي</p>
              <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed whitespace-pre-line">
                {description}
              </p>
            </div>
          ) : null}

          {!hasRows && !hasDescription ? (
            <p className="py-8 text-center text-sm text-stone-500">لا توجد مواصفات مضافة لهذا المنتج.</p>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
