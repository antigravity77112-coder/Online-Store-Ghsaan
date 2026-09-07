import React, { useState } from 'react';
import { ProductGrid } from './ProductGrid';
import { Product } from './ProductCard';

const MOCK_PRODUCTS: Product[] = [
  {
    id: '1',
    title: 'Sony WH-1000XM5 Wireless Noise Canceling Headphones, Auto Pause/Play, 30-Hour Battery',
    image: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&q=80&w=400',
    price: 348.00,
    originalPrice: 398.00,
    rating: 4.8,
    reviewCount: 12453,
    badge: 'Sale'
  },
  {
    id: '2',
    title: 'Apple AirPods Max - Sky Blue with Active Noise Cancellation and Spatial Audio',
    image: 'https://images.unsplash.com/photo-1628202926206-c63a34b1618f?auto=format&fit=crop&q=80&w=400',
    price: 479.99,
    originalPrice: 549.00,
    rating: 4.6,
    reviewCount: 8932,
    badge: 'Sale'
  },
  {
    id: '3',
    title: 'Logitech MX Master 3S - Advanced Wireless Mouse for Mac, Ultrafast Scrolling',
    image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&q=80&w=400',
    price: 99.00,
    rating: 4.9,
    reviewCount: 24512,
    badge: 'Local'
  },
  {
    id: '4',
    title: 'Keychron Q1 Pro Custom Wireless Mechanical Keyboard, QMK/VIA Programmable',
    image: 'https://images.unsplash.com/photo-1595225476474-87563907a212?auto=format&fit=crop&q=80&w=400',
    price: 199.00,
    rating: 4.7,
    reviewCount: 1845,
  },
  {
    id: '5',
    title: 'Nintendo Switch OLED Model w/ White Joy-Con - Fast Delivery',
    image: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&q=80&w=400',
    price: 349.99,
    rating: 4.9,
    reviewCount: 45221,
    badge: 'Local'
  }
];

export const ProductGridDemo = () => {
  const [isLoading, setIsLoading] = useState(false);

  // Simulate loading state functionality
  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 mb-4 flex justify-end">
        <button 
          onClick={handleRefresh}
          className="bg-white border border-gray-300 shadow-sm px-4 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Toggle Skeleton Loading
        </button>
      </div>

      <ProductGrid 
        title="Inspired by Your Browsing History"
        products={MOCK_PRODUCTS} 
        isLoading={isLoading}
        loadingCount={5}
        onQuickAdd={(product) => alert(`Added ${product.title} to cart!`)}
      />
    </div>
  );
};

export default ProductGridDemo;
