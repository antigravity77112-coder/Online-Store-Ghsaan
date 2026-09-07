/**
 * HeroPeekProductPicker — pick up to 2 products for hero peek cards
 */

import React, { useMemo } from 'react';
import useSWR from 'swr';
import * as api from '../../../services/api';

function normalizeIds(value) {
  if (!Array.isArray(value)) return ['', ''];
  return [value[0] || '', value[1] || ''];
}

export default function HeroPeekProductPicker({ value = [], onChange }) {
  const { data: products, isLoading } = useSWR(
    'admin-products-hero-peek',
    () => api.getAdminProducts({ pageNumber: 1, pageSize: 100, status: 'active' }),
    { revalidateOnFocus: false },
  );

  const [slot1, slot2] = normalizeIds(value);

  const options = useMemo(
    () => (products || []).map((p) => ({ id: p.id, label: p.title })),
    [products],
  );

  const updateSlot = (index, id) => {
    const next = normalizeIds(value);
    next[index] = id;
    onChange(next.filter(Boolean));
  };

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-4">
      <div>
        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">بطاقات المنتجات على الهيرو</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          اختر منتجين يظهران كصورتين صغيرتين على يسار البانر (نمط Shein). اختياري.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[0, 1].map((index) => (
          <label key={index} className="block">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">
              المنتج {index + 1}
            </span>
            <select
              className="appearance-none w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-gold-500/40 cursor-pointer"
              value={index === 0 ? slot1 : slot2}
              onChange={(e) => updateSlot(index, e.target.value)}
              disabled={isLoading}
            >
              <option value="">— بدون —</option>
              {options.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </div>
  );
}
