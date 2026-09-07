import React, { useEffect, useState } from 'react';
import {
  AdminToolbar, AdminCard, adminInputClass, AdminPrimaryButton, AdminLoading,
} from './AdminUI';
import { DollarSign, Save, Loader2, RefreshCw } from 'lucide-react';
import * as api from '../../services/api';
import { useCurrency } from '../../context/CurrencyContext';
import { normalizeRates } from '../../utils/currency';

const RATE_FIELDS = [
  {
    key: 'USD_to_SAR',
    label: 'دولار → ريال سعودي (SAR)',
    hint: 'كم ريال سعودي يساوي دولار واحد',
    placeholder: '3.75',
  },
  {
    key: 'USD_to_YER_Sanaa',
    label: 'دولار → ريال يمني — صنعاء',
    hint: 'سعر صرف العرض لعملة صنعاء',
    placeholder: '535',
  },
  {
    key: 'USD_to_YER_Aden',
    label: 'دولار → ريال يمني — عدن',
    hint: 'سعر صرف العرض لعملة عدن',
    placeholder: '1562',
  },
];

const emptyRates = () => ({
  USD_to_YER_Sanaa: '',
  USD_to_YER_Aden: '',
  USD_to_SAR: '',
});

export default function AdminRatesTab({ showSuccess, setError }) {
  const { setRates: applyLiveRates } = useCurrency();
  const [rates, setRates] = useState(emptyRates);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadRates = async () => {
    setLoading(true);
    try {
      const data = await api.getExchangeRates();
      const normalized = normalizeRates(data || {});
      setRates({
        USD_to_YER_Sanaa: String(normalized.USD_to_YER_Sanaa),
        USD_to_YER_Aden: String(normalized.USD_to_YER_Aden),
        USD_to_SAR: String(normalized.USD_to_SAR),
      });
    } catch (err) {
      setError?.(`تعذر تحميل أسعار الصرف: ${err.message || ''}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    const sanaa = parseFloat(rates.USD_to_YER_Sanaa);
    const aden = parseFloat(rates.USD_to_YER_Aden);
    const sar = parseFloat(rates.USD_to_SAR);

    if (![sanaa, aden, sar].every((n) => Number.isFinite(n) && n > 0)) {
      setError?.('أدخل قيم موجبة صحيحة لأسعار الصرف');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        USD_to_YER_Sanaa: sanaa,
        USD_to_YER_Aden: aden,
        USD_to_SAR: sar,
      };
      await api.updateExchangeRates(payload);
      applyLiveRates(payload);
      showSuccess?.('تم تحديث أسعار الصرف بنجاح ✅');
    } catch (err) {
      setError?.(`فشل حفظ أسعار الصرف: ${err.message || ''}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <AdminLoading label="جاري تحميل أسعار الصرف..." />;

  return (
    <div className="max-w-2xl space-y-6">
      <AdminToolbar
        title="أسعار الصرف"
        subtitle="معدلات يدوية من قاعدة البيانات — تُستخدم لتحويل عرض الأسعار فقط. الطلبات تبقى بعملة المنتج."
        icon={DollarSign}
        actions={(
          <button
            type="button"
            onClick={loadRates}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            تحديث
          </button>
        )}
      />

      <AdminCard>
        <div className="space-y-5">
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            غيّر القيم عند تغيّر السوق. الموقع والتطبيق يقرآن هذه المعدلات من الـ API ويعرضان الأسعار بعملة العميل المختارة.
          </p>

          {RATE_FIELDS.map((field) => (
            <div key={field.key}>
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">
                {field.label}
              </label>
              <p className="text-[11px] text-slate-400 mb-2">{field.hint}</p>
              <input
                type="number"
                min="0"
                step="any"
                dir="ltr"
                value={rates[field.key]}
                onChange={(e) => setRates((prev) => ({ ...prev, [field.key]: e.target.value }))}
                className={adminInputClass}
                placeholder={field.placeholder}
              />
            </div>
          ))}

          <div className="pt-2">
            <AdminPrimaryButton onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'جاري الحفظ...' : 'حفظ أسعار الصرف'}
            </AdminPrimaryButton>
          </div>
        </div>
      </AdminCard>
    </div>
  );
}
