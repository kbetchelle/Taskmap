// Phase 3: keyboard context and focus history

export type KeyboardContext =
  | 'navigation'
  | 'creation'
  | 'editing'
  | 'search'
  | 'settings'
  | 'confirmation'
  | 'shortcut-sheet'

export interface FocusHistoryItem {
  columnIndex: number
  itemId: string
}

export type ShortcutCategory =
  | 'Navigation'
  | 'Selection'
  | 'Actions'
  | 'View'
  | 'Other'

export interface KeyboardShortcut {
  key: string
  modifiers?: string
  context: KeyboardContext | 'global'
  description: string
  category: ShortcutCategory
  /** Action ID for ShortcutManager lookup (when remappable) */
  action?: string
}
