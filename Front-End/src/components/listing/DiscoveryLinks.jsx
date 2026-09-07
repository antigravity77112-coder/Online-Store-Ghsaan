import React from 'react';
import { Link } from 'react-router-dom';
import { LayoutGrid, Sparkles, Heart, BadgePercent, TrendingUp } from 'lucide-react';

const DISCOVERY_LINKS = [
  { to: '/categories', label: 'تصفح الفئات', icon: LayoutGrid },
  { to: '/scents', label: 'استكشف الروائح', icon: Sparkles },
  { to: '/products?trending=true', label: 'الأكثر رواجاً', icon: TrendingUp },
  { to: '/products?promoted=true', label: 'العروض الحصرية', icon: BadgePercent },
  { to: '/favorites', label: 'المفضلة', icon: Heart },
];

export default function DiscoveryLinks({ className = '', compact = false }) {
  return (
    <nav
      className={`flex flex-wrap justify-center gap-2 ${className}`.trim()}
      aria-label="اكتشف المزيد"
    >
      {DISCOVERY_LINKS.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          className={`inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold hover:border-gold-300 dark:hover:border-gold-600 hover:text-gold-700 dark:hover:text-gold-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40 ${
            compact ? 'px-3 py-2 text-xs min-h-[44px]' : 'px-4 py-2.5 text-sm min-h-[44px]'
          }`}
        >
          <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
