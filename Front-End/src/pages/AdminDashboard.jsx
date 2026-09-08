import React, { useState, useEffect, Suspense } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Search,
  Users,
  Package,
  Tag,
  DollarSign,
  Home,
  Loader2,
  AlertCircle,
  CheckCircle,
  X,
  Trash2,
  ShieldBan,
  ShieldCheck,
  UserCog,
  Plus,
  Edit3,
  Save,
  RefreshCw,
  TrendingUp,
  ShoppingCart,
  UserPlus,
  Ban,
  Crown,
  Info,
  Phone,
  Mail,
  Link as LinkIcon,
  Clock,
  Truck,
  XCircle,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Eye,
  Megaphone,
  MapPin,
  Database,
  Sparkles,
  Bell,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import useSWR, { preload, mutate } from "swr";
import * as api from "../services/api";
import { useSiteConfig } from "../context/SiteConfigContext";
import { DEFAULT_SITE_CONFIG, resolveSiteLogo } from "../config/siteConfigDefaults";
import { confirmDiscardDraft } from "../utils/adminDraftConfirm";
import { useTheme } from "../context/ThemeContext";
import { themeStatusError, themeStatusSuccess } from "../config/themeTokens";
/** Eager import — avoids Vite "Failed to fetch dynamically imported module" flakes on Arabic paths. */
import AdminUsersTab from "./admin/AdminUsersTab";

/** Retry lazy imports once (Vite HMR / network flake common on non-ASCII project paths). */
function lazyWithRetry(factory) {
  return React.lazy(async () => {
    try {
      return await factory();
    } catch (firstError) {
      await new Promise((r) => setTimeout(r, 400));
      try {
        return await factory();
      } catch {
        throw firstError;
      }
    }
  });
}

const AddProductFormLazy = lazyWithRetry(() => import("../components/AddProductForm"));

const AdminDashboardTab = lazyWithRetry(() => import("./admin/AdminDashboardTab"));
const AdminOrdersTab = lazyWithRetry(() => import("./admin/AdminOrdersTab"));
const AdminProductsTab = lazyWithRetry(() => import("./admin/AdminProductsTab"));
const AdminCategoriesTab = lazyWithRetry(() => import("./admin/AdminCategoriesTab"));
const AdminStoreInfoTab = lazyWithRetry(() => import("./admin/AdminStoreInfoTab"));
const AdminCustomizationTab = lazyWithRetry(() => import("./admin/AdminCustomizationTab"));
const AdminRatesTab = lazyWithRetry(() => import("./admin/AdminRatesTab"));
const AdminBannersTab = lazyWithRetry(() => import("./admin/AdminBannersTab"));
const AdminBranchesTab = lazyWithRetry(() => import("./admin/AdminBranchesTab"));
const AdminBrandsTab = lazyWithRetry(() => import("./admin/AdminBrandsTab"));
const AdminScentsTab = lazyWithRetry(() => import("./admin/AdminScentsTab"));
const AdminNotificationsTab = lazyWithRetry(() => import("./admin/AdminNotificationsTab"));

const AdminTabFallback = () => (
  <div className="flex items-center justify-center py-20">
    <Loader2 className="w-8 h-8 animate-spin text-gold-600" />
  </div>
);

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("AdminDashboard ErrorBoundary caught an error:", error, errorInfo);
  }
  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false, error: null, errorInfo: null });
    }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 sm:p-10 bg-white dark:bg-slate-900 rounded-2xl border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300">
          <h1 className="text-xl font-bold mb-2">حدث خطأ في لوحة التحكم</h1>
          <p className="mb-4 text-sm font-mono break-all">{this.state.error && this.state.error.toString()}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
              className="px-4 py-2 rounded-xl bg-gold-600 text-white text-sm font-bold"
            >
              إعادة المحاولة
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-sm font-bold"
            >
              تحديث الصفحة
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const AdminDashboard = () => {
  const { user, isAuthenticated } = useAuth();
  const { config } = useSiteConfig();
  const { isDark } = useTheme();
  const logo = resolveSiteLogo(config.media, { dark: isDark });
  const brandShort = config.brand?.siteShortName || DEFAULT_SITE_CONFIG.brand.siteShortName;
  const brandAr = config.brand?.siteNameAr || DEFAULT_SITE_CONFIG.brand.siteNameAr;
  const navigate = useNavigate();
  const isAdmin = user?.role === "Admin";

  const [activeTab, setActiveTab] = useState("dashboard");
  const [highlightOrderId, setHighlightOrderId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // SWR Conditional Fetching
  const isAuth = isAuthenticated && isAdmin;

  const {
    data: stats,
    isLoading: statsLoading,
  } = useSWR(isAuth && activeTab === "dashboard" ? "adminDashboard" : null, api.getAdminDashboard);

  const {
    data: usersData,
    isLoading: usersLoading,
    mutate: mutateUsers,
  } = useSWR(isAuth && activeTab === "users" ? "adminUsers" : null, api.getAdminUsers);
  const users = usersData || [];

  // Dashboard Warm-Up (Predictive Prefetching)
  useEffect(() => {
    if (isAuth) {
      preload("adminDashboard", api.getAdminDashboard);
      preload(["adminOrders", "All"], () => api.getAdminOrders("All"));
      preload("adminConfig", api.getAdminConfig);
    }
  }, [isAuth]);

  // Orders
  const {
    data: ordersData,
    isLoading: ordersLoading,
    mutate: mutateOrders,
  } = useSWR(isAuth && (activeTab === "orders" || activeTab === "dashboard") ? ["adminOrders", "All"] : null, () => api.getAdminOrders("All"));
  const orders = ordersData || [];

  // Site customization config
  const {
    data: adminConfigData,
    mutate: mutateAdminConfig,
  } = useSWR(isAuth && activeTab === "storeInfo" ? "adminConfig" : null, api.getAdminConfig);

  const [siteConfig, setSiteConfig] = useState({});
  const [storeInfoSaving, setStoreInfoSaving] = useState(false);

  useEffect(() => {
    if (adminConfigData) {
      setSiteConfig(adminConfigData);
    }
  }, [adminConfigData]);

  // Modals & Forms local state
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productFormMounted, setProductFormMounted] = useState(false);
  const [productFormKey, setProductFormKey] = useState(0);
  const [productFormDirty, setProductFormDirty] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryFormDirty, setCategoryFormDirty] = useState(false);
  const [categoryDraftActive, setCategoryDraftActive] = useState(false);
  const emptyCategoryForm = { name: "", slug: "", iconUrl: "", description: "", imageUrl: "", parentId: "", isActive: true, sortOrder: 0, metaTitle: "", metaDescription: "" };
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm);
  const categoryBaselineRef = React.useRef(JSON.stringify(emptyCategoryForm));

  const { data: allCategories } = useSWR(isAuth && (showCategoryForm || categoryDraftActive) ? "allCategories" : null, () => api.getCategories());

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) {
      navigate("/auth", { replace: true });
    }
  }, [isAuthenticated, isAdmin, navigate]);

  useEffect(() => {
    if (!productModalOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setProductModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [productModalOpen]);

  useEffect(() => {
    if (!showCategoryForm) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setShowCategoryForm(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showCategoryForm]);

  const showSuccessMsg = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  };

  const handleBlockUser = async (id) => {
    try {
      await api.blockUser(id);
      mutateUsers();
      showSuccessMsg("تم تحديث حالة المستخدم");
    } catch (err) {
      setError("فشل تحديث الحالة: " + (err.message || ""));
    }
  };

  const handleChangeRole = async (id, newRole) => {
    try {
      await api.changeUserRole(id, newRole);
      mutateUsers();
      showSuccessMsg("تم تغيير دور المستخدم");
    } catch (err) {
      setError("فشل تغيير الدور: " + (err.message || ""));
    }
  };

  const handleDeleteUser = async (id) => {
    if (!confirm("هل أنت متأكد من حذف هذا الحساب؟ لا يمكن التراجع!")) return;
    try {
      await api.deleteUser(id);
      mutateUsers();
      showSuccessMsg("تم حذف الحساب بنجاح");
    } catch (err) {
      setError("فشل حذف الحساب: " + (err.message || ""));
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!confirm("هل أنت متأكد من حذف هذا المنتج؟")) return;
    try {
      await api.deleteAdminProduct(id);
      mutate((key) => Array.isArray(key) && key[0] === 'adminProducts');
      showSuccessMsg("تم حذف المنتج بنجاح");
    } catch (err) {
      setError("فشل حذف المنتج: " + (err.message || ""));
    }
  };

  const softDismissProductModal = () => {
    setProductModalOpen(false);
  };

  const hardClearProductModal = ({ skipConfirm = false } = {}) => {
    if (!skipConfirm && !confirmDiscardDraft(productFormDirty)) return;
    setProductModalOpen(false);
    setProductFormMounted(false);
    setEditingProduct(null);
    setProductFormDirty(false);
    setProductFormKey((k) => k + 1);
  };

  const handleProductCreated = () => {
    const wasEdit = Boolean(editingProduct?.id);
    hardClearProductModal({ skipConfirm: true });
    showSuccessMsg(wasEdit ? "تم تعديل المنتج بنجاح! ✅" : "تم إضافة المنتج بنجاح! 🎉");
    mutate((key) => Array.isArray(key) && key[0] === 'adminProducts');
  };

  const openEditProductModal = async (product) => {
    // Reopen soft-dismissed add draft
    if (!product?.id) {
      if (productFormMounted && !editingProduct?.id) {
        setProductModalOpen(true);
        return;
      }
      if (productFormMounted && productFormDirty && !confirmDiscardDraft(true)) return;
      setEditingProduct(null);
      setProductFormDirty(false);
      setProductFormKey((k) => k + 1);
      setProductFormMounted(true);
      setProductModalOpen(true);
      return;
    }

    // Reopen soft-dismissed edit of the same product
    if (productFormMounted && editingProduct?.id === product.id) {
      setProductModalOpen(true);
      return;
    }

    if (productFormMounted && productFormDirty && !confirmDiscardDraft(true)) return;

    try {
      const fullProduct = await api.getProductById(product.id);
      if (!fullProduct) throw new Error('Product not found');
      setEditingProduct(fullProduct);
    } catch (err) {
      alert('تعذر تحميل بيانات المنتج الكاملة. يرجى المحاولة مرة أخرى قبل التعديل حتى لا تُفقد صور المنتج.');
      return;
    }
    setProductFormDirty(false);
    setProductFormKey((k) => k + 1);
    setProductFormMounted(true);
    setProductModalOpen(true);
  };

  const updateCategoryForm = (updater) => {
    setCategoryForm((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      setCategoryFormDirty(JSON.stringify(next) !== categoryBaselineRef.current);
      setCategoryDraftActive(true);
      return next;
    });
  };

  const resetCategoryFormState = () => {
    setEditingCategory(null);
    setCategoryForm(emptyCategoryForm);
    categoryBaselineRef.current = JSON.stringify(emptyCategoryForm);
    setCategoryFormDirty(false);
    setCategoryDraftActive(false);
  };

  const softDismissCategoryModal = () => {
    setShowCategoryForm(false);
  };

  const hardClearCategoryModal = ({ skipConfirm = false } = {}) => {
    if (!skipConfirm && !confirmDiscardDraft(categoryFormDirty)) return;
    setShowCategoryForm(false);
    resetCategoryFormState();
  };

  const openCategoryForm = (cat = null) => {
    if (cat) {
      if (categoryDraftActive && editingCategory?.id === cat.id) {
        setShowCategoryForm(true);
        return;
      }
      if (categoryDraftActive && categoryFormDirty && !confirmDiscardDraft(true)) return;
      setEditingCategory(cat);
      const next = {
        name: cat.name,
        slug: cat.slug || "",
        iconUrl: cat.iconUrl || "",
        description: cat.description || "",
        imageUrl: cat.imageUrl || "",
        parentId: cat.parentId || "",
        isActive: cat.isActive !== false,
        sortOrder: cat.sortOrder || 0,
        metaTitle: cat.metaTitle || "",
        metaDescription: cat.metaDescription || "",
      };
      setCategoryForm(next);
      categoryBaselineRef.current = JSON.stringify(next);
      setCategoryFormDirty(false);
      setCategoryDraftActive(true);
    } else {
      if (categoryDraftActive && !editingCategory) {
        setShowCategoryForm(true);
        return;
      }
      if (categoryDraftActive && categoryFormDirty && !confirmDiscardDraft(true)) return;
      setEditingCategory(null);
      setCategoryForm(emptyCategoryForm);
      categoryBaselineRef.current = JSON.stringify(emptyCategoryForm);
      setCategoryFormDirty(false);
      setCategoryDraftActive(true);
    }
    setShowCategoryForm(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) {
      setError("اسم التصنيف مطلوب");
      return;
    }
    const payload = {
      name: categoryForm.name,
      slug: (categoryForm.slug ?? "").trim() || undefined, // undefined = auto-generate on backend
      iconUrl: categoryForm.iconUrl || null,
      description: categoryForm.description || null,
      imageUrl: categoryForm.imageUrl || null,
      parentId: categoryForm.parentId || null,
      isActive: categoryForm.isActive,
      sortOrder: parseInt(categoryForm.sortOrder) || 0,
      metaTitle: categoryForm.metaTitle || null,
      metaDescription: categoryForm.metaDescription || null,
    };

    try {
      if (editingCategory) {
        await api.updateCategory(editingCategory.id, payload);
        mutate('allCategoriesAdmin');
        mutate('allCategories');
        showSuccessMsg("تم تحديث التصنيف");
      } else {
        await api.createCategory(payload);
        mutate('allCategoriesAdmin');
        mutate('allCategories');
        showSuccessMsg("تم إضافة التصنيف بنجاح 🎉");
      }
      hardClearCategoryModal({ skipConfirm: true });
    } catch (err) {
      setError("فشل حفظ التصنيف: " + (err.message || ""));
    }
  };


  const handleSaveSiteConfig = async () => {
    setStoreInfoSaving(true);
    try {
      const {
        public: _pub, updatedAt, id, ...payload
      } = siteConfig;
      await api.updateSiteConfig(payload);
      mutateAdminConfig();
      const freshConfig = await api.getSiteConfig();
      mutate('siteConfig', freshConfig, { revalidate: false });
      showSuccessMsg("تم حفظ التخصيص بنجاح ✅");
    } catch (err) {
      setError("فشل حفظ التخصيص: " + (err.message || ""));
    }
    setStoreInfoSaving(false);
  };

  const tabGroups = [
    {
      label: 'نظرة عامة',
      items: [{ id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard }],
    },
    {
      label: 'العمليات',
      items: [
        { id: 'orders', label: 'إدارة الطلبات', icon: ClipboardList },
        { id: 'notifications', label: 'الإشعارات', icon: Bell },
        { id: 'users', label: 'المستخدمين', icon: Users },
      ],
    },
    {
      label: 'المتجر',
      items: [
        { id: 'products', label: 'المحتوى', icon: Package },
        { id: 'categories', label: 'التصنيفات', icon: Tag },
        { id: 'brands', label: 'العلامات التجارية', icon: Crown },
        { id: 'scents', label: 'عائلات الروائح', icon: Sparkles },
      ],
    },
    {
      label: 'التسويق',
      items: [
        { id: 'banners', label: 'الإعلانات', icon: Megaphone },
        { id: 'branches', label: 'الفروع', icon: MapPin },
      ],
    },
    {
      label: 'الإعدادات',
      items: [
        { id: 'storeInfo', label: 'تخصيص المتجر', icon: Info },
        { id: 'rates', label: 'أسعار الصرف', icon: DollarSign },
        { id: 'storeBackup', label: 'نسخ احتياطي', icon: Database },
      ],
    },
  ];

  const activeTabMeta = tabGroups.flatMap((g) => g.items).find((t) => t.id === activeTab);

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f6f1] dark:bg-slate-950">
        <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
      </div>
    );
  }

  const renderNavButton = (tab, compact = false) => (
    <button
      key={tab.id}
      type="button"
      onClick={() => setActiveTab(tab.id)}
      className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
        activeTab === tab.id
          ? 'bg-gradient-to-l from-gold-500/20 to-gold-600/10 text-gold-700 dark:text-gold-300 border border-gold-400/30 shadow-sm shadow-gold-500/10'
          : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
      }`}
    >
      <tab.icon className={`w-4 h-4 flex-shrink-0 ${activeTab === tab.id ? 'text-gold-600 dark:text-gold-400' : ''}`} />
      {!compact && <span className="truncate">{tab.label}</span>}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#f8f6f1] dark:bg-slate-950 font-sans" dir="rtl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(218,165,32,0.06),_transparent_50%)] pointer-events-none" />

        <div className="relative flex min-h-screen">
          {/* Sidebar — desktop */}
          <aside className="hidden lg:flex w-72 flex-shrink-0 flex-col border-l border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl sticky top-0 h-screen z-30 overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 overflow-visible">
              <Link to="/" className="flex items-center gap-3 min-w-0 group">
                <div className="w-11 h-11 flex-shrink-0 bg-white rounded-2xl flex items-center justify-center shadow-md shadow-gold-500/10 overflow-hidden border border-gold-200/50 ring-2 ring-gold-500/10">
                  <img src={logo} alt={brandShort} className="w-full h-full object-cover scale-[1.12] transition-transform group-hover:scale-[1.16]" />
                </div>
                <div className="min-w-0 overflow-visible">
                  <div className="flex items-center gap-1.5 font-serif font-bold leading-tight" dir="ltr">
                    <span className="text-sm text-slate-900 dark:text-white truncate">{brandShort}</span>
                    <span className="text-sm text-slate-900 dark:text-white">{brandAr}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">لوحة المسؤول · {user?.fullName || 'مسؤول'}</p>
                </div>
              </Link>
            </div>

            <nav className="flex-1 overflow-y-auto p-4 space-y-5">
              {tabGroups.map((group) => (
                <div key={group.label}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-2">{group.label}</p>
                  <div className="space-y-1">
                    {group.items.map((tab) => renderNavButton(tab))}
                  </div>
                </div>
              ))}
            </nav>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800">
              <Link
                to="/"
                className="flex items-center justify-center gap-2 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:border-gold-400/40 hover:text-gold-700 dark:hover:text-gold-300 transition-all"
              >
                <Home className="w-4 h-4" />
                العودة للمتجر
              </Link>
            </div>
          </aside>

          {/* Main area */}
          <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0 relative z-0">
            {/* Mobile header */}
            <header className="lg:hidden sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800">
              <div className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl overflow-hidden border border-gold-200/50 flex-shrink-0">
                    <img src={logo} alt={brandShort} className="w-full h-full object-cover scale-[1.12]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-900 dark:text-white truncate">
                      {activeTabMeta?.label || 'لوحة المسؤول'}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">{user?.fullName || 'مسؤول'}</p>
                  </div>
                </div>
                <Link to="/" className="text-xs font-semibold text-gold-600 flex items-center gap-1 flex-shrink-0">
                  <Home className="w-3.5 h-3.5" />
                  المتجر
                </Link>
              </div>
            </header>

            {/* Desktop page header */}
            <header className="hidden lg:block border-b border-slate-200/60 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
              <div className="px-6 lg:px-8 py-5">
                <p className="text-xs font-semibold text-gold-600 dark:text-gold-400 mb-1">Smart Shopper Admin</p>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                  {activeTabMeta?.label || 'لوحة التحكم'}
                </h2>
              </div>
            </header>

            <div className="flex-1 px-4 sm:px-6 lg:px-8 py-5 lg:py-7">
          {/* Notifications */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`mb-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between ${themeStatusError} text-sm px-4 py-3 rounded-xl`}>
                <span className="flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {error}</span>
                <button onClick={() => setError("")}><X className="w-4 h-4" /></button>
              </motion.div>
            )}
            {success && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`mb-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between ${themeStatusSuccess} text-sm px-4 py-3 rounded-xl`}>
                <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> {success}</span>
                <button onClick={() => setSuccess("")}><X className="w-4 h-4" /></button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tabs — mobile horizontal scroll */}
          <div className="lg:hidden flex gap-1.5 overflow-x-auto pb-1 mb-5 -mx-1 px-1 scrollbar-hide">
            {tabGroups.flatMap((g) => g.items).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex-shrink-0 transition-all ${
                  activeTab === tab.id
                    ? 'bg-gold-600 text-white shadow-md shadow-gold-600/25'
                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Active Tab Content */}
          <ErrorBoundary resetKey={activeTab}>
          <Suspense fallback={<AdminTabFallback />}>
          {activeTab === "dashboard" && (
            <AdminDashboardTab
              stats={stats}
              statsLoading={statsLoading}
              orders={orders}
              onNavigateTab={setActiveTab}
              userName={user?.fullName}
            />
          )}
          {activeTab === "orders" && (
            <AdminOrdersTab
              orders={orders}
              ordersLoading={ordersLoading}
              mutateOrders={mutateOrders}
              showSuccess={showSuccessMsg}
              setError={setError}
              highlightOrderId={highlightOrderId}
              onHighlightConsumed={() => setHighlightOrderId(null)}
            />
          )}
          {activeTab === "notifications" && (
            <AdminNotificationsTab
              showSuccess={showSuccessMsg}
              setError={setError}
              onOpenOrder={(orderId) => {
                setHighlightOrderId(orderId);
                setActiveTab("orders");
              }}
            />
          )}
          {activeTab === "users" && (
            <AdminUsersTab
              users={users}
              usersLoading={usersLoading}
              handleBlockUser={handleBlockUser}
              handleChangeRole={handleChangeRole}
              handleDeleteUser={handleDeleteUser}
            />
          )}
          {activeTab === "products" && (
            <AdminProductsTab
              openEditProductModal={openEditProductModal}
              hasProductDraft={productFormMounted && !productModalOpen && productFormDirty}
              onResumeProductDraft={() => setProductModalOpen(true)}
            />
          )}
          {activeTab === "categories" && <AdminCategoriesTab openCategoryForm={openCategoryForm} />}
          {activeTab === "brands" && <AdminBrandsTab onSuccessMsg={showSuccessMsg} />}
          {activeTab === "scents" && <AdminScentsTab onSuccessMsg={showSuccessMsg} />}
          {activeTab === "banners" && <AdminBannersTab showSuccess={showSuccessMsg} setError={setError} />}
          {activeTab === "branches" && <AdminBranchesTab />}
          {activeTab === "storeInfo" && (
            <AdminCustomizationTab
              config={siteConfig}
              setConfig={setSiteConfig}
              onSave={handleSaveSiteConfig}
              saving={storeInfoSaving}
            />
          )}
          {activeTab === "rates" && (
            <AdminRatesTab showSuccess={showSuccessMsg} setError={setError} />
          )}
          {activeTab === "storeBackup" && <AdminStoreInfoTab />}
          </Suspense>
          </ErrorBoundary>

            </div>
          </div>
        </div>

        {/* Add/Edit Product Modal — stays mounted while soft-dismissed to preserve draft */}
        {productFormMounted && (
          <div
            className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-6 ${
              productModalOpen ? "" : "invisible pointer-events-none"
            }`}
            aria-hidden={!productModalOpen}
            onClick={softDismissProductModal}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg lg:max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden"
            >
              <div className="flex-shrink-0 flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-l from-gold-50/50 to-white dark:from-gold-900/10 dark:to-slate-900">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">{editingProduct ? "تعديل المنتج" : "إضافة منتج جديد"}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">املأ التفاصيل واختر الخيارات من البطاقات أدناه</p>
                </div>
                <button type="button" onClick={softDismissProductModal} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors" aria-label="إخفاء النافذة"><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <div className="flex-1 overflow-y-auto overscroll-contain">
                <Suspense fallback={<AdminTabFallback />}>
                  <AddProductFormLazy
                    key={productFormKey}
                    onSuccess={handleProductCreated}
                    onCancel={() => hardClearProductModal()}
                    onDirtyChange={setProductFormDirty}
                    editProduct={editingProduct}
                  />
                </Suspense>
              </div>
            </div>
          </div>
        )}

        {/* Category Form Modal */}
        <AnimatePresence>
          {showCategoryForm && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={softDismissCategoryModal}>
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl dark:border dark:border-slate-700">
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between p-5 border-b border-slate-100 dark:border-slate-700">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{editingCategory ? "تعديل التصنيف" : "إضافة تصنيف جديد"}</h3>
                  <button type="button" onClick={softDismissCategoryModal} className="p-1 hover:bg-slate-100 rounded-lg" aria-label="إخفاء النافذة"><X className="w-5 h-5 text-slate-400" /></button>
                </div>
                <div className="p-5 space-y-4">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-1 md:col-span-1">
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">اسم التصنيف <span className="text-red-500">*</span></label>
                      <input type="text" value={categoryForm.name} onChange={(e) => updateCategoryForm(f => ({ ...f, name: e.target.value }))} className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-gold-500/50" placeholder="مثال: إلكترونيات" />
                    </div>
                    <div className="col-span-1 md:col-span-1">
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">رابط التصنيف (Slug)</label>
                      <input type="text" value={categoryForm.slug} onChange={(e) => updateCategoryForm(f => ({ ...f, slug: e.target.value }))} className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-gold-500/50" placeholder="يتم توليده تلقائياً إذا تُرك فارغاً" />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">وصف التصنيف</label>
                      <textarea rows="2" value={categoryForm.description} onChange={(e) => updateCategoryForm(f => ({ ...f, description: e.target.value }))} className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-gold-500/50 resize-none" placeholder="وصف قصير للتصنيف..." />
                    </div>
                    <div className="col-span-1 md:col-span-2 flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
                      <div>
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 block">حالة التصنيف</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">تفعيل أو إخفاء التصنيف من المتجر</span>
                      </div>
                      <button type="button" role="switch" aria-checked={categoryForm.isActive} onClick={() => updateCategoryForm(f => ({ ...f, isActive: !f.isActive }))} className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-300 focus:outline-none ${categoryForm.isActive ? 'bg-gold-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${categoryForm.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </div>

                  {/* Parent & Ordering */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-700">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">القسم الأب (اختياري)</label>
                      <select
                        value={categoryForm.parentId || ""}
                        onChange={(e) => updateCategoryForm(f => ({ ...f, parentId: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                      >
                        <option value="">-- بدون قسم أب (قسم رئيسي) --</option>
                        {Array.isArray(allCategories) && allCategories
                          .filter(c => c.id !== editingCategory?.id)
                          .map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))
                        }
                      </select>
                      <span className="text-[10px] text-slate-400 mt-1 block">اختر القسم الأب لجعل هذا القسم فرعياً.</span>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">الترتيب</label>
                      <input type="number" min="0" value={categoryForm.sortOrder} onChange={(e) => updateCategoryForm(f => ({ ...f, sortOrder: e.target.value }))} className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-gold-500/50" />
                    </div>
                  </div>

                  {/* Media */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-700">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">أيقونة التصنيف (صغيرة)</label>
                      {categoryForm.iconUrl && (
                        <div className="mb-2 flex items-center gap-2">
                          <img src={categoryForm.iconUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-slate-200" />
                          <button type="button" onClick={() => updateCategoryForm(f => ({ ...f, iconUrl: "" }))} className="text-xs text-red-500 hover:text-red-700 font-semibold">إزالة</button>
                        </div>
                      )}
                      <input type="file" accept="image/*" onChange={async (e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        try {
                          const url = await api.uploadCategoryIcon(file);
                          updateCategoryForm(f => ({ ...f, iconUrl: url }));
                        } catch (err) {
                          setError("فشل رفع الأيقونة: " + (err.message || ""));
                        }
                      }} className="w-full text-xs text-slate-500 file:mr-2 file:rounded-md file:border-0 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:bg-gold-50 dark:file:bg-gold-900/40 file:text-gold-700 dark:file:text-gold-300" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">صورة التصنيف (كبيرة)</label>
                      {categoryForm.imageUrl && (
                        <div className="mb-2 flex items-center gap-2">
                          <img src={categoryForm.imageUrl} alt="" className="w-16 h-10 rounded-lg object-cover border border-slate-200" />
                          <button type="button" onClick={() => updateCategoryForm(f => ({ ...f, imageUrl: "" }))} className="text-xs text-red-500 hover:text-red-700 font-semibold">إزالة</button>
                        </div>
                      )}
                      <input type="file" accept="image/*" onChange={async (e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        try {
                          const url = await api.uploadCategoryIcon(file); // Reusing upload for now
                          updateCategoryForm(f => ({ ...f, imageUrl: url }));
                        } catch (err) {
                          setError("فشل رفع الصورة: " + (err.message || ""));
                        }
                      }} className="w-full text-xs text-slate-500 file:mr-2 file:rounded-md file:border-0 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:bg-gold-50 dark:file:bg-gold-900/40 file:text-gold-700 dark:file:text-gold-300" />
                    </div>
                  </div>

                  {/* SEO */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                    <details className="group">
                      <summary className="text-sm font-bold text-slate-600 dark:text-slate-400 cursor-pointer hover:text-gold-500 transition-colors list-none flex items-center justify-between">
                        إعدادات تحسين محركات البحث (SEO)
                        <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
                      </summary>
                      <div className="mt-4 space-y-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">عنوان الميتا (Meta Title)</label>
                          <input type="text" value={categoryForm.metaTitle} onChange={(e) => updateCategoryForm(f => ({ ...f, metaTitle: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-gold-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">وصف الميتا (Meta Description)</label>
                          <textarea rows="2" value={categoryForm.metaDescription} onChange={(e) => updateCategoryForm(f => ({ ...f, metaDescription: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-gold-500 resize-none" />
                        </div>
                      </div>
                    </details>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                    <button type="button" onClick={handleSaveCategory} className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-gold-600 text-white text-sm font-bold rounded-xl hover:bg-gold-500 transition-all">
                      <Save className="w-4 h-4" /> {editingCategory ? "تحديث" : "إضافة"}
                    </button>
                    <button type="button" onClick={() => hardClearCategoryModal()} className="px-5 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-all">إلغاء</button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
  );
};

export default AdminDashboard;
