/**
 * CategorySubcategoryHub — fill the viewport; «المزيد» opens a horizontal scroll
 * with a clear left-edge hint (RTL: more chips toward the left).
 */

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronUp } from 'lucide-react';

const GAP_PX = 6;

const CompactCategoryPill = React.forwardRef(function CompactCategoryPill(
  { cat, isActive, to, ...rest },
  ref,
) {
  return (
    <Link
      ref={ref}
      to={to || `/category/${encodeURIComponent(cat.slug || cat.name)}`}
      className={`flex-shrink-0 inline-flex items-center gap-1.5 min-h-[44px] px-3 py-1 rounded-full text-xs font-semibold border transition-colors leading-[1.45] ${
        isActive
          ? 'bg-gold-600 border-gold-600 text-white shadow-sm'
          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-gold-300 dark:hover:border-gold-600'
      }`}
      aria-current={isActive ? 'page' : undefined}
      {...rest}
    >
      {cat?.iconUrl ? (
        <img src={cat.iconUrl} alt="" className="w-4 h-4 object-contain rounded-full" />
      ) : null}
      <span>{cat.name}</span>
    </Link>
  );
});

function MoreButton({ expanded, hiddenCount, onClick, measure = false }) {
  return (
    <button
      type="button"
      data-more-btn={measure ? '1' : undefined}
      onClick={measure ? undefined : onClick}
      tabIndex={measure ? -1 : 0}
      aria-hidden={measure || undefined}
      className="flex-shrink-0 inline-flex items-center gap-1 min-h-[44px] px-3 py-1 rounded-full text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:border-gold-300 dark:hover:border-gold-600 transition-colors leading-[1.45]"
      aria-expanded={measure ? undefined : expanded}
    >
      {expanded ? (
        <>
          عرض أقل
          <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
        </>
      ) : (
        <>
          عرض المزيد{hiddenCount > 0 ? ` (${hiddenCount})` : ''}
          <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
        </>
      )}
    </button>
  );
}

function fitChipIndices(widths, available, moreWidth, priority = []) {
  if (!widths.length || available <= 0) return [];

  const ordered = [];
  const seen = new Set();
  for (const i of priority) {
    if (i >= 0 && i < widths.length && !seen.has(i)) {
      ordered.push(i);
      seen.add(i);
    }
  }
  for (let i = 0; i < widths.length; i += 1) {
    if (!seen.has(i)) ordered.push(i);
  }

  const fitted = [];
  let used = 0;

  for (const i of ordered) {
    const chipW = widths[i];
    const nextUsed = fitted.length === 0 ? chipW : used + GAP_PX + chipW;
    const remainingAfter = widths.length - (fitted.length + 1);
    const reserve = remainingAfter > 0 ? moreWidth : 0;

    if (fitted.length > 0 && nextUsed + reserve > available) break;

    used = nextUsed;
    fitted.push(i);
    if (nextUsed > available) break;
  }

  return fitted.length ? fitted.sort((a, b) => a - b) : [0];
}

/** True when the scroller still has content toward the physical left edge. */
function hasMoreToTheLeft(el) {
  if (!el || el.scrollWidth <= el.clientWidth + 2) return false;
  const children = el.querySelectorAll('[data-scroll-chip]');
  if (!children.length) return false;
  const last = children[children.length - 1];
  const cRect = el.getBoundingClientRect();
  const lRect = last.getBoundingClientRect();
  // In RTL the later chips sit further left; if last chip's left is past container left, more to scroll
  return lRect.left < cRect.left - 4;
}

export default function CategorySubcategoryHub({
  allHref,
  allActive,
  items = [],
  activeSlug,
  activeName,
}) {
  const [expanded, setExpanded] = useState(false);
  const [fittedIds, setFittedIds] = useState(null);
  const [showLeftHint, setShowLeftHint] = useState(false);
  const containerRef = useRef(null);
  const scrollRef = useRef(null);
  const measureRef = useRef(null);

  const chips = useMemo(() => {
    const allChip = { id: '__all__', name: 'الكل', href: allHref, isActive: allActive };
    const rest = (items || []).map((cat) => ({
      id: cat.id,
      name: cat.name,
      iconUrl: cat.iconUrl,
      href: `/category/${encodeURIComponent(cat.slug || cat.name)}`,
      isActive: !allActive && (cat.slug === activeSlug || cat.name === activeName),
    }));
    return [allChip, ...rest];
  }, [allHref, allActive, items, activeSlug, activeName]);

  const updateLeftHint = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !expanded) {
      setShowLeftHint(false);
      return;
    }
    setShowLeftHint(hasMoreToTheLeft(el));
  }, [expanded]);

  useLayoutEffect(() => {
    if (expanded) return undefined;

    const run = () => {
      const container = containerRef.current;
      const measureRow = measureRef.current;
      if (!container || !measureRow) return;

      const available = container.clientWidth;
      if (available <= 0) return;

      const chipEls = [...measureRow.querySelectorAll('[data-chip]')];
      const moreEl = measureRow.querySelector('[data-more-btn]');
      if (!chipEls.length) return;

      const widths = chipEls.map((el) => el.offsetWidth);
      const moreWidth = moreEl ? moreEl.offsetWidth + GAP_PX : 0;

      const activeIdx = chips.findIndex((c) => c.isActive);
      const priority = activeIdx > 0 ? [0, activeIdx] : [0];
      const fitted = fitChipIndices(widths, available, moreWidth, priority);
      setFittedIds(fitted.map((i) => chips[i].id));
    };

    run();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(run) : null;
    if (ro && containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', run);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', run);
    };
  }, [chips, expanded]);

  useEffect(() => {
    if (!expanded) {
      setShowLeftHint(false);
      return undefined;
    }
    const el = scrollRef.current;
    if (!el) return undefined;

    // Nudge scroll slightly so the left overflow is obvious, then sync hint
    const nudge = () => {
      updateLeftHint();
      if (hasMoreToTheLeft(el)) {
        // Gentle scroll toward the left (works across RTL scroll models)
        el.scrollBy({ left: -48, behavior: 'smooth' });
        setTimeout(updateLeftHint, 320);
      }
    };
    const t = requestAnimationFrame(nudge);

    el.addEventListener('scroll', updateLeftHint, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateLeftHint) : null;
    if (ro) ro.observe(el);
    window.addEventListener('resize', updateLeftHint);
    return () => {
      cancelAnimationFrame(t);
      el.removeEventListener('scroll', updateLeftHint);
      ro?.disconnect();
      window.removeEventListener('resize', updateLeftHint);
    };
  }, [expanded, chips, updateLeftHint]);

  if (!items.length) return null;

  const idSet = fittedIds ? new Set(fittedIds) : null;
  const visibleChips = expanded || !idSet
    ? chips
    : chips.filter((c) => idSet.has(c.id));
  const hiddenCount = Math.max(0, chips.length - visibleChips.length);
  const overflows = hiddenCount > 0;
  const canToggle = expanded || overflows;

  const handleToggle = () => {
    setExpanded((v) => !v);
  };

  const scrollMoreLeft = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: -Math.max(120, el.clientWidth * 0.45), behavior: 'smooth' });
  };

  return (
    <div className="mb-3 relative" role="navigation" aria-label="الأقسام الفرعية">
      <div
        ref={measureRef}
        className="absolute flex gap-1.5 whitespace-nowrap pointer-events-none"
        aria-hidden="true"
        style={{ visibility: 'hidden', left: 0, top: 0, height: 0, overflow: 'hidden' }}
      >
        {chips.map((chip) => (
          <CompactCategoryPill
            key={`m-${chip.id}`}
            cat={chip}
            to={chip.href}
            isActive={chip.isActive}
            data-chip="1"
          />
        ))}
        <MoreButton expanded={false} hiddenCount={1} measure />
      </div>

      <div ref={containerRef} className="relative -mx-1 px-1">
        <div
          ref={scrollRef}
          dir="rtl"
          className={`flex gap-1.5 flex-nowrap pb-1 ${
            expanded
              ? 'overflow-x-auto scrollbar-hide overscroll-x-contain'
              : 'overflow-hidden'
          }`}
          style={expanded ? { WebkitOverflowScrolling: 'touch' } : undefined}
        >
          {visibleChips.map((chip) => (
            <CompactCategoryPill
              key={chip.id}
              cat={chip}
              to={chip.href}
              isActive={chip.isActive}
              data-scroll-chip="1"
            />
          ))}
          {canToggle ? (
            <MoreButton
              expanded={expanded}
              hiddenCount={hiddenCount}
              onClick={handleToggle}
            />
          ) : null}
        </div>

        {/* Left-edge cue: more chips that way — scroll left */}
        {expanded && showLeftHint ? (
          <>
            <div
              className="pointer-events-none absolute inset-y-0 left-0 w-14 bg-gradient-to-r from-white via-white/90 to-transparent dark:from-stone-950 dark:via-stone-950/90"
              aria-hidden="true"
            />
            <button
              type="button"
              onClick={scrollMoreLeft}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 inline-flex items-center gap-0.5 min-h-[36px] pl-1.5 pr-2 rounded-full bg-stone-900/90 text-white text-[10px] font-bold shadow-md animate-pulse"
              aria-label="مرّر لليسار لعرض المزيد من الأقسام"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              <span>المزيد</span>
            </button>
          </>
        ) : null}
      </div>

      {expanded && showLeftHint ? (
        <p className="mt-1 text-[10px] text-stone-400 dark:text-stone-500 text-start px-1 leading-[1.45]">
          اسحب لليسار لعرض باقي الأقسام
        </p>
      ) : null}
    </div>
  );
}
