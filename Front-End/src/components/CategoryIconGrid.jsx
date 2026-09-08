/**
 * CategoryIconGrid — حزام فئات أفقي (تمرير RTL؛ 7 ظاهرة على سطح المكتب)
 */

import React from 'react';
import CategoryTile from './CategoryTile';

const SKELETON_COUNT = 7;

export default function CategoryIconGrid({
  categories = [],
  isLoading = false,
  showHeader = true,
}) {
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
        className="category-belt-scroll flex gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-0.5 -mx-0.5 px-0.5 lg:gap-3"
        style={{ WebkitOverflowScrolling: 'touch' }}
        dir="rtl"
        role="list"
      >
        {isLoading
          ? Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <div
                key={`cat-grid-skel-${i}`}
                role="listitem"
                className="snap-start flex-shrink-0 w-[calc((100%-0.5rem*3)/4)] sm:w-[calc((100%-0.5rem*4)/5)] lg:w-[calc((100%-0.75rem*6)/7)]"
              >
                <CategoryTile isLoading />
              </div>
            ))
          : categories.map((cat) => (
              <div
                key={cat.id}
                role="listitem"
                className="snap-start flex-shrink-0 w-[calc((100%-0.5rem*3)/4)] sm:w-[calc((100%-0.5rem*4)/5)] lg:w-[calc((100%-0.75rem*6)/7)]"
              >
                <CategoryTile category={cat} />
              </div>
            ))}
      </div>
    </section>
  );
}
