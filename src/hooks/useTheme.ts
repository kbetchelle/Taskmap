import { useEffect } from 'react'
import { useThemeStore } from '../stores/themeStore'
import { deriveAccentColors } from '../lib/accentColors'
import type { ThemeMode, ResolvedTheme } from '../lib/themeTokens'

/**
 * useTheme — mount once at app root (AppContainer).
 *
 * Responsibilities:
 * 1. Listen for OS color scheme changes (when mode === 'system')
 * 2. Apply accent color CSS custom properties on mount and change
 * 3. Ensure data-theme attribute is set on <html>
 *
 * Returns current theme state for any component that needs it.
 */
export function useTheme(): {
  themeMode: ThemeMode
  resolvedTheme: ResolvedTheme
  setThemeMode: (mode: ThemeMode) => void
  accentColor: string
  setAccentColor: (color: string) => void
} {
  const themeMode = useThemeStore((s) => s.themeMode)
  const resolvedTheme = useThemeStore((s) => s.resolvedTheme)
  const accentColor = useThemeStore((s) => s.accentColor)
  const setThemeMode = useThemeStore((s) => s.setThemeMode)
  const setAccentColor = useThemeStore((s) => s.setAccentColor)
  const setResolvedTheme = useThemeStore((s) => s.setResolvedTheme)

  // Listen for OS color scheme changes
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')

    const handler = (e: MediaQueryListEvent) => {
      const mode = useThemeStore.getState().themeMode
      if (mode === 'system') {
        setResolvedTheme(e.matches ? 'dark' : 'light')
      }
    }

    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [setResolvedTheme])

  // Ensure data-theme is set on mount (handles hot-reload / React remount)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme)
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) {
      meta.setAttribute('content', resolvedTheme === 'dark' ? '#1A1A1A' : '#FFFFFF')
    }
  }, [resolvedTheme])

  // Apply accent CSS vars on mount and when accent changes
  useEffect(() => {
    const accent = deriveAccentColors(accentColor)
    const root = document.documentElement
    root.style.setProperty('--flow-focus', accent.base)
    root.style.setProperty('--flow-focus-hover', accent.hover)
    root.style.setProperty('--flow-focus-light', accent.light)
  }, [accentColor])

  return { themeMode, resolvedTheme, setThemeMode, accentColor, setAccentColor }
}
