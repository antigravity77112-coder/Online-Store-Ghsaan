import React, { useMemo } from 'react';
import Layout from '../components/Layout';
import SEO from '../components/SEO';
import { useSiteConfig } from '../context/SiteConfigContext';
import { Phone, MessageCircle, Instagram, Mail } from 'lucide-react';

const ContactPage = () => {
  const { config } = useSiteConfig();
  const contact = config.contact || {};
  const social = config.social || {};
  const siteName = config.brand?.siteShortName || 'المتجر';

  const phone = useMemo(() => (contact.phone || '').trim(), [contact.phone]);
  const phoneDigits = useMemo(() => phone.replace(/[^\d]/g, ''), [phone]);
  const phoneE164 = useMemo(() => (phoneDigits ? (phoneDigits.startsWith('967') ? phoneDigits : `967${phoneDigits}`) : ''), [phoneDigits]);

  const whatsappUrl = contact.whatsapp || (phoneE164 ? `https://wa.me/${phoneE164}` : '');
  const instagramUrl = social.instagram || '';

  return (
    <Layout>
      <SEO
        title={`اتصل بنا — ${siteName}`}
        description={`تواصل مع ${siteName} عبر الواتساب أو الهاتف أو الانستغرام.`}
      />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
          اتصل بنا
        </h1>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm p-6 sm:p-8">
          <p className="text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
            لأي استفسار أو مساعدة، تواصل معنا عبر الوسائل التالية:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {phoneDigits && (
              <a
                href={`tel:${phoneDigits}`}
                className="flex items-center gap-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-gold-300 dark:hover:border-gold-500/60 hover:bg-gold-50/60 dark:hover:bg-gold-500/10 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-gold-100 dark:bg-gold-900/40 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-gold-600 dark:text-gold-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-extrabold text-slate-900 dark:text-white">اتصل بنا</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{phone}</div>
                </div>
              </a>
            )}

            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-500/60 hover:bg-emerald-50/60 dark:hover:bg-emerald-500/10 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-extrabold text-slate-900 dark:text-white">واتساب</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{phone}</div>
                </div>
              </a>
            )}

            {instagramUrl && (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-pink-300 dark:hover:border-pink-500/60 hover:bg-pink-50/60 dark:hover:bg-pink-500/10 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                  <Instagram className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-extrabold text-slate-900 dark:text-white">انستغرام</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">تابعنا على انستغرام</div>
                </div>
              </a>
            )}

            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="flex items-center gap-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-gold-300 dark:hover:border-gold-500/60 hover:bg-gold-50/60 dark:hover:bg-gold-500/10 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-gold-100 dark:bg-gold-900/30 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-gold-600 dark:text-gold-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-extrabold text-slate-900 dark:text-white">راسلنا</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{contact.email}</div>
                </div>
              </a>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ContactPage;
