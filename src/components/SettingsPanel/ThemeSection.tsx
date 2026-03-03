import { useState, useCallback } from 'react'
import { useThemeStore } from '../../stores/themeStore'
import { ACCENT_PRESETS, isValidHexColor, deriveAccentColors } from '../../lib/accentColors'
import type { ThemeMode } from '../../lib/themeTokens'
import { SettingsSection } from './SettingsSection'
import { SettingField } from './SettingField'

const MODES: { value: ThemeMode; label: string; icon: string }[] = [
  { value: 'light', label: 'Light', icon: '\u2600\uFE0F' },
  { value: 'system', label: 'System', icon: '\uD83D\uDDA5\uFE0F' },
  { value: 'dark', label: 'Dark', icon: '\uD83C\uDF19' },
]

export function ThemeSection({ onDirty }: { onDirty?: () => void }) {
  const themeMode = useThemeStore((s) => s.themeMode)
  const accentColor = useThemeStore((s) => s.accentColor)
  const setThemeMode = useThemeStore((s) => s.setThemeMode)
  const setAccentColor = useThemeStore((s) => s.setAccentColor)
  const resolvedTheme = useThemeStore((s) => s.resolvedTheme)

  const [showCustomHex, setShowCustomHex] = useState(false)
  const [customHexInput, setCustomHexInput] = useState(accentColor)

  const handleCustomHexChange = useCallback(
    (value: string) => {
      setCustomHexInput(value)
      // Auto-apply valid hex as user types
      if (isValidHexColor(value)) {
        setAccentColor(value)
        onDirty?.()
      }
    },
    [setAccentColor, onDirty],
  )

  const isPreset = ACCENT_PRESETS.some((p) => p.color.toLowerCase() === accentColor.toLowerCase())
  const accent = deriveAccentColors(accentColor)

  return (
    <SettingsSection title="Theme">
      {/* ── Theme Mode Selector ── */}
      <SettingField label="Appearance" description="Choose light, dark, or follow your system settings">
        <div className="inline-flex rounded-lg border border-flow-columnBorder overflow-hidden">
          {MODES.map((mode) => (
            <button
              key={mode.value}
              type="button"
              className={`
                px-4 py-2 text-sm font-flow-medium transition-colors
                ${themeMode === mode.value
                  ? 'bg-flow-focus text-white'
                  : 'bg-flow-background text-flow-textSecondary hover:bg-flow-hover'
                }
              `}
              onClick={() => { setThemeMode(mode.value); onDirty?.() }}
              aria-pressed={themeMode === mode.value}
            >
              <span className="mr-1.5">{mode.icon}</span>
              {mode.label}
            </button>
          ))}
        </div>
      </SettingField>

      {/* ── Accent Color Picker ── */}
      <SettingField label="Accent Color" description="Customize the primary interactive color">
        <div className="flex flex-col gap-3">
          {/* Preset circles */}
          <div className="flex flex-wrap gap-2">
            {ACCENT_PRESETS.map((preset) => {
              const selected = preset.color.toLowerCase() === accentColor.toLowerCase()
              return (
                <button
                  key={preset.color}
                  type="button"
                  className={`
                    w-7 h-7 rounded-full transition-transform hover:scale-110
                    ${selected ? 'ring-2 ring-offset-2 ring-flow-focus' : ''}
                  `}
                  style={{ backgroundColor: preset.color }}
                  onClick={() => {
                    setAccentColor(preset.color)
                    setShowCustomHex(false)
                    setCustomHexInput(preset.color)
                    onDirty?.()
                  }}
                  title={preset.label}
                  aria-label={`Accent: ${preset.label}`}
                />
              )
            })}
          </div>

          {/* Custom hex toggle */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={`
                px-3 py-1.5 text-xs font-medium rounded-md border transition-colors
                ${!isPreset && !showCustomHex
                  ? 'border-flow-focus text-flow-focus'
                  : 'border-flow-columnBorder text-flow-textSecondary hover:bg-flow-hover'
                }
              `}
              onClick={() => {
                setShowCustomHex(!showCustomHex)
                setCustomHexInput(accentColor)
              }}
            >
              Custom
            </button>
          </div>

          {/* Custom hex input */}
          {showCustomHex && (
            <div className="flex items-center gap-2 p-3 bg-flow-surface rounded-md">
              <input
                type="color"
                className="w-10 h-8 border border-flow-columnBorder rounded cursor-pointer"
                value={accentColor}
                onChange={(e) => {
                  setAccentColor(e.target.value)
                  setCustomHexInput(e.target.value)
                  onDirty?.()
                }}
                aria-label="Custom accent color"
              />
              <input
                type="text"
                className="flex-1 px-2 py-1.5 text-sm font-mono border border-flow-columnBorder rounded bg-flow-background text-flow-textPrimary"
                value={customHexInput}
                onChange={(e) => handleCustomHexChange(e.target.value)}
                placeholder="#007AFF"
                maxLength={7}
                data-keyboard-ignore
              />
              <button
                type="button"
                className="px-3 py-1.5 text-xs font-medium text-white rounded cursor-pointer"
                style={{ backgroundColor: accentColor }}
                onClick={() => setShowCustomHex(false)}
              >
                Done
              </button>
            </div>
          )}
        </div>
      </SettingField>

      {/* ── Live Preview Card ── */}
      <SettingField label="Preview" description="How the theme looks with your current settings">
        <div
          className="rounded-lg border border-flow-columnBorder p-4 flex flex-col gap-3"
          style={{ backgroundColor: 'var(--flow-card-bg)' }}
        >
          {/* Mini task row */}
          <div className="flex items-center gap-3">
            {/* Status circle */}
            <div
              className="w-4 h-4 rounded-sm border-2 flex-shrink-0"
              style={{ borderColor: 'var(--flow-status-in-progress)' }}
            />
            <span className="text-flow-task text-flow-textPrimary font-flow-medium flex-1 truncate">
              Sample task title
            </span>
            <span className="text-flow-meta text-flow-textSecondary">
              {resolvedTheme === 'dark' ? 'Dark' : 'Light'}
            </span>
          </div>

          {/* Accent-colored button demo */}
          <div className="flex items-center gap-2">
            <span
              className="px-3 py-1 rounded-md text-xs font-flow-medium"
              style={{ backgroundColor: accent.base, color: accent.text }}
            >
              Accent Button
            </span>
            <span
              className="px-3 py-1 rounded-md text-xs font-flow-medium"
              style={{
                backgroundColor: 'var(--flow-focus-light)',
                color: accent.base,
              }}
            >
              Subtle
            </span>
            <span className="ml-auto text-flow-meta text-flow-textDisabled">
              Disabled text
            </span>
          </div>

          {/* Surface demo */}
          <div className="flex gap-2">
            <div
              className="flex-1 rounded-md p-2 text-flow-meta text-center"
              style={{ backgroundColor: 'var(--flow-surface)', color: 'var(--flow-text-secondary)' }}
            >
              Surface
            </div>
            <div
              className="flex-1 rounded-md p-2 text-flow-meta text-center border"
              style={{
                backgroundColor: 'var(--flow-background)',
                borderColor: 'var(--flow-border)',
                color: 'var(--flow-text-primary)',
              }}
            >
              Background
            </div>
          </div>
        </div>
      </SettingField>
    </SettingsSection>
  )
}
