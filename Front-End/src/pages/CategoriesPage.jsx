/**
 * CategoriesPage — صفحة جميع الفئات (نمط Shein)
 */

import React, { useState, useMemo } from 'react';
import { Search, LayoutGrid } from 'lucide-react';
import Layout from '../components/Layout';
import SEO from '../components/SEO';
import CategoryTile from '../components/CategoryTile';
import { useCategories } from '../hooks/useProducts';

const SKELETON_COUNT = 15;
const GRID_COLS = 5;

const CategoriesPage = () => {
  const { data: categories, isLoading } = useCategories();
  const [searchText, setSearchText] = useState('');

  const filteredCategories = useMemo(() => {
    if (!searchText.trim()) return categories;
    const q = searchText.trim().toLowerCase();
    return categories.filter((cat) => cat.name?.toLowerCase().includes(q));
  }, [categories, searchText]);

  return (
    <Layout>
      <SEO title="جميع الفئات" description="تصفح جميع فئات المنتجات في متجر قصة" />

      <div className="bg-white dark:bg-stone-950 min-h-screen">
        <div className="sticky top-14 sm:top-16 z-30 bg-white dark:bg-stone-950 border-b border-stone-100 dark:border-stone-800 px-2 py-2.5 sm:px-4">
          <h1 className="text-sm font-extrabold text-stone-900 dark:text-white mb-2.5 px-0.5">
            الفئات
          </h1>

          <div className="relative">
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-stone-400" aria-hidden="true" />
            </div>
            <input
              type="search"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="block w-full min-h-[44px] pr-10 pl-3 py-2 border border-stone-200 dark:border-stone-700 rounded-full bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-stone-300 text-sm text-right"
              placeholder="ابحث عن فئة..."
              aria-label="ابحث عن فئة"
            />
          </div>
        </div>

        <div className="px-2 py-3 sm:px-4 pb-24 md:pb-10">
          {!isLoading && categories.length > 0 && (
            <p className="text-[10px] text-stone-400 dark:text-stone-500 mb-2.5 px-0.5">
              {filteredCategories.length} فئة
            </p>
          )}

          <div
            className="grid gap-x-2 gap-y-3 sm:gap-x-2.5 sm:gap-y-3.5"
            style={{ gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))` }}
          >
            {isLoading
              ? Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                  <CategoryTile key={`cat-tile-skel-${i}`} isLoading />
                ))
              : filteredCategories.map((cat) => (
                  <CategoryTile key={cat.id} category={cat} />
                ))}
          </div>

          {!isLoading && filteredCategories.length === 0 && (
            <div className="text-center py-16 text-stone-400 dark:text-stone-500">
              <LayoutGrid className="w-9 h-9 mx-auto mb-3 opacity-40" aria-hidden="true" />
              <p className="text-sm font-medium">
                {searchText ? 'لا توجد فئات تطابق البحث' : 'لا توجد فئات حالياً'}
              </p>
              {searchText && (
                <button
                  type="button"
                  onClick={() => setSearchText('')}
                  className="mt-3 text-sm font-bold text-stone-700 dark:text-stone-300 hover:text-[#e6533d] transition-colors min-h-[44px] px-4"
                >
                  مسح البحث
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default CategoriesPage;
