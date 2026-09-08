import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, ShoppingCart, User, Flame } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

/** Content height of the bar (excluding safe-area inset). Keep sticky CTAs flush on top. */
export const MOBILE_BOTTOM_NAV_CONTENT_HEIGHT = '4.5rem';

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
      className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 dark:bg-stone-950/95 backdrop-blur-md border-t border-stone-200/80 dark:border-stone-800"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      aria-label={t('nav.mainNavigation')}
    >
      <div
        className="grid grid-cols-5 max-w-lg mx-auto px-1.5"
        style={{ height: MOBILE_BOTTOM_NAV_CONTENT_HEIGHT }}
      >
        {tabs.map(({ to, icon: Icon, label, id, badge, authRequired, featured }) => {
          const count = getBadge(badge);
          const isActive = isTabActive(to);
          const destination = authRequired && !isAuthenticated ? '/auth' : to;

          return (
            <Link
              key={id}
              to={destination}
              className={`relative flex flex-col items-center justify-center gap-1.5 min-w-0 h-full px-1 pt-1.5 pb-1 transition-colors duration-200 ${
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

              <div className="relative flex items-center justify-center h-7 shrink-0">
                <Icon
                  className={`w-[22px] h-[22px] transition-transform ${
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
