import React, { useState, useRef, useMemo } from 'react';
import useSWR from 'swr';
import {
  AdminToolbar,
  AdminSearch,
  AdminPrimaryButton,
  AdminLoading,
  AdminCard,
  AdminUploadProgress,
  AdminFilterChips,
  AdminEmptyState,
  AdminFadeIn,
} from './AdminUI';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Edit3,
  Trash2,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  CheckCircle,
  Package,
  Crown,
  X,
  ExternalLink,
  CheckSquare,
  Square,
} from 'lucide-react';
import * as api from '../../services/api';
import { confirmDiscardDraft } from '../../utils/adminDraftConfirm';
import { matchesSearch } from '../../utils/arabicSearch';

const EMPTY_BRAND_FORM = { name: '', slug: '', description: '', logoUrl: '' };

const DESKTOP_GRID =
  'hidden lg:grid lg:grid-cols-[40px_56px_minmax(160px,1fr)_minmax(100px,140px)_72px_140px] lg:gap-3 lg:items-center';

const AdminBrandsTab = ({ onSuccessMsg }) => {
  const { data: brands, mutate, error: fetchError } = useSWR('adminBrands', api.getBrands);
  const [searchQuery, setSearchQuery] = useState('');
  const [logoFilter, setLogoFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formDirty, setFormDirty] = useState(false);
  const [draftActive, setDraftActive] = useState(false);
  const fileInputRef = useRef(null);
  const baselineRef = useRef(JSON.stringify(EMPTY_BRAND_FORM));

  const [form, setForm] = useState(EMPTY_BRAND_FORM);

  const isLoading = !brands && !fetchError;

  const logoStats = useMemo(() => {
    const list = Array.isArray(brands) ? brands : [];
    return {
      total: list.length,
      withLogo: list.filter((b) => Boolean(b.logoUrl)).length,
      noLogo: list.filter((b) => !b.logoUrl).length,
    };
  }, [brands]);

  const filteredBrands = useMemo(() => {
    if (!Array.isArray(brands)) return [];
    let list = brands;
    if (logoFilter === 'withLogo') list = list.filter((b) => Boolean(b.logoUrl));
    if (logoFilter === 'noLogo') list = list.filter((b) => !b.logoUrl);
    const q = searchQuery.trim();
    if (q) {
      list = list.filter((b) => matchesSearch(q, b.name, b.slug));
    }
    return list;
  }, [brands, searchQuery, logoFilter]);

  const hasFilters = Boolean(searchQuery.trim()) || logoFilter !== 'all';

  const toggleSelection = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectAll = () => {
    if (selectedIds.size === filteredBrands.length && filteredBrands.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredBrands.map((b) => b.id)));
    }
  };

  const isAllSelected = filteredBrands.length > 0 && selectedIds.size === filteredBrands.length;

  const filterItems = [
    { id: 'all', label: `الكل (${logoStats.total})` },
    { id: 'withLogo', label: `بشعار (${logoStats.withLogo})` },
    { id: 'noLogo', label: `بدون شعار (${logoStats.noLogo})` },
  ];

  const applyForm = (next) => {
    setForm(next);
    setFormDirty(JSON.stringify(next) !== baselineRef.current);
    setDraftActive(true);
  };

  const softDismissModal = () => {
    setIsModalOpen(false);
  };

  const hardClearModal = ({ skipConfirm = false } = {}) => {
    if (!skipConfirm && !confirmDiscardDraft(formDirty)) return;
    setIsModalOpen(false);
    setEditingBrand(null);
    setForm(EMPTY_BRAND_FORM);
    baselineRef.current = JSON.stringify(EMPTY_BRAND_FORM);
    setFormDirty(false);
    setDraftActive(false);
    setFormError('');
  };

  const handleOpenModal = (brand = null) => {
    setFormError('');
    if (brand) {
      if (draftActive && editingBrand?.id === brand.id) {
        setIsModalOpen(true);
        return;
      }
      if (draftActive && formDirty && !confirmDiscardDraft(true)) return;
      setEditingBrand(brand);
      const next = {
        name: brand.name,
        slug: brand.slug || '',
        description: brand.description || '',
        logoUrl: brand.logoUrl || '',
      };
      setForm(next);
      baselineRef.current = JSON.stringify(next);
      setFormDirty(false);
      setDraftActive(true);
    } else {
      if (draftActive && !editingBrand) {
        setIsModalOpen(true);
        return;
      }
      if (draftActive && formDirty && !confirmDiscardDraft(true)) return;
      setEditingBrand(null);
      setForm(EMPTY_BRAND_FORM);
      baselineRef.current = JSON.stringify(EMPTY_BRAND_FORM);
      setFormDirty(false);
      setDraftActive(true);
    }
    setIsModalOpen(true);
  };

  const handleChange = (e) => {
    applyForm({ ...form, [e.target.name]: e.target.value });
    setFormError('');
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('يرجى اختيار ملف صورة صالح');
      return;
    }

    setUploading(true);
    setFormError('');
    try {
      const url = await api.uploadBrandLogo(file);
      applyForm({ ...form, logoUrl: url });
    } catch (err) {
      setFormError(err.message || 'فشل رفع الشعار');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading || uploading) return;
    if (!form.name.trim()) {
      setFormError('اسم العلامة التجارية مطلوب');
      return;
    }

    setLoading(true);
    setFormError('');

    try {
      if (editingBrand) {
        await api.updateBrand(editingBrand.id, form);
        onSuccessMsg('تم تحديث العلامة التجارية بنجاح');
      } else {
        await api.createBrand(form);
        onSuccessMsg('تمت إضافة العلامة التجارية بنجاح');
      }
      mutate();
      hardClearModal({ skipConfirm: true });
    } catch (err) {
      setFormError(err.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (
      !window.confirm(
        `هل أنت متأكد من حذف العلامة التجارية "${name}"؟\nلن يتم حذف المنتجات التابعة لها، بل ستصبح بدون علامة تجارية.`,
      )
    ) {
      return;
    }

    try {
      await api.deleteBrand(id);
      onSuccessMsg('تم الحذف بنجاح');
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      mutate();
    } catch (err) {
      alert(err.message || 'حدث خطأ أثناء الحذف');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (
      !window.confirm(
        `هل أنت متأكد من حذف ${selectedIds.size} علامة تجارية؟\nالمنتجات المرتبطة ستبقى بدون علامة.`,
      )
    ) {
      return;
    }
    setIsBulkLoading(true);
    try {
      const ids = Array.from(selectedIds);
      for (const id of ids) {
        await api.deleteBrand(id);
      }
      onSuccessMsg('تم الحذف بنجاح');
      setSelectedIds(new Set());
      mutate();
    } catch (err) {
      alert(err.message || 'حدث خطأ أثناء الحذف');
    } finally {
      setIsBulkLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setLogoFilter('all');
  };

  const storefrontHref = (brand) => (brand.slug ? `/brand/${brand.slug}` : null);

  const bulkBarInner = (
    <>
      <div className="flex items-center gap-2 text-white px-1 flex-shrink-0">
        <div className="bg-gold-500 text-white text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center">
          {selectedIds.size}
        </div>
        <span className="text-sm font-semibold hidden xs:inline sm:inline">محددة</span>
      </div>
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide flex-1 min-w-0">
        <button
          type="button"
          disabled={isBulkLoading}
          onClick={handleBulkDelete}
          className="px-3 py-2.5 min-h-[44px] bg-red-500/20 text-red-400 rounded-xl text-xs font-bold whitespace-nowrap"
        >
          <Trash2 className="w-3.5 h-3.5 inline ml-1" /> حذف
        </button>
      </div>
    </>
  );

  return (
    <div className={`relative min-h-[60vh] space-y-6 ${selectedIds.size > 0 ? 'pb-8 lg:pb-36' : 'pb-24'}`}>
      <AdminToolbar
        title="العلامات التجارية"
        subtitle={Array.isArray(brands) ? `${logoStats.total} علامة` : 'إدارة العلامات المعروضة في المتجر'}
        icon={Crown}
        actions={
          <AdminPrimaryButton onClick={() => handleOpenModal()} disabled={isModalOpen || loading}>
            <Plus className="w-5 h-5" /> إضافة علامة
          </AdminPrimaryButton>
        }
      >
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
          <AdminSearch
            className="w-full lg:max-w-md"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث عن علامة بالاسم أو الرابط..."
          />
          <AdminFilterChips items={filterItems} value={logoFilter} onChange={setLogoFilter} />
        </div>
      </AdminToolbar>

      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            key="bulk-bar-mobile"
            initial={{ y: -12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0 }}
            className="lg:hidden sticky top-0 z-[60] mb-3 w-full bg-slate-900/95 backdrop-blur-xl shadow-2xl rounded-2xl border border-gold-500/20 p-3 flex items-center gap-3 flex-nowrap"
          >
            {bulkBarInner}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            key="bulk-bar-desktop"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="hidden lg:flex fixed left-1/2 -translate-x-1/2 z-[60] w-[min(95vw,42rem)] bg-slate-900/95 backdrop-blur-xl shadow-2xl rounded-2xl border border-gold-500/20 p-3 items-center gap-3 flex-nowrap"
            style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}
          >
            {bulkBarInner}
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <AdminLoading label="جاري تحميل العلامات التجارية..." />
      ) : fetchError ? (
        <AdminCard className="text-center py-10">
          <AlertCircle className="w-10 h-10 mx-auto mb-2 text-red-500" />
          <p className="font-bold text-red-600 dark:text-red-400">حدث خطأ أثناء جلب البيانات</p>
          <p className="text-sm mt-1 text-slate-500">{fetchError.message}</p>
        </AdminCard>
      ) : filteredBrands.length === 0 ? (
        <AdminEmptyState
          icon={Crown}
          title={hasFilters ? 'لا توجد نتائج' : 'لا توجد علامات تجارية'}
          description={
            hasFilters
              ? 'لم يتم العثور على علامات تطابق البحث أو الفلتر.'
              : 'أضف أول علامة تجارية لتظهر في المتجر.'
          }
          action={
            hasFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="px-5 py-2.5 min-h-[44px] text-sm font-bold text-gold-700 dark:text-gold-300 hover:bg-gold-50 dark:hover:bg-gold-900/20 rounded-xl transition-colors"
              >
                مسح الفلاتر
              </button>
            ) : (
              <AdminPrimaryButton onClick={() => handleOpenModal()} disabled={isModalOpen || loading}>
                <Plus className="w-4 h-4" /> إضافة علامة
              </AdminPrimaryButton>
            )
          }
        />
      ) : (
        <AdminCard padding={false} className="overflow-hidden">
          <div
            className={`${DESKTOP_GRID} px-4 py-3 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-700/80`}
          >
            <button type="button" onClick={selectAll} className="text-slate-400 hover:text-gold-600 justify-self-center">
              {isAllSelected ? <CheckSquare className="w-5 h-5 text-gold-500" /> : <Square className="w-5 h-5" />}
            </button>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">شعار</span>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">الاسم</span>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">الرابط</span>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">المنتجات</span>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">إجراءات</span>
          </div>

          <div className="lg:hidden flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={selectAll}
              className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300"
            >
              {isAllSelected ? <CheckSquare className="w-5 h-5 text-gold-500" /> : <Square className="w-5 h-5 text-slate-400" />}
              تحديد الكل
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredBrands.map((brand, index) => {
              const isSelected = selectedIds.has(brand.id);
              const href = storefrontHref(brand);
              return (
                <AdminFadeIn key={brand.id} delay={Math.min(index * 0.02, 0.15)}>
                  <div
                    className={`px-4 py-3 transition-colors ${
                      isSelected ? 'bg-gold-50/40 dark:bg-gold-900/10' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                    }`}
                  >
                    {/* Desktop row */}
                    <div className={DESKTOP_GRID}>
                      <button
                        type="button"
                        onClick={() => toggleSelection(brand.id)}
                        className="text-slate-400 hover:text-gold-600 justify-self-center"
                      >
                        {isSelected ? <CheckSquare className="w-5 h-5 text-gold-500" /> : <Square className="w-5 h-5" />}
                      </button>

                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden justify-self-center">
                        {brand.logoUrl ? (
                          <img src={brand.logoUrl} alt="" className="max-w-full max-h-full object-contain p-0.5" />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                        )}
                      </div>

                      <p className="font-bold text-sm text-slate-900 dark:text-white truncate" title={brand.name}>
                        {brand.name}
                      </p>

                      <p className="text-xs font-mono text-slate-500 truncate" dir="ltr" title={brand.slug}>
                        /{brand.slug || '—'}
                      </p>

                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 text-center">
                        {brand.productsCount ?? 0}
                      </p>

                      <div className="flex items-center justify-center gap-0.5 relative z-10">
                        <button
                          type="button"
                          onClick={() => handleOpenModal(brand)}
                          title="تعديل"
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {href ? (
                          <a
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            title="عرض في المتجر"
                            className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        ) : (
                          <span className="p-1.5 text-slate-200 dark:text-slate-700" title="لا يوجد رابط">
                            <ExternalLink className="w-4 h-4" />
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(brand.id, brand.name)}
                          title="حذف"
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Mobile card */}
                    <div className="lg:hidden space-y-3">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => toggleSelection(brand.id)}
                          className="flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
                        >
                          {isSelected ? <CheckSquare className="w-5 h-5 text-gold-500" /> : <Square className="w-5 h-5 text-slate-400" />}
                        </button>
                        <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {brand.logoUrl ? (
                            <img src={brand.logoUrl} alt="" className="max-w-full max-h-full object-contain p-1" />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-slate-300" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate">{brand.name}</p>
                          <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5" dir="ltr">
                            /{brand.slug || '—'}
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-gold-50 dark:bg-gold-900/20 text-gold-700 dark:text-gold-400 rounded-md text-[10px] font-bold flex-shrink-0">
                          <Package className="w-3 h-3" />
                          {brand.productsCount ?? 0}
                        </span>
                      </div>

                      <div className="flex justify-end gap-1.5 pl-8 border-t border-slate-100 dark:border-slate-800 pt-2">
                        <button
                          type="button"
                          onClick={() => handleOpenModal(brand)}
                          className="p-2.5 min-w-[44px] min-h-[44px] text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center"
                          aria-label="تعديل"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {href ? (
                          <a
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2.5 min-w-[44px] min-h-[44px] text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center"
                            aria-label="عرض في المتجر"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => handleDelete(brand.id, brand.name)}
                          className="p-2.5 min-w-[44px] min-h-[44px] text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center justify-center"
                          aria-label="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </AdminFadeIn>
              );
            })}
          </div>
        </AdminCard>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={softDismissModal}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white dark:bg-slate-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 z-10 flex flex-col max-h-[90vh]"
            >
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 shrink-0 flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                  {editingBrand ? 'تعديل العلامة التجارية' : 'إضافة علامة تجارية جديدة'}
                </h3>
                <button
                  type="button"
                  onClick={softDismissModal}
                  className="p-1 hover:bg-slate-200/80 dark:hover:bg-slate-700 rounded-lg"
                  aria-label="إخفاء النافذة"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar">
                {formError && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <form id="brandForm" onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">
                      اسم العلامة التجارية <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-gold-500"
                      placeholder="مثال: Dior"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">الرابط الدائم (Slug) - اختياري</label>
                    <input
                      type="text"
                      name="slug"
                      value={form.slug}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-gold-500 font-mono text-left"
                      dir="ltr"
                      placeholder="يُترك فارغاً للتوليد التلقائي"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">يجب أن يكون فريداً وباللغة الإنجليزية بدون مسافات.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">الشعار (Logo)</label>
                    <div className="flex items-center gap-4 p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/50 relative overflow-hidden">
                      <div className="w-16 h-16 bg-transparent flex items-center justify-center overflow-hidden shrink-0 relative">
                        {form.logoUrl ? (
                          <img src={form.logoUrl} alt="Logo preview" className="w-full h-full object-contain p-1" />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                        )}
                        <AdminUploadProgress active={uploading} />
                      </div>
                      <div className="flex-1">
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading || loading}
                          className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                        >
                          {uploading ? 'جاري الرفع...' : 'اختيار صورة الشعار'}
                        </button>
                        <p className="text-[10px] text-slate-400 mt-1">يفضل أن يكون الشعار بخلفية شفافة (PNG).</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">الوصف (اختياري)</label>
                    <textarea
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-gold-500 resize-none"
                      placeholder="وصف موجز عن العلامة التجارية..."
                    />
                  </div>
                </form>
              </div>

              <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 shrink-0 flex gap-3">
                <button
                  type="submit"
                  form="brandForm"
                  disabled={loading || uploading}
                  className="flex-1 py-3 bg-gold-600 text-white font-bold rounded-xl hover:bg-gold-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                  <span>{editingBrand ? 'حفظ التعديلات' : 'إضافة العلامة'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => hardClearModal()}
                  className="px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminBrandsTab;
