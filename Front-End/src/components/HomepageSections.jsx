/**
 * HomepageSections — أقسام الصفحة الرئيسية
 *
 * EN: "Start Shopping" call-to-action section with two paths:
 *     1. Browse All Products → /products
 *     2. Discover Random Products → shuffles product list inline
 *     Modern gradient buttons with micro-animations.
 *
 * AR: قسم "ابدأ التسوق" مع مسارين:
 *     1. تصفح جميع المنتجات → /products
 *     2. اكتشف منتجات عشوائية → يخلط قائمة المنتجات
 *     أزرار بتدرجات حديثة مع رسوم متحركة دقيقة.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, ArrowLeft, Sparkles, BadgePercent } from 'lucide-react';

const HomepageSections = React.memo(() => {
  const navigate = useNavigate();

  return (
    <section className="mb-8 sm:mb-10">
      {/* Section Header */}
      <div className="flex items-center gap-2.5 mb-5 sm:mb-6">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
          <Sparkles className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            ابدأ التسوق
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            اختر طريقة التصفح المفضلة لديك
          </p>
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* Browse All Products */}
        <motion.button
          onClick={() => navigate('/products')}
          className="group relative w-full overflow-hidden rounded-2xl px-5 py-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-sm hover:shadow-md hover:border-gold-200 dark:hover:border-gold-800/60 transition-all duration-200 active:scale-[0.98] focus:outline-none"
        >
          {/* Subtle gradient hover effect */}
          <div className="absolute inset-0 bg-gradient-to-l from-gold-50/60 to-transparent dark:from-gold-900/10 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          <div className="relative z-10 flex items-center justify-between w-full">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-gold-50 dark:bg-gold-900/20 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                <ShoppingBag className="w-5 h-5 text-gold-600 dark:text-gold-400" />
              </div>
              <div className="flex flex-col items-start text-right">
                <span className="text-[15px] sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-gold-700 dark:group-hover:text-gold-400 transition-colors tracking-tight">
                  تصفح جميع المنتجات
                </span>
                <span className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5 opacity-90">
                  استعرض كافة المنتجات المتاحة
                </span>
              </div>
            </div>
            <ArrowLeft className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-gold-600 dark:group-hover:text-gold-400 group-hover:-translate-x-1.5 transition-all duration-300 flex-shrink-0" />
          </div>
        </motion.button>

        {/* Exclusive Offers */}
        <motion.button
          onClick={() => navigate('/products?offers=true')}
          className="group relative w-full overflow-hidden rounded-2xl px-5 py-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-sm hover:shadow-md hover:border-rose-200 dark:hover:border-rose-800/60 transition-all duration-200 active:scale-[0.98] focus:outline-none"
        >
          {/* Subtle gradient hover effect */}
          <div className="absolute inset-0 bg-gradient-to-l from-rose-50/60 to-transparent dark:from-rose-900/10 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          <div className="relative z-10 flex items-center justify-between w-full">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                <BadgePercent className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div className="flex flex-col items-start text-right">
                <span className="text-[15px] sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-rose-700 dark:group-hover:text-rose-400 transition-colors tracking-tight">
                  العروض الحصرية
                </span>
                <span className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5 opacity-90">
                  أقوى الخصومات والأسعار المميزة
                </span>
              </div>
            </div>
            <ArrowLeft className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-rose-600 dark:group-hover:text-rose-400 group-hover:-translate-x-1.5 transition-all duration-300 flex-shrink-0" />
          </div>
        </motion.button>
      </div>
    </section>
  );
});

HomepageSections.displayName = 'HomepageSections';
export default HomepageSections;
