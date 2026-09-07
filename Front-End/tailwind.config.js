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
        // Gisaah Gold Palette — wired to runtime CSS variables from site config
        gold: {
          50: 'var(--gold-50, #FBF8F1)',
          100: 'var(--gold-100, #F7F0E2)',
          200: 'var(--gold-200, #F0E2C5)',
          300: 'var(--gold-300, #E8D4A8)',
          400: 'var(--gold-400, #B8860B)',
          500: 'var(--gold-500, #DAA520)',
          600: 'var(--gold-600, #DAA520)',
          700: 'var(--gold-700, #B8860B)',
          800: 'var(--gold-800, #916A09)',
          900: 'var(--gold-900, #6D5007)',
          950: 'var(--gold-950, #362803)',
        },
        // Gisaah Neutral Overrides
        slate: {
          900: '#232323', // Gisaah Text (LIGHT)
          950: '#0F0F0F', // Screen Background (NIGHT)
        },
        gray: {
          900: '#232323', // Gisaah Text (LIGHT)
          950: '#0F0F0F', // Screen Background (NIGHT)
        },
        // Bone Palette (Background/Light) - Centers on #F8F6EF
        bone: {
          DEFAULT: 'var(--color-background, #F8F6EF)',
          50: 'var(--color-background, #FCFBF8)',
          100: 'var(--color-background, #F8F6EF)',
          200: '#EFEADD',
          300: '#E4DBCA',
          400: '#D6C8B2',
          500: '#C7B49A',
          600: '#B59E81',
          700: '#9E8669',
          800: '#867056',
          900: '#6D5B46',
          950: '#40352A',
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
