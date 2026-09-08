/**
 * HomeCategoryTabs — شريط تصفح أفقي فاخر تحت الهيدر (نمط Shein)
 */

import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const TABS = (t) => [
  { id: 'home', label: t('nav.all'), href: '/' },
  { id: 'offers', label: t('nav.offers'), href: '/products?promoted=true' },
  { id: 'trending', label: t('nav.trendingShort', t('nav.trending')), href: '/products?trending=true' },
  { id: 'new', label: t('nav.newArrivals'), href: '/products?sort=newest' },
  { id: 'products', label: t('nav.products'), href: '/products' },
];

export default function HomeCategoryTabs() {
  const { pathname, search } = useLocation();
  const { t } = useTranslation();
  const tabs = useMemo(() => TABS(t), [t]);
  const current = `${pathname}${search}`;
  const params = useMemo(() => new URLSearchParams(search), [search]);

  const isActive = (tab) => {
    if (tab.id === 'home') return pathname === '/' && !search;
    if (tab.id === 'offers') return pathname === '/products' && params.get('promoted') === 'true';
    if (tab.id === 'trending') return pathname === '/products' && params.get('trending') === 'true';
    if (tab.id === 'new') return pathname === '/products' && params.get('sort') === 'newest';
    if (tab.id === 'products') {
      return pathname === '/products'
        && params.get('promoted') !== 'true'
        && params.get('trending') !== 'true'
        && params.get('sort') !== 'newest';
    }
    return pathname === tab.href || current === tab.href;
  };

  return (
    <nav
      className="h-[var(--mobile-shop-tabs-height)] border-b border-white/15 bg-[#565656] md:hidden"
      aria-label={t('nav.browseStore', 'تصفح المتجر')}
    >
      <div className="grid h-full grid-cols-5 px-0.5">
        {tabs.map((tab) => {
          const active = isActive(tab);
          return (
            <Link
              key={tab.id}
              to={tab.href}
              className={`relative flex min-w-0 items-center justify-center px-0.5 text-center text-[10px] font-bold leading-tight transition-colors sm:text-[11px] ${
                active
                  ? 'text-white'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <span className="truncate">{tab.label}</span>
              {active && (
                <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-t-full bg-[#EA0001] sm:inset-x-3" aria-hidden="true" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
