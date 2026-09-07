import React from 'react';
import Layout from '../components/Layout';

const PrivacyPolicyPage = () => {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
          سياسة الخصوصية
        </h1>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            نحن في متجر قصة نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية. توضح هذه السياسة كيفية جمع معلوماتك واستخدامها وحمايتها عند استخدامك للموقع.
          </p>

          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white mb-2">المعلومات التي نجمعها</h2>
            <ul className="list-disc pr-6 space-y-1 text-slate-600 dark:text-slate-300">
              <li>الاسم ورقم الهاتف وبيانات العنوان اللازمة للتوصيل.</li>
              <li>بيانات الطلبات وسجل الشراء لتحسين الخدمة.</li>
              <li>بيانات تقنية أساسية (مثل نوع المتصفح) لأغراض الأمان وتحسين الأداء.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white mb-2">كيف نستخدم معلوماتك</h2>
            <ul className="list-disc pr-6 space-y-1 text-slate-600 dark:text-slate-300">
              <li>إتمام الطلبات وتأكيدها والتواصل معك بشأنها.</li>
              <li>تحسين تجربة الاستخدام وجودة الخدمة.</li>
              <li>منع الاحتيال وحماية المستخدمين والمنصة.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white mb-2">مشاركة المعلومات</h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              لا نبيع بياناتك لأي طرف ثالث. قد نشارك بعض البيانات فقط مع شركاء التوصيل أو مزودي الخدمات عند الحاجة لإتمام الطلب، وبالقدر اللازم فقط.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white mb-2">حماية البيانات</h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              نستخدم إجراءات تنظيمية وتقنية معقولة لحماية بياناتك من الوصول غير المصرح به أو التغيير أو الفقدان.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white mb-2">التواصل</h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              إذا كان لديك أي استفسار بخصوص سياسة الخصوصية، يمكنك التواصل معنا عبر صفحة “اتصل بنا”.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PrivacyPolicyPage;

