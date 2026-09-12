/**
 * CategoryIconGrid — صفّان × N أعمدة مع تمرير أفقي RTL
 * يدعم أكثر من صفحة مع زر «المزيد» ومؤشر نقاط للتنبيه بوجود المزيد.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import CategoryTile from './CategoryTile';

const ROWS = 2;

function getVisibleCols() {
  if (typeof window === 'undefined') return 7;
  if (window.matchMedia('(min-width: 1024px)').matches) return 7;
  if (window.matchMedia('(min-width: 640px)').matches) return 5;
  return 4;
}

function useVisibleCols() {
  const [cols, setCols] = useState(getVisibleCols);

  useEffect(() => {
    const lg = window.matchMedia('(min-width: 1024px)');
    const sm = window.matchMedia('(min-width: 640px)');
    const sync = () => setCols(getVisibleCols());
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

/** Align a page to the scroller's inline-start (right in RTL). Works on Chrome + Firefox. */
function alignChildToInlineStart(scroller, child) {
  if (!scroller || !child) return;
  const isRtl = getComputedStyle(scroller).direction === 'rtl';
  const drift = () => {
    const s = scroller.getBoundingClientRect();
    const c = child.getBoundingClientRect();
    return isRtl ? c.right - s.right : c.left - s.left;
  };

  let delta = drift();
  if (Math.abs(delta) < 2) return;

  const before = scroller.scrollLeft;
  scroller.scrollLeft = before + delta;
  if (Math.abs(drift()) > Math.abs(delta)) {
    scroller.scrollLeft = before - delta;
  }
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

  const goToPage = (pageIndex, behavior = 'smooth') => {
    const el = scrollRef.current;
    if (!el) return;
    const target = Math.max(0, Math.min(pages.length - 1, pageIndex));
    const pageEl = el.children[target];
    if (!pageEl) return;
    if (behavior === 'smooth') {
      pageEl.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
    } else {
      alignChildToInlineStart(el, pageEl);
    }
    setActivePage(target);
  };

  // Desktop Chrome + dir=rtl starts at the LAST page; pin to the first after layout.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const pinStart = () => {
      alignChildToInlineStart(el, el.firstElementChild);
      setActivePage(0);
    };
    pinStart();
    const raf = requestAnimationFrame(pinStart);
    return () => cancelAnimationFrame(raf);
  }, [pages.length, pageSize, isLoading, categories.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !hasMultiplePages) return undefined;
    const onScroll = () => {
      const pageWidth = el.clientWidth || 1;
      const page = Math.round(Math.abs(el.scrollLeft) / pageWidth);
      setActivePage(Math.max(0, Math.min(pages.length - 1, page)));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [hasMultiplePages, pages.length]);

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
          className="category-belt-scroll flex overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-0.5 -mx-0.5 px-0.5"
          style={{ WebkitOverflowScrolling: 'touch', overflowAnchor: 'none' }}
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
