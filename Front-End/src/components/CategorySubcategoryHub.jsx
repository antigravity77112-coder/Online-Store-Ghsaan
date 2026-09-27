/**
 * CategorySubcategoryHub — horizontal الكل + subcategory chips with show-more
 */

import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';

/** Initial visible chips including الكل (keeps one phone row readable). */
const COLLAPSED_VISIBLE = 5;

const CompactCategoryPill = ({ cat, isActive, to }) => (
  <Link
    to={to || `/category/${encodeURIComponent(cat.slug || cat.name)}`}
    className={`flex-shrink-0 inline-flex items-center gap-1.5 min-h-[44px] px-3 py-1 rounded-full text-xs font-semibold border transition-colors leading-[1.45] ${
      isActive
        ? 'bg-gold-600 border-gold-600 text-white shadow-sm'
        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-gold-300 dark:hover:border-gold-600'
    }`}
    aria-current={isActive ? 'page' : undefined}
  >
    {cat?.iconUrl ? (
      <img src={cat.iconUrl} alt="" className="w-4 h-4 object-contain rounded-full" />
    ) : null}
    <span>{cat.name}</span>
  </Link>
);

/**
 * @param {{ allHref: string, allActive: boolean, items: Array, activeSlug?: string, activeName?: string }} props
 */
export default function CategorySubcategoryHub({
  allHref,
  allActive,
  items = [],
  activeSlug,
  activeName,
}) {
  const [expanded, setExpanded] = useState(false);

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

  // Keep the active chip visible while collapsed
  const visibleChips = useMemo(() => {
    if (expanded || chips.length <= COLLAPSED_VISIBLE) return chips;
    const activeIdx = chips.findIndex((c) => c.isActive);
    if (activeIdx < 0 || activeIdx < COLLAPSED_VISIBLE) {
      return chips.slice(0, COLLAPSED_VISIBLE);
    }
    // الكل + active + fill from start
    const picked = [chips[0], chips[activeIdx]];
    for (const c of chips) {
      if (picked.length >= COLLAPSED_VISIBLE) break;
      if (!picked.some((p) => p.id === c.id)) picked.push(c);
    }
    return picked;
  }, [chips, expanded]);

  const hiddenCount = chips.length - visibleChips.length;
  const canToggle = chips.length > COLLAPSED_VISIBLE;

  if (!items.length) return null;

  return (
    <div className="mb-3" role="navigation" aria-label="الأقسام الفرعية">
      <div
        className={`flex gap-1.5 ${
          expanded ? 'flex-wrap' : 'flex-nowrap overflow-x-auto scrollbar-hide'
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
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex-shrink-0 inline-flex items-center gap-1 min-h-[44px] px-3 py-1 rounded-full text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:border-gold-300 dark:hover:border-gold-600 transition-colors leading-[1.45]"
            aria-expanded={expanded}
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
        ) : null}
      </div>
    </div>
  );
}
