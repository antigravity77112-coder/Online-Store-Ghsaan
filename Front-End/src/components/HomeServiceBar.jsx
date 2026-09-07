/**
 * HomeServiceBar — شريط الخدمات المزدوج (نمط Shein: شحن | إرجاع)
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Truck, RotateCcw } from 'lucide-react';

export default function HomeServiceBar({
  shippingTitle = 'شحن مجاني',
  shippingSubtitle = 'على الطلبات المؤهلة',
  returnsTitle = 'إرجاع سهل',
  returnsHref = '/contact',
  returnsSubtitle = 'اعرف المزيد',
}) {
  return (
    <div className="grid grid-cols-2 bg-white dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800">
      <div className="flex items-center gap-2 px-2.5 py-2.5 border-l border-stone-200/80 dark:border-stone-700/50">
        <Truck className="w-5 h-5 text-stone-700 dark:text-stone-300 flex-shrink-0" aria-hidden="true" />
        <div className="min-w-0 text-right">
          <p className="text-xs font-extrabold text-stone-900 dark:text-stone-100 leading-tight">
            {shippingTitle}
          </p>
          <p className="text-[10px] text-stone-500 dark:text-stone-400 leading-snug line-clamp-2">
            {shippingSubtitle}
          </p>
        </div>
      </div>

      <Link
        to={returnsHref}
        className="flex items-center gap-2 px-2.5 py-2.5 min-h-[44px] hover:bg-stone-100/80 dark:hover:bg-stone-800/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold-500/40"
      >
        <RotateCcw className="w-5 h-5 text-stone-700 dark:text-stone-300 flex-shrink-0" aria-hidden="true" />
        <div className="min-w-0 text-right">
          <p className="text-xs font-extrabold text-stone-900 dark:text-stone-100 leading-tight">
            {returnsTitle}
          </p>
          <p className="text-[10px] text-stone-500 dark:text-stone-400 underline underline-offset-2">
            {returnsSubtitle}
          </p>
        </div>
      </Link>
    </div>
  );
}
