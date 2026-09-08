/**
 * HomeSearchStrip — شريط بحث سريع تحت الهيرو (نمط Shein)
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';

export default function HomeSearchStrip() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    const q = query.trim();
    if (q) {
      navigate(`/products?search=${encodeURIComponent(q)}`);
    } else {
      navigate('/products');
    }
  }, [query, navigate]);

  return (
    <form
      onSubmit={handleSubmit}
      className="relative w-full"
      role="search"
      aria-label="بحث المنتجات"
    >
      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
        <Search className="w-4 h-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
      </div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="ابحث عن منتجاتك المفضلة..."
        className="w-full min-h-[44px] pr-10 pl-4 py-2.5 text-sm text-right rounded-full border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900/80 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40 focus-visible:border-gold-400/50 shadow-sm"
      />
    </form>
  );
}
