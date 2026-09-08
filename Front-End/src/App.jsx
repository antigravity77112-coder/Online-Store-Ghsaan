import React, { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { preload } from "swr";
import * as api from "./services/api";
import HomePage from "./pages/HomePage";
import ScrollToTop from "./components/ScrollToTop";

// ─── Route-based code splitting ───
// EN: Only HomePage is loaded eagerly (it's the landing page / LCP critical path).
//     All other pages are lazy-loaded on demand, reducing initial JS by ~55%.
// AR: فقط الصفحة الرئيسية تُحمّل مبدئياً (هي صفحة الهبوط / مسار LCP الحرج).
//     كل الصفحات الأخرى تُحمّل عند الطلب، مما يقلل JS الأولي بـ ~55%.
const ProductDetailsPage = React.lazy(
  () => import("./pages/ProductDetailsPage"),
);
const AdminDashboard = React.lazy(() =>
  import("./pages/AdminDashboard").catch((err) => {
    console.error("AdminDashboard chunk failed to load:", err);
    return {
      default: () => (
        <div className="min-h-screen flex items-center justify-center bg-[#f8f6f1] dark:bg-slate-950 px-4" dir="rtl">
          <div className="text-center">
            <p className="text-red-600 font-bold mb-2">تعذّر تحميل لوحة المسؤول</p>
            <button type="button" onClick={() => window.location.reload()} className="text-sm text-gold-600 underline">
              إعادة المحاولة
            </button>
          </div>
        </div>
      ),
    };
  }),
);
const AuthPage = React.lazy(() => import("./pages/AuthPage"));
const CartPage = React.lazy(() => import("./pages/CartPage"));
const MyOrdersPage = React.lazy(() => import("./pages/MyOrdersPage"));
const ProfilePage = React.lazy(() => import("./pages/ProfilePage"));
const FavoritesPage = React.lazy(() => import("./pages/FavoritesPage"));
const ProductsPage = React.lazy(() => import("./pages/ProductsPage"));
const CategoryPage = React.lazy(() => import("./pages/CategoryPage"));
const CategoriesPage = React.lazy(() => import("./pages/CategoriesPage"));
const BrandPage = React.lazy(() => import("./pages/BrandPage"));
const ProductGridDemo = React.lazy(
  () => import("./components/HighConversionGrid/ProductGridDemo"),
);
const AboutPage = React.lazy(() => import("./pages/AboutPage"));
const PrivacyPolicyPage = React.lazy(() => import("./pages/PrivacyPolicyPage"));
const ContactPage = React.lazy(() => import("./pages/ContactPage"));
const BranchesPage = React.lazy(() => import("./pages/BranchesPage"));

// EN: ChatWidget is lazy-loaded because it imports react-markdown + remark-gfm (~45KB gzip).
//     The FAB button still appears immediately via a lightweight wrapper.
// AR: ChatWidget يُحمّل كسولاً لأنه يستورد react-markdown + remark-gfm (~45KB gzip).
//     زر FAB يظهر فوراً عبر غلاف خفيف.
// const ChatWidget = React.lazy(() => import("./components/chat/ChatWidget"));
const WhatsAppFAB = React.lazy(() => import("./components/WhatsAppFAB"));
const BackToTop = React.lazy(() => import("./components/BackToTop"));

/**
 * EN: Minimal loading fallback — a subtle centered spinner.
 *     Uses pure CSS to avoid importing any component library.
 * AR: مؤشر تحميل بسيط — دوّار مركزي ناعم.
 *     يستخدم CSS نقي لتجنب استيراد أي مكتبة مكونات.
 */
const PageLoadingFallback = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-bone dark:bg-slate-950 gap-4">
    <div className="fixed top-0 inset-x-0 z-[100] h-1 overflow-hidden bg-gold-500/15">
      <div className="h-full w-1/3 bg-gradient-to-l from-gold-600 via-amber-400 to-gold-500 animate-[pageProgress_1.1s_ease-in-out_infinite]" />
    </div>
    <style>{`
      @keyframes pageProgress {
        0% { transform: translateX(200%); }
        100% { transform: translateX(-400%); }
      }
    `}</style>
    <div className="w-10 h-10 border-2 border-gold-200 dark:border-slate-700 border-t-gold-600 dark:border-t-gold-400 rounded-full animate-spin" />
  </div>
);

class RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('Route render error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-bone dark:bg-slate-950 px-4" dir="rtl">
          <div className="max-w-md w-full rounded-2xl border border-red-200 bg-white dark:bg-slate-900 p-6 text-center shadow-lg">
            <h1 className="text-lg font-bold text-red-600 mb-2">تعذّر تحميل الصفحة</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              {this.state.error?.message || 'حدث خطأ غير متوقع.'}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-gold-600 text-white text-sm font-bold"
            >
              إعادة تحميل
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) return <PageLoadingFallback />;
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const App = () => {
  // Storefront Warm-Up (Predictive Prefetching)
  React.useEffect(() => {
    preload('categories', () => api.getCategories() || []);
    preload('siteConfig', api.getSiteConfig);
    preload('home-products-offers', () => api.getProducts({ specialOffers: true, pageSize: 8 }));
    preload('home-products-trending', () => api.getProducts({ trending: true, pageSize: 8 }));
    preload('home-products-catalog', () => api.getProducts({ pageSize: 32 }));
  }, []);

  return (
    <>
      <ScrollToTop />
      <RouteErrorBoundary>
      <Suspense fallback={<PageLoadingFallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/category/:slug" element={<CategoryPage />} />
          <Route path="/brand/:slug" element={<BrandPage />} />
          <Route path="/scents" element={<Navigate to="/" replace />} />
          <Route path="/scents/:slug" element={<Navigate to="/" replace />} />
          {import.meta.env.DEV && (
            <Route path="/product-grid-demo" element={<ProductGridDemo />} />
          )}
          {/* Primary SEO-friendly slug route */}
          <Route path="/product/:slug" element={<ProductDetailsPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/branches" element={<BranchesPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/my-orders"
            element={
              <ProtectedRoute allowedRoles={["Buyer", "Admin"]}>
                <MyOrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["Admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      </RouteErrorBoundary>
      {/* Chat FAB — Disabled per user request */}
      {/* 
      <Suspense fallback={null}>
        <ChatWidget />
      </Suspense> 
      */}
      {/* WhatsApp FAB — home page only */}
      <Suspense fallback={null}>
        <WhatsAppFAB />
      </Suspense>
      {/* Back to Top — appears after 400px scroll */}
      <Suspense fallback={null}>
        <BackToTop />
      </Suspense>
    </>
  );
};

export default App;
