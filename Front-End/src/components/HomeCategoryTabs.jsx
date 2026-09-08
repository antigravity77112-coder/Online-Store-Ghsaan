/**
 * HomeCategoryTabs — شريط تصفح أفقي فاخر تحت الهيدر (نمط Shein)
 */

import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const TABS = (t) => [
  { id: 'home', label: t('nav.all'), href: '/' },
  { id: 'offers', label: t('nav.offers'), href: '/products?promoted=true' },
  { id: 'new', label: t('nav.newArrivals'), href: '/products?sort=newest' },
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
    if (tab.id === 'new') return pathname === '/products' && search.includes('sort=newest');
    if (tab.id === 'products') {
      return pathname === '/products'
        && !search.includes('promoted=true')
        && !search.includes('sort=newest');
    }
    return pathname === tab.href || current === tab.href;
  };

  return (
    <nav
      className="h-[var(--mobile-shop-tabs-height)] border-b border-white/15 bg-[#565656] md:hidden"
      aria-label={t('nav.browseStore', 'تصفح المتجر')}
    >
      <div className="grid h-full grid-cols-4 px-1">
        {tabs.map((tab) => {
          const active = isActive(tab);
          return (
            <Link
              key={tab.id}
              to={tab.href}
              className={`relative flex min-w-0 items-center justify-center px-1 text-center text-[11px] font-bold leading-tight transition-colors ${
                active
                  ? 'text-white'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <span className="truncate">{tab.label}</span>
              {active && (
                <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-t-full bg-[#EA0001]" aria-hidden="true" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
