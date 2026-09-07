/**
 * ScentsPage — تصفح جميع عائلات العطور
 */

import React, { useState, useMemo } from 'react';
import { Search, Sparkles } from 'lucide-react';
import Layout from '../components/Layout';
import SEO from '../components/SEO';
import ScentTile from '../components/ScentTile';
import { useScents } from '../hooks/useProducts';

const SKELETON_COUNT = 12;

const ScentsPage = () => {
  const { data: scents, isLoading } = useScents();
  const [searchText, setSearchText] = useState('');

  const filteredScents = useMemo(() => {
    let list = [...scents].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name, 'ar'));
    if (!searchText.trim()) return list;
    const q = searchText.trim().toLowerCase();
    return list.filter((s) =>
      s.name?.toLowerCase().includes(q) || (s.slug || '').toLowerCase().includes(q),
    );
  }, [scents, searchText]);

  return (
    <Layout>
      <SEO title="عائلات العطور" description="اختر رائحتك المفضلة واكتشف العطور المناسبة في متجر قصة" />

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-5 pb-24 md:pb-10">
        <header className="mb-4 sm:mb-5">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-gold-500" />
            <h1 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
              اختر رائحتك المفضلة
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            تصفح عائلات العطور واكتشف المنتجات التي تناسب ذوقك
          </p>
          {!isLoading && scents.length > 0 && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              {filteredScents.length} رائحة متاحة
            </p>
          )}
        </header>

        <div className="relative mb-4 sm:mb-5">
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400 dark:text-slate-500" />
          </div>
          <input
            type="search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="block w-full pr-10 pl-3 py-2 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-400 text-sm text-right shadow-sm"
            placeholder="ابحث عن رائحة..."
            aria-label="ابحث عن رائحة"
          />
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-1.5 sm:gap-2 md:gap-2.5">
          {isLoading
            ? Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                <ScentTile key={`scent-skel-${i}`} isLoading />
              ))
            : filteredScents.map((scent) => (
                <ScentTile key={scent.id} scent={scent} />
              ))}
        </div>

        {!isLoading && filteredScents.length === 0 && (
          <div className="text-center py-14 text-slate-400 dark:text-slate-500">
            <Sparkles className="w-9 h-9 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium">
              {searchText ? 'لا توجد روائح تطابق البحث' : 'لا توجد روائح حالياً'}
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ScentsPage;
