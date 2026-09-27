/**
 * BrandsPage — صفحة جميع   الماركات التجارية
 */

import React, { useState, useMemo } from 'react';
import { Search, Crown } from 'lucide-react';
import Layout from '../components/Layout';
import SEO from '../components/SEO';
import BrandTile from '../components/BrandTile';
import BannerRenderer from '../components/BannerRenderer';
import { useBrands } from '../hooks/useProducts';
import { matchesSearch } from '../utils/arabicSearch';

const SKELETON_COUNT = 8;

const BrandsPage = () => {
  const { data: brands, isLoading } = useBrands();
  const [searchText, setSearchText] = useState('');

  const filteredBrands = useMemo(() => {
    if (!searchText.trim()) return brands;
    return brands.filter((b) => matchesSearch(searchText, b.name, b.slug));
  }, [brands, searchText]);

  return (
    <Layout>
      <SEO title="  الماركات التجارية" description="تصفح جميع   الماركات التجارية في المتسوق الذكي" />

      <div className="bg-stone-50 dark:bg-stone-950 min-h-screen">
        <div className="sticky top-14 sm:top-16 z-30 bg-stone-50/95 dark:bg-stone-950/95 backdrop-blur border-b border-stone-100 dark:border-stone-800 px-3 py-2.5 sm:px-4">
          <h1 className="text-sm font-extrabold text-stone-900 dark:text-white mb-2.5 px-0.5">
            الماركات التجارية
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
              placeholder="ابحث عن علامة..."
              aria-label="ابحث عن علامة"
            />
          </div>
        </div>

        <div className="px-3 py-4 sm:px-4 pb-6 md:pb-10">
          <BannerRenderer placement="category" className="mb-3" />

          {!isLoading && brands.length > 0 && (
            <p className="text-[10px] text-stone-400 dark:text-stone-500 mb-2.5 px-0.5">
              {filteredBrands.length} علامة
            </p>
          )}

          <div
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4"
            dir="rtl"
          >
            {isLoading
              ? Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                  <BrandTile key={`brand-tile-skel-${i}`} isLoading />
                ))
              : filteredBrands.map((b) => (
                  <BrandTile key={b.id} brand={b} />
                ))}
          </div>

          {!isLoading && filteredBrands.length === 0 && (
            <div className="text-center py-16 text-stone-400 dark:text-stone-500">
              <Crown className="w-9 h-9 mx-auto mb-3 opacity-40" aria-hidden="true" />
              <p className="text-sm font-medium">
                {searchText ? 'لا توجد علامات تطابق البحث' : 'لا توجد علامات حالياً'}
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

export default BrandsPage;
