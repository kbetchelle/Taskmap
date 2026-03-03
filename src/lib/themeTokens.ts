// Light and dark theme token definitions
// These map CSS custom property names to their values for each theme.
// The CSS variables are declared in index.css (:root and :root[data-theme="dark"]).
// Tailwind flow-* colors reference these variables, so the entire app adapts automatically.

export type ThemeMode = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export const LIGHT_TOKENS: Record<string, string> = {
  '--flow-background': '#FFFFFF',
  '--flow-surface': '#F9F9F9',
  '--flow-border': '#E5E5E5',
  '--flow-text-primary': '#000000',
  '--flow-text-secondary': '#6B6B6B',
  '--flow-text-disabled': '#AAAAAA',
  '--flow-focus': '#007AFF',
  '--flow-error': '#FF3B30',
  '--flow-completed': '#C7C7C7',
  '--flow-hover': 'rgba(0,0,0,0.04)',
  '--flow-selected': 'rgba(0,122,255,0.08)',
  '--flow-shadow': 'rgba(0,0,0,0.1)',
  '--flow-backdrop': 'rgba(0,0,0,0.3)',
  '--flow-code-bg': '#F5F5F5',
  '--flow-card-bg': '#FFFFFF',
  '--flow-skeleton': '#E5E5E5',
  // Status colors
  '--flow-status-not-started': '#1A1A1A',
  '--flow-status-in-progress': '#FF9500',
  '--flow-status-finishing-touches': '#FFD60A',
  '--flow-status-completed': '#34C759',
} as const

export const DARK_TOKENS: Record<string, string> = {
  '--flow-background': '#1A1A1A',
  '--flow-surface': '#252525',
  '--flow-border': '#3A3A3A',
  '--flow-text-primary': '#F0F0F0',
  '--flow-text-secondary': '#999999',
  '--flow-text-disabled': '#666666',
  '--flow-focus': '#0A84FF',
  '--flow-error': '#FF453A',
  '--flow-completed': '#555555',
  '--flow-hover': 'rgba(255,255,255,0.06)',
  '--flow-selected': 'rgba(10,132,255,0.15)',
  '--flow-shadow': 'rgba(0,0,0,0.4)',
  '--flow-backdrop': 'rgba(0,0,0,0.5)',
  '--flow-code-bg': '#2A2A2A',
  '--flow-card-bg': '#252525',
  '--flow-skeleton': '#3A3A3A',
  // Status: not_started must be light in dark mode (original #1A1A1A is invisible on dark bg)
  '--flow-status-not-started': '#E0E0E0',
  '--flow-status-in-progress': '#FF9500',
  '--flow-status-finishing-touches': '#FFD60A',
  '--flow-status-completed': '#34C759',
} as const

/** Default accent color for light theme */
export const DEFAULT_ACCENT_LIGHT = '#007AFF'
/** Default accent color for dark theme */
export const DEFAULT_ACCENT_DARK = '#0A84FF'

/** localStorage key for theme mode persistence */
export const THEME_MODE_STORAGE_KEY = 'taskmap-theme-mode'
/** localStorage key for accent color persistence */
export const ACCENT_COLOR_STORAGE_KEY = 'taskmap-accent-color'
