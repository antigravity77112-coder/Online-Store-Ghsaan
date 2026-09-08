import React, { useState, useRef, useMemo } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AdminToolbar,
  AdminSearch,
  AdminPrimaryButton,
  AdminFilterChips,
  AdminEmptyState,
  AdminUploadProgress,
} from './AdminUI';
import {
  Plus, Edit, Trash2, AlertCircle, Loader2,
  Image as ImageIcon, CheckCircle, Package, Sparkles, Eye, EyeOff,
  GripVertical, X,
} from 'lucide-react';
import * as api from '../../services/api';
import { confirmDiscardDraft } from '../../utils/adminDraftConfirm';

/** Scent icon specs — matches mobile home tile (56px) @2x retina */
export const SCENT_IMAGE_SPEC = {
  recommended: '256×256',
  minimum: '128×128',
  aspect: '1:1',
  formats: 'PNG / WebP',
  displayNote: 'تُعرض كأيقونة مربعة في الصفحة الرئيسية والتصفح',
};

/** Subtle accent gradients — rotates by sortOrder for visual variety */
const SCENT_AURA = [
  'from-amber-400/30 via-gold-500/20 to-orange-300/30',
  'from-rose-400/25 via-pink-500/15 to-amber-300/25',
  'from-violet-400/25 via-purple-500/15 to-indigo-300/20',
  'from-emerald-400/20 via-teal-500/15 to-cyan-300/20',
  'from-sky-400/20 via-blue-500/15 to-indigo-300/20',
];

function ScentSwatch({ scent, index }) {
  const aura = SCENT_AURA[index % SCENT_AURA.length];
  return (
    <div className="relative flex-shrink-0">
      <div className={`absolute -inset-0.5 rounded-xl bg-gradient-to-br ${aura} blur-[2px] opacity-80`} />
      <div className="relative w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-600 flex items-center justify-center overflow-hidden shadow-sm">
        {scent.imageUrl ? (
          <img src={scent.imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <Sparkles className="w-4 h-4 text-gold-500/70" />
        )}
      </div>
    </div>
  );
}

function ScentRow({ scent, index, onEdit, onToggle, onDelete }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.15, delay: index * 0.02 }}
      className={`flex items-center gap-3 px-4 py-3 group border-b border-slate-100 dark:border-slate-800 last:border-b-0 transition-colors ${
        scent.isActive
          ? 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
          : 'opacity-60 hover:opacity-80 bg-slate-50/50 dark:bg-slate-900/30'
      }`}
    >
      {/* Sort grip + order */}
      <div className="flex items-center gap-1.5 w-12 flex-shrink-0 text-slate-300 dark:text-slate-600">
        <GripVertical className="w-3.5 h-3.5 opacity-40 group-hover:opacity-70" />
        <span className="text-[10px] font-bold tabular-nums">{scent.sortOrder ?? 0}</span>
      </div>

      <ScentSwatch scent={scent} index={index} />

      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-slate-900 dark:text-white text-sm truncate">{scent.name}</span>
          {!scent.isActive && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-md">معطّل</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[11px] text-slate-400 font-mono truncate max-w-[140px]" dir="ltr">/{scent.slug}</span>
          {scent.description && (
            <span className="text-[11px] text-slate-400 truncate max-w-[180px] hidden sm:inline">{scent.description}</span>
          )}
        </div>
      </div>

      {/* Product count */}
      <div className="w-16 flex-shrink-0 text-left">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-gold-50 dark:bg-gold-900/20 text-gold-700 dark:text-gold-400 text-[11px] font-bold">
          <Package className="w-3 h-3" />
          {scent.productsCount ?? 0}
        </span>
      </div>

      {/* Status pill */}
      <div className="w-14 flex-shrink-0 hidden md:block">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
          scent.isActive
            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
        }`}>
          {scent.isActive ? 'نشط' : 'مخفي'}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 w-24 justify-end flex-shrink-0 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <button type="button" onClick={() => onEdit(scent)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all" title="تعديل">
          <Edit className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => onToggle(scent)} className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-all" title={scent.isActive ? 'تعطيل' : 'تفعيل'}>
          {scent.isActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
        <button type="button" onClick={() => onDelete(scent.id, scent.name)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all" title="حذف">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

const EMPTY_SCENT_FORM = { name: '', slug: '', description: '', imageUrl: '', isActive: true, sortOrder: 0 };

const AdminScentsTab = ({ onSuccessMsg }) => {
  const { data: scents, mutate, error: fetchError } = useSWR('adminScents', () => api.getScents({ includeInactive: true }));
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingScent, setEditingScent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formDirty, setFormDirty] = useState(false);
  const [draftActive, setDraftActive] = useState(false);
  const fileInputRef = useRef(null);
  const baselineRef = useRef(JSON.stringify(EMPTY_SCENT_FORM));

  const [form, setForm] = useState(EMPTY_SCENT_FORM);

  const isLoading = !scents && !fetchError;

  const stats = useMemo(() => {
    const list = scents || [];
    return {
      total: list.length,
      active: list.filter((s) => s.isActive !== false).length,
      withProducts: list.filter((s) => (s.productsCount ?? 0) > 0).length,
    };
  }, [scents]);

  const filteredScents = useMemo(() => {
    let list = scents || [];
    if (statusFilter === 'active') list = list.filter((s) => s.isActive !== false);
    if (statusFilter === 'inactive') list = list.filter((s) => s.isActive === false);
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((s) =>
        s.name.toLowerCase().includes(q) || (s.slug || '').toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name, 'ar'));
  }, [scents, searchQuery, statusFilter]);

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
    setEditingScent(null);
    setForm(EMPTY_SCENT_FORM);
    baselineRef.current = JSON.stringify(EMPTY_SCENT_FORM);
    setFormDirty(false);
    setDraftActive(false);
    setFormError('');
  };

  const handleOpenModal = (scent = null) => {
    setFormError('');
    if (scent) {
      if (draftActive && editingScent?.id === scent.id) {
        setIsModalOpen(true);
        return;
      }
      if (draftActive && formDirty && !confirmDiscardDraft(true)) return;
      setEditingScent(scent);
      const next = {
        name: scent.name,
        slug: scent.slug || '',
        description: scent.description || '',
        imageUrl: scent.imageUrl || '',
        isActive: scent.isActive !== false,
        sortOrder: scent.sortOrder ?? 0,
      };
      setForm(next);
      baselineRef.current = JSON.stringify(next);
      setFormDirty(false);
      setDraftActive(true);
    } else {
      if (draftActive && !editingScent) {
        setIsModalOpen(true);
        return;
      }
      if (draftActive && formDirty && !confirmDiscardDraft(true)) return;
      setEditingScent(null);
      const nextOrder = scents?.length ? Math.max(...scents.map((s) => s.sortOrder ?? 0)) + 1 : 0;
      const next = { ...EMPTY_SCENT_FORM, sortOrder: nextOrder };
      setForm(next);
      baselineRef.current = JSON.stringify(next);
      setFormDirty(false);
      setDraftActive(true);
    }
    setIsModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    applyForm({ ...form, [name]: type === 'checkbox' ? checked : value });
    setFormError('');
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFormError('يرجى اختيار ملف صورة صالح');
      return;
    }
    setUploading(true);
    setFormError('');
    try {
      const url = await api.uploadScentImage(file);
      applyForm({ ...form, imageUrl: url });
    } catch (err) {
      setFormError(err.message || 'فشل رفع الصورة');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading || uploading) return;
    if (!form.name.trim()) {
      setFormError('اسم الرائحة مطلوب');
      return;
    }
    setLoading(true);
    setFormError('');
    try {
      const payload = { ...form, sortOrder: parseInt(form.sortOrder, 10) || 0 };
      if (editingScent) {
        await api.updateScent(editingScent.id, payload);
        onSuccessMsg('تم تحديث الرائحة بنجاح');
      } else {
        await api.createScent(payload);
        onSuccessMsg('تمت إضافة الرائحة بنجاح');
      }
      mutate();
      hardClearModal({ skipConfirm: true });
    } catch (err) {
      setFormError(err.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (scent) => {
    try {
      await api.toggleScentActive(scent.id);
      onSuccessMsg(scent.isActive ? 'تم تعطيل الرائحة' : 'تم تفعيل الرائحة');
      mutate();
    } catch (err) {
      alert(err.message || 'حدث خطأ');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`هل أنت متأكد من حذف الرائحة "${name}"؟`)) return;
    try {
      await api.deleteScent(id);
      onSuccessMsg('تم الحذف بنجاح');
      mutate();
    } catch (err) {
      alert(err.message || 'حدث خطأ أثناء الحذف');
    }
  };

  return (
    <div>
      <AdminToolbar
        title="عائلات الروائح"
        subtitle={`${stats.total} رائحة · ${stats.active} نشطة · ${stats.withProducts} مرتبطة بمنتجات`}
        icon={Sparkles}
        actions={(
          <AdminPrimaryButton onClick={() => handleOpenModal()} disabled={isModalOpen || loading}>
            <Plus className="w-5 h-5" /> إضافة رائحة
          </AdminPrimaryButton>
        )}
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <AdminSearch
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث عن رائحة..."
            className="flex-1"
          />
          <AdminFilterChips
            value={statusFilter}
            onChange={setStatusFilter}
            items={[
              { value: 'all', label: `الكل (${stats.total})` },
              { value: 'active', label: `نشطة (${stats.active})` },
              { value: 'inactive', label: `معطّلة (${stats.total - stats.active})` },
            ]}
          />
        </div>
      </AdminToolbar>

      {/* Quick preview strip — compact scent chips (storefront order) */}
      {!isLoading && filteredScents.length > 0 && (
        <div className="mb-4 px-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">معاينة ترتيب العرض</p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {filteredScents.slice(0, 12).map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleOpenModal(s)}
                className={`flex-shrink-0 flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border text-xs font-semibold transition-all hover:shadow-md ${
                  s.isActive
                    ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-gold-300'
                    : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-700 opacity-60'
                }`}
              >
                <span className={`w-6 h-6 rounded-full bg-gradient-to-br ${SCENT_AURA[i % SCENT_AURA.length]} flex items-center justify-center`}>
                  {s.imageUrl
                    ? <img src={s.imageUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
                    : <Sparkles className="w-3 h-3 text-gold-600" />}
                </span>
                {s.name}
              </button>
            ))}
            {filteredScents.length > 12 && (
              <span className="flex-shrink-0 self-center text-[11px] text-slate-400 px-2">+{filteredScents.length - 12}</span>
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-gold-500" />
          <p className="text-sm">جاري تحميل الروائح...</p>
        </div>
      ) : fetchError ? (
        <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-red-600 dark:text-red-400 flex flex-col items-center text-center">
          <AlertCircle className="w-10 h-10 mb-2" />
          <p className="font-bold">حدث خطأ أثناء جلب البيانات</p>
          <p className="text-sm mt-1">{fetchError.message}</p>
        </div>
      ) : filteredScents.length === 0 ? (
        <AdminEmptyState
          icon={Sparkles}
          title={searchQuery || statusFilter !== 'all' ? 'لا توجد نتائج' : 'لا توجد روائح'}
          description={searchQuery || statusFilter !== 'all' ? 'جرّب تغيير البحث أو الفلتر' : 'أضف أول عائلة رائحة لتسهيل اكتشاف المنتجات'}
          action={!searchQuery && statusFilter === 'all' && (
            <AdminPrimaryButton onClick={() => handleOpenModal()} disabled={isModalOpen || loading}>
              <Plus className="w-4 h-4" /> إضافة رائحة
            </AdminPrimaryButton>
          )}
        />
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className="w-12">#</span>
            <span className="flex-1">الرائحة / الرابط</span>
            <span className="w-16 text-left">منتجات</span>
            <span className="w-14 hidden md:block text-left">الحالة</span>
            <span className="w-24 text-left">إجراءات</span>
          </div>
          <div className="max-h-[min(65vh,560px)] overflow-y-auto custom-scrollbar">
            {filteredScents.map((scent, index) => (
              <ScentRow
                key={scent.id}
                scent={scent}
                index={index}
                onEdit={handleOpenModal}
                onToggle={handleToggleActive}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={softDismissModal} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative bg-white dark:bg-slate-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 z-10 flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 shrink-0 flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                  {editingScent ? 'تعديل الرائحة' : 'إضافة رائحة جديدة'}
                </h3>
                <button type="button" onClick={softDismissModal} className="p-1 hover:bg-slate-200/80 dark:hover:bg-slate-700 rounded-lg" aria-label="إخفاء النافذة">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto">
                {formError && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 text-sm rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}
                <form id="scentForm" onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">اسم الرائحة *</label>
                    <input type="text" name="name" value={form.name} onChange={handleChange} required className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-gold-500" placeholder="مثال: عود" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">الرابط (Slug)</label>
                    <input type="text" name="slug" value={form.slug} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono text-left" dir="ltr" placeholder="oud" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5">ترتيب العرض</label>
                      <input type="number" name="sortOrder" value={form.sortOrder} onChange={handleChange} min={0} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm" />
                    </div>
                    <div className="flex items-end pb-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} className="rounded border-slate-300 text-gold-600 focus:ring-gold-500" />
                        <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">نشط</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">
                      الصورة / الأيقونة
                      <span className="text-[10px] text-slate-400 font-normal mr-2" dir="ltr">
                        {SCENT_IMAGE_SPEC.recommended} px — {SCENT_IMAGE_SPEC.formats}
                      </span>
                    </label>
                    <div className="flex items-start gap-4 p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                      <div className="w-16 h-16 bg-white dark:bg-slate-800 border rounded-xl flex items-center justify-center overflow-hidden shrink-0 relative">
                        {form.imageUrl ? <img src={form.imageUrl} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-6 h-6 text-slate-300" />}
                        <AdminUploadProgress active={uploading} />
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <input type="file" ref={fileInputRef} accept="image/png,image/webp,image/jpeg,image/jpg,.png,.webp,.jpg,.jpeg" onChange={handleImageUpload} className="hidden" />
                        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading || loading} className="px-4 py-2 bg-white dark:bg-slate-700 border text-xs font-bold rounded-lg hover:border-gold-300 transition-colors disabled:opacity-50">
                          {uploading ? 'جاري الرفع...' : 'اختيار صورة'}
                        </button>
                        <div className="rounded-lg bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 px-3 py-2 space-y-1">
                          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">مقاسات الصورة الموصى بها</p>
                          <ul className="text-[10px] text-slate-400 space-y-0.5" dir="ltr">
                            <li><span className="font-semibold text-slate-500">Recommended:</span> {SCENT_IMAGE_SPEC.recommended} px ({SCENT_IMAGE_SPEC.aspect})</li>
                            <li><span className="font-semibold text-slate-500">Minimum:</span> {SCENT_IMAGE_SPEC.minimum} px</li>
                            <li><span className="font-semibold text-slate-500">Format:</span> {SCENT_IMAGE_SPEC.formats} — شفاف يفضّل</li>
                            <li><span className="font-semibold text-slate-500">Display:</span> 56×56 mobile · 40×40 admin</li>
                          </ul>
                          <p className="text-[10px] text-slate-400 pt-0.5">{SCENT_IMAGE_SPEC.displayNote}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">الوصف (اختياري)</label>
                    <textarea name="description" value={form.description} onChange={handleChange} rows={3} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm resize-none" />
                  </div>
                </form>
              </div>
              <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 shrink-0 flex gap-3">
                <button type="submit" form="scentForm" disabled={loading || uploading} className="flex-1 py-3 bg-gold-600 text-white font-bold rounded-xl hover:bg-gold-500 flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                  <span>{editingScent ? 'حفظ' : 'إضافة'}</span>
                </button>
                <button type="button" onClick={() => hardClearModal()} className="px-6 py-3 bg-slate-200 dark:bg-slate-700 font-bold rounded-xl">إلغاء</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminScentsTab;
