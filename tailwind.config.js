/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      colors: {
        accent: { DEFAULT: '#2563eb', muted: '#93c5fd' },
        flow: {
          background: 'var(--flow-background)',
          surface: 'var(--flow-surface)',
          columnBorder: 'var(--flow-border)',
          textPrimary: 'var(--flow-text-primary)',
          textSecondary: 'var(--flow-text-secondary)',
          textDisabled: 'var(--flow-text-disabled)',
          focus: 'var(--flow-focus)',
          error: 'var(--flow-error)',
          completed: 'var(--flow-completed)',
          hover: 'var(--flow-hover)',
          selected: 'var(--flow-selected)',
          shadow: 'var(--flow-shadow)',
          backdrop: 'var(--flow-backdrop)',
          codeBg: 'var(--flow-code-bg)',
          cardBg: 'var(--flow-card-bg)',
          skeleton: 'var(--flow-skeleton)',
          priority: { high: '#FF3B30', med: '#FF9500', low: 'transparent' },
          status: {
            notStarted: 'var(--flow-status-not-started)',
            inProgress: 'var(--flow-status-in-progress)',
            finishingTouches: 'var(--flow-status-finishing-touches)',
            completed: 'var(--flow-status-completed)',
          },
          // Categories stay hardcoded — user-configurable via CSS custom properties
          category1: '#FF6B6B',
          category2: '#4ECDC4',
          category3: '#45B7D1',
          category4: '#FFA07A',
          category5: '#98D8C8',
        },
      },
      fontSize: {
        'flow-task': '14px',
        'flow-dir': '14px',
        'flow-meta': '12px',
        'flow-footer': '11px',
      },
      fontWeight: { 'flow-normal': 400, 'flow-medium': 500, 'flow-semibold': 600 },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 150ms ease-in',
      },
    },
  },
  plugins: [],
}
