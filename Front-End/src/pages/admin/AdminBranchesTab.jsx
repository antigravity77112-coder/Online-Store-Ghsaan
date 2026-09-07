import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Plus, Edit3, Trash2, Loader2, Building2,
  Phone, Clock, Link, ToggleLeft, ToggleRight, X, Save
} from 'lucide-react';
import * as api from '../../services/api';
import { AdminToolbar, AdminPrimaryButton, AdminEmptyState, AdminLoading } from './AdminUI';

const EMPTY_FORM = {
  name: '', address: '', city: '', phone: '', whatsapp: '',
  workingHours: '', mapUrl: '', latitude: '', longitude: '',
  isActive: true, sortOrder: 0,
};

const BranchFormModal = ({ branch, onClose, onSaved }) => {
  const [form, setForm] = useState(branch ? { ...branch, latitude: branch.latitude ?? '', longitude: branch.longitude ?? '' } : EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.address.trim() || !form.city.trim()) {
      setError('الاسم والعنوان والمدينة مطلوبة');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (branch?.id) {
        await api.updateBranch(branch.id, form);
      } else {
        await api.createBranch(form);
      }
      onSaved();
    } catch (err) {
      setError(err.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-gold-500" />
            {branch?.id ? 'تعديل الفرع' : 'إضافة فرع جديد'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="px-4 py-3 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Name */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">اسم الفرع *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-400"
                placeholder="مثال: الفرع الرئيسي - صنعاء" />
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">المدينة *</label>
              <input value={form.city} onChange={e => set('city', e.target.value)} required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-400"
                placeholder="صنعاء" />
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">الترتيب</label>
              <input type="number" value={form.sortOrder} onChange={e => set('sortOrder', e.target.value)} min={0}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-400"
                placeholder="0" />
            </div>

            {/* Address */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">العنوان التفصيلي *</label>
              <textarea value={form.address} onChange={e => set('address', e.target.value)} required rows={2}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-400 resize-none"
                placeholder="الشارع، الحي، المبنى..." />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">رقم الهاتف</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} dir="ltr"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-400"
                placeholder="+967 77X XXX XXX" />
            </div>

            {/* WhatsApp */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">رقم واتساب</label>
              <input value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} dir="ltr"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-400"
                placeholder="+967 77X XXX XXX" />
            </div>

            {/* Working Hours */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">أوقات العمل</label>
              <input value={form.workingHours} onChange={e => set('workingHours', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-400"
                placeholder="السبت - الخميس: 8 ص - 10 م" />
            </div>

            {/* Map URL */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">رابط الخريطة (Google Maps)</label>
              <input value={form.mapUrl} onChange={e => set('mapUrl', e.target.value)} dir="ltr"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-400"
                placeholder="https://maps.google.com/..." />
            </div>

            {/* Latitude / Longitude */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">خط العرض (اختياري)</label>
              <input type="number" step="any" value={form.latitude} onChange={e => set('latitude', e.target.value)} dir="ltr"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-400"
                placeholder="15.3694" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">خط الطول (اختياري)</label>
              <input type="number" step="any" value={form.longitude} onChange={e => set('longitude', e.target.value)} dir="ltr"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-400"
                placeholder="44.1910" />
            </div>

            {/* Active toggle */}
            <div className="sm:col-span-2 flex items-center gap-3">
              <button type="button" onClick={() => set('isActive', !form.isActive)}
                className={`relative w-11 h-6 rounded-full transition-colors ${form.isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isActive ? 'translate-x-1' : 'translate-x-6'}`} />
              </button>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {form.isActive ? 'الفرع نشط (يظهر للعملاء)' : 'الفرع مخفي'}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors">
              إلغاء
            </button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-gold-600 hover:bg-gold-500 text-white text-sm font-bold rounded-xl transition-colors shadow-sm shadow-gold-600/20 disabled:opacity-60">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'جاري الحفظ...' : (branch?.id ? 'حفظ التغييرات' : 'إضافة الفرع')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const AdminBranchesTab = () => {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalBranch, setModalBranch] = useState(undefined); // undefined=closed, null=new, obj=edit

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getBranches({ all: true });
      setBranches(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذا الفرع؟')) return;
    try {
      await api.deleteBranch(id);
      setBranches(bs => bs.filter(b => b.id !== id));
    } catch (err) {
      alert('فشل الحذف: ' + (err.message || ''));
    }
  };

  const handleSaved = () => {
    setModalBranch(undefined);
    load();
  };

  return (
    <div>
      <AdminToolbar
        title="إدارة الفروع والمواقع"
        subtitle={`${branches.length} فرع`}
        icon={MapPin}
        actions={
          <AdminPrimaryButton onClick={() => setModalBranch(null)}>
            <Plus className="w-4 h-4" /> إضافة فرع
          </AdminPrimaryButton>
        }
      />

      {loading ? (
        <AdminLoading label="جاري تحميل الفروع..." />
      ) : branches.length === 0 ? (
        <AdminEmptyState
          icon={Building2}
          title="لا توجد فروع"
          description="أضف أول فرع لمتجرك"
          action={
            <AdminPrimaryButton onClick={() => setModalBranch(null)}>
              <Plus className="w-5 h-5" /> إضافة فرع
            </AdminPrimaryButton>
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {branches.map((branch, i) => (
            <motion.div key={branch.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
              {/* Card header */}
              <div className="flex items-center justify-between px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-4 h-4 text-gold-500 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-slate-800 dark:text-white text-sm">{branch.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{branch.city}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${branch.isActive ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                    {branch.isActive ? 'نشط' : 'مخفي'}
                  </span>
                  <button onClick={() => setModalBranch(branch)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title="تعديل">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(branch.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="حذف">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {/* Card body */}
              <div className="px-5 py-3 space-y-1.5">
                <p className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 text-slate-400 flex-shrink-0" /> {branch.address}
                </p>
                {branch.workingHours && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /> {branch.workingHours}
                  </p>
                )}
                {branch.phone && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /> {branch.phone}
                  </p>
                )}
                {branch.mapUrl && (
                  <a href={branch.mapUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-gold-600 dark:text-gold-400 flex items-center gap-1.5 hover:underline">
                    <Link className="w-3.5 h-3.5 flex-shrink-0" /> فتح في الخريطة
                  </a>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {modalBranch !== undefined && (
          <BranchFormModal
            branch={modalBranch}
            onClose={() => setModalBranch(undefined)}
            onSaved={handleSaved}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminBranchesTab;
