/** @type {import('tailwindcss').Config} */
export default {
  // EN: 'class' strategy = dark mode is toggled by adding/removing 'dark' class on <html>
  // AR: استراتيجية 'class' = الوضع الداكن يُفعَّل بإضافة/إزالة كلاس 'dark' على <html>
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Runtime site theme tokens (admin → CSS variables)
        site: {
          primary: 'var(--color-primary)',
          secondary: 'var(--color-secondary)',
          accent: 'var(--color-accent)',
          focus: 'var(--color-focus, var(--color-accent))',
          bg: 'var(--color-background)',
          'bg-dark': 'var(--color-background-dark, #0a0a0a)',
          surface: 'var(--color-surface)',
          'surface-dark': 'var(--color-surface-dark, #141414)',
          text: 'var(--color-text)',
          'text-dark': 'var(--color-text-on-dark, #f8fafc)',
          muted: 'var(--color-textMuted)',
          'muted-dark': 'var(--color-muted-on-dark, #94a3b8)',
          border: 'var(--color-border)',
          'border-dark': 'var(--color-border-on-dark, #334155)',
          success: 'var(--color-success)',
          warning: 'var(--color-warning)',
          error: 'var(--color-error)',
          'success-soft': 'var(--color-success-soft)',
          'warning-soft': 'var(--color-warning-soft)',
          'error-soft': 'var(--color-error-soft)',
          'success-soft-dark': 'var(--color-success-soft-dark)',
          'warning-soft-dark': 'var(--color-warning-soft-dark)',
          'error-soft-dark': 'var(--color-error-soft-dark)',
          'accent-soft': 'var(--color-accent-soft)',
          'accent-soft-dark': 'var(--color-accent-soft-dark)',
        },
        // Brand accent scale (token name kept as gold-* for existing class usage)
        // Primary #EA0001 · hover #B80001 — wired to runtime CSS variables
        gold: {
          50: 'var(--gold-50, #FFF0F0)',
          100: 'var(--gold-100, #FFE0E0)',
          200: 'var(--gold-200, #FFB3B3)',
          300: 'var(--gold-300, #FF7A7A)',
          400: 'var(--gold-400, #B80001)',
          500: 'var(--gold-500, #EA0001)',
          600: 'var(--gold-600, #EA0001)',
          700: 'var(--gold-700, #B80001)',
          800: 'var(--gold-800, #8A0001)',
          900: 'var(--gold-900, #5C0001)',
          950: 'var(--gold-950, #2E0000)',
        },
        // Brand Neutral Overrides — #565656 text
        slate: {
          900: '#565656',
          950: '#0F0F0F',
        },
        gray: {
          900: '#565656',
          950: '#0F0F0F',
        },
        // Page / surface background — white brand
        bone: {
          DEFAULT: 'var(--color-background, #FFFFFF)',
          50: 'var(--color-background, #FFFFFF)',
          100: 'var(--color-background, #FFFFFF)',
          200: '#F2F2F2',
          300: '#E5E5E5',
          400: '#D0D0D0',
          500: '#B8B8B8',
          600: '#9A9A9A',
          700: '#7A7A7A',
          800: '#565656',
          900: '#3D3D3D',
          950: '#1F1F1F',
        },
      },
      fontFamily: {
        sans: ['"Tajawal"', '"Cormorant Garamond"', 'Georgia', 'serif'],
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        arabic: ['"Tajawal"', 'sans-serif'],
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
