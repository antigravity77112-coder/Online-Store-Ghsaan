import React from 'react';
import Layout from '../components/Layout';
import SEO from '../components/SEO';
import { useSiteConfig } from '../context/SiteConfigContext';
import { buildOrganizationSchema } from '../utils/structuredData';

const DEFAULT_ABOUT = `المتسوق الذكي هو متجرك الإلكتروني لمنتجات متنوعة بأسعار منافسة وتجربة تسوق سهلة. نوفر توصيلاً سريعاً وخدمة عملاء موثوقة لتصل مشترياتك بأمان وراحة.

تسوق بذكاء مع المتسوق الذكي.`;

const AboutPage = () => {
  const { config, isLoading } = useSiteConfig();
  const aboutText = String(config.content?.aboutUsText || '').trim() || DEFAULT_ABOUT;
  const siteName = config.brand?.siteShortName || 'Smart Shopper';

  return (
    <Layout>
      <SEO
        title={`من نحن — ${siteName}`}
        description={`${siteName} — متجرك الإلكتروني لمنتجات متنوعة بأسعار منافسة وتجربة تسوق سهلة.`}
        jsonLd={[buildOrganizationSchema(config)]}
      />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
          من نحن
        </h1>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm p-6 sm:p-8 min-h-[120px]">
          {isLoading && !config.content?.aboutUsText ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-lg w-full" />
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-lg w-5/6" />
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-lg w-4/5" />
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-lg w-full" />
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-lg w-3/4" />
            </div>
          ) : (
            <p className="text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line text-base sm:text-lg">
              {aboutText}
            </p>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default AboutPage;
