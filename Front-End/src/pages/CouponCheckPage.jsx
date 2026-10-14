/**
 * CouponCheckPage — تحقق عام من صلاحية كود خصم
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TicketPercent, Loader2, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import Layout from '../components/Layout';
import SEO from '../components/SEO';
import * as api from '../services/api';

const REASON_UI = {
  valid: { ok: true, icon: CheckCircle2, tone: 'text-emerald-600 dark:text-emerald-400' },
  expired: { ok: false, icon: XCircle, tone: 'text-rose-600' },
  used: { ok: false, icon: XCircle, tone: 'text-amber-600' },
  not_found: { ok: false, icon: XCircle, tone: 'text-rose-600' },
  inactive: { ok: false, icon: XCircle, tone: 'text-slate-500' },
};

export default function CouponCheckPage() {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleCheck = async (e) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await api.validateCoupon({ code: trimmed });
      setResult(data);
    } catch (err) {
      setResult({
        ok: false,
        reason: 'not_found',
        message: err.message || t('couponCheck.error', 'تعذر التحقق حالياً'),
      });
    } finally {
      setLoading(false);
    }
  };

  const ui = REASON_UI[result?.reason] || REASON_UI.not_found;
  const Icon = ui.icon;

  return (
    <Layout>
      <SEO
        title={t('couponCheck.title', 'التحقق من كوبون')}
        description={t('couponCheck.seoDesc', 'تحقق من صلاحية كود الخصم قبل الطلب.')}
      />
      <div className="max-w-lg mx-auto px-4 py-10 md:py-16">
        <Link
          to="/cart"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-gold-600 mb-6"
        >
          <ArrowRight className="w-4 h-4" />
          {t('couponCheck.backToCart', 'العودة للسلة')}
        </Link>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-gold-100 dark:bg-gold-900/40 flex items-center justify-center">
              <TicketPercent className="w-5 h-5 text-gold-600" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
                {t('couponCheck.title', 'التحقق من كوبون')}
              </h1>
              <p className="text-xs text-slate-500">
                {t('couponCheck.subtitle', 'أدخل الكود لمعرفة إن كان صالحاً للاستخدام')}
              </p>
            </div>
          </div>

          <form onSubmit={handleCheck} className="space-y-3">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              dir="ltr"
              placeholder="SAVE10"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-sm tracking-wider"
              aria-label={t('couponCheck.inputLabel', 'كود الكوبون')}
            />
            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="w-full min-h-[44px] rounded-xl bg-gold-600 hover:bg-gold-500 text-white font-bold text-sm disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {t('couponCheck.submit', 'تحقق')}
            </button>
          </form>

          {result && (
            <div className={`mt-5 rounded-xl border border-slate-100 dark:border-slate-800 p-4 ${ui.tone}`}>
              <div className="flex items-start gap-2">
                <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm text-slate-900 dark:text-white">{result.message}</p>
                  {result.ok && result.coupon && (
                    <ul className="mt-2 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                      <li dir="ltr" className="font-mono">{result.coupon.code}</li>
                      <li>
                        {result.coupon.discountType === 'Amount'
                          ? `${t('couponCheck.amount', 'مبلغ الخصم')}: ${Number(result.coupon.discountFixedAmount).toLocaleString('en-US')}`
                          : `${t('couponCheck.percent', 'نسبة الخصم')}: ${result.coupon.discountPercent}%`}
                      </li>
                      {result.coupon.expiresAt && (
                        <li>
                          {t('couponCheck.expires', 'ينتهي')}:{' '}
                          {new Date(result.coupon.expiresAt).toLocaleDateString('ar')}
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
