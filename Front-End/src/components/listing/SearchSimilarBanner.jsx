import React from 'react';
import { Sparkles } from 'lucide-react';

/** Shown above the grid when the API returned fuzzy / similar matches. */
export default function SearchSimilarBanner({ searchTerm, className = '' }) {
  const q = String(searchTerm || '').trim();
  if (!q) return null;

  return (
    <div
      className={`mb-4 flex items-start gap-2.5 rounded-xl border border-amber-200/80 bg-amber-50/90 px-3.5 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100 ${className}`}
      role="status"
    >
      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
      <p className="leading-relaxed">
        لم نعثر على تطابق دقيق — هذه{' '}
        <span className="font-bold">نتائج مشابهة</span> لـ{' '}
        <span className="font-semibold">&ldquo;{q}&rdquo;</span>
      </p>
    </div>
  );
}
