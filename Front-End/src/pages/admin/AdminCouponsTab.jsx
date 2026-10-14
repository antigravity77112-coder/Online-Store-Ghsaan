/**
 * AdminCouponsTab — إدارة الكوبونات
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TicketPercent, Plus, Edit3, Ban, X, Save, Loader2, RefreshCw, Search,
} from 'lucide-react';
import * as api from '../../services/api';
import { AdminToolbar, AdminPrimaryButton, AdminEmptyState, AdminLoading } from './AdminUI';

const STATUS_LABELS = {
  Draft: 'مسودة',
  Active: 'فعّال',
  Used: 'مستخدم',
  Expired: 'منتهي',
  Disabled: 'معطّل',
};

const STATUS_COLORS = {
  Draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  Active: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  Used: 'bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  Expired: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  Disabled: 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
};

const EMPTY_FORM = {
  name: '',
  code: '',
  discountType: 'Percent',
  discountPercent: 10,
  discountFixedAmount: '',
  validityDays: 14,
  usageLimit: 1,
  adminStatus: 'Draft',
  internalNotes: '',
};

function formatDiscountLabel(coupon) {
  if (coupon?.discountType === 'Amount') {
    const amount = Number(coupon.discountFixedAmount);
    return Number.isFinite(amount) ? `${amount.toLocaleString('en-US')} (مبلغ)` : '—';
  }
  const pct = coupon?.discountPercent;
  return pct != null ? `${pct}%` : '—';
}

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('ar-YE', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch {
    return '—';
  }
}

function formatRemaining(ms) {
  if (ms == null) return '—';
  if (ms <= 0) return 'انتهى';
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  if (days > 0) return `${days} يوم${hours ? ` و${hours} س` : ''}`;
  return `${Math.max(1, hours)} ساعة`;
}

function CouponFormModal({ coupon, onClose, onSaved }) {
  const [form, setForm] = useState(() => (
    coupon
      ? {
          name: coupon.name || '',
          code: coupon.code || '',
          discountType: coupon.discountType === 'Amount' ? 'Amount' : 'Percent',
          discountPercent: coupon.discountPercent ?? 10,
          discountFixedAmount: coupon.discountFixedAmount ?? '',
          validityDays: coupon.validityDays ?? 14,
          usageLimit: coupon.usageLimit ?? 1,
          adminStatus: coupon.adminStatus === 'Disabled' ? 'Disabled' : (coupon.adminStatus || 'Draft'),
          internalNotes: coupon.internalNotes || '',
        }
      : { ...EMPTY_FORM }
  ));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);

  const set = (field, val) => setForm((f) => ({ ...f, [field]: val }));

  useEffect(() => {
    if (coupon?.id || form.code) return undefined;
    let cancelled = false;
    (async () => {
      setGenerating(true);
      try {
        const res = await api.generateCouponCode();
        if (!cancelled && res?.code) set('code', res.code);
      } catch {
        /* ignore — admin can type manually */
      } finally {
        if (!cancelled) setGenerating(false);
      }
    })();
    return () => { cancelled = true; };
  }, [coupon?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!form.name.trim()) {
      setError('اسم الكوبون مطلوب');
      return;
    }
    if (!form.code.trim()) {
      setError('كود الكوبون مطلوب');
      return;
    }
    if (form.discountType === 'Amount') {
      const amount = Number(form.discountFixedAmount);
      if (!Number.isFinite(amount) || amount <= 0) {
        setError('أدخل مبلغ خصم صالحاً أكبر من صفر');
        return;
      }
    } else {
      const pct = Number(form.discountPercent);
      if (!Number.isInteger(pct) || pct < 1 || pct > 100) {
        setError('نسبة الخصم يجب أن تكون بين 1 و 100');
        return;
      }
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        discountType: form.discountType === 'Amount' ? 'Amount' : 'Percent',
        discountPercent: form.discountType === 'Amount' ? null : Number(form.discountPercent),
        discountFixedAmount: form.discountType === 'Amount' ? Number(form.discountFixedAmount) : null,
        validityDays: Number(form.validityDays),
        usageLimit: Number(form.usageLimit) || 1,
        adminStatus: form.adminStatus === 'Disabled' ? 'Disabled' : form.adminStatus,
        internalNotes: form.internalNotes.trim() || null,
      };
      if (coupon?.id) {
        await api.updateCoupon(coupon.id, payload);
      } else {
        await api.createCoupon({
          ...payload,
          adminStatus: payload.adminStatus === 'Active' ? 'Active' : 'Draft',
        });
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TicketPercent className="w-5 h-5 text-gold-500" />
            {coupon?.id ? 'تعديل الكوبون' : 'إنشاء كوبون جديد'}
          </h2>
          <button type="button" onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="px-4 py-3 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">اسم / وصف الكوبون *</label>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              placeholder="مثال: خصم افتتاح المتجر"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">كود الكوبون *</label>
            <div className="flex gap-2">
              <input
                value={form.code}
                onChange={(e) => set('code', e.target.value.toUpperCase())}
                required
                dir="ltr"
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono tracking-wider"
                placeholder="SAVE10"
              />
              <button
                type="button"
                disabled={generating}
                onClick={async () => {
                  setGenerating(true);
                  try {
                    const res = await api.generateCouponCode();
                    if (res?.code) set('code', res.code);
                  } catch (err) {
                    setError(err.message || 'فشل توليد الكود');
                  } finally {
                    setGenerating(false);
                  }
                }}
                className="px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'توليد'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">نوع الخصم *</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'Percent', label: 'نسبة مئوية %' },
                { value: 'Amount', label: 'مبلغ ثابت' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set('discountType', opt.value)}
                  className={`px-3 py-2.5 rounded-xl border text-sm font-bold transition-colors ${
                    form.discountType === opt.value
                      ? 'border-gold-500 bg-gold-50 text-gold-800 dark:bg-gold-900/20 dark:text-gold-200'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {form.discountType === 'Amount' ? (
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">مبلغ الخصم *</label>
                <input
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={form.discountFixedAmount}
                  onChange={(e) => set('discountFixedAmount', e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  placeholder="مثال: 500"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">نسبة الخصم % *</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={form.discountPercent}
                  onChange={(e) => set('discountPercent', e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">مدة الصلاحية (أيام) *</label>
              <input
                type="number"
                min={1}
                value={form.validityDays}
                onChange={(e) => set('validityDays', e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              />
              <div className="flex flex-wrap gap-1 mt-1.5">
                {[7, 10, 14, 30].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => set('validityDays', d)}
                    className="px-2 py-0.5 text-[10px] rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 hover:border-gold-400"
                  >
                    {d} يوم
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">حد الاستخدام *</label>
              <input
                type="number"
                min={1}
                value={form.usageLimit}
                onChange={(e) => set('usageLimit', e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">الحالة</label>
              <select
                value={form.adminStatus === 'Disabled' ? 'Disabled' : form.adminStatus}
                onChange={(e) => set('adminStatus', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              >
                <option value="Draft">مسودة</option>
                <option value="Active">فعّال</option>
                {coupon?.id && <option value="Disabled">معطّل</option>}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">ملاحظات داخلية</label>
            <textarea
              value={form.internalNotes}
              onChange={(e) => set('internalNotes', e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm resize-none"
              placeholder="لا تظهر للعملاء"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 inline-flex items-center justify-center gap-2 min-h-[44px] rounded-xl bg-gold-600 text-white text-sm font-bold hover:bg-gold-500 disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              حفظ
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300"
            >
              إلغاء
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function AdminCouponsTab({ showSuccess, setError }) {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalCoupon, setModalCoupon] = useState(undefined);
  const [detail, setDetail] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getCoupons({ q: search.trim() || undefined });
      setCoupons(Array.isArray(data) ? data : []);
    } catch (err) {
      setError?.(err.message || 'فشل تحميل الكوبونات');
    } finally {
      setLoading(false);
    }
  }, [search, setError]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => coupons, [coupons]);

  const handleDisable = async (coupon) => {
    if (!confirm(`تعطيل الكوبون ${coupon.code}؟`)) return;
    try {
      await api.disableCoupon(coupon.id);
      showSuccess?.('تم تعطيل الكوبون');
      load();
    } catch (err) {
      setError?.(err.message || 'فشل التعطيل');
    }
  };

  if (loading && coupons.length === 0) {
    return <AdminLoading label="جاري تحميل الكوبونات..." />;
  }

  return (
    <div className="space-y-4">
      <AdminToolbar
        title="إدارة الكوبونات"
        subtitle="إنشاء وتتبع كوبونات الخصم النسبية"
        actions={(
          <>
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300"
            >
              <RefreshCw className="w-4 h-4" />
              تحديث
            </button>
            <AdminPrimaryButton onClick={() => setModalCoupon(null)}>
              <Plus className="w-4 h-4" />
              إنشاء كوبون جديد
            </AdminPrimaryButton>
          </>
        )}
      />

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث بالاسم أو الكود..."
          className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <AdminEmptyState
          icon={TicketPercent}
          title="لا توجد كوبونات"
          description="أنشئ أول كوبون خصم من الزر أعلاه"
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <table className="w-full text-sm text-right">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-500">
              <tr>
                <th className="px-3 py-3 font-bold">الاسم</th>
                <th className="px-3 py-3 font-bold">الكود</th>
                <th className="px-3 py-3 font-bold">الخصم</th>
                <th className="px-3 py-3 font-bold">التفعيل</th>
                <th className="px-3 py-3 font-bold">الانتهاء</th>
                <th className="px-3 py-3 font-bold">المتبقي</th>
                <th className="px-3 py-3 font-bold">الاستخدام</th>
                <th className="px-3 py-3 font-bold">الحالة</th>
                <th className="px-3 py-3 font-bold">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-3 py-3 font-semibold text-slate-900 dark:text-white max-w-[140px] truncate">{c.name}</td>
                  <td className="px-3 py-3 font-mono dir-ltr text-left tracking-wide">{c.code}</td>
                  <td className="px-3 py-3 whitespace-nowrap">{formatDiscountLabel(c)}</td>
                  <td className="px-3 py-3 whitespace-nowrap">{formatDate(c.activatedAt)}</td>
                  <td className="px-3 py-3 whitespace-nowrap">{formatDate(c.expiresAt)}</td>
                  <td className="px-3 py-3 whitespace-nowrap">{formatRemaining(c.remainingMs)}</td>
                  <td className="px-3 py-3 tabular-nums">{c.usageCount}/{c.usageLimit}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ${STATUS_COLORS[c.effectiveStatus] || STATUS_COLORS.Draft}`}>
                      {STATUS_LABELS[c.effectiveStatus] || c.effectiveStatus}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => setDetail(c)} className="p-1.5 text-slate-400 hover:text-gold-600" title="تفاصيل">
                        <Search className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => setModalCoupon(c)} className="p-1.5 text-slate-400 hover:text-blue-500" title="تعديل">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {c.adminStatus === 'Active' && c.effectiveStatus !== 'Disabled' && (
                        <button type="button" onClick={() => handleDisable(c)} className="p-1.5 text-slate-400 hover:text-rose-500" title="تعطيل">
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {modalCoupon !== undefined && (
          <CouponFormModal
            coupon={modalCoupon}
            onClose={() => setModalCoupon(undefined)}
            onSaved={() => {
              setModalCoupon(undefined);
              showSuccess?.(modalCoupon?.id ? 'تم تحديث الكوبون' : 'تم إنشاء الكوبون');
              load();
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {detail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setDetail(null)}>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-xl space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">{detail.name}</h3>
                <button type="button" onClick={() => setDetail(null)} className="p-2 text-slate-400"><X className="w-4 h-4" /></button>
              </div>
              <p className="font-mono text-sm dir-ltr text-left">{detail.code}</p>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <div><dt className="text-slate-400">الخصم</dt><dd className="font-bold">{formatDiscountLabel(detail)}</dd></div>
                <div><dt className="text-slate-400">الحالة</dt><dd className="font-bold">{STATUS_LABELS[detail.effectiveStatus]}</dd></div>
                <div><dt className="text-slate-400">التفعيل</dt><dd>{formatDate(detail.activatedAt)}</dd></div>
                <div><dt className="text-slate-400">الانتهاء</dt><dd>{formatDate(detail.expiresAt)}</dd></div>
                <div><dt className="text-slate-400">الاستخدام</dt><dd>{detail.usageCount}/{detail.usageLimit}</dd></div>
                <div><dt className="text-slate-400">المتبقي</dt><dd>{formatRemaining(detail.remainingMs)}</dd></div>
              </dl>
              {detail.internalNotes && (
                <p className="text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-3">
                  ملاحظات: {detail.internalNotes}
                </p>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
