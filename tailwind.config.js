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
          background: '#FFFFFF',
          columnBorder: '#E5E5E5',
          textPrimary: '#000000',
          textSecondary: '#6B6B6B',
          textDisabled: '#AAAAAA',
          focus: '#007AFF',
          error: '#FF3B30',
          completed: '#C7C7C7',
          priority: { high: '#FF3B30', med: '#FF9500', low: 'transparent' },
          status: {
            notStarted: '#1A1A1A',
            inProgress: '#FF9500',
            finishingTouches: '#FFD60A',
            completed: '#34C759',
          },
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
