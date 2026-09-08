import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Megaphone, Plus, Edit3, Trash2, Copy, Archive, Eye, EyeOff,
  ChevronUp, ChevronDown, X, Save, Loader2, BarChart2,
  AlertTriangle, Image as ImageIcon, Monitor, Smartphone,
  Calendar, Clock, TrendingUp, MousePointerClick, Layers,
} from 'lucide-react';
import useSWR from 'swr';
import * as api from '../../services/api';
import { confirmDiscardDraft } from '../../utils/adminDraftConfirm';
import BannerPreview from './banners/BannerPreview';
import HeroPeekProductPicker from './banners/HeroPeekProductPicker';
import { AdminToolbar, AdminPrimaryButton, AdminGhostButton, adminSelectClass, AdminLoading, AdminUploadProgress } from './AdminUI';

// ─── Constants ────────────────────────────────────────────────────────────────
const PLACEMENTS = [
  { value: 'hero',         label: 'القسم الرئيسي (الهيرو)' },
  { value: 'promo_home',   label: 'قسم ترويجي - الرئيسية' },
  { value: 'announcement', label: 'شريط الإعلان العلوي' },
  { value: 'category',     label: 'صفحة الأقسام' },
  { value: 'product',      label: 'صفحة المنتج' },
  { value: 'sidebar',      label: 'الشريط الجانبي' },
  { value: 'footer',       label: 'التذييل' },
  { value: 'popup',        label: 'نافذة منبثقة' },
];

const DIMENSION_HINTS = {
  hero:         { desktop: '1920x820 بكسل (أو 21:9)', mobile: '800x1200 بكسل (أو 4:5)' },
  promo_home:   { desktop: '1200x300 بكسل (أو 4:1)',  mobile: '800x400 بكسل (أو 2:1)' },
  announcement: { desktop: 'لا يحتاج إلى صورة عادة',    mobile: 'لا يحتاج إلى صورة عادة' },
  category:     { desktop: '1200x400 بكسل (أو 3:1)',  mobile: '800x400 بكسل (أو 2:1)' },
  product:      { desktop: '1200x400 بكسل (أو 3:1)',  mobile: '800x400 بكسل (أو 2:1)' },
  sidebar:      { desktop: '400x710 بكسل (أو 9:16)',  mobile: '400x710 بكسل (أو 9:16)' },
  footer:       { desktop: '1200x240 بكسل (أو 5:1)',  mobile: '800x400 بكسل (أو 2:1)' },
  popup:        { desktop: '800x600 بكسل (أو 4:3)',   mobile: '600x600 بكسل (أو 1:1)' },
};

const STATUSES = [
  { value: 'active',    label: 'نشط',     color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  { value: 'draft',     label: 'مسودة',   color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
  { value: 'scheduled', label: 'مجدول',   color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  { value: 'archived',  label: 'مؤرشف',   color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
];

const EMPTY_FORM = {
  title: '', subtitle: '', description: '', ctaText: '', ctaUrl: '',
  imageUrl: '', mobileImageUrl: '', bgColor: '#1A0A0A',
  textAlign: 'right', overlayOpacity: 30,
  placement: 'promo_home', status: 'active',
  showOnDesktop: true, showOnMobile: true,
  priority: 0, scheduledAt: '', expiresAt: '',
  peekProductIds: [],
};

function statusInfo(s) { return STATUSES.find(x => x.value === s) || STATUSES[1]; }
function placementLabel(p) { return PLACEMENTS.find(x => x.value === p)?.label || p; }
function ctr(b) { return b.impressions > 0 ? ((b.clicks / b.impressions) * 100).toFixed(1) : '0.0'; }

// ─── Analytics sub-view ────────────────────────────────────────────────────────
function BannerAnalytics({ banners }) {
  const totalImpressions = banners.reduce((s, b) => s + (b.impressions || 0), 0);
  const totalClicks = banners.reduce((s, b) => s + (b.clicks || 0), 0);
  const avgCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : '0.0';
  const activeCount = banners.filter(b => b.status === 'active').length;

  const topBanners = [...banners]
    .filter(b => b.impressions > 0)
    .sort((a, b) => parseFloat(ctr(b)) - parseFloat(ctr(a)))
    .slice(0, 5);

  const cards = [
    { label: 'إجمالي المشاهدات', value: totalImpressions.toLocaleString(), icon: Eye, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' },
    { label: 'إجمالي النقرات', value: totalClicks.toLocaleString(), icon: MousePointerClick, color: 'text-gold-500 bg-gold-50 dark:bg-gold-900/20' },
    { label: 'متوسط CTR', value: `${avgCtr}%`, icon: TrendingUp, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'بانرات نشطة', value: activeCount, icon: Layers, color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${c.color}`}>
              <c.icon className="w-5 h-5" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{c.value}</div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>

      {topBanners.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-white">أفضل البانرات أداءً</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  {['البانر', 'الموقع', 'المشاهدات', 'النقرات', 'CTR'].map(h => (
                    <th key={h} className="text-right px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {topBanners.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-white max-w-[200px] truncate">{b.title}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{placementLabel(b.placement)}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{(b.impressions || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{(b.clicks || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">{ctr(b)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Field component (reuse AdminStoreInfoTab style) ─────────────────────────
function Field({ label, children, className = '' }) {
  return (
    <div className={className}>
      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-gold-500/50 focus:border-gold-400 text-slate-900 dark:text-white text-sm outline-none transition-all';
const selectCls = inputCls + ' cursor-pointer appearance-none';

// ─── Editor Panel ─────────────────────────────────────────────────────────────
function EditorPanel({ banner, allBanners = [], visible, onSoftClose, onHardClose, onSaved, onDirtyChange, showSuccess, setError }) {
  const isEdit = !!banner?.id;
  const [form, setForm] = useState(isEdit ? {
    ...banner,
    peekProductIds: Array.isArray(banner.peekProductIds) ? banner.peekProductIds : [],
    scheduledAt: banner.scheduledAt ? banner.scheduledAt.slice(0, 16) : '',
    expiresAt:   banner.expiresAt   ? banner.expiresAt.slice(0, 16)   : '',
  } : { ...EMPTY_FORM });
  const [saving, setSaving]       = useState(false);
  const [uploadingField, setUploadingField] = useState(null);
  const dirtyNotifiedRef = useRef(false);
  const panelRootRef = useRef(null);

  const markDirty = () => {
    if (dirtyNotifiedRef.current) return;
    dirtyNotifiedRef.current = true;
    onDirtyChange?.(true);
  };

  useEffect(() => {
    dirtyNotifiedRef.current = false;
    onDirtyChange?.(false);
  }, [banner?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const root = panelRootRef.current;
    if (!root) return undefined;
    const onInteract = () => markDirty();
    root.addEventListener('input', onInteract, true);
    root.addEventListener('change', onInteract, true);
    root.addEventListener('click', onInteract, true);
    return () => {
      root.removeEventListener('input', onInteract, true);
      root.removeEventListener('change', onInteract, true);
      root.removeEventListener('click', onInteract, true);
    };
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onSoftClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, onSoftClose]);

  const set = (k, v) => {
    markDirty();
    setForm(f => ({ ...f, [k]: v }));
  };

  const handleImageUpload = async (e, field) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadingField(field);
    try { set(field, await api.uploadBannerImage(file)); }
    catch (err) { setError('فشل رفع الصورة: ' + err.message); }
    finally { setUploadingField(null); }
  };

  const handleSave = async () => {
    if (saving || uploadingField) return;
    setSaving(true);
    try {
      const payload = { ...form,
        scheduledAt: form.scheduledAt || null,
        expiresAt:   form.expiresAt   || null,
        overlayOpacity: Number(form.overlayOpacity),
        priority:       Number(form.priority),
        peekProductIds: Array.isArray(form.peekProductIds)
          ? form.peekProductIds.filter(Boolean).slice(0, 2)
          : [],
      };
      if (!isEdit) {
        const samePlacement = allBanners.filter((b) => b.placement === payload.placement);
        const maxPriority = samePlacement.reduce((max, b) => Math.max(max, Number(b.priority) || 0), -1);
        payload.priority = maxPriority + 1;
      }
      if (isEdit) await api.updateAdminBanner(banner.id, payload);
      else        await api.createAdminBanner(payload);
      showSuccess(isEdit ? 'تم تحديث البانر ✅' : 'تم إنشاء البانر 🎉');
      onSaved();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div
      ref={panelRootRef}
      className={`fixed inset-0 z-50 flex ${visible ? '' : 'invisible pointer-events-none'}`}
      aria-hidden={!visible}
    >
      <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={onSoftClose} />
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 h-full overflow-y-auto shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{isEdit ? 'تعديل البانر' : 'بانر جديد'}</h3>
          <button type="button" onClick={onSoftClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" aria-label="إخفاء النافذة"><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        <div className="flex-1 p-6 space-y-5">
          {/* Live Preview */}
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">معاينة مباشرة</p>
            <BannerPreview banner={form} compact />
          </div>

          {/* Content */}
          <div className="grid grid-cols-1 gap-4">
            <Field label="العنوان (اختياري)">
              <input className={inputCls} value={form.title} onChange={e => set('title', e.target.value)} placeholder="عنوان البانر" />
            </Field>
            <Field label="العنوان الفرعي">
              <input className={inputCls} value={form.subtitle} onChange={e => set('subtitle', e.target.value)} placeholder="عنوان فرعي اختياري" />
            </Field>
            <Field label="الوصف">
              <textarea className={inputCls + ' min-h-[70px] resize-none'} value={form.description} onChange={e => set('description', e.target.value)} placeholder="نص توضيحي..." />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="نص زر CTA">
                <input className={inputCls} value={form.ctaText} onChange={e => set('ctaText', e.target.value)} placeholder="مثال: تسوق الآن" />
              </Field>
              <Field label="رابط CTA">
                <input className={inputCls} dir="ltr" value={form.ctaUrl} onChange={e => set('ctaUrl', e.target.value)} placeholder="https://..." />
              </Field>
            </div>
          </div>

          {/* Images */}
          <div className="grid grid-cols-1 gap-4">
            <Field label={
              <div className="flex justify-between items-center w-full">
                <span>صورة البانر الأساسية (سطح المكتب)</span>
                <span className="text-xs text-slate-400 font-normal" dir="ltr">{DIMENSION_HINTS[form.placement]?.desktop}</span>
              </div>
            }>
              {form.imageUrl && <img src={form.imageUrl} className="h-20 rounded-lg object-cover mb-2 border border-slate-200 dark:border-slate-700" alt="" />}
              <div className="relative">
                <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'imageUrl')} disabled={uploadingField === 'imageUrl'} className={inputCls + ' file:mr-3 file:rounded-lg file:border-0 file:bg-gold-50 dark:file:bg-gold-900/40 file:text-gold-700 dark:file:text-gold-300 file:font-semibold file:text-sm cursor-pointer disabled:opacity-50'} />
                <AdminUploadProgress active={uploadingField === 'imageUrl'} />
              </div>
            </Field>
            <Field label={
              <div className="flex justify-between items-center w-full">
                <span>صورة الجوال (اختياري)</span>
                <span className="text-xs text-slate-400 font-normal" dir="ltr">{DIMENSION_HINTS[form.placement]?.mobile}</span>
              </div>
            }>
              {form.mobileImageUrl && <img src={form.mobileImageUrl} className="h-16 rounded-lg object-cover mb-2 border border-slate-200 dark:border-slate-700" alt="" />}
              <div className="relative">
                <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'mobileImageUrl')} disabled={uploadingField === 'mobileImageUrl'} className={inputCls + ' file:mr-3 file:rounded-lg file:border-0 file:bg-gold-50 dark:file:bg-gold-900/40 file:text-gold-700 dark:file:text-gold-300 file:font-semibold file:text-sm cursor-pointer disabled:opacity-50'} />
                <AdminUploadProgress active={uploadingField === 'mobileImageUrl'} />
              </div>
            </Field>
          </div>

          {form.placement === 'hero' && (
            <HeroPeekProductPicker
              value={form.peekProductIds}
              onChange={(ids) => set('peekProductIds', ids)}
            />
          )}

          {/* Appearance */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="لون الخلفية">
              <div className="flex items-center gap-3">
                <input type="color" value={form.bgColor || '#1A0A0A'} onChange={e => set('bgColor', e.target.value)} className="w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer" />
                <input className={inputCls} dir="ltr" value={form.bgColor} onChange={e => set('bgColor', e.target.value)} placeholder="#1A0A0A" />
              </div>
            </Field>
            <Field label={`شفافية التعتيم: ${form.overlayOpacity}%`}>
              <input type="range" min="0" max="100" value={form.overlayOpacity} onChange={e => set('overlayOpacity', e.target.value)} className="w-full mt-3" />
            </Field>
          </div>

          <Field label="محاذاة النص">
            <div className="flex gap-2">
              {['right','center','left'].map(a => (
                <button key={a} onClick={() => set('textAlign', a)}
                  className={`flex-1 py-2 text-sm font-semibold rounded-xl border transition-all ${form.textAlign === a ? 'bg-gold-600 text-white border-gold-600' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-gold-400'}`}>
                  {a === 'right' ? 'يمين' : a === 'center' ? 'وسط' : 'يسار'}
                </button>
              ))}
            </div>
          </Field>

          {/* Placement + Status */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="الموضع">
              <select className={selectCls} value={form.placement} onChange={e => set('placement', e.target.value)}>
                {PLACEMENTS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </Field>
            <Field label="الحالة">
              <select className={selectCls} value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
          </div>

          {/* Scheduling */}
          {(form.status === 'scheduled' || form.scheduledAt || form.expiresAt) && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="تاريخ النشر"><input type="datetime-local" className={inputCls} dir="ltr" value={form.scheduledAt} onChange={e => set('scheduledAt', e.target.value)} /></Field>
              <Field label="تاريخ الانتهاء"><input type="datetime-local" className={inputCls} dir="ltr" value={form.expiresAt} onChange={e => set('expiresAt', e.target.value)} /></Field>
            </div>
          )}

          {/* Visibility + Priority */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="الأولوية">
              <input type="number" min="0" className={inputCls} value={form.priority} onChange={e => set('priority', e.target.value)} />
            </Field>
            <Field label="الظهور">
              <div className="flex gap-3 mt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.showOnDesktop} onChange={e => set('showOnDesktop', e.target.checked)} className="w-4 h-4 accent-gold-600" />
                  <Monitor className="w-4 h-4 text-slate-500" /><span className="text-sm text-slate-600 dark:text-slate-300">سطح المكتب</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.showOnMobile} onChange={e => set('showOnMobile', e.target.checked)} className="w-4 h-4 accent-gold-600" />
                  <Smartphone className="w-4 h-4 text-slate-500" /><span className="text-sm text-slate-600 dark:text-slate-300">جوال</span>
                </label>
              </div>
            </Field>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex gap-3 sticky bottom-0 bg-white dark:bg-slate-900">
          <button onClick={handleSave} disabled={saving || !!uploadingField}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gold-600 hover:bg-gold-500 text-white font-bold rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEdit ? 'حفظ التغييرات' : 'إنشاء البانر'}
          </button>
          <button type="button" onClick={onHardClose} className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">إلغاء</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────
function AdminBannersTab({ showSuccess, setError }) {
  const [view, setView]         = useState('list'); // 'list' | 'analytics'
  const [editorBanner, setEditorBanner] = useState(null); // null | {} new | banner edit
  const [bannerEditorMounted, setBannerEditorMounted] = useState(false);
  const [bannerModalOpen, setBannerModalOpen] = useState(false);
  const [bannerFormKey, setBannerFormKey] = useState(0);
  const [bannerDirty, setBannerDirty] = useState(false);
  const [filterPlacement, setFilterPlacement] = useState('');
  const [filterStatus, setFilterStatus]       = useState('');
  const [actionLoading, setActionLoading]     = useState(null);

  const { data: banners, mutate, isLoading: bannersLoading } = useSWR('adminBanners', api.getAdminBanners, { revalidateOnFocus: false });
  const bannerList = banners || [];

  const softDismissBannerEditor = () => setBannerModalOpen(false);

  const hardClearBannerEditor = ({ skipConfirm = false } = {}) => {
    if (!skipConfirm && !confirmDiscardDraft(bannerDirty)) return;
    setBannerModalOpen(false);
    setBannerEditorMounted(false);
    setEditorBanner(null);
    setBannerDirty(false);
    setBannerFormKey((k) => k + 1);
  };

  const openBannerEditor = (banner = {}) => {
    const isNew = !banner?.id;
    if (bannerEditorMounted) {
      if (isNew && !editorBanner?.id) {
        setBannerModalOpen(true);
        return;
      }
      if (!isNew && editorBanner?.id === banner.id) {
        setBannerModalOpen(true);
        return;
      }
      if (bannerDirty && !confirmDiscardDraft(true)) return;
    }
    setEditorBanner(isNew ? {} : banner);
    setBannerDirty(false);
    setBannerFormKey((k) => k + 1);
    setBannerEditorMounted(true);
    setBannerModalOpen(true);
  };

  const filtered = useMemo(() => bannerList.filter(b =>
    (!filterPlacement || b.placement === filterPlacement) &&
    (!filterStatus    || b.status    === filterStatus)
  ), [bannerList, filterPlacement, filterStatus]);

  // Conflict detector: >1 active banner per placement
  const conflicts = useMemo(() => {
    const counts = {};
    bannerList.filter(b => b.status === 'active').forEach(b => { counts[b.placement] = (counts[b.placement] || 0) + 1; });
    return new Set(Object.entries(counts).filter(([, c]) => c > 1).map(([p]) => p));
  }, [bannerList]);

  const doAction = useCallback(async (id, fn, msg) => {
    setActionLoading(id);
    try { await fn(); await mutate(); showSuccess(msg); }
    catch (err) { setError(err.message); }
    finally { setActionLoading(null); }
  }, [mutate, showSuccess, setError]);

  const handleDelete = (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا البانر نهائياً؟')) return;
    doAction(id, () => api.deleteAdminBanner(id), 'تم حذف البانر');
  };

  const handleReorder = async (id, dir) => {
    const sorted = [...bannerList].sort((a, b) => a.priority - b.priority);
    const idx = sorted.findIndex(b => b.id === id);
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    [sorted[idx].priority, sorted[swapIdx].priority] = [sorted[swapIdx].priority, sorted[idx].priority];
    await doAction(id, () => api.reorderAdminBanners(sorted.map(b => b.id)), 'تم إعادة الترتيب');
  };

  return (
    <div className="space-y-6">
      <AdminToolbar
        title="إدارة البانرات والإعلانات"
        subtitle={`${bannerList.length} بانر — ${bannerList.filter(b => b.status === 'active').length} نشط`}
        icon={Megaphone}
        actions={
          <>
            <AdminGhostButton onClick={() => setView(v => v === 'analytics' ? 'list' : 'analytics')}>
              <BarChart2 className="w-4 h-4" /> التحليلات
            </AdminGhostButton>
            <AdminPrimaryButton onClick={() => openBannerEditor({})} disabled={bannerModalOpen}>
              <Plus className="w-4 h-4" /> بانر جديد
            </AdminPrimaryButton>
          </>
        }
      />

      {bannersLoading && !banners ? (
        <AdminLoading label="جاري تحميل البانرات..." />
      ) : null}

      {/* Analytics View */}
      {!(bannersLoading && !banners) && view === 'analytics' && <BannerAnalytics banners={bannerList} />}

      {/* List View */}
      {!(bannersLoading && !banners) && view === 'list' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <select className={selectCls + ' w-auto'} value={filterPlacement} onChange={e => setFilterPlacement(e.target.value)}>
              <option value="">كل المواضع</option>
              {PLACEMENTS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <select className={selectCls + ' w-auto'} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">كل الحالات</option>
              {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {/* Conflict warning */}
          {conflicts.size > 0 && (
            <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                يوجد أكثر من بانر نشط في: {[...conflicts].map(p => placementLabel(p)).join('، ')}. ستُعرض جميعها في عرض دوّار تلقائي حسب الأولوية.
              </p>
            </div>
          )}

          {/* Empty state */}
          {filtered.length === 0 && (
            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <Megaphone className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-slate-500 dark:text-slate-400 font-semibold">لا توجد بانرات بعد</p>
              <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">ابدأ بإنشاء بانر جديد لتعزيز مبيعاتك</p>
              <button onClick={() => openBannerEditor({})} disabled={bannerModalOpen} className="mt-4 px-5 py-2 bg-gold-600 text-white rounded-xl text-sm font-bold hover:bg-gold-500 transition-all disabled:opacity-50">
                إنشاء أول بانر
              </button>
            </div>
          )}

          {/* Banner Cards */}
          <div className="space-y-3">
            <AnimatePresence>
              {filtered.map((b, idx) => {
                const st = statusInfo(b.status);
                const isLoading = actionLoading === b.id;
                return (
                  <motion.div key={b.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row gap-4">
                      {/* Thumbnail */}
                      <div className="flex-shrink-0 w-full sm:w-32 h-20 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800">
                        {b.imageUrl
                          ? <img src={b.imageUrl} className="w-full h-full object-cover" alt={b.title} />
                          : <div className="w-full h-full flex items-center justify-center" style={{ background: b.bgColor || '#1A0A0A' }}>
                              <ImageIcon className="w-6 h-6 text-white/40" />
                            </div>
                        }
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h4 className="font-bold text-slate-900 dark:text-white truncate">{b.title || 'بدون عنوان'}</h4>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${st.color}`}>{st.label}</span>
                          {conflicts.has(b.placement) && b.status === 'active' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                              <AlertTriangle className="w-3 h-3" /> تعارض
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {placementLabel(b.placement)} · أولوية: {b.priority} · 👁 {b.impressions?.toLocaleString() || 0} · 🖱 {b.clicks?.toLocaleString() || 0} · CTR: {ctr(b)}%
                        </p>
                        {b.scheduledAt && <p className="text-xs text-blue-500 mt-0.5 flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(b.scheduledAt).toLocaleString('ar-EG')}</p>}
                        {b.expiresAt   && <p className="text-xs text-amber-500 mt-0.5 flex items-center gap-1"><Clock className="w-3 h-3" /> ينتهي: {new Date(b.expiresAt).toLocaleString('ar-EG')}</p>}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap sm:flex-col gap-1.5 flex-shrink-0">
                        <div className="flex gap-1">
                          <button onClick={() => handleReorder(b.id, 'up')} disabled={isLoading || idx === 0} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors" title="رفع الأولوية"><ChevronUp className="w-4 h-4 text-slate-500" /></button>
                          <button onClick={() => handleReorder(b.id, 'down')} disabled={isLoading || idx === filtered.length - 1} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors" title="خفض الأولوية"><ChevronDown className="w-4 h-4 text-slate-500" /></button>
                        </div>
                        <button onClick={() => doAction(b.id, () => api.updateAdminBanner(b.id, { status: b.status === 'active' ? 'draft' : 'active' }), b.status === 'active' ? 'تم إيقاف البانر' : 'تم تفعيل البانر')} disabled={isLoading} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title={b.status === 'active' ? 'إيقاف' : 'تفعيل'}>{b.status === 'active' ? <EyeOff className="w-4 h-4 text-slate-500" /> : <Eye className="w-4 h-4 text-slate-500" />}</button>
                        <button onClick={() => openBannerEditor(b)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-gold-600" title="تعديل"><Edit3 className="w-4 h-4" /></button>
                        <button onClick={() => doAction(b.id, () => api.duplicateAdminBanner(b.id), 'تم نسخ البانر')} disabled={isLoading} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-blue-500" title="نسخ"><Copy className="w-4 h-4" /></button>
                        <button onClick={() => doAction(b.id, () => api.archiveAdminBanner(b.id), 'تم أرشفة البانر')} disabled={isLoading} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-amber-500" title="أرشفة"><Archive className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(b.id)} disabled={isLoading} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-500" title="حذف نهائي">
                          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </>
      )}

      {/* Editor Panel — stays mounted while soft-dismissed */}
      {bannerEditorMounted && (
        <EditorPanel
          key={bannerFormKey}
          banner={editorBanner?.id ? editorBanner : null}
          allBanners={bannerList}
          visible={bannerModalOpen}
          onSoftClose={softDismissBannerEditor}
          onHardClose={() => hardClearBannerEditor()}
          onSaved={() => { hardClearBannerEditor({ skipConfirm: true }); mutate(); }}
          onDirtyChange={setBannerDirty}
          showSuccess={showSuccess}
          setError={setError}
        />
      )}
    </div>
  );
}

export default AdminBannersTab;

