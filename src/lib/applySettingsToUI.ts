import type { UserSettings } from '../types'
import { useSettingsStore } from '../stores/settingsStore'
import { colors } from './theme'
import { DEFAULT_SETTINGS_PAYLOAD } from './constants'

/**
 * Applies user settings to the UI: sets CSS variables and updates the settings store
 * so components that read from the store or vars reflect the new colors.
 */
export function applySettingsToUI(settings: UserSettings | null): void {
  if (!settings) return

  const root = document.documentElement
  root.style.setProperty(
    '--priority-high-color',
    settings.priority_high_color ?? DEFAULT_SETTINGS_PAYLOAD.priority_high_color
  )
  root.style.setProperty(
    '--priority-med-color',
    settings.priority_med_color ?? DEFAULT_SETTINGS_PAYLOAD.priority_med_color
  )

  const categoryColors = settings.category_colors ?? DEFAULT_SETTINGS_PAYLOAD.category_colors
  for (const [num, color] of Object.entries(categoryColors)) {
    root.style.setProperty(`--category-${num}-color`, color)
  }

  const palette = settings.background_color_palette ?? DEFAULT_SETTINGS_PAYLOAD.background_color_palette
  palette.forEach((color, i) => {
    root.style.setProperty(`--background-palette-${i}`, color)
  })

  useSettingsStore.getState().setSettings(settings)
}

/**
 * Resets CSS variables to theme defaults (e.g. when settings are cleared).
 */
export function resetSettingsCSS(): void {
  const root = document.documentElement
  root.style.setProperty('--priority-high-color', colors.priority.high)
  root.style.setProperty('--priority-med-color', colors.priority.med)
  const cats = colors.categories as Record<string, string>
  for (let i = 1; i <= 5; i++) {
    root.style.setProperty(`--category-${i}-color`, cats[`category${i}`] ?? '')
  }
  colors.backgroundPalette.forEach((color, i) => {
    root.style.setProperty(`--background-palette-${i}`, color)
  })
}
