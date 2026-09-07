/**
 * Tailwind class strings mapped to runtime site theme CSS variables.
 * Use these in shared UI instead of hardcoded slate/gold/white.
 */

export const themePage = 'bg-site-bg dark:bg-site-bg-dark';
export const themeSurface = 'bg-site-surface dark:bg-site-surface-dark';
export const themeSurfaceGlass = 'bg-site-surface/90 dark:bg-site-surface-dark/90 backdrop-blur-sm';
export const themeText = 'text-site-text dark:text-site-text-dark';
export const themeMuted = 'text-site-muted dark:text-site-muted-dark';
export const themeBorder = 'border-site-border dark:border-site-border-dark';
export const themeBorderSubtle = 'border border-site-border/80 dark:border-site-border-dark/80';

export const themeInputClass =
  'w-full px-4 py-2.5 border border-site-border/80 dark:border-site-border-dark/80 rounded-xl text-sm bg-site-surface dark:bg-site-surface-dark text-site-text dark:text-site-text-dark placeholder:text-site-muted focus:outline-none focus:ring-2 focus:ring-site-accent/40 focus:border-site-accent transition-all';

export const themeCardClass =
  `rounded-2xl border border-site-border/80 dark:border-site-border-dark/80 ${themeSurfaceGlass} shadow-sm`;

export const themeStatusSuccess =
  'bg-site-success-soft dark:bg-site-success-soft-dark text-site-success border border-site-success/25 dark:border-site-success/35';

export const themeStatusWarning =
  'bg-site-warning-soft dark:bg-site-warning-soft-dark text-site-warning border border-site-warning/25 dark:border-site-warning/35';

export const themeStatusError =
  'bg-site-error-soft dark:bg-site-error-soft-dark text-site-error border border-site-error/25 dark:border-site-error/35';

/** Order / alert badge classes using theme success, warning, error */
export const orderStatusClasses = {
  Pending: themeStatusWarning,
  Confirmed: themeStatusSuccess,
  Processing: 'bg-site-accent-soft dark:bg-site-accent-soft-dark text-site-accent border border-site-accent/20',
  Shipped: 'bg-gold-500/15 text-gold-700 dark:text-gold-300',
  Delivered: themeStatusSuccess,
  Cancelled: themeStatusError,
};

/** Admin UI: what each theme color controls on the website */
export const THEME_COLOR_DETAILS = [
  {
    key: 'primary',
    label: 'أساسي',
    appliesTo: 'الأزرار الذهبية، الروابط، شريط التمرير، لهجات العلامة التجارية (gold-500 / gold-600)',
  },
  {
    key: 'secondary',
    label: 'ثانوي',
    appliesTo: 'الدرجات الداكنة من الذهبي، حالة hover، gold-400 و gold-700',
  },
  {
    key: 'accent',
    label: 'تمييز',
    appliesTo: 'حلقات التركيز (focus) في الحقول، التمييز البصري للعناصر النشطة، حالة «جاري التجهيز» في الطلبات',
  },
  {
    key: 'background',
    label: 'الخلفية',
    appliesTo: 'خلفية الصفحة الرئيسية في الوضع الفاتح والداكن',
  },
  {
    key: 'surface',
    label: 'السطح / البطاقات',
    appliesTo: 'البطاقات، حقول الإدخال، الهيدر، التذييل، لوحات لوحة التحكم',
  },
  {
    key: 'text',
    label: 'النص',
    appliesTo: 'النص الرئيسي للصفحة والعناوين الأساسية',
  },
  {
    key: 'textMuted',
    label: 'نص باهت',
    appliesTo: 'النص الثانوي، التوضيحات، التسميات الصغيرة، placeholder',
  },
  {
    key: 'border',
    label: 'الحدود',
    appliesTo: 'حدود البطاقات، الحقول، الهيدر، الفواصل بين الأقسام',
  },
  {
    key: 'success',
    label: 'نجاح',
    appliesTo: 'رسائل النجاح في لوحة التحكم، الطلبات المؤكدة والمُسلَّمة',
  },
  {
    key: 'warning',
    label: 'تحذير',
    appliesTo: 'تنبيهات الانتظار، حالة الطلب «قيد الانتظار»',
  },
  {
    key: 'error',
    label: 'خطأ',
    appliesTo: 'رسائل الخطأ في لوحة التحكم، الطلبات الملغاة',
  },
];

export const THEME_FIELD_HINTS = Object.fromEntries(
  THEME_COLOR_DETAILS.map(({ key, appliesTo }) => [key, appliesTo]),
);
