import { useState, useEffect } from 'react'
import type { UserSettings } from '../../types'
import { useAppStore } from '../../stores/appStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { useAppContext } from '../../contexts/AppContext'
import { Button } from '../ui/Button'
import { SettingsSelect } from '../SettingsPanel/SettingsSelect'
import { SettingField } from '../SettingsPanel/SettingField'
import { ColorPicker } from '../SettingsPanel/ColorPicker'
import { DEFAULT_SETTINGS_PAYLOAD, COLOR_PRESETS } from '../../lib/constants'
import { applySettingsToUI } from '../../lib/applySettingsToUI'
import { upsertUserSettings } from '../../api/userSettings'
import { createStarterStructure } from '../../lib/starterStructure'
import { formatShortcutForDisplay } from '../../lib/platform'
import { useShortcutStore } from '../../lib/shortcutManager'
import { useDirectoryStore } from '../../stores/directoryStore'
import { useFeedbackStore } from '../../stores/feedbackStore'

const STEPS = [
  {
    title: 'Welcome to Flow',
    description: "Let's set up a few preferences to make Flow feel like yours.",
    content: 'welcome',
  },
  {
    title: 'Week Start Day',
    description: 'Choose which day your week starts on',
    content: 'week_start',
  },
  {
    title: 'Default View',
    description: 'Which view should open when you launch Flow?',
    content: 'default_view',
  },
  {
    title: 'Priority Colors',
    description: 'Choose colors for high and medium priority tasks',
    content: 'priority_colors',
  },
  {
    title: 'Starter Projects',
    description: 'Want us to create some starter projects for you?',
    content: 'starter_projects',
  },
  {
    title: "All Set!",
    description: "You're ready to start using Flow",
    content: 'complete',
  },
] as const

type PartialSettings = Partial<{
  week_start_day: 'sunday' | 'monday'
  default_view: string
  priority_high_color: string
  priority_med_color: string
  skip_starter_structure: boolean
}>

export function OnboardingFlow() {
  const { userId } = useAppContext()
  const setOnboardingOpen = useAppStore((s) => s.setOnboardingOpen)
  const setSettings = useSettingsStore((s) => s.setSettings)
  const pushKeyboardContext = useAppStore((s) => s.pushKeyboardContext)
  const popKeyboardContext = useAppStore((s) => s.popKeyboardContext)

  const [step, setStep] = useState(0)
  const [partial, setPartial] = useState<PartialSettings>({})

  useEffect(() => {
    pushKeyboardContext('editing')
    return () => popKeyboardContext()
  }, [pushKeyboardContext, popKeyboardContext])

  const completeOnboarding = async (merged: Partial<UserSettings>) => {
    if (!userId) return
    const payload = {
      user_id: userId,
      ...DEFAULT_SETTINGS_PAYLOAD,
      ...merged,
      skip_starter_structure: merged.skip_starter_structure ?? false,
    }
    const updated = await upsertUserSettings(payload)
    setSettings(updated)
    applySettingsToUI(updated)

    const skipStarter = updated.skip_starter_structure ?? false
    const newTaskShortcut = formatShortcutForDisplay(
      useShortcutStore.getState().getShortcut('newTask') || ''
    )
    if (!skipStarter) {
      try {
        const { personal } = await createStarterStructure(userId)
        await useDirectoryStore.getState().fetchDirectories(userId)
        useAppStore.getState().setNavigationPath([personal.id])
        useFeedbackStore.getState().showTooltip(
          `You're inside your Personal project. Press ${newTaskShortcut} to create your first task!`,
          5000
        )
      } catch {
        useFeedbackStore.getState().showTooltip(
          `Press ${newTaskShortcut} in the Home column to create your first project`,
          5000
        )
      }
    } else {
      useFeedbackStore.getState().showTooltip(
        `Press ${newTaskShortcut} in the Home column to create your first project`,
        5000
      )
    }
    setOnboardingOpen(false)
  }

  const handleNext = () => {
    if (step === STEPS.length - 1) {
      const merged = {
        week_start_day: partial.week_start_day ?? DEFAULT_SETTINGS_PAYLOAD.week_start_day,
        default_view: partial.default_view ?? DEFAULT_SETTINGS_PAYLOAD.default_view,
        priority_high_color: partial.priority_high_color ?? DEFAULT_SETTINGS_PAYLOAD.priority_high_color,
        priority_med_color: partial.priority_med_color ?? DEFAULT_SETTINGS_PAYLOAD.priority_med_color,
        skip_starter_structure: partial.skip_starter_structure ?? false,
      }
      completeOnboarding(merged)
    } else {
      setStep((s) => s + 1)
    }
  }

  const handleSkip = () => {
    completeOnboarding({})
  }

  if (!userId) return null

  const stepData = STEPS[step]
  const isLastStep = step === STEPS.length - 1

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-flow-background p-10"
      role="dialog"
      aria-modal="true"
      aria-label="Onboarding"
    >
      <div className="w-full max-w-[500px] flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <div className="h-1 bg-neutral-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#007AFF] transition-all duration-300"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
          <p className="text-xs text-flow-textSecondary text-center m-0">
            Step {step + 1} of {STEPS.length}
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-semibold text-flow-textPrimary text-center m-0">
            {stepData.title}
          </h1>
          <p className="text-base text-flow-textSecondary text-center m-0 leading-relaxed">
            {stepData.description}
          </p>

          <div className="pt-6">
            {stepData.content === 'welcome' && (
              <div className="flex flex-col items-center gap-4 text-center">
                <span className="text-5xl" aria-hidden>🌊</span>
                <p className="text-base text-flow-textSecondary leading-relaxed m-0">
                  Flow is a peaceful task manager built around calm confidence and spatial clarity.
                </p>
              </div>
            )}
            {stepData.content === 'week_start' && (
              <SettingField label="Week start" description="First day of the week">
                <SettingsSelect
                  value={partial.week_start_day ?? 'sunday'}
                  onChange={(v) => setPartial((p) => ({ ...p, week_start_day: v as 'sunday' | 'monday' }))}
                  options={[
                    { value: 'sunday', label: 'Sunday' },
                    { value: 'monday', label: 'Monday' },
                  ]}
                />
              </SettingField>
            )}
            {stepData.content === 'default_view' && (
              <SettingField label="Default view" description="View when you open Flow">
                <SettingsSelect
                  value={partial.default_view ?? 'main_db'}
                  onChange={(v) => setPartial((p) => ({ ...p, default_view: v }))}
                  options={[
                    { value: 'main_db', label: 'Today (Main DB) – Shows active work' },
                    { value: 'upcoming', label: 'Upcoming – Shows all future work' },
                  ]}
                />
              </SettingField>
            )}
            {stepData.content === 'priority_colors' && (
              <div className="flex flex-col gap-5">
                <SettingField label="High priority" description="Color for high priority tasks">
                  <ColorPicker
                    value={partial.priority_high_color ?? DEFAULT_SETTINGS_PAYLOAD.priority_high_color}
                    onChange={(c) => setPartial((p) => ({ ...p, priority_high_color: c }))}
                    presets={COLOR_PRESETS.priority}
                  />
                </SettingField>
                <SettingField label="Medium priority" description="Color for medium priority tasks">
                  <ColorPicker
                    value={partial.priority_med_color ?? DEFAULT_SETTINGS_PAYLOAD.priority_med_color}
                    onChange={(c) => setPartial((p) => ({ ...p, priority_med_color: c }))}
                    presets={COLOR_PRESETS.priority}
                  />
                </SettingField>
              </div>
            )}
            {stepData.content === 'starter_projects' && (
              <div className="flex flex-col gap-4 text-center">
                <p className="text-base text-flow-textSecondary leading-relaxed m-0">
                  We can create &quot;Personal&quot; and &quot;Work&quot; projects to get you started, or you can start with a blank slate.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    type="button"
                    variant="primary"
                    className="flex-1"
                    onClick={() => {
                      setPartial((p) => ({ ...p, skip_starter_structure: false }))
                      setStep((s) => s + 1)
                    }}
                  >
                    Create Starters (Recommended)
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1 border border-flow-columnBorder"
                    onClick={() => {
                      setPartial((p) => ({ ...p, skip_starter_structure: true }))
                      setStep((s) => s + 1)
                    }}
                  >
                    Start Fresh
                  </Button>
                </div>
              </div>
            )}
            {stepData.content === 'complete' && (
              <div className="flex flex-col items-center gap-4 text-center">
                <span className="text-5xl" aria-hidden>✨</span>
                <p className="text-base text-flow-textSecondary leading-relaxed m-0">
                  Press <kbd className="px-1.5 py-0.5 bg-neutral-100 border border-flow-columnBorder rounded text-sm font-mono">⌘/</kbd> anytime to see all keyboard shortcuts.
                </p>
                <p className="text-base text-flow-textSecondary leading-relaxed m-0">
                  Press <kbd className="px-1.5 py-0.5 bg-neutral-100 border border-flow-columnBorder rounded text-sm font-mono">⌘,</kbd> to open settings.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          {!isLastStep && (
            <Button
              type="button"
              variant="secondary"
              className="flex-1 border border-flow-columnBorder"
              onClick={handleSkip}
            >
              Skip & Use Defaults
            </Button>
          )}
          <Button
            type="button"
            variant="primary"
            className="flex-1"
            onClick={handleNext}
          >
            {isLastStep ? 'Start Using Flow' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  )
}
