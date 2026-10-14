/**
 * HomeSearchStrip — شريط بحث سريع تحت الهيرو (نمط Shein)
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ListingSearchField from './listing/ListingSearchField';
import { pushRecentSearch } from '../utils/recentSearches';

export default function HomeSearchStrip() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const handleSubmit = useCallback((override) => {
    const q = String(typeof override === 'string' ? override : query).trim();
    if (q) {
      pushRecentSearch(q);
      navigate(`/products?search=${encodeURIComponent(q)}`);
    } else {
      navigate('/products');
    }
  }, [query, navigate]);

  return (
    <ListingSearchField
      value={query}
      onChange={setQuery}
      onClear={() => setQuery('')}
      onSubmit={handleSubmit}
      placeholder="ابحث عن منتجاتك المفضلة..."
      inputClassName="min-h-[44px] py-2.5 rounded-full shadow-sm"
    />
  );
}
