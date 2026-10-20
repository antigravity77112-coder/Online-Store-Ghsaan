import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  Sun,
  Moon,
  Heart,
  LogIn,
  LogOut,
  Package,
  Crown,
  Home,
  BadgePercent,
  Sparkles,
  Flame,
  Info,
  Phone,
  MapPin,
  Settings,
  LayoutGrid,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Mobile hamburger menu panel — lazy-loaded from Layout so drawer icons
 * are not on the critical path until the user opens the menu.
 */
export default function MobileNavDrawer({
  showShopChrome,
  favoritesCount,
  isAuthenticated,
  isAdmin,
  isDark,
  language,
  linkClass,
  dividerClass,
  onClose,
  onLogout,
  onToggleTheme,
  onChangeLanguage,
}) {
  const { t } = useTranslation();

  return (
    <div
      className={`md:hidden py-4 border-t space-y-3 max-h-[calc(100vh-4rem)] overflow-y-auto pb-[var(--mobile-current-bottom-offset)] ${
        showShopChrome
          ? 'border-gold-500/20 bg-white dark:bg-stone-900'
          : 'border-gray-100 dark:border-slate-800'
      }`}
    >
      <div className="flex flex-col gap-1 px-2 pb-4">
        <Link to="/" onClick={onClose} className={linkClass}>
          <Home className="w-5 h-5 text-gold-500" /> {t('nav.home')}
        </Link>

        <Link to="/categories" onClick={onClose} className={linkClass}>
          <LayoutGrid className="w-5 h-5 text-gold-500" /> {t('nav.categories')}
        </Link>

        <Link to="/brands" onClick={onClose} className={linkClass}>
          <Crown className="w-5 h-5 text-gold-500" /> {t('nav.brands')}
        </Link>

        <Link to="/products" onClick={onClose} className={linkClass}>
          <ShoppingBag className="w-5 h-5 text-gold-500" /> {t('nav.products')}
        </Link>

        <Link to="/favorites" onClick={onClose} className={`${linkClass} min-h-[44px]`}>
          <Heart className="w-5 h-5 text-rose-400" /> {t('nav.favorites')}
          {favoritesCount > 0 && (
            <span className="mr-auto text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 rounded-full">
              {favoritesCount}
            </span>
          )}
        </Link>

        <Link to="/products?promoted=true" onClick={onClose} className={linkClass}>
          <BadgePercent className="w-5 h-5 text-rose-500" /> {t('nav.offers')}
        </Link>

        <Link to="/products?trending=true" onClick={onClose} className={linkClass}>
          <Flame className="w-5 h-5 text-gold-600" /> {t('nav.trending')}
        </Link>

        <Link to="/products?sort=newest" onClick={onClose} className={linkClass}>
          <Sparkles className="w-5 h-5 text-amber-500" /> {t('nav.newArrivals', 'المنتجات الجديدة')}
        </Link>

        <div className={dividerClass} />

        <Link to={isAuthenticated ? '/my-orders' : '/auth'} onClick={onClose} className={linkClass}>
          <Package className="w-5 h-5 text-slate-400" /> {t('nav.orders')}
        </Link>

        <div className={dividerClass} />

        <Link to="/about" onClick={onClose} className={linkClass}>
          <Info className="w-5 h-5 text-slate-400" /> {t('nav.about', 'من نحن')}
        </Link>

        <Link to="/contact" onClick={onClose} className={linkClass}>
          <Phone className="w-5 h-5 text-slate-400" /> {t('nav.contact', 'تواصل معنا')}
        </Link>

        <Link to="/branches" onClick={onClose} className={linkClass}>
          <MapPin className="w-5 h-5 text-slate-400" /> {t('nav.branches', 'فروعنا / موقعنا')}
        </Link>

        <div className={dividerClass} />

        <div className="px-4 py-2" role="group" aria-label={t('settings.language')}>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">{t('settings.language')}</p>
          <div className="grid grid-cols-2 gap-2">
            {['ar', 'en'].map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => onChangeLanguage(code)}
                className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                  language === code
                    ? 'border-gold-500 bg-gold-50 dark:bg-gold-900/30 text-gold-700 dark:text-gold-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
                aria-pressed={language === code}
              >
                {code === 'ar' ? t('settings.languageArabic') : t('settings.languageEnglish')}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 py-2" role="group" aria-label={t('settings.appearance')}>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">{t('settings.appearance')}</p>
          <button
            type="button"
            onClick={onToggleTheme}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-sm font-bold text-slate-700 dark:text-slate-200 hover:border-gold-300 dark:hover:border-gold-600 transition-all"
            aria-pressed={isDark}
          >
            <span className="flex items-center gap-3">
              {isDark ? (
                <Sun className="w-5 h-5 text-gold-500" aria-hidden="true" />
              ) : (
                <Moon className="w-5 h-5 text-slate-500" aria-hidden="true" />
              )}
              {t('settings.darkMode')}
            </span>
            <span
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                isDark ? 'bg-gold-500' : 'bg-slate-300 dark:bg-slate-600'
              }`}
              aria-hidden="true"
            >
              <span
                className={`absolute top-0.5 start-0.5 inline-block h-5 w-5 rounded-full bg-white shadow transition-[inset-inline-start] duration-200 ${
                  isDark ? 'start-[1.375rem]' : 'start-0.5'
                }`}
              />
            </span>
          </button>
        </div>

        <div className={dividerClass} />

        <Link to={isAuthenticated ? '/profile' : '/auth'} onClick={onClose} className={linkClass}>
          <Settings className="w-5 h-5 text-slate-400" /> {t('nav.settings')}
        </Link>

        {isAdmin && (
          <>
            <div className={dividerClass} />
            <Link
              to="/admin"
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-xl transition-colors"
            >
              <Crown className="w-5 h-5" /> لوحة المسؤول
            </Link>
          </>
        )}

        <div className="mt-2">
          {isAuthenticated ? (
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors w-full text-right"
            >
              <LogOut className="w-5 h-5" /> تسجيل الخروج
            </button>
          ) : (
            <Link
              to="/auth"
              onClick={onClose}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gold-500 text-white font-bold rounded-xl text-sm hover:bg-gold-400 transition-all mx-2"
            >
              <LogIn className="w-4 h-4" /> تسجيل الدخول
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
