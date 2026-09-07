/**
 * CategoryGrid — شبكة الأقسام
 *
 * EN: Responsive grid displaying category cards.
 *     - 2 columns on mobile
 *     - 3 columns on tablet (sm)
 *     - 4 columns on desktop (lg)
 *     Shows skeleton loading cards while data loads.
 *
 * AR: شبكة متجاوبة تعرض بطاقات الأقسام.
 *     - 2 أعمدة على الجوال
 *     - 3 أعمدة على التابلت
 *     - 4 أعمدة على سطح المكتب
 *     تعرض بطاقات هيكلية أثناء تحميل البيانات.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { LayoutGrid } from 'lucide-react';
import CategoryCard from './CategoryCard';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: 'easeOut' }
  }
};

const SKELETON_COUNT = 8;

const CategoryGrid = React.memo(({ categories = [], isLoading = false }) => {
  return (
    <section id="categories-section" className="mb-8 sm:mb-10">
      {/* Section Header */}
      <div className="flex items-center gap-2.5 mb-5 sm:mb-6">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gold-100 dark:bg-gold-900/40">
          <LayoutGrid className="w-4.5 h-4.5 text-gold-600 dark:text-gold-400" />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            تصفح الأقسام
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            اختر القسم الذي يناسبك
          </p>
        </div>
      </div>

      {/* Grid */}
      <motion.div
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {isLoading
          ? Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <motion.div key={`cat-skel-${i}`} variants={itemVariants}>
                <CategoryCard isLoading={true} />
              </motion.div>
            ))
          : categories.map((cat) => (
              <motion.div key={cat.id} variants={itemVariants}>
                <CategoryCard category={cat} />
              </motion.div>
            ))
        }
      </motion.div>

      {/* Empty State */}
      {!isLoading && categories.length === 0 && (
        <div className="text-center py-12 text-slate-400 dark:text-slate-500">
          <LayoutGrid className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">لا توجد أقسام حالياً</p>
        </div>
      )}
    </section>
  );
});

CategoryGrid.displayName = 'CategoryGrid';
export default CategoryGrid;
