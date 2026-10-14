import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { useLocale } from '../context/LocaleContext';

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
 * Order: التصنيف → SKU → البراند → variant options → free-form product specs.
 * Price, condition, stock quantity, and the long description stay outside the sheet.
 */
export function buildProductSpecRows(product, { selectedVariant = null, optionGroups = [] } = {}) {
  if (!product) return [];
  const rows = [];
  const seen = new Set();

  const push = (label, value, href = null) => {
    if (!label || value == null || value === '') return;
    const key = `${label}::${value}`;
    if (seen.has(key)) return;
    seen.add(key);
    const row = { label, value: String(value) };
    if (href) row.href = href;
    rows.push(row);
  };

  push('التصنيف', product.categoryName || product.category?.name);
  push('SKU', selectedVariant?.sku || product.sku);
  const brandName = product.brand?.name || product.brandName;
  const brandSlug = product.brand?.slug;
  push(
    'البراند',
    brandName,
    brandSlug ? `/brand/${encodeURIComponent(brandSlug)}` : null,
  );

  // Product-level category attributes (key/value from admin)
  if (Array.isArray(product.attributes)) {
    for (const attr of product.attributes) {
      push(attr.categoryAttribute?.name || attr.name, formatAttributeDisplayValue(attr));
    }
  }

  if (selectedVariant?.attributes?.length) {
    for (const attr of selectedVariant.attributes) {
      push(attr.categoryAttribute?.name, formatAttributeDisplayValue(attr));
    }
  }

  const groups =
    (Array.isArray(optionGroups) && optionGroups.length
      ? optionGroups
      : product.optionGroups) || [];
  for (const group of groups) {
    if (!group?.name || !Array.isArray(group.values) || !group.values.length) continue;
    const hasSelectedValue = selectedVariant?.attributes?.some(
      (attr) => attr.categoryAttribute?.name === group.name,
    );
    push(
      hasSelectedValue ? `${group.name} (المتاح)` : group.name,
      group.values.join('، '),
    );
  }

  // Free-form per-product specs (name/value) — not tied to the category
  if (Array.isArray(product.specs)) {
    for (const spec of product.specs) {
      const label = spec.name || spec.key || spec.label;
      const value = spec.value ?? spec.val;
      push(label, value);
    }
  }

  if (Array.isArray(product.scents) && product.scents.length > 0) {
    push(
      'الروائح',
      product.scents.map((scent) => scent.name).filter(Boolean).join('، '),
    );
  }

  return rows;
}

/**
 * Bottom-sheet containing key/value specifications only.
 */
export default function ProductDescriptionSheet({
  open,
  onClose,
  title = 'المواصفات',
  rows = [],
}) {
  const { dir, isRtl } = useLocale();

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

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-desc-title"
      dir={dir}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label="إغلاق"
        onClick={onClose}
      />
      <div className="relative w-full sm:max-w-md max-h-[85vh] bg-white dark:bg-stone-900 rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col overflow-hidden">
        <div className="relative flex items-center justify-center px-4 py-3.5 border-b border-stone-100 dark:border-stone-800 shrink-0">
          <h2 id="product-desc-title" className="text-base font-extrabold text-stone-900 dark:text-white">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={`absolute top-1/2 -translate-y-1/2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 ${
              isRtl ? 'left-3' : 'right-3'
            }`}
            aria-label="إغلاق الوصف"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain px-5 sm:px-8 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {hasRows ? (
            <ul className="mx-auto max-w-sm space-y-0">
              {rows.map((row, idx) => (
                <li
                  key={`${row.label}-${idx}`}
                  className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-x-2.5 py-2.5 text-sm leading-[1.5]"
                >
                  {/* Key: inline-start */}
                  <span className="min-w-0 text-start font-semibold text-stone-800 dark:text-stone-100 break-words">
                    {row.label}
                  </span>
                  <span className="select-none text-stone-300 dark:text-stone-600 font-light pt-px" aria-hidden="true">
                    |
                  </span>
                  {/* Value: right-aligned (flush toward separator in RTL Arabic) */}
                  <span className="min-w-0 text-right text-stone-600 dark:text-stone-300 break-words">
                    {row.href ? (
                      <Link
                        to={row.href}
                        className="text-gold-700 dark:text-gold-400 hover:underline underline-offset-2"
                        onClick={onClose}
                      >
                        {row.value}
                      </Link>
                    ) : (
                      row.value
                    )}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-stone-500">لا توجد مواصفات مضافة لهذا المنتج.</p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
