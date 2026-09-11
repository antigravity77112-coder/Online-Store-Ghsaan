import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  Plus,
  Edit3,
  Trash2,
  Tag,
  CheckSquare,
  Square,
  Copy,
  ExternalLink,
  X,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import * as api from '../../services/api';
import { formatNativePrice } from '../../utils/currency';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import InfiniteScrollTrigger from '../../components/InfiniteScrollTrigger';
import {
  AdminToolbar,
  AdminSearch,
  AdminFilterChips,
  AdminCard,
  AdminEmptyState,
  AdminLoading,
  AdminPrimaryButton,
  AdminFadeIn,
} from './AdminUI';

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  React.useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const DESKTOP_GRID = 'hidden lg:grid lg:grid-cols-[40px_minmax(200px,1fr)_100px_80px_120px_100px_140px] lg:gap-3 lg:items-center';

const AdminProductsTab = ({ openEditProductModal, hasProductDraft, onResumeProductDraft, addDisabled = false }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 500);
  const [filter, setFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [showCategorySelector, setShowCategorySelector] = useState(false);

  const getKeyProducts = (pageIndex, previousPageData) => {
    if (previousPageData && !previousPageData.length) return null;
    return ['adminProducts', debouncedSearch, filter, pageIndex + 1];
  };

  const {
    data: productsData,
    size: productsSize,
    setSize: setProductsSize,
    isLoading: productsLoadingInitial,
    isValidating: productsValidating,
    mutate: mutateProducts,
  } = useSWRInfinite(getKeyProducts, async ([_key, search, status, pageNumber]) => {
    return api.getAdminProducts({ pageNumber, pageSize: 15, search, status });
  });

  const products = productsData ? [].concat(...productsData.filter(Boolean)) : [];
  const productsLoading = productsLoadingInitial && !products.length;
  const productsLoadingMore = productsValidating || (productsSize > 0 && productsData && typeof productsData[productsSize - 1] === 'undefined');
  const productsIsEmpty = productsData?.[0]?.length === 0;
  const productsIsReachingEnd = productsIsEmpty || (productsData && productsData[productsData.length - 1]?.length < 15);

  const { data: categories } = useSWR('adminCategoriesAll', () => api.getCategories({ pageSize: 100 }));

  const toggleSelection = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    if (selectedIds.size === products.length && products.length > 0) setSelectedIds(new Set());
    else setSelectedIds(new Set(products.map((p) => p.id)));
  };

  const isAllSelected = products.length > 0 && selectedIds.size === products.length;

  const handleDeleteProduct = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
    try {
      mutateProducts(productsData.map((page) => page.filter((p) => p.id !== id)), { revalidate: false });
      await api.deleteAdminProduct(id);
      mutateProducts();
    } catch (err) {
      alert('فشل حذف المنتج: ' + (err.message || ''));
      mutateProducts();
    }
  };

  const handleDuplicate = (product) => {
    const {
      id,
      createdAt,
      updatedAt,
      slug,
      ...clonedProduct
    } = product;
    const suffix = String(Math.floor(Math.random() * 10_000_000) || 1);
    const variants = Array.isArray(clonedProduct.variants)
      ? clonedProduct.variants.map((v) => ({
          ...v,
          id: undefined,
          sku: v?.sku ? `${v.sku}-COPY-${suffix}` : `COPY-${suffix}`,
        }))
      : clonedProduct.variants;
    openEditProductModal({
      ...clonedProduct,
      title: `${clonedProduct.title || 'منتج'} (نسخة)`,
      sku: '',
      variants,
      status: 'Draft',
    });
  };

  const handleBulkStatus = async (isHidden) => {
    if (selectedIds.size === 0) return;
    setIsBulkLoading(true);
    try {
      const newPages = productsData.map((page) => page.map((p) => (selectedIds.has(p.id) ? { ...p, isHidden } : p)));
      mutateProducts(newPages, { revalidate: false });
      await api.bulkUpdateAdminProductStatus(Array.from(selectedIds), isHidden);
      mutateProducts();
      setSelectedIds(new Set());
    } catch (err) {
      alert('حدث خطأ: ' + err.message);
      mutateProducts();
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`هل أنت متأكد من حذف ${selectedIds.size} منتج نهائياً؟`)) return;
    setIsBulkLoading(true);
    try {
      const newPages = productsData.map((page) => page.filter((p) => !selectedIds.has(p.id)));
      mutateProducts(newPages, { revalidate: false });
      await api.bulkDeleteAdminProducts(Array.from(selectedIds));
      mutateProducts();
      setSelectedIds(new Set());
    } catch (err) {
      alert('حدث خطأ: ' + err.message);
      mutateProducts();
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleBulkCategoryChange = async (categoryId) => {
    setIsBulkLoading(true);
    try {
      const selectedCat = categories?.find((c) => c.id === categoryId);
      const newPages = productsData.map((page) =>
        page.map((p) => (selectedIds.has(p.id) ? { ...p, categoryId, categoryName: selectedCat?.name } : p))
      );
      mutateProducts(newPages, { revalidate: false });
      await api.bulkUpdateAdminProductCategory(Array.from(selectedIds), categoryId);
      mutateProducts();
      setSelectedIds(new Set());
      setShowCategorySelector(false);
    } catch (err) {
      alert('حدث خطأ: ' + err.message);
      mutateProducts();
    } finally {
      setIsBulkLoading(false);
    }
  };

  const getStatusBadge = (p) => {
    if (p.stockQuantity === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300">
          <AlertCircle className="w-3 h-3" /> نفد
        </span>
      );
    }
    if (p.status === 'Archived' || p.isHidden) {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/15 text-slate-600 dark:text-slate-300">مخفي</span>;
    }
    if (p.status === 'Draft') {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300">مسودة</span>;
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
        <CheckCircle2 className="w-3 h-3" /> نشط
      </span>
    );
  };

  const filterItems = [
    { id: 'all', label: 'الكل' },
    { id: 'active', label: 'نشط' },
    { id: 'trending', label: 'تريند' },
    { id: 'hidden', label: 'مسودة/مخفي' },
    { id: 'outofstock', label: 'نفد المخزون' },
  ];

  return (
    <div className="relative min-h-[60vh] pb-24">
      <AdminToolbar
        title="إدارة المنتجات"
        subtitle={`${products.length} منتج محمّل`}
        icon={Package}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {hasProductDraft ? (
              <button
                type="button"
                onClick={onResumeProductDraft}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border border-amber-200/80 dark:border-amber-700/50 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
              >
                استكمال مسودة المنتج
              </button>
            ) : null}
            <AdminPrimaryButton onClick={() => openEditProductModal(null)} disabled={addDisabled}>
              <Plus className="w-4 h-4" />
              إضافة منتج
            </AdminPrimaryButton>
          </div>
        }
      >
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
          <AdminSearch
            className="w-full lg:max-w-md"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث برمز SKU، اسم المنتج، أو القسم..."
          />
          <AdminFilterChips items={filterItems} value={filter} onChange={setFilter} />
        </div>
      </AdminToolbar>

      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95%] sm:w-auto max-w-2xl bg-slate-900/95 backdrop-blur-xl shadow-2xl rounded-2xl border border-gold-500/20 p-3 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap"
          >
            <div className="flex items-center gap-2 text-white px-2">
              <div className="bg-gold-500 text-white text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center">
                {selectedIds.size}
              </div>
              <span className="text-sm font-semibold">منتجات محددة</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
              {showCategorySelector ? (
                <div className="flex items-center gap-2">
                  <select
                    onChange={(e) => { if (e.target.value) handleBulkCategoryChange(e.target.value); }}
                    className="bg-slate-800 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 outline-none min-w-[160px]"
                    defaultValue=""
                  >
                    <option value="" disabled>اختر القسم...</option>
                    {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button type="button" onClick={() => setShowCategorySelector(false)} className="p-2 bg-slate-800 rounded-xl text-white"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <>
                  <button type="button" disabled={isBulkLoading} onClick={() => setShowCategorySelector(true)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold whitespace-nowrap">
                    <Tag className="w-3.5 h-3.5 inline ml-1" /> نقل
                  </button>
                  <button type="button" disabled={isBulkLoading} onClick={() => handleBulkStatus(false)} className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 rounded-xl text-xs font-bold whitespace-nowrap">تنشيط</button>
                  <button type="button" disabled={isBulkLoading} onClick={() => handleBulkStatus(true)} className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold whitespace-nowrap">إخفاء</button>
                  <button type="button" disabled={isBulkLoading} onClick={handleBulkDelete} className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-xl text-xs font-bold whitespace-nowrap">حذف</button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {productsLoading ? (
        <AdminLoading label="جاري تحميل المنتجات..." />
      ) : products.length === 0 ? (
        <AdminEmptyState
          icon={Package}
          title="لا توجد منتجات"
          description="لم يتم العثور على منتجات تطابق بحثك."
          action={
            <AdminPrimaryButton onClick={() => openEditProductModal(null)} disabled={addDisabled}>
              <Plus className="w-4 h-4" /> أضف أول منتج
            </AdminPrimaryButton>
          }
        />
      ) : (
        <AdminCard padding={false} className="overflow-hidden">
          {/* Desktop header */}
          <div className={`${DESKTOP_GRID} px-4 py-3 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-700/80`}>
            <button type="button" onClick={selectAll} className="text-slate-400 hover:text-gold-600 justify-self-center">
              {isAllSelected ? <CheckSquare className="w-5 h-5 text-gold-500" /> : <Square className="w-5 h-5" />}
            </button>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">المنتج</span>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">السعر</span>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">المخزون</span>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">القسم</span>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">الحالة</span>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">إجراءات</span>
          </div>

          <div className="lg:hidden flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <button type="button" onClick={selectAll} className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300">
              {isAllSelected ? <CheckSquare className="w-5 h-5 text-gold-500" /> : <Square className="w-5 h-5 text-slate-400" />}
              تحديد الكل
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {products.map((p, index) => {
              const isSelected = selectedIds.has(p.id);
              return (
                <AdminFadeIn key={p.id} delay={Math.min(index * 0.02, 0.15)}>
                  <div
                    className={`px-4 py-3 transition-colors ${
                      isSelected ? 'bg-gold-50/40 dark:bg-gold-900/10' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                    }`}
                  >
                    {/* Desktop row */}
                    <div className={`${DESKTOP_GRID}`}>
                      <button type="button" onClick={() => toggleSelection(p.id)} className="text-slate-400 hover:text-gold-600 justify-self-center">
                        {isSelected ? <CheckSquare className="w-5 h-5 text-gold-500" /> : <Square className="w-5 h-5" />}
                      </button>

                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0 border border-slate-200 dark:border-slate-700">
                          <img src={p.imageUrl || 'https://images.unsplash.com/photo-1560472355-536de3962603?w=100&q=80'} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{p.title}</p>
                          <div className="flex flex-wrap items-center gap-1 mt-0.5">
                            <p className="text-[10px] font-mono text-slate-400">{p.id.substring(0, 8).toUpperCase()}</p>
                            {p.isTrending && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900">
                                ترند
                              </span>
                            )}
                            {p.isPromoted && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#e6533d]/15 text-[#e6533d]">
                                عرض
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <p className="text-sm font-extrabold text-slate-900 dark:text-white text-center">
                        {formatNativePrice(p.price, p.currency)}
                      </p>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 text-center">{p.stockQuantity}</p>
                      <p className="text-xs text-slate-500 text-center truncate">{p.categoryName || '—'}</p>
                      <div className="flex justify-center">{getStatusBadge(p)}</div>
                      <div className="flex items-center justify-center gap-0.5">
                        <button type="button" onClick={() => openEditProductModal(p)} title="تعديل" className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"><Edit3 className="w-4 h-4" /></button>
                        <button type="button" onClick={() => handleDuplicate(p)} title="تكرار" className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg"><Copy className="w-4 h-4" /></button>
                        <a href={`/product/${p.slug || p.id}`} target="_blank" rel="noreferrer" title="عرض" className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg"><ExternalLink className="w-4 h-4" /></a>
                        <button type="button" onClick={() => handleDeleteProduct(p.id)} title="حذف" className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>

                    {/* Mobile card */}
                    <div className="lg:hidden space-y-3">
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => toggleSelection(p.id)} className="flex-shrink-0">
                          {isSelected ? <CheckSquare className="w-5 h-5 text-gold-500" /> : <Square className="w-5 h-5 text-slate-400" />}
                        </button>
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                          <img src={p.imageUrl || ''} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate">{p.title}</p>
                          <div className="flex items-center gap-2 mt-1">{getStatusBadge(p)}</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm pl-8">
                        <div><span className="text-[10px] text-slate-400 block">السعر</span><span className="font-bold">{formatNativePrice(p.price, p.currency)}</span></div>
                        <div><span className="text-[10px] text-slate-400 block">المخزون</span><span className="font-semibold">{p.stockQuantity}</span></div>
                      </div>
                      <div className="flex justify-end gap-1 pl-8 border-t border-slate-100 dark:border-slate-800 pt-2">
                        <button type="button" onClick={() => openEditProductModal(p)} className="p-2 text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-lg"><Edit3 className="w-4 h-4" /></button>
                        <button type="button" onClick={() => handleDuplicate(p)} className="p-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg"><Copy className="w-4 h-4" /></button>
                        <button type="button" onClick={() => handleDeleteProduct(p.id)} className="p-2 text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>
                </AdminFadeIn>
              );
            })}
          </div>
        </AdminCard>
      )}

      {!productsLoading && !productsIsReachingEnd && (
        <InfiniteScrollTrigger
          onIntersect={() => setProductsSize(productsSize + 1)}
          isLoadingMore={productsLoadingMore}
          isReachingEnd={productsIsReachingEnd}
        />
      )}

      {productsIsReachingEnd && products.length > 0 && (
        <p className="text-center text-xs font-bold text-slate-400 mt-6">تم تحميل جميع المنتجات</p>
      )}
    </div>
  );
};

export default AdminProductsTab;
