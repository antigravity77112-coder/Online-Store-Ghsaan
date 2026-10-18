import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { useLocale } from '../context/LocaleContext';

/**
 * Formats a variant attribute value for display in the description sheet.
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
 * Build key/value rows for the description sheet.
 * Only this product's own specs, plus the selected variant's own values.
 * Category attributes (product.attributes → CategoryAttribute) are shared across
 * the category, so they stay out of the sheet.
 *
 * Order: التصنيف → SKU → البراند → selected variant values → product.specs → scents.
 * Long description, price, stock, and condition stay on the product page.
 */
export function buildProductSpecRows(product, { selectedVariant = null } = {}) {
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

  // Selected variant's own values only (Color × Size pickers) — not the category catalog.
  if (selectedVariant?.attributes?.length) {
    for (const attr of selectedVariant.attributes) {
      push(attr.categoryAttribute?.name || attr.name, formatAttributeDisplayValue(attr));
    }
  }

  // Free-form per-product specs (ProductSpec) — each product owns its own names/values.
  if (Array.isArray(product.specs)) {
    const specs = [...product.specs].sort(
      (a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0),
    );
    for (const spec of specs) {
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
 * Bottom-sheet of per-product key/value specifications only (no prose description).
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
            aria-label="إغلاق المواصفات"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain px-5 sm:px-8 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {hasRows ? (
            <ul
              dir={dir}
              className="mx-auto max-w-sm grid grid-cols-[max-content_auto_minmax(0,1fr)] gap-x-2.5 items-start text-sm leading-[1.5]"
            >
              {rows.map((row, idx) => (
                <li key={`${row.label}-${idx}`} className="contents">
                  <span className="py-2.5 text-start font-semibold text-stone-800 dark:text-stone-100 whitespace-nowrap">
                    {row.label}
                  </span>
                  <span className="py-2.5 select-none text-stone-300 dark:text-stone-600 font-light" aria-hidden="true">
                    |
                  </span>
                  <span className="py-2.5 min-w-0 text-start text-stone-600 dark:text-stone-300 break-words">
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
