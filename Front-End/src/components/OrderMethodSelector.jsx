import React from 'react';
import { MessageCircle, CreditCard, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const OrderMethodSelector = ({ value, onChange, className = '', showPaymentOption = true }) => {
  const { t } = useTranslation();

  if (!showPaymentOption) {
    return (
      <div className={className}>
        <p className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
          {t('cart.orderMethod')}
        </p>
        <div className="flex items-center gap-2.5 rounded-xl border border-[#25D366]/30 bg-[#25D366]/10 px-3 py-3 min-h-[44px]">
          <MessageCircle className="w-5 h-5 text-[#128C7E] dark:text-[#25D366] flex-shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-[#128C7E] dark:text-[#25D366]">{t('cart.viaWhatsapp')}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{t('cart.whatsappCheckoutHint')}</p>
          </div>
        </div>
        <p className="mt-2 text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
          {t('cart.paymentSoonShort')}
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
        {t('cart.orderMethod')}
      </label>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange('whatsapp')}
          className={`flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl border text-xs font-bold transition-all min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40 ${
            value === 'whatsapp'
              ? 'bg-[#25D366]/10 border-[#25D366] text-[#128C7E] dark:text-[#25D366] shadow-sm'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-500 hover:border-[#25D366]/40'
          }`}
        >
          <MessageCircle className="w-5 h-5" />
          <span>{t('cart.viaWhatsapp')}</span>
        </button>
        <button
          type="button"
          onClick={() => onChange('payment')}
          className={`flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl border text-xs font-bold transition-all min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40 ${
            value === 'payment'
              ? 'bg-gold-50 dark:bg-gold-900/20 border-gold-400 text-gold-700 dark:text-gold-300 shadow-sm'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-500 hover:border-gold-300'
          }`}
        >
          <CreditCard className="w-5 h-5" />
          <span>{t('cart.onlinePayment')}</span>
        </button>
      </div>

      {value === 'payment' && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 px-3 py-2.5 text-amber-800 dark:text-amber-200">
          <Clock className="w-4 h-4 flex-shrink-0" />
          <p className="text-xs font-semibold leading-relaxed">
            {t('cart.paymentSoon')}
          </p>
        </div>
      )}
    </div>
  );
};

export default OrderMethodSelector;
