import { create } from 'zustand'
import type { ThemeMode, ResolvedTheme } from '../lib/themeTokens'
import {
  THEME_MODE_STORAGE_KEY,
  ACCENT_COLOR_STORAGE_KEY,
  DEFAULT_ACCENT_LIGHT,
} from '../lib/themeTokens'
import { deriveAccentColors } from '../lib/accentColors'

// ── Helpers ──────────────────────────────────────────────────────────────

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'light') return 'light'
  if (mode === 'dark') return 'dark'
  // system — check OS preference
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

function applyDataTheme(resolved: ResolvedTheme) {
  document.documentElement.setAttribute('data-theme', resolved)
  // Update <meta name="theme-color"> for browser chrome
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.setAttribute('content', resolved === 'dark' ? '#1A1A1A' : '#FFFFFF')
  }
}

function applyAccentCSSVars(hex: string) {
  const accent = deriveAccentColors(hex)
  const root = document.documentElement
  root.style.setProperty('--flow-focus', accent.base)
  root.style.setProperty('--flow-focus-hover', accent.hover)
  root.style.setProperty('--flow-focus-light', accent.light)
}

function applyTransition() {
  document.documentElement.classList.add('theme-transitioning')
  setTimeout(() => {
    document.documentElement.classList.remove('theme-transitioning')
  }, 300)
}

// ── Read initial state from localStorage ─────────────────────────────────

function getInitialThemeMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_MODE_STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  } catch { /* localStorage may not be available */ }
  return 'system'
}

function getInitialAccentColor(): string {
  try {
    const stored = localStorage.getItem(ACCENT_COLOR_STORAGE_KEY)
    if (stored && /^#[0-9A-Fa-f]{6}$/.test(stored)) return stored
  } catch { /* noop */ }
  return DEFAULT_ACCENT_LIGHT
}

// ── Store ────────────────────────────────────────────────────────────────

interface ThemeState {
  themeMode: ThemeMode
  accentColor: string
  resolvedTheme: ResolvedTheme

  setThemeMode: (mode: ThemeMode) => void
  setAccentColor: (color: string) => void
  setResolvedTheme: (theme: ResolvedTheme) => void
}

const initialMode = getInitialThemeMode()
const initialAccent = getInitialAccentColor()
const initialResolved = resolveTheme(initialMode)

export const useThemeStore = create<ThemeState>((set, get) => ({
  themeMode: initialMode,
  accentColor: initialAccent,
  resolvedTheme: initialResolved,

  setThemeMode: (mode) => {
    const resolved = resolveTheme(mode)
    applyTransition()
    applyDataTheme(resolved)
    try { localStorage.setItem(THEME_MODE_STORAGE_KEY, mode) } catch { /* noop */ }
    set({ themeMode: mode, resolvedTheme: resolved })
    // Re-apply accent since default accent differs per theme
    applyAccentCSSVars(get().accentColor)
  },

  setAccentColor: (color) => {
    applyAccentCSSVars(color)
    try { localStorage.setItem(ACCENT_COLOR_STORAGE_KEY, color) } catch { /* noop */ }
    set({ accentColor: color })
  },

  setResolvedTheme: (theme) => {
    applyTransition()
    applyDataTheme(theme)
    set({ resolvedTheme: theme })
    applyAccentCSSVars(get().accentColor)
  },
}))
