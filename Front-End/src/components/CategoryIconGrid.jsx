/**
 * CategoryIconGrid — شبكة فئات بصفّين (موبايل 5 أعمدة، سطح المكتب 7)
 */

import React from 'react';
import CategoryTile from './CategoryTile';

const MOBILE_COLS = 5;
const DESKTOP_COLS = 7;
const ROWS = 2;
const MOBILE_LIMIT = MOBILE_COLS * ROWS; // 10
const DESKTOP_LIMIT = DESKTOP_COLS * ROWS; // 14
const SKELETON_COUNT = DESKTOP_LIMIT;

export default function CategoryIconGrid({
  categories = [],
  isLoading = false,
  showHeader = true,
}) {
  const visible = categories.slice(0, DESKTOP_LIMIT);

  return (
    <section
      id="categories-section"
      className="border-b border-stone-100 bg-white py-3 dark:border-stone-800/80 dark:bg-stone-950"
      aria-label="تصفح الفئات"
    >
      {showHeader && (
        <div className="mb-2.5 px-0.5">
          <h2 className="text-sm font-extrabold text-stone-900 dark:text-white">
            الفئات
          </h2>
        </div>
      )}

      <div
        className="grid grid-cols-5 gap-x-2 gap-y-3 lg:grid-cols-7 lg:gap-x-3"
        dir="rtl"
        role="list"
      >
        {isLoading
          ? Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <div
                key={`cat-grid-skel-${i}`}
                role="listitem"
                className={i >= MOBILE_LIMIT ? 'hidden lg:block' : undefined}
              >
                <CategoryTile isLoading />
              </div>
            ))
          : visible.map((cat, i) => (
              <div
                key={cat.id}
                role="listitem"
                className={i >= MOBILE_LIMIT ? 'hidden lg:block' : undefined}
              >
                <CategoryTile category={cat} />
              </div>
            ))}
      </div>
    </section>
  );
}
