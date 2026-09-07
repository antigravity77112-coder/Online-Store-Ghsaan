/**
 * Breadcrumbs — مكون التنقل التفصيلي
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ArrowRight } from 'lucide-react';
import { buildBreadcrumbSchema } from '../utils/structuredData';
import { Helmet } from 'react-helmet-async';

const Breadcrumbs = ({ items = [], compact = false, className = '' }) => {
  if (!items || items.length === 0) return null;

  const schema = buildBreadcrumbSchema(items);
  const lastItem = items[items.length - 1];
  const parentItem = items.length > 1 ? items[items.length - 2] : items[0];

  return (
    <>
      {schema && (
        <Helmet>
          <script type="application/ld+json">
            {JSON.stringify(schema)}
          </script>
        </Helmet>
      )}

      {/* Mobile: compact back + current title */}
      <nav
        aria-label="التنقل"
        className={`flex md:hidden items-center gap-2 min-h-[44px] mb-2 ${className}`}
      >
        {parentItem?.url && items.length > 1 ? (
          <Link
            to={parentItem.url}
            className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl text-slate-500 hover:text-gold-600 hover:bg-gold-50/80 dark:hover:bg-gold-900/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40"
            aria-label={`العودة إلى ${parentItem.name}`}
          >
            <ArrowRight className="w-5 h-5" aria-hidden="true" />
          </Link>
        ) : null}
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate min-w-0">
          {lastItem?.name}
        </span>
      </nav>

      {/* Desktop: full breadcrumb trail */}
      <nav
        aria-label="التنقل التفصيلي"
        className={`hidden md:flex items-center gap-1 text-slate-500 dark:text-slate-400 overflow-x-auto scrollbar-hide ${compact ? 'text-xs mb-2' : 'text-sm mb-5'} ${className}`}
      >
        <ol className="flex items-center gap-1 list-none p-0 m-0 flex-nowrap whitespace-nowrap">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;

            return (
              <li key={index} className="flex items-center gap-1 min-w-0">
                {index > 0 && (
                  <ChevronLeft className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 flex-shrink-0" aria-hidden="true" />
                )}

                {isLast ? (
                  <span className="font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[200px] sm:max-w-none">
                    {item.name}
                  </span>
                ) : (
                  <Link
                    to={item.url || '/'}
                    className="hover:text-gold-600 dark:hover:text-gold-400 transition-colors truncate max-w-[120px] sm:max-w-none focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40 rounded"
                  >
                    {item.name}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
};

export default Breadcrumbs;
