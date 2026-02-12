// Shortcut manager for remappable keyboard shortcuts

import { create } from 'zustand'
import { SHORTCUT_BINDINGS, REMAPPABLE_ACTIONS } from './shortcutRegistry'
import { upsertUserSettings } from '../api/userSettings'
import { useFeedbackStore } from '../stores/feedbackStore'
import type { ShortcutCategory } from '../types/keyboard'

export interface ShortcutMapping {
  action: string
  defaultShortcut: string
  currentShortcut: string
  category: ShortcutCategory
  description: string
}

interface ShortcutDefinition {
  action: string
  defaultShortcut: string
  category: ShortcutCategory
  description: string
}

// Derive definitions from the unified registry (single source of truth)
const SHORTCUT_DEFINITIONS: ShortcutDefinition[] = SHORTCUT_BINDINGS
  .filter(b => REMAPPABLE_ACTIONS.has(b.action))
  .map(b => ({
    action: b.action,
    defaultShortcut: b.keys,
    category: b.category,
    description: b.label,
  }))

function buildMappings(customShortcuts: Record<string, string> | null): Map<string, ShortcutMapping> {
  const map = new Map<string, ShortcutMapping>()
  for (const def of SHORTCUT_DEFINITIONS) {
    const currentShortcut = customShortcuts?.[def.action] ?? def.defaultShortcut
    map.set(def.action, {
      action: def.action,
      defaultShortcut: def.defaultShortcut,
      currentShortcut,
      category: def.category,
      description: def.description,
    })
  }
  return map
}

interface ShortcutManagerState {
  mappings: Map<string, ShortcutMapping>
  loadCustomMappings: (customShortcuts: Record<string, string> | null) => void
  getShortcut: (action: string) => string
  getAllMappings: () => ShortcutMapping[]
  updateShortcut: (userId: string, action: string, newShortcut: string) => Promise<boolean>
  resetToDefaults: () => void
  resetToDefaultsAndPersist: (userId: string) => Promise<void>
}

export const useShortcutStore = create<ShortcutManagerState>((set, get) => ({
  mappings: buildMappings(null),

  loadCustomMappings: (customShortcuts) => {
    set({ mappings: buildMappings(customShortcuts) })
  },

  getShortcut: (action) => {
    return get().mappings.get(action)?.currentShortcut ?? ''
  },

  getAllMappings: () => {
    return Array.from(get().mappings.values())
  },

  updateShortcut: async (userId, action, newShortcut) => {
    const { mappings } = get()
    const mapping = mappings.get(action)
    if (!mapping) return false

    const conflict = get().getAllMappings().find(
      (m) => m.action !== action && m.currentShortcut === newShortcut
    )
    if (conflict) {
      useFeedbackStore.getState().showError(
        `Shortcut ${newShortcut} is already used for: ${conflict.description}`
      )
      return false
    }

    const next = new Map(mappings)
    next.set(action, { ...mapping, currentShortcut: newShortcut })

    const customShortcuts: Record<string, string> = {}
    for (const m of next.values()) {
      if (m.currentShortcut !== m.defaultShortcut) {
        customShortcuts[m.action] = m.currentShortcut
      }
    }

    try {
      await upsertUserSettings({ user_id: userId, custom_shortcuts: customShortcuts })
      set({ mappings: next })
      return true
    } catch {
      useFeedbackStore.getState().showError('Failed to save shortcut')
      return false
    }
  },

  resetToDefaults: () => {
    set({ mappings: buildMappings(null) })
  },

  resetToDefaultsAndPersist: async (userId) => {
    try {
      await upsertUserSettings({ user_id: userId, custom_shortcuts: {} })
      set({ mappings: buildMappings(null) })
    } catch {
      useFeedbackStore.getState().showError('Failed to reset shortcuts')
    }
  },
}))
