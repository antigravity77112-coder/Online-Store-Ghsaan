import React, { useState, useEffect, useCallback, useMemo, Suspense, lazy } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  ShoppingBag,
  Menu,
  X,
  Sun,
  Moon,
  Heart,
  LogIn,
  LogOut,
  User,
  Package,
  Crown,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useFavorites } from "../context/FavoritesContext";
import { useTheme } from "../context/ThemeContext";
import Footer from "./Footer";
import BrandTrio from "./BrandTrio";
import MobileBottomNav from "./MobileBottomNav";
import HomeCategoryTabs from "./HomeCategoryTabs";
import BannerRenderer from "./BannerRenderer";
import CartDrawer from "./CartDrawer";
import ListingSearchField from "./listing/ListingSearchField";
import { useLocation } from "react-router-dom";
import { useSiteConfig } from "../context/SiteConfigContext";
import { themePage } from "../config/themeTokens";
import { useTranslation } from "react-i18next";
import { useLocale } from "../context/LocaleContext";
import { isShopChromeRoute } from "../utils/marketplaceNav";
import { pushRecentSearch } from "../utils/recentSearches";

const MobileNavDrawer = lazy(() => import("./MobileNavDrawer"));

const Layout = React.memo(({ children, homeMarketplace = false, hideMobileHeader = false }) => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { cartCount } = useCart();
  const { favoritesCount } = useFavorites();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const search = searchParams.toString() ? `?${searchParams.toString()}` : '';
  const isProductsPage = pathname === '/products';
  const showShopChrome = isShopChromeRoute(pathname) && !hideMobileHeader;
  const isHomePage = pathname === '/' || pathname === '';
  const isCategoriesPage = pathname === '/categories' || pathname.startsWith('/categories/');
  const showMobileBottomNav = !pathname.startsWith('/admin') && !pathname.startsWith('/checkout');
  // Shop chrome hides footer on mobile elsewhere; home + categories always show it.
  const showFooterOnMobile = isHomePage || isCategoriesPage || !showShopChrome;
  const mobileSearchTopClass = 'top-[var(--mobile-current-chrome-height)]';
  const searchFromUrl = isProductsPage ? (searchParams.get('search') || '') : '';

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [desktopSearchOpen, setDesktopSearchOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { config } = useSiteConfig();
  const { t } = useTranslation();
  const { dir, changeLanguage, language } = useLocale();

  const desktopNavLinks = useMemo(() => ([
    { to: "/", label: t("nav.home") },
    { to: "/products", label: t("nav.products") },
    { to: "/categories", label: t("nav.categories") },
    { to: "/brands", label: t("nav.brands") },
    { to: "/products?promoted=true", label: t("nav.offers") },
    { to: "/products?trending=true", label: t("nav.trending") },
  ]), [t]);

  const brandWordClass = showShopChrome
    ? 'text-stone-50 max-md:text-stone-50 md:text-slate-900 md:dark:text-white'
    : 'text-slate-900 dark:text-white';

  useEffect(() => {
    if (isProductsPage) {
      setSearchQuery(searchFromUrl);
    }
  }, [isProductsPage, searchFromUrl]);

  useEffect(() => {
    setMobileSearchOpen(false);
    setDesktopSearchOpen(false);
    setIsMobileMenuOpen(false);
  }, [pathname, searchParams]);

  const handleLogout = useCallback(() => {
    logout();
    navigate("/");
    setIsMobileMenuOpen(false);
  }, [logout, navigate]);

  const runSearch = useCallback(
    (override) => {
      const q = String(typeof override === 'string' ? override : searchQuery).trim();
      if (q) {
        pushRecentSearch(q);
        setSearchQuery(q);
        navigate(`/products?search=${encodeURIComponent(q)}`);
      } else {
        navigate("/products");
      }
      setIsMobileMenuOpen(false);
      setDesktopSearchOpen(false);
      setMobileSearchOpen(false);
    },
    [searchQuery, navigate],
  );

  const renderDesktopSearchForm = (className = "") => (
    <ListingSearchField
      value={searchQuery}
      onChange={setSearchQuery}
      onClear={() => setSearchQuery('')}
      onSubmit={runSearch}
      placeholder={t("nav.searchPlaceholder")}
      className={className}
      inputClassName="py-2.5 rounded-full shadow-sm"
    />
  );

  const mobileNavLinkClass =
    'flex items-center gap-3 px-4 py-3 text-sm font-semibold text-stone-800 dark:text-stone-100 hover:bg-stone-50 dark:hover:bg-stone-800/80 rounded-xl transition-colors';

  const mobileMenuDividerClass = 'h-px bg-stone-200/80 dark:bg-stone-700/80 my-1 mx-2';

  return (
    <div
      className={`min-h-screen min-w-0 overflow-x-clip ${themePage} flex flex-col font-sans transition-colors duration-300`}
      dir={dir}
      style={{
        '--mobile-current-chrome-height': hideMobileHeader
          ? '0px'
          : showShopChrome
            ? 'var(--mobile-shop-chrome-height)'
            : 'var(--mobile-header-height)',
        '--mobile-current-bottom-offset': showMobileBottomNav
          ? 'var(--mobile-bottom-nav-offset)'
          : '0px',
      }}
    >
      {/* شريط التنقل / Navigation Bar */}
      <div className={`sticky top-0 z-50 isolate ${hideMobileHeader ? 'max-md:hidden' : ''}`}>
      <header
        className={`border-b md:bg-site-surface md:dark:bg-site-surface-dark md:shadow-sm ${
          showShopChrome
            ? 'max-md:bg-[#565656] max-md:border-white/15 md:border-site-border md:dark:border-site-border-dark'
            : 'max-md:bg-site-surface max-md:dark:bg-site-surface-dark max-md:border-site-border max-md:dark:border-site-border-dark md:border-site-border/60 md:dark:border-site-border-dark/60'
        }`}
      >
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          {/* Equal side rails keep BrandTrio visually centered */}
          <div className="grid h-[var(--mobile-header-height)] grid-cols-[minmax(3.5rem,auto)_minmax(0,1fr)_minmax(3.5rem,auto)] items-center gap-x-0.5 overflow-x-clip sm:gap-x-2 md:h-auto md:min-h-16 md:py-1 sm:grid-cols-[minmax(4.5rem,1fr)_minmax(0,auto)_minmax(4.5rem,1fr)]">
            {/* START / RIGHT SIDE (Menu + Search) */}
            <div className="flex min-w-0 items-center justify-start gap-0 sm:gap-1">
              <button
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40 md:hidden ${
                  showShopChrome
                    ? 'text-stone-200 hover:text-white hover:bg-white/10'
                    : 'text-gray-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white focus-visible:bg-gray-100 dark:focus-visible:bg-slate-800'
                }`}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="فتح القائمة"
              >
                {isMobileMenuOpen ? <X className="h-5 w-5 sm:h-6 sm:w-6" /> : <Menu className="h-5 w-5 sm:h-6 sm:w-6" />}
              </button>

              {/* بحث الجوال — يمين الهيدر */}
              {!isProductsPage && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileSearchOpen((open) => !open);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40 md:hidden ${
                    mobileSearchOpen
                      ? showShopChrome
                        ? 'text-gold-400 bg-white/15'
                        : 'text-gold-600 dark:text-gold-300 bg-gold-50 dark:bg-gold-900/40'
                      : showShopChrome
                        ? 'text-stone-200 hover:text-white hover:bg-white/10'
                        : 'text-gray-500 dark:text-slate-400 hover:text-gold-600 dark:hover:text-gold-300 hover:bg-gold-50 dark:hover:bg-gold-500/10'
                  }`}
                  aria-label="بحث"
                  aria-expanded={mobileSearchOpen}
                >
                  <Search className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* CENTER / BRAND — Smart Shopper | logo | المتسوق الذكي */}
            <div className="flex min-w-0 justify-center justify-self-center overflow-visible px-0.5">
              <BrandTrio size="header" wordClassName={brandWordClass} />
            </div>

            {/* END / LEFT SIDE (theme + favorites — balances menu/search on the other rail) */}
            <div className="flex min-w-0 items-center justify-end gap-0 sm:gap-1">
              {/* Desktop search — icon toggle only (full bar opens below) */}
              {!isProductsPage && (
                <button
                  type="button"
                  onClick={() => setDesktopSearchOpen((open) => !open)}
                  className={`hidden md:flex items-center justify-center p-2 rounded-xl border transition-all flex-shrink-0 ${
                    desktopSearchOpen
                      ? 'border-gold-400 bg-gold-50 text-gold-600 dark:bg-gold-900/40 dark:border-gold-600 dark:text-gold-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-gold-300 hover:text-gold-600 dark:hover:border-gold-700 dark:hover:text-gold-300'
                  }`}
                  aria-label="بحث"
                  aria-expanded={desktopSearchOpen}
                >
                  <Search className="h-5 w-5" />
                </button>
              )}

              {/* Admin — icon only in storefront header (never crowds the brand) */}
              {isAdmin && (
                <Link
                  to="/admin"
                  title="لوحة المسؤول"
                  aria-label="لوحة المسؤول"
                  className="hidden sm:flex items-center justify-center p-2 border border-purple-200 dark:border-purple-700 rounded-xl text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-all flex-shrink-0"
                >
                  <Crown className="w-4 h-4" />
                </Link>
              )}

              {/* Orders — icon only */}
              {isAuthenticated && (
                <Link
                  to="/my-orders"
                  title="طلباتي"
                  aria-label="طلباتي"
                  className="hidden md:flex items-center justify-center p-2 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-gold-50 dark:hover:bg-gold-900/30 hover:border-gold-300 dark:hover:border-gold-700 transition-all flex-shrink-0"
                >
                  <Package className="w-4 h-4" />
                </Link>
              )}

              {/* Night mode — beside favorites on mobile and desktop */}
              <button
                type="button"
                onClick={toggleTheme}
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40 ${
                  showShopChrome
                    ? 'max-md:text-stone-200 max-md:hover:text-white max-md:hover:bg-white/10 md:text-gray-500 md:dark:text-slate-400 md:hover:text-gold-500 md:dark:hover:text-gold-400 md:hover:bg-gold-50 md:dark:hover:bg-gold-500/10'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gold-500 dark:hover:text-gold-400 hover:bg-gold-50 dark:hover:bg-gold-500/10'
                }`}
                aria-label={
                  isDark ? t('settings.lightMode', 'تفعيل الوضع الفاتح') : t('settings.darkMode', 'تفعيل الوضع الداكن')
                }
                aria-pressed={isDark}
                title={isDark ? t('settings.lightMode', 'الوضع الفاتح') : t('settings.darkMode', 'الوضع الداكن')}
              >
                {isDark ? (
                  <Sun className="w-5 h-5 transition-transform hover:rotate-45 duration-300" aria-hidden="true" />
                ) : (
                  <Moon className="w-5 h-5 transition-transform hover:-rotate-12 duration-300" aria-hidden="true" />
                )}
              </button>

              {/* Favorites */}
              <Link
                to="/favorites"
                className={`relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40 ${
                  showShopChrome
                    ? 'max-md:text-stone-200 max-md:hover:text-white max-md:hover:bg-white/10'
                    : 'text-gray-400 dark:text-gold-700 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10'
                }`}
                aria-label={favoritesCount > 0 ? `المفضلة، ${favoritesCount} منتج` : 'المفضلة'}
              >
                <span className="relative inline-flex">
                  <Heart className="h-5 w-5" />
                  {favoritesCount > 0 && (
                    <span className="absolute -top-1.5 -end-1.5 min-w-[14px] h-[14px] px-0.5 bg-rose-500 rounded-full text-[8px] font-bold leading-none text-white flex items-center justify-center border border-white dark:border-gold-950 pointer-events-none">
                      {favoritesCount > 99 ? "99+" : favoritesCount}
                    </span>
                  )}
                </span>
              </Link>

              {/* Cart — desktop only; mobile uses bottom nav (including /cart and /profile) */}
              <Link
                to="/cart"
                className={`hidden md:inline-flex p-2 transition-colors relative group focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40 rounded-xl flex-shrink-0 ${
                  showShopChrome
                    ? 'max-md:text-stone-200 max-md:hover:text-white max-md:hover:bg-white/10'
                    : 'text-gray-500 dark:text-gold-600 hover:text-gold-600 dark:hover:text-gold-400 hover:bg-gold-50 dark:hover:bg-gold-500/10'
                }`}
              >
                <span className="relative inline-flex">
                  <ShoppingBag className="h-5 w-5 group-hover:scale-110 transition-transform" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1.5 -end-1.5 min-w-[14px] h-[14px] px-0.5 bg-gold-500 rounded-full text-[8px] font-bold leading-none text-white flex items-center justify-center border border-white dark:border-gold-950 pointer-events-none">
                      {cartCount > 99 ? "99+" : cartCount}
                    </span>
                  )}
                </span>
              </Link>

              {/* Profile / Login — avatar only (name in title tooltip) */}
              {isAuthenticated ? (
                <div className="hidden md:flex items-center gap-0.5 flex-shrink-0">
                  <Link
                    to="/profile"
                    title={user?.fullName || 'الملف الشخصي'}
                    aria-label={user?.fullName || 'الملف الشخصي'}
                    className="flex items-center justify-center p-1.5 bg-gold-50 dark:bg-gold-900/40 rounded-xl border border-gold-100 dark:border-gold-800 hover:bg-gold-100 dark:hover:bg-gold-900/60 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-gold-500 flex items-center justify-center text-white text-xs font-bold">
                      {user?.fullName?.charAt(0) || (
                        <User className="w-4 h-4" />
                      )}
                    </div>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-gray-400 dark:text-gold-700 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10"
                    title="تسجيل الخروج"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <Link
                  to="/auth"
                  className="hidden md:flex items-center justify-center gap-1.5 px-3 py-2 bg-gold-500 text-white rounded-xl text-sm font-bold hover:bg-gold-400 transition-all shadow-sm hover:shadow-md active:scale-[0.98] flex-shrink-0"
                >
                  <LogIn className="w-4 h-4" />
                  <span className="hidden lg:inline">تسجيل الدخول</span>
                </Link>
              )}
            </div>
          </div>

          {/* Expandable desktop search drawer */}
          {!isProductsPage && (
          <div
            className={`hidden md:block transition-all duration-200 ease-out ${
              desktopSearchOpen
                ? 'max-h-[min(28rem,75vh)] opacity-100 overflow-visible'
                : 'max-h-0 opacity-0 overflow-hidden pointer-events-none'
            }`}
          >
            <div className="pb-3 pt-1">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 shadow-sm overflow-visible">
                {renderDesktopSearchForm('')}
              </div>
            </div>
          </div>
          )}

          {/* قائمة الجوال / Mobile Menu — lazy chunk */}
          {isMobileMenuOpen && (
            <Suspense fallback={<div className="md:hidden py-6 text-center text-sm text-slate-400" aria-busy="true">...</div>}>
              <MobileNavDrawer
                showShopChrome={showShopChrome}
                favoritesCount={favoritesCount}
                isAuthenticated={isAuthenticated}
                isAdmin={isAdmin}
                isDark={isDark}
                language={language}
                linkClass={mobileNavLinkClass}
                dividerClass={mobileMenuDividerClass}
                onClose={() => setIsMobileMenuOpen(false)}
                onLogout={handleLogout}
                onToggleTheme={toggleTheme}
                onChangeLanguage={(code) => {
                  changeLanguage(code, { syncBackend: isAuthenticated });
                  setIsMobileMenuOpen(false);
                }}
              />
            </Suspense>
          )}

          {/* Desktop main navigation */}
          <nav className="hidden md:flex items-center justify-center gap-1.5 pb-3 border-t border-slate-100/80 dark:border-slate-800/80 pt-2.5" aria-label="التنقل الرئيسي">
            {desktopNavLinks.map(({ to, label }) => {
              const isActive = to === '/'
                ? pathname === '/' && !search
                : to.includes('promoted=true')
                  ? pathname === '/products' && search.includes('promoted=true')
                  : to.includes('trending=true')
                    ? pathname === '/products' && search.includes('trending=true')
                    : pathname.startsWith(to);

              return (
                <Link
                  key={to}
                  to={to}
                  className={`px-4 py-2 text-sm font-semibold leading-[1.45] rounded-lg transition-colors ${
                    isActive
                      ? 'text-gold-700 dark:text-gold-400 bg-gold-50 dark:bg-gold-900/30'
                      : 'text-slate-600 dark:text-slate-400 hover:text-gold-600 dark:hover:text-gold-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {showShopChrome && <HomeCategoryTabs />}
      </div>

      {/* تيكَر إعلاني تحت الهيدر وفوق الهيرو / المحتوى — تدفق عادي بدون تراكب */}
      <div className={hideMobileHeader ? 'max-md:hidden' : ''}>
        <BannerRenderer placement="announcement" />
      </div>

      {/* لوحة بحث الجوال — تظهر عند النقر على أيقونة البحث */}
      {!isProductsPage && mobileSearchOpen && (
        <>
          <button
            type="button"
            className={`md:hidden fixed inset-0 ${mobileSearchTopClass} z-[55] bg-black/25`}
            onClick={() => setMobileSearchOpen(false)}
            aria-label="إغلاق البحث"
          />
          <div className={`md:hidden fixed inset-x-0 ${mobileSearchTopClass} z-[60] overflow-visible bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 shadow-md`} dir={dir}>
            {renderDesktopSearchForm('')}
          </div>
        </>
      )}

      {/* المحتوى الرئيسي / Main Content */}
      <main className={`w-full min-w-0 pb-[var(--mobile-current-bottom-offset)] md:pb-0 ${homeMarketplace ? '' : 'flex-grow'}`}>{children}</main>

      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full ${showFooterOnMobile ? '' : 'hidden md:block'} ${homeMarketplace ? 'mt-2' : ''}`}>
        <BannerRenderer placement="footer" />
      </div>

      {/* الفوتر / Footer */}
      <div className={showFooterOnMobile ? '' : 'hidden md:block'}>
        <Footer />
      </div>

      {/* شريط التنقل السفلي للجوال / Mobile Bottom Nav */}
      <MobileBottomNav />

      <CartDrawer />

      {/* نافذة منبثقة / Popup Banner */}
      <BannerRenderer placement="popup" />
    </div>
  );
});
Layout.displayName = "Layout";

export default Layout;
