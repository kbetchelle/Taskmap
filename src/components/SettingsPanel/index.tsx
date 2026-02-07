import { useEffect, useCallback, useState, useRef } from 'react'
import type { UserSettings } from '../../types'
import { useAppStore } from '../../stores/appStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { useFeedbackStore } from '../../stores/feedbackStore'
import { useAppContext } from '../../contexts/AppContext'
import { useKeyboard } from '../../hooks/useKeyboard'
import { Button } from '../ui/Button'
import { SettingsSection } from './SettingsSection'
import { SettingField } from './SettingField'
import { ShortcutCustomization } from '../ShortcutCustomization'
import { ColorPicker } from './ColorPicker'
import { SettingsSelect } from './SettingsSelect'
import { SettingsInput } from './SettingsInput'
import { DEFAULT_SETTINGS_PAYLOAD, COLOR_PRESETS } from '../../lib/constants'
import { applySettingsToUI } from '../../lib/applySettingsToUI'
import { upsertUserSettings } from '../../api/userSettings'

interface SettingsPanelProps {
  onClose: () => void
}

type SettingsDraft = Omit<UserSettings, 'created_at' | 'updated_at'> & {
  created_at?: string
  updated_at?: string
}

function buildDraft(settings: UserSettings | null, userId: string): SettingsDraft {
  const defaults = {
    ...DEFAULT_SETTINGS_PAYLOAD,
    user_id: userId,
  }
  if (!settings) return defaults as SettingsDraft
  return {
    user_id: settings.user_id,
    default_view: settings.default_view ?? defaults.default_view,
    week_start_day: settings.week_start_day ?? defaults.week_start_day,
    priority_high_color: settings.priority_high_color ?? defaults.priority_high_color,
    priority_med_color: settings.priority_med_color ?? defaults.priority_med_color,
    category_colors: settings.category_colors
      ? { ...defaults.category_colors, ...settings.category_colors }
      : defaults.category_colors,
    category_names: settings.category_names
      ? { ...defaults.category_names, ...settings.category_names }
      : defaults.category_names,
    background_color_palette:
      (settings.background_color_palette?.length ?? 0) > 0
        ? [...defaults.background_color_palette].map(
            (c, i) => settings.background_color_palette?.[i] ?? c
          )
        : defaults.background_color_palette,
    saved_views: settings.saved_views ?? null,
    skip_starter_structure: settings.skip_starter_structure ?? defaults.skip_starter_structure,
  } as SettingsDraft
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { userId } = useAppContext()
  const storeSettings = useSettingsStore((s) => s.settings)
  const pushKeyboardContext = useAppStore((s) => s.pushKeyboardContext)
  const popKeyboardContext = useAppStore((s) => s.popKeyboardContext)
  const panelRef = useRef<HTMLDivElement>(null)

  const [draft, setDraft] = useState<SettingsDraft>(() =>
    userId ? buildDraft(storeSettings, userId) : ({} as SettingsDraft)
  )
  const [hasChanges, setHasChanges] = useState(false)
  const [saving, setSaving] = useState(false)
  const [shortcutCustomizationOpen, setShortcutCustomizationOpen] = useState(false)

  const updateSetting = useCallback(<K extends keyof SettingsDraft>(key: K, value: SettingsDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }, [])

  const handleSave = useCallback(async () => {
    if (!userId || !hasChanges) return
    setSaving(true)
    try {
      const payload = {
        user_id: userId,
        default_view: draft.default_view,
        week_start_day: draft.week_start_day,
        priority_high_color: draft.priority_high_color,
        priority_med_color: draft.priority_med_color,
        category_colors: draft.category_colors,
        category_names: draft.category_names,
        background_color_palette: draft.background_color_palette,
        skip_starter_structure: draft.skip_starter_structure,
      }
      const updated = await upsertUserSettings(payload)
      useSettingsStore.getState().setSettings(updated)
      applySettingsToUI(updated)
      setHasChanges(false)
      onClose()
    } catch {
      useFeedbackStore.getState().showError('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }, [userId, hasChanges, draft, onClose])

  const handleClose = useCallback(() => {
    if (hasChanges && !window.confirm('Close without saving changes?')) return
    onClose()
  }, [hasChanges, onClose])

  useKeyboard({
    onSettingsSave: () => {
      if (hasChanges) handleSave()
    },
    onSettingsClose: handleClose,
    enabled: true,
  })

  useEffect(() => {
    pushKeyboardContext('settings')
    return () => popKeyboardContext()
  }, [pushKeyboardContext, popKeyboardContext])

  useEffect(() => {
    if (userId) {
      setDraft(buildDraft(storeSettings, userId))
      setHasChanges(false)
    }
  }, [userId])

  useEffect(() => {
    const el = panelRef.current?.querySelector<HTMLElement>('button, [tabindex="0"]')
    el?.focus()
  }, [])

  if (!userId) return null

  const categoryColors = draft.category_colors ?? DEFAULT_SETTINGS_PAYLOAD.category_colors
  const categoryNames = draft.category_names ?? DEFAULT_SETTINGS_PAYLOAD.category_names
  const backgroundPalette =
    draft.background_color_palette ?? DEFAULT_SETTINGS_PAYLOAD.background_color_palette

  return (
    <div
      ref={panelRef}
      className="h-full flex flex-col bg-flow-background overflow-hidden"
      role="region"
      aria-label="Settings"
    >
      <div className="flex-shrink-0 px-6 pb-4 border-b border-flow-columnBorder">
        <h1 className="text-xl font-semibold text-flow-textPrimary m-0 mb-1">Settings</h1>
        <p className="text-sm text-flow-textSecondary m-0">Customize Flow to your preferences</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-8">
        <SettingsSection title="General">
          <SettingField
            label="Default View"
            description="View to show when opening Flow"
          >
            <SettingsSelect
              value={draft.default_view}
              onChange={(v) => updateSetting('default_view', v)}
              options={[
                { value: 'main_db', label: 'Today (Main DB)' },
                { value: 'upcoming', label: 'Upcoming' },
              ]}
            />
          </SettingField>
          <SettingField
            label="Week Start Day"
            description="First day of the week for date calculations"
          >
            <SettingsSelect
              value={draft.week_start_day}
              onChange={(v) => updateSetting('week_start_day', v as 'sunday' | 'monday')}
              options={[
                { value: 'sunday', label: 'Sunday' },
                { value: 'monday', label: 'Monday' },
              ]}
            />
          </SettingField>
        </SettingsSection>

        <SettingsSection title="Priority Colors">
          <SettingField label="High Priority" description="Color for high priority tasks">
            <ColorPicker
              value={draft.priority_high_color ?? DEFAULT_SETTINGS_PAYLOAD.priority_high_color}
              onChange={(c) => updateSetting('priority_high_color', c)}
              presets={COLOR_PRESETS.priority}
            />
          </SettingField>
          <SettingField label="Medium Priority" description="Color for medium priority tasks">
            <ColorPicker
              value={draft.priority_med_color ?? DEFAULT_SETTINGS_PAYLOAD.priority_med_color}
              onChange={(c) => updateSetting('priority_med_color', c)}
              presets={COLOR_PRESETS.priority}
            />
          </SettingField>
        </SettingsSection>

        <SettingsSection title="Category Colors">
          {([1, 2, 3, 4, 5] as const).map((num) => (
            <SettingField
              key={num}
              label={`Category ${num}`}
              description={`Color for category ${num} tasks`}
            >
              <ColorPicker
                value={(categoryColors as Record<string, string>)[String(num)] ?? (DEFAULT_SETTINGS_PAYLOAD.category_colors as Record<string, string>)[String(num)]}
                onChange={(color) =>
                  updateSetting('category_colors', {
                    ...categoryColors,
                    [String(num)]: color,
                  })
                }
                presets={COLOR_PRESETS.category}
              />
            </SettingField>
          ))}
        </SettingsSection>

        <SettingsSection title="Background Color Palette">
          <p className="text-xs text-flow-textSecondary -mt-2 mb-2">
            Colors available for individual task backgrounds (in &quot;No Color&quot; mode)
          </p>
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <SettingField key={index} label={`Color ${index + 1}`}>
              <ColorPicker
                value={backgroundPalette[index] ?? DEFAULT_SETTINGS_PAYLOAD.background_color_palette[index]}
                onChange={(color) => {
                  const next = [...backgroundPalette]
                  next[index] = color
                  updateSetting('background_color_palette', next)
                }}
                presets={COLOR_PRESETS.background}
              />
            </SettingField>
          ))}
        </SettingsSection>

        <SettingsSection title="Category Names">
          <p className="text-xs text-flow-textSecondary -mt-2 mb-2">
            Customize the names of your 5 categories
          </p>
          {([1, 2, 3, 4, 5] as const).map((num) => (
            <SettingField key={num} label={`Category ${num}`}>
              <SettingsInput
                value={(categoryNames as Record<string, string>)[String(num)] ?? `Category ${num}`}
                onChange={(value) =>
                  updateSetting('category_names', {
                    ...categoryNames,
                    [String(num)]: value,
                  })
                }
                placeholder={`Category ${num}`}
              />
            </SettingField>
          ))}
        </SettingsSection>

        <SettingsSection title="Keyboard Shortcuts">
          <SettingField
            label="Customize Shortcuts"
            description="Remap keyboard shortcuts to your preference"
          >
            <Button
              type="button"
              variant="secondary"
              className="border border-flow-columnBorder"
              onClick={() => setShortcutCustomizationOpen(true)}
            >
              Customize Shortcuts
            </Button>
          </SettingField>
        </SettingsSection>

        <SettingsSection title="Import/Export">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="border border-flow-columnBorder"
              onClick={() => exportSettings(draft)}
            >
              Export Settings
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="border border-flow-columnBorder"
              onClick={() => importSettings(userId, handleClose)}
            >
              Import Settings
            </Button>
          </div>
        </SettingsSection>

        <SettingsSection title="Reset">
          <Button
            type="button"
            variant="secondary"
            className="text-flow-error border border-flow-error hover:bg-red-50"
            onClick={() => resetToDefaults(userId, setDraft, handleClose)}
          >
            Reset to Default Settings
          </Button>
        </SettingsSection>
      </div>

      <div className="flex-shrink-0 px-6 pt-4 border-t border-flow-columnBorder flex flex-col gap-3">
        {hasChanges && (
          <p className="text-xs font-medium text-amber-600 text-center m-0">Unsaved changes</p>
        )}
        <div className="flex gap-2">
          <Button type="button" variant="secondary" className="flex-1 border border-flow-columnBorder" onClick={handleClose}>
            Cancel (Esc)
          </Button>
          <Button
            type="button"
            variant="primary"
            className="flex-1"
            onClick={handleSave}
            disabled={!hasChanges || saving}
          >
            {saving ? 'Saving…' : 'Save Changes (Enter)'}
          </Button>
        </div>
      </div>

      {shortcutCustomizationOpen && (
        <ShortcutCustomization
          open={shortcutCustomizationOpen}
          onClose={() => setShortcutCustomizationOpen(false)}
        />
      )}
    </div>
  )
}

function exportSettings(settings: SettingsDraft) {
  const data = {
    version: '1.0',
    exported_at: new Date().toISOString(),
    settings: {
      default_view: settings.default_view,
      week_start_day: settings.week_start_day,
      priority_high_color: settings.priority_high_color,
      priority_med_color: settings.priority_med_color,
      category_colors: settings.category_colors,
      category_names: settings.category_names,
      background_color_palette: settings.background_color_palette,
    },
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `flow-settings-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function importSettings(userId: string, onClose: () => void) {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (!data.settings || !data.version) throw new Error('Invalid settings file')
      if (!window.confirm('Import these settings? This will replace your current settings.')) return
      const s = data.settings
      const payload = {
        user_id: userId,
        default_view: s.default_view ?? 'main_db',
        week_start_day: s.week_start_day ?? 'sunday',
        priority_high_color: s.priority_high_color ?? null,
        priority_med_color: s.priority_med_color ?? null,
        category_colors: s.category_colors ?? null,
        category_names: s.category_names ?? null,
        background_color_palette: s.background_color_palette ?? null,
      }
      const updated = await upsertUserSettings(payload)
      useSettingsStore.getState().setSettings(updated)
      applySettingsToUI(updated)
      onClose()
    } catch {
      window.alert('Failed to import settings')
    }
  }
  input.click()
}

async function resetToDefaults(
  userId: string,
  setDraft: (d: SettingsDraft) => void,
  onClose: () => void
) {
  if (!window.confirm('Reset all settings to defaults? This cannot be undone.')) return
  try {
    const payload = {
      ...DEFAULT_SETTINGS_PAYLOAD,
      user_id: userId,
    }
    const updated = await upsertUserSettings(payload)
    useSettingsStore.getState().setSettings(updated)
    applySettingsToUI(updated)
    setDraft(buildDraft(updated, userId))
    onClose()
  } catch {
    window.alert('Failed to reset settings')
  }
}
