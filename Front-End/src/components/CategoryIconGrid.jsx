/**
 * CategoryIconGrid — صفّان × 7 أعمدة على سطح المكتب مع تمرير أفقي RTL
 */

import React, { useEffect, useMemo, useState } from 'react';
import CategoryTile from './CategoryTile';

const ROWS = 2;

function useVisibleCols() {
  const [cols, setCols] = useState(7);

  useEffect(() => {
    const lg = window.matchMedia('(min-width: 1024px)');
    const sm = window.matchMedia('(min-width: 640px)');
    const sync = () => {
      if (lg.matches) setCols(7);
      else if (sm.matches) setCols(5);
      else setCols(4);
    };
    sync();
    lg.addEventListener('change', sync);
    sm.addEventListener('change', sync);
    return () => {
      lg.removeEventListener('change', sync);
      sm.removeEventListener('change', sync);
    };
  }, []);

  return cols;
}

function chunkList(list, size) {
  if (!size || size < 1) return [list];
  const pages = [];
  for (let i = 0; i < list.length; i += size) {
    pages.push(list.slice(i, i + size));
  }
  return pages;
}

export default function CategoryIconGrid({
  categories = [],
  isLoading = false,
  showHeader = true,
}) {
  const cols = useVisibleCols();
  const pageSize = cols * ROWS;

  const pages = useMemo(
    () => chunkList(isLoading ? Array.from({ length: pageSize }, (_, i) => ({ id: `skel-${i}` })) : categories, pageSize),
    [categories, isLoading, pageSize],
  );

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
        className="category-belt-scroll flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-0.5 -mx-0.5 px-0.5"
        style={{ WebkitOverflowScrolling: 'touch' }}
        dir="rtl"
        role="list"
      >
        {pages.map((page, pageIndex) => (
          <div
            key={`cat-page-${pageIndex}`}
            className="grid w-full min-w-full flex-shrink-0 snap-start grid-cols-4 gap-x-2 gap-y-3 sm:grid-cols-5 lg:grid-cols-7 lg:gap-x-3"
            role="presentation"
          >
            {page.map((cat) => (
              <div key={cat.id} role="listitem">
                {isLoading ? <CategoryTile isLoading /> : <CategoryTile category={cat} />}
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
