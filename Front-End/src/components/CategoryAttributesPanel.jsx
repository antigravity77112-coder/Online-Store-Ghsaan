import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Plus, Edit3, Trash2, Loader2, ChevronUp, ChevronDown,
  SlidersHorizontal, Check, AlertCircle,
} from 'lucide-react';
import useSWR from 'swr';
import * as api from '../services/api';

// ─── Constants ────────────────────────────────────────────────────────────────
const TYPE_LABELS = { TEXT: 'نص', NUMBER: 'رقم', BOOLEAN: 'نعم/لا', SELECT: 'اختيار واحد', MULTI_SELECT: 'اختيارات متعددة' };
const SCOPE_LABELS = { PRODUCT: 'منتج', VARIANT: 'متغير', BOTH: 'كليهما' };
const TYPE_COLORS  = { TEXT: 'bg-blue-100 text-blue-700', NUMBER: 'bg-purple-100 text-purple-700', BOOLEAN: 'bg-green-100 text-green-700', SELECT: 'bg-amber-100 text-amber-700', MULTI_SELECT: 'bg-orange-100 text-orange-700' };

const EMPTY_FORM = { name: '', type: 'TEXT', scope: 'PRODUCT', isRequired: false, isFilterable: false, isSearchable: false, sortOrder: 0, options: '' };

// ─── AttributeForm ─────────────────────────────────────────────────────────────
function AttributeForm({ initial, onSave, onCancel, loading }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const needsOptions = ['SELECT', 'MULTI_SELECT'].includes(form.type);

  return (
    <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-3">
      {/* Name */}
      <div>
        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">اسم الخاصية *</label>
        <input
          value={form.name}
          onChange={e => set('name', e.target.value)}
          placeholder="مثال: التركيز، الجنس، عائلة العطر"
          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/40"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Type */}
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">النوع</label>
          <select value={form.type} onChange={e => set('type', e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/40">
            {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        {/* Scope */}
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">النطاق</label>
          <select value={form.scope} onChange={e => set('scope', e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/40">
            {Object.entries(SCOPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>

      {/* Options (only for SELECT/MULTI_SELECT) */}
      {needsOptions && (
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">الخيارات (مفصولة بفاصلة)</label>
          <input
            value={form.options}
            onChange={e => set('options', e.target.value)}
            placeholder="مثال: رجالي، نسائي، مشترك"
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/40"
          />
        </div>
      )}

      {/* Toggles */}
      <div className="flex flex-wrap gap-4 pt-1">
        {[
          { key: 'isRequired',    label: 'إلزامي' },
          { key: 'isFilterable',  label: 'قابل للتصفية' },
          { key: 'isSearchable',  label: 'قابل للبحث' },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
            <div
              onClick={() => set(key, !form[key])}
              className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${form[key] ? 'bg-gold-500' : 'bg-slate-300 dark:bg-slate-600'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form[key] ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-xs text-slate-600 dark:text-slate-300">{label}</span>
          </label>
        ))}
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-600 dark:text-slate-300">الترتيب</label>
          <input type="number" value={form.sortOrder} onChange={e => set('sortOrder', parseInt(e.target.value) || 0)}
            className="w-16 px-2 py-1 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/40" />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onSave(form)}
          disabled={loading || !form.name.trim()}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-gold-600 hover:bg-gold-500 disabled:opacity-50 rounded-xl transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          حفظ
        </button>
        <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-xl transition-colors">
          إلغاء
        </button>
      </div>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────
const CategoryAttributesPanel = ({ category, onClose }) => {
  const [editingId, setEditingId]   = useState(null); // attrId being edited
  const [addingNew, setAddingNew]   = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError]           = useState('');

  const { data: attrs = [], isLoading, mutate } = useSWR(
    category ? `catAttrs-${category.id}` : null,
    () => api.getCategoryAttributes(category.id)
  );

  const clearError = () => setError('');

  const handleCreate = useCallback(async (formData) => {
    setActionLoading(true);
    clearError();
    try {
      await api.createCategoryAttribute(category.id, formData);
      await mutate();
      setAddingNew(false);
    } catch (e) {
      setError(e.message || 'فشل إنشاء الخاصية');
    } finally {
      setActionLoading(false);
    }
  }, [category, mutate]);

  const handleUpdate = useCallback(async (attrId, formData) => {
    setActionLoading(true);
    clearError();
    try {
      await api.updateCategoryAttribute(category.id, attrId, formData);
      await mutate();
      setEditingId(null);
    } catch (e) {
      setError(e.message || 'فشل تحديث الخاصية');
    } finally {
      setActionLoading(false);
    }
  }, [category, mutate]);

  const handleDelete = useCallback(async (attr) => {
    if (!confirm(`حذف الخاصية "${attr.name}"؟ سيتم حذف قيمها من جميع المنتجات المرتبطة.`)) return;
    setActionLoading(true);
    clearError();
    try {
      const result = await api.deleteCategoryAttribute(category.id, attr.id);
      await mutate();
      if (result?.affectedProducts > 0) {
        alert(`تم الحذف. تم مسح القيمة من ${result.affectedProducts} منتج.`);
      }
    } catch (e) {
      setError(e.message || 'فشل حذف الخاصية');
    } finally {
      setActionLoading(false);
    }
  }, [category, mutate]);

  const handleReorder = useCallback(async (attrId, direction) => {
    const idx = attrs.findIndex(a => a.id === attrId);
    if (idx < 0) return;
    const newAttrs = [...attrs];
    const swapIdx  = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= newAttrs.length) return;
    [newAttrs[idx], newAttrs[swapIdx]] = [newAttrs[swapIdx], newAttrs[idx]];
    try {
      await api.reorderCategoryAttributes(category.id, newAttrs.map(a => a.id));
      await mutate();
    } catch (e) {
      setError(e.message || 'فشل إعادة الترتيب');
    }
  }, [attrs, category, mutate]);

  if (!category) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-0 sm:px-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: '100%', scale: 0.97 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: '100%', scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-full sm:max-w-xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gold-100 dark:bg-gold-900/30 flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4 text-gold-600 dark:text-gold-400" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">خصائص التصنيف</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{category.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
              <button onClick={clearError} className="ml-auto text-red-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
            </div>
          ) : attrs.length === 0 && !addingNew ? (
            <div className="text-center py-10 text-slate-400 dark:text-slate-500">
              <SlidersHorizontal className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">لا توجد خصائص لهذا التصنيف</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {attrs.map((attr, idx) => (
                <motion.div key={attr.id}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                >
                  {editingId === attr.id ? (
                    <AttributeForm
                      initial={{
                        name: attr.name, type: attr.type, scope: attr.scope,
                        isRequired: attr.isRequired, isFilterable: attr.isFilterable,
                        isSearchable: attr.isSearchable, sortOrder: attr.sortOrder,
                        options: attr.options ? JSON.parse(attr.options).join(', ') : '',
                      }}
                      onSave={data => handleUpdate(attr.id, data)}
                      onCancel={() => setEditingId(null)}
                      loading={actionLoading}
                    />
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl group">
                      {/* Reorder */}
                      <div className="flex flex-col gap-0.5">
                        <button onClick={() => handleReorder(attr.id, 'up')} disabled={idx === 0} className="p-0.5 text-slate-300 hover:text-gold-500 disabled:opacity-20 transition-colors">
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleReorder(attr.id, 'down')} disabled={idx === attrs.length - 1} className="p-0.5 text-slate-300 hover:text-gold-500 disabled:opacity-20 transition-colors">
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-slate-900 dark:text-white">{attr.name}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${TYPE_COLORS[attr.type] || ''}`}>{TYPE_LABELS[attr.type]}</span>
                          {attr.scope !== 'PRODUCT' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">{SCOPE_LABELS[attr.scope]}</span>
                          )}
                          {attr.isRequired   && <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold bg-red-50 text-red-500 dark:bg-red-900/20">إلزامي</span>}
                          {attr.isFilterable && <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold bg-blue-50 text-blue-500 dark:bg-blue-900/20">تصفية</span>}
                          {attr.isSearchable && <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold bg-green-50 text-green-500 dark:bg-green-900/20">بحث</span>}
                        </div>
                        {attr.options && (
                          <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                            {JSON.parse(attr.options).join(' · ')}
                          </p>
                        )}
                        <p className="text-[10px] text-slate-400 mt-0.5">/{attr.slug}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingId(attr.id); setAddingNew(false); }}
                          className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(attr)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          )}

          {addingNew && (
            <AttributeForm
              initial={EMPTY_FORM}
              onSave={handleCreate}
              onCancel={() => setAddingNew(false)}
              loading={actionLoading}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
          <button
            onClick={() => { setAddingNew(true); setEditingId(null); }}
            disabled={addingNew}
            className="flex items-center gap-2 w-full justify-center px-4 py-2.5 text-sm font-bold text-white bg-gold-600 hover:bg-gold-500 disabled:opacity-50 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            إضافة خاصية جديدة
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default CategoryAttributesPanel;
