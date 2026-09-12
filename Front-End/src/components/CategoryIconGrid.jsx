/**
 * CategoryIconGrid — صفّان × N أعمدة مع تمرير أفقي RTL
 * يدعم أكثر من صفحة مع زر «المزيد» ومؤشر نقاط للتنبيه بوجود المزيد.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
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
  const scrollRef = useRef(null);

  const pages = useMemo(
    () => chunkList(isLoading ? Array.from({ length: pageSize }, (_, i) => ({ id: `skel-${i}` })) : categories, pageSize),
    [categories, isLoading, pageSize],
  );

  const [activePage, setActivePage] = useState(0);
  const hasMultiplePages = pages.length > 1;

  // Track active page based on scroll position
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !hasMultiplePages) return undefined;
    const onScroll = () => {
      const pageWidth = el.clientWidth || 1;
      // RTL: scrollLeft is negative in some browsers; normalize
      const raw = el.scrollLeft;
      const scrollLeft = Math.abs(raw);
      const page = Math.round(scrollLeft / pageWidth);
      setActivePage(Math.max(0, Math.min(pages.length - 1, page)));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [hasMultiplePages, pages.length]);

  const goToPage = (pageIndex) => {
    const el = scrollRef.current;
    if (!el) return;
    const target = Math.max(0, Math.min(pages.length - 1, pageIndex));
    const pageWidth = el.clientWidth || 1;
    // RTL scroll: use positive left for LTR, negative for RTL
    el.scrollTo({ left: pageWidth * target, behavior: 'smooth' });
    setActivePage(target);
  };

  return (
    <section
      id="categories-section"
      className="border-b border-stone-100 bg-white py-3 dark:border-stone-800/80 dark:bg-stone-950"
      aria-label="تصفح الفئات"
    >
      {showHeader && (
        <div className="mb-2.5 flex items-center justify-between px-0.5">
          <h2 className="text-sm font-extrabold text-stone-900 dark:text-white">
            الفئات
          </h2>
          {hasMultiplePages ? (
            <button
              type="button"
              onClick={() => goToPage(activePage + 1 >= pages.length ? 0 : activePage + 1)}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-gold-700 dark:text-gold-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40 rounded-sm"
              aria-label="عرض المزيد من الفئات"
            >
              {activePage + 1 >= pages.length ? 'العودة للبداية' : 'المزيد'}
              <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      )}

      <div className="relative">
        <div
          ref={scrollRef}
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

        {/* Fade hint on the trailing edge to signal more content */}
        {hasMultiplePages ? (
          <div
            className="pointer-events-none absolute top-0 bottom-0 left-0 w-6 bg-gradient-to-l from-transparent to-white dark:to-stone-950"
            aria-hidden="true"
          />
        ) : null}
      </div>

      {/* Dot indicators */}
      {hasMultiplePages ? (
        <div className="mt-2 flex items-center justify-center gap-1.5" role="tablist" aria-label="صفحات الفئات">
          {pages.map((_, idx) => (
            <button
              key={idx}
              type="button"
              role="tab"
              aria-selected={activePage === idx}
              aria-label={`الصفحة ${idx + 1}`}
              onClick={() => goToPage(idx)}
              className={`min-w-[24px] min-h-[24px] flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40 rounded-full`}
            >
              <span
                className={`rounded-full transition-all ${activePage === idx ? 'w-2 h-2 bg-gold-600' : 'w-1.5 h-1.5 bg-stone-300 dark:bg-stone-700'}`}
              />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
