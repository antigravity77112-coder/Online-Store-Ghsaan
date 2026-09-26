import React from 'react';
import Layout from '../components/Layout';
import SEO from '../components/SEO';
import { useSiteConfig } from '../context/SiteConfigContext';

function buildDefaultPrivacy(siteNameAr) {
  const name = siteNameAr || 'المتسوق الذكي';
  return `نحن في ${name} نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية. توضح هذه السياسة كيفية جمع معلوماتك واستخدامها وحمايتها عند استخدامك للموقع.

المعلومات التي نجمعها
• الاسم ورقم الهاتف وبيانات العنوان اللازمة للتوصيل.
• بيانات الطلبات وسجل الشراء لتحسين الخدمة.
• بيانات تقنية أساسية (مثل نوع المتصفح) لأغراض الأمان وتحسين الأداء.

كيف نستخدم معلوماتك
• إتمام الطلبات وتأكيدها والتواصل معك بشأنها.
• تحسين تجربة الاستخدام وجودة الخدمة.
• منع الاحتيال وحماية المستخدمين والمنصة.

مشاركة المعلومات
لا نبيع بياناتك لأي طرف ثالث. قد نشارك بعض البيانات فقط مع شركاء التوصيل أو مزودي الخدمات عند الحاجة لإتمام الطلب، وبالقدر اللازم فقط.

حماية البيانات
نستخدم إجراءات تنظيمية وتقنية معقولة لحماية بياناتك من الوصول غير المصرح به أو التغيير أو الفقدان.

التواصل
إذا كان لديك أي استفسار بخصوص سياسة الخصوصية، يمكنك التواصل معنا عبر صفحة "اتصل بنا".`;
}

const PrivacyPolicyPage = () => {
  const { config, isLoading } = useSiteConfig();
  const siteName = config.brand?.siteShortName || 'Smart Shopper';
  const siteNameAr =
    config.brand?.siteNameAr ||
    (config.brand?.siteName || '').split('|').pop()?.trim() ||
    'المتسوق الذكي';
  const fromDb = String(config.content?.privacyPolicyText || '').trim();
  const privacyText = fromDb || buildDefaultPrivacy(siteNameAr);

  return (
    <Layout>
      <SEO
        title={`سياسة الخصوصية — ${siteName}`}
        description={`سياسة الخصوصية لمتجر ${siteNameAr}.`}
      />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
          سياسة الخصوصية
        </h1>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm p-6 sm:p-8 min-h-[120px]">
          {isLoading && !fromDb ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-lg w-full" />
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-lg w-5/6" />
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-lg w-4/5" />
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-lg w-full" />
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-lg w-3/4" />
            </div>
          ) : (
            <p className="text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap text-base sm:text-lg">
              {privacyText}
            </p>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default PrivacyPolicyPage;
