/**
 * CategoryIconGrid — شبكة الفئات (نمط Shein: 5 أعمدة، صور مربعة مستديرة)
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import CategoryTile from './CategoryTile';

const GRID_COLS = 5;
const DISPLAY_LIMIT = 10;

export default function CategoryIconGrid({
  categories = [],
  isLoading = false,
  limit = DISPLAY_LIMIT,
  showHeader = true,
}) {
  const visible = categories.slice(0, limit);

  return (
    <section
      id="categories-section"
      className="border-b border-stone-100 bg-white py-3 dark:border-stone-800/80 dark:bg-stone-950"
      aria-label="تصفح الفئات"
    >
      {showHeader && (
        <div className="flex items-center justify-between mb-2.5 px-0.5">
          <h2 className="text-sm font-extrabold text-stone-900 dark:text-white">
            الفئات
          </h2>
          {categories.length > limit && (
            <Link
              to="/categories"
              className="inline-flex items-center gap-0.5 min-h-[40px] px-1 text-[11px] font-bold text-stone-600 dark:text-stone-300 hover:text-[#e6533d] transition-colors"
            >
              عرض الكل
              <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          )}
        </div>
      )}

      <div
        className="grid gap-x-2 gap-y-3"
        style={{ gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))` }}
        role="list"
      >
        {isLoading
          ? Array.from({ length: DISPLAY_LIMIT }).map((_, i) => (
              <div key={`cat-grid-skel-${i}`} role="listitem">
                <CategoryTile isLoading />
              </div>
            ))
          : visible.map((cat) => (
              <div key={cat.id} role="listitem">
                <CategoryTile category={cat} />
              </div>
            ))}
      </div>

      {!isLoading && categories.length > limit && !showHeader && (
        <div className="mt-3 text-center">
          <Link
            to="/categories"
            className="inline-flex items-center justify-center min-h-[40px] px-3 text-[11px] font-bold text-stone-600 dark:text-stone-300 underline underline-offset-2"
          >
            عرض كل الفئات
          </Link>
        </div>
      )}
    </section>
  );
}
