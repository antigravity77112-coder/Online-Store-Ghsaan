import React from 'react';
import { Loader2, Search } from 'lucide-react';
import { motion } from 'framer-motion';

import {
  themeInputClass,
  themeCardClass,
  themeText,
  themeMuted,
  themeBorderSubtle,
  themeSurfaceGlass,
} from '../../config/themeTokens';

export const adminInputClass = themeInputClass;

export const adminSelectClass = themeInputClass;

export function parseAttrOptions(options) {
  if (!options) return [];
  if (Array.isArray(options)) return options;
  try {
    const parsed = JSON.parse(options);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return String(options).split(',').map((s) => s.trim()).filter(Boolean);
  }
}

export function OptionPicker({
  value,
  onChange,
  options = [],
  multiple = false,
  required = false,
  size = 'md',
  emptyLabel = 'اختر...',
}) {
  const current = multiple
    ? (typeof value === 'string' && value.length > 0 ? value.split(',') : Array.isArray(value) ? value : [])
    : value;

  const pillClass = size === 'sm'
    ? 'px-2.5 py-1 text-[11px] rounded-lg'
    : 'px-3 py-1.5 text-xs rounded-xl';

  if (!options.length) {
    return <p className="text-xs text-slate-400 italic">لا توجد خيارات متاحة</p>;
  }

  const toggle = (opt) => {
    if (multiple) {
      const set = new Set(current);
      set.has(opt) ? set.delete(opt) : set.add(opt);
      onChange(Array.from(set).join(','));
    } else {
      onChange(opt);
    }
  };

  return (
    <div className="flex flex-wrap gap-2" role="listbox" aria-required={required}>
      {!multiple && !required && (
        <button
          type="button"
          onClick={() => onChange('')}
          className={`${pillClass} border font-semibold transition-all ${
            !current
              ? 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-gold-300'
          }`}
        >
          {emptyLabel}
        </button>
      )}
      {options.map((opt) => {
        const selected = multiple ? current.includes(opt) : current === opt;
        return (
          <button
            key={opt}
            type="button"
            role="option"
            aria-selected={selected}
            onClick={() => toggle(opt)}
            className={`${pillClass} border font-semibold transition-all ${
              selected
                ? 'bg-gold-50 dark:bg-gold-900/30 border-gold-400 dark:border-gold-600 text-gold-800 dark:text-gold-200 shadow-sm shadow-gold-500/10'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-gold-300 dark:hover:border-gold-700'
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export function BooleanPicker({ value, onChange, required = false, size = 'md', trueLabel = 'نعم', falseLabel = 'لا' }) {
  const pillClass = size === 'sm'
    ? 'px-2.5 py-1 text-[11px] rounded-lg'
    : 'px-3 py-1.5 text-xs rounded-xl';
  const strVal = value === '' ? '' : String(value);
  const items = [
    { v: 'true', label: trueLabel },
    { v: 'false', label: falseLabel },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {!required && (
        <button
          type="button"
          onClick={() => onChange('')}
          className={`${pillClass} border font-semibold transition-all ${
            !strVal
              ? 'bg-slate-200 dark:bg-slate-700 border-slate-300 text-slate-700 dark:text-slate-200'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500'
          }`}
        >
          —
        </button>
      )}
      {items.map(({ v, label }) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`${pillClass} border font-semibold transition-all ${
            strVal === v
              ? 'bg-gold-50 dark:bg-gold-900/30 border-gold-400 text-gold-800 dark:text-gold-200'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-gold-300'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function AdminToolbar({ title, subtitle, icon: Icon, children, actions }) {
  return (
    <div className={`rounded-2xl ${themeBorderSubtle} ${themeSurfaceGlass} p-4 sm:p-5 mb-5 shadow-sm`}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          {Icon && (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-500 to-amber-600 flex items-center justify-center shadow-md shadow-gold-500/20 flex-shrink-0">
              <Icon className="w-5 h-5 text-white" />
            </div>
          )}
          <div>
            {title && <h2 className={`text-lg sm:text-xl font-black ${themeText}`}>{title}</h2>}
            {subtitle && <p className={`text-xs sm:text-sm ${themeMuted} mt-0.5`}>{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

export function AdminSearch({ value, onChange, placeholder, className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`${adminInputClass} pr-10`}
      />
    </div>
  );
}

export function AdminFilterChips({ items, value, onChange }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {items.map((item) => (
        <button
          key={item.id ?? item.value}
          type="button"
          onClick={() => onChange(item.id ?? item.value)}
          className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
            value === (item.id ?? item.value)
              ? 'bg-gradient-to-l from-gold-600 to-gold-500 text-white border-gold-500 shadow-md shadow-gold-500/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-gold-300'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function AdminCard({ children, className = '', padding = true }) {
  return (
    <div className={`${themeCardClass} ${padding ? 'p-4 sm:p-5' : ''} ${className}`}>
      {children}
    </div>
  );
}

export function AdminEmptyState({ icon: Icon, title, description, action }) {
  return (
    <AdminCard className="text-center py-14">
      {Icon && <Icon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />}
      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-1">{title}</h3>
      {description && <p className="text-sm text-slate-500 mb-4 max-w-sm mx-auto">{description}</p>}
      {action}
    </AdminCard>
  );
}

export function AdminLoading({ label = 'جاري التحميل...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}

export function AdminPrimaryButton({ children, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-bold text-white bg-gradient-to-l from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 rounded-xl shadow-md shadow-gold-600/20 transition-all disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function AdminGhostButton({ children, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-gold-300 transition-all ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function AdminFadeIn({ children, delay = 0, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
