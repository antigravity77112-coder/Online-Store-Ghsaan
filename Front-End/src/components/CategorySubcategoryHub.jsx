/**
 * CategorySubcategoryHub — fill the viewport row; show «المزيد» only when chips overflow
 */

import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';

const GAP_PX = 6; // Tailwind gap-1.5

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

/**
 * Pack chip indices into `available` width, reserving space for the more button when needed.
 * `priority` indices are placed first (e.g. الكل + active), then the rest in order.
 */
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

export default function CategorySubcategoryHub({
  allHref,
  allActive,
  items = [],
  activeSlug,
  activeName,
}) {
  const [expanded, setExpanded] = useState(false);
  const [fittedIds, setFittedIds] = useState(null);
  const containerRef = useRef(null);
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

  if (!items.length) return null;

  const idSet = fittedIds ? new Set(fittedIds) : null;
  const visibleChips = expanded || !idSet
    ? chips
    : chips.filter((c) => idSet.has(c.id));
  const hiddenCount = Math.max(0, chips.length - visibleChips.length);
  const overflows = hiddenCount > 0;
  const canToggle = expanded || overflows;

  return (
    <div className="mb-3 relative" role="navigation" aria-label="الأقسام الفرعية">
      {/* Hidden measure row: full chip set + more button for width calc */}
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

      <div
        ref={containerRef}
        className={`flex gap-1.5 ${
          expanded ? 'flex-wrap' : 'flex-nowrap overflow-hidden'
        } pb-1 -mx-1 px-1`}
      >
        {visibleChips.map((chip) => (
          <CompactCategoryPill
            key={chip.id}
            cat={chip}
            to={chip.href}
            isActive={chip.isActive}
          />
        ))}
        {canToggle ? (
          <MoreButton
            expanded={expanded}
            hiddenCount={hiddenCount}
            onClick={() => setExpanded((v) => !v)}
          />
        ) : null}
      </div>
    </div>
  );
}
