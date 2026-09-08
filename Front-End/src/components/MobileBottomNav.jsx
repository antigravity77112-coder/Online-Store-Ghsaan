import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, ShoppingCart, User, Flame } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const MOBILE_TABS = (t) => ([
  { to: '/', icon: Home, label: t('nav.shop'), id: 'nav-home' },
  { to: '/categories', icon: LayoutGrid, label: t('nav.categories'), id: 'nav-categories' },
  { to: '/products?trending=true', icon: Flame, label: t('nav.trendingShort'), id: 'nav-trending', featured: true },
  { to: '/cart', icon: ShoppingCart, label: t('nav.cart'), id: 'nav-cart', badge: 'cart' },
  { to: '/profile', icon: User, label: t('nav.account'), id: 'nav-account', authRequired: true },
]);

const MobileBottomNav = React.memo(() => {
  const { pathname, search } = useLocation();
  const { cartCount } = useCart();
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();

  const tabs = useMemo(() => MOBILE_TABS(t), [t]);

  if (pathname.startsWith('/admin') || pathname.startsWith('/checkout')) {
    return null;
  }

  function getBadge(badge) {
    if (badge === 'cart') return cartCount;
    return 0;
  }

  function isTabActive(to) {
    if (to === '/') return pathname === '/' && !search;
    if (to === '/categories') {
      return pathname.startsWith('/categories') || pathname.startsWith('/category/');
    }
    if (to.includes('trending=true')) {
      return pathname === '/products' && search.includes('trending=true');
    }
    if (to === '/profile') {
      return pathname.startsWith('/profile') || pathname.startsWith('/auth') || pathname.startsWith('/my-orders');
    }
    return pathname.startsWith(to.split('?')[0]);
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-950 md:hidden"
      style={{ paddingBottom: 'max(0.25rem, env(safe-area-inset-bottom))' }}
      aria-label={t('nav.mainNavigation')}
    >
      <div className="mx-auto grid h-[var(--mobile-bottom-nav-content-height)] max-w-lg grid-cols-5 px-1">
        {tabs.map(({ to, icon: Icon, label, id, badge, authRequired, featured }) => {
          const count = getBadge(badge);
          const isActive = isTabActive(to);
          const destination = authRequired && !isAuthenticated ? '/auth' : to;

          return (
            <Link
              key={id}
              to={destination}
              className={`relative flex h-full min-w-[44px] flex-col items-center justify-center gap-1 px-0.5 py-1 transition-colors duration-200 ${
                isActive
                  ? 'text-gold-600 dark:text-gold-400'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
              }`}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && (
                <span
                  className="absolute top-0 inset-x-3 h-0.5 bg-gradient-to-r from-transparent via-gold-500 to-transparent rounded-b-full"
                  aria-hidden="true"
                />
              )}

              <div className="relative flex h-6 shrink-0 items-center justify-center">
                <Icon
                  className={`h-[21px] w-[21px] transition-transform ${
                    featured && isActive ? 'fill-current scale-110' : isActive ? 'scale-105' : ''
                  }`}
                  strokeWidth={featured ? 2.25 : 2}
                  aria-hidden="true"
                />
                {count > 0 && (
                  <span className="absolute -top-1.5 -end-2.5 min-w-[16px] h-4 px-1 bg-[#e6533d] rounded-full text-[9px] font-bold leading-none text-white flex items-center justify-center border border-white dark:border-stone-950 pointer-events-none">
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </div>

              <span className="w-full text-[10px] sm:text-[11px] font-semibold leading-tight text-center truncate px-0.5">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
});

MobileBottomNav.displayName = 'MobileBottomNav';
export default MobileBottomNav;
