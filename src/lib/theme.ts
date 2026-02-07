// Flow design tokens (light mode only)

export const colors = {
  background: '#FFFFFF',
  columnBorder: '#E5E5E5',
  text: {
    primary: '#000000',
    secondary: '#6B6B6B',
    disabled: '#AAAAAA',
  },
  focus: '#007AFF',
  error: '#FF3B30',
  completed: '#C7C7C7',

  priority: {
    high: '#FF3B30',
    med: '#FF9500',
    low: 'transparent',
  },

  categories: {
    category1: '#FF6B6B',
    category2: '#4ECDC4',
    category3: '#45B7D1',
    category4: '#FFA07A',
    category5: '#98D8C8',
  },

  backgroundPalette: [
    '#FFF8E7',
    '#E8F5E9',
    '#E3F2FD',
    '#FCE4EC',
    '#F3E5F5',
    '#FFF3E0',
  ],
} as const

export const typography = {
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  sizes: {
    taskTitle: '14px',
    directoryTitle: '14px',
    metadata: '12px',
    footer: '11px',
    error: '12px',
  },
  weights: {
    normal: 400,
    medium: 500,
    semibold: 600,
  },
} as const

export const COLUMN_WIDTH_PX = 280
export const EXPANDED_PANEL_WIDTH_PX = 320
