// Shortcut manager for remappable keyboard shortcuts

import { create } from 'zustand'
import { SHORTCUTS } from './constants'
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

const SHORTCUT_DEFINITIONS: ShortcutDefinition[] = [
  { action: 'mainView', defaultShortcut: SHORTCUTS.MAIN_VIEW, category: 'View', description: 'Main view' },
  { action: 'upcomingView', defaultShortcut: SHORTCUTS.UPCOMING_VIEW, category: 'View', description: 'Upcoming view' },
  { action: 'archiveView', defaultShortcut: SHORTCUTS.ARCHIVE_VIEW, category: 'View', description: 'View archived tasks' },
  { action: 'commandPalette', defaultShortcut: SHORTCUTS.COMMAND_PALETTE, category: 'View', description: 'Command palette' },
  { action: 'searchOpen', defaultShortcut: SHORTCUTS.SEARCH_OPEN, category: 'View', description: 'Open search overlay' },
  { action: 'completedToggle', defaultShortcut: SHORTCUTS.COMPLETED_TOGGLE, category: 'View', description: 'Show/hide completed tasks' },
  { action: 'saveView', defaultShortcut: SHORTCUTS.SAVE_VIEW, category: 'View', description: 'Save current view' },
  { action: 'newTask', defaultShortcut: SHORTCUTS.NEW_TASK, category: 'Actions', description: 'Create (task or directory)' },
  { action: 'newDirectory', defaultShortcut: SHORTCUTS.NEW_DIRECTORY, category: 'Actions', description: 'Create directory' },
  { action: 'settings', defaultShortcut: SHORTCUTS.SETTINGS, category: 'View', description: 'Open settings' },
  { action: 'undo', defaultShortcut: SHORTCUTS.UNDO, category: 'Actions', description: 'Undo' },
  { action: 'redo', defaultShortcut: SHORTCUTS.REDO, category: 'Actions', description: 'Redo' },
  { action: 'optionE', defaultShortcut: SHORTCUTS.OPTION_E, category: 'Actions', description: 'Quick edit' },
  { action: 'cmdShiftE', defaultShortcut: SHORTCUTS.CMD_SHIFT_E, category: 'Actions', description: 'Full edit' },
  { action: 'cmdDelete', defaultShortcut: SHORTCUTS.CMD_DELETE, category: 'Actions', description: 'Delete selected' },
  { action: 'cmdC', defaultShortcut: SHORTCUTS.CMD_C, category: 'Actions', description: 'Copy' },
  { action: 'cmdShiftC', defaultShortcut: SHORTCUTS.CMD_SHIFT_C, category: 'Actions', description: 'Copy recursive' },
  { action: 'cmdV', defaultShortcut: SHORTCUTS.CMD_V, category: 'Actions', description: 'Paste' },
  { action: 'cmdShiftV', defaultShortcut: SHORTCUTS.CMD_SHIFT_V, category: 'Actions', description: 'Paste with metadata' },
  { action: 'cmdX', defaultShortcut: SHORTCUTS.CMD_X, category: 'Actions', description: 'Cut' },
  { action: 'scrollLeft', defaultShortcut: SHORTCUTS.SCROLL_LEFT, category: 'View', description: 'Scroll column left' },
  { action: 'scrollRight', defaultShortcut: SHORTCUTS.SCROLL_RIGHT, category: 'View', description: 'Scroll column right' },
  { action: 'scrollHome', defaultShortcut: SHORTCUTS.SCROLL_HOME, category: 'Navigation', description: 'First column' },
  { action: 'scrollEnd', defaultShortcut: SHORTCUTS.SCROLL_END, category: 'Navigation', description: 'Last column' },
  { action: 'colorNone', defaultShortcut: SHORTCUTS.COLOR_NONE, category: 'View', description: 'Color: none' },
  { action: 'colorCategory', defaultShortcut: SHORTCUTS.COLOR_CATEGORY, category: 'View', description: 'Color: category' },
  { action: 'colorPriority', defaultShortcut: SHORTCUTS.COLOR_PRIORITY, category: 'View', description: 'Color: priority' },
  { action: 'arrowUp', defaultShortcut: SHORTCUTS.ARROW_UP, category: 'Navigation', description: 'Move focus up' },
  { action: 'arrowDown', defaultShortcut: SHORTCUTS.ARROW_DOWN, category: 'Navigation', description: 'Move focus down' },
  { action: 'arrowLeft', defaultShortcut: SHORTCUTS.ARROW_LEFT, category: 'Navigation', description: 'Collapse column' },
  { action: 'arrowRight', defaultShortcut: SHORTCUTS.ARROW_RIGHT, category: 'Navigation', description: 'Expand / open' },
  { action: 'enter', defaultShortcut: SHORTCUTS.ENTER, category: 'Navigation', description: 'Expand / open' },
  { action: 'escape', defaultShortcut: SHORTCUTS.ESCAPE, category: 'Navigation', description: 'Clear selection' },
  { action: 'space', defaultShortcut: SHORTCUTS.SPACE, category: 'Actions', description: 'Toggle completion' },
  { action: 'shiftArrowUp', defaultShortcut: SHORTCUTS.SHIFT_ARROW_UP, category: 'Selection', description: 'Extend selection up' },
  { action: 'shiftArrowDown', defaultShortcut: SHORTCUTS.SHIFT_ARROW_DOWN, category: 'Selection', description: 'Extend selection down' },
  { action: 'cmdA', defaultShortcut: SHORTCUTS.CMD_A, category: 'Selection', description: 'Select all in column' },
  { action: 'cmdArrowUp', defaultShortcut: SHORTCUTS.CMD_ARROW_UP, category: 'Navigation', description: 'First item in column' },
  { action: 'cmdArrowDown', defaultShortcut: SHORTCUTS.CMD_ARROW_DOWN, category: 'Navigation', description: 'Last item in column' },
  { action: 'cmdSlash', defaultShortcut: SHORTCUTS.CMD_SLASH, category: 'View', description: 'Show keyboard shortcuts' },
  { action: 'cmdShiftF', defaultShortcut: SHORTCUTS.CMD_SHIFT_F, category: 'Actions', description: 'Add attachment' },
  { action: 'cmdShiftO', defaultShortcut: SHORTCUTS.CMD_SHIFT_O, category: 'Actions', description: 'Open all attachments' },
  { action: 'savedView2', defaultShortcut: SHORTCUTS.SAVED_VIEW_2, category: 'View', description: 'Load saved view 1' },
  { action: 'savedView3', defaultShortcut: SHORTCUTS.SAVED_VIEW_3, category: 'View', description: 'Load saved view 2' },
  { action: 'savedView4', defaultShortcut: SHORTCUTS.SAVED_VIEW_4, category: 'View', description: 'Load saved view 3' },
  { action: 'savedView5', defaultShortcut: SHORTCUTS.SAVED_VIEW_5, category: 'View', description: 'Load saved view 4' },
  { action: 'savedView6', defaultShortcut: SHORTCUTS.SAVED_VIEW_6, category: 'View', description: 'Load saved view 5' },
  { action: 'savedView7', defaultShortcut: SHORTCUTS.SAVED_VIEW_7, category: 'View', description: 'Load saved view 6' },
  { action: 'savedView8', defaultShortcut: SHORTCUTS.SAVED_VIEW_8, category: 'View', description: 'Load saved view 7' },
  { action: 'savedView9', defaultShortcut: SHORTCUTS.SAVED_VIEW_9, category: 'View', description: 'Load saved view 8' },
]

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
