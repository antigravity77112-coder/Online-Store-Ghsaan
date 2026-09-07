/**
 * HomeCategoryTabs — شريط تصفح أفقي فاخر تحت الهيدر (نمط Shein)
 */

import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const TABS = (t) => [
  { id: 'home', label: t('nav.all'), href: '/' },
  { id: 'offers', label: t('nav.offers'), href: '/products?promoted=true' },
  { id: 'trending', label: t('nav.trending'), href: '/products?trending=true' },
  { id: 'new', label: t('nav.newArrivals'), href: '/products?sort=newest' },
  { id: 'scents', label: t('nav.scents'), href: '/scents' },
  { id: 'products', label: t('nav.products'), href: '/products' },
];

export default function HomeCategoryTabs() {
  const { pathname, search } = useLocation();
  const { t } = useTranslation();
  const tabs = useMemo(() => TABS(t), [t]);
  const current = `${pathname}${search}`;

  const isActive = (tab) => {
    if (tab.id === 'home') return pathname === '/' && !search;
    if (tab.id === 'offers') return pathname === '/products' && search.includes('promoted=true');
    if (tab.id === 'trending') return pathname === '/products' && search.includes('trending=true');
    if (tab.id === 'new') return pathname === '/products' && search.includes('sort=newest');
    if (tab.id === 'products') return pathname === '/products' && !search;
    return pathname === tab.href || current === tab.href;
  };

  return (
    <nav
      className="md:hidden bg-[#2f271f] border-b border-gold-500/20"
      aria-label={t('nav.browseStore', 'تصفح المتجر')}
    >
      <div className="flex overflow-x-auto scrollbar-hide snap-x snap-mandatory px-1">
        {tabs.map((tab) => {
          const active = isActive(tab);
          return (
            <Link
              key={tab.id}
              to={tab.href}
              className={`relative flex-shrink-0 snap-start px-3.5 pt-2.5 pb-3.5 text-xs font-bold whitespace-nowrap min-h-[44px] flex items-center leading-normal transition-colors ${
                active
                  ? 'text-gold-400'
                  : 'text-stone-300/90 hover:text-stone-100'
              }`}
            >
              {tab.label}
              {active && (
                <span className="absolute inset-x-3 bottom-1.5 h-0.5 rounded-full bg-gradient-to-r from-gold-600 via-gold-400 to-gold-600" aria-hidden="true" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
