// Phase 3: shortcut registry for Cmd+/ display

import type { KeyboardShortcut, ShortcutCategory } from '../types/keyboard'

const mod = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)
  ? '⌘'
  : 'Ctrl'

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  { key: '1', modifiers: mod, context: 'global', description: 'Main view', category: 'View' },
  { key: 'L', modifiers: `${mod}+Shift`, context: 'global', description: 'Upcoming view', category: 'View' },
  { key: 'K', modifiers: mod, context: 'global', description: 'Command palette', category: 'View' },
  { key: 'S', modifiers: `${mod}+Shift`, context: 'global', description: 'Open search overlay', category: 'View' },
  { key: 'H', modifiers: `${mod}+Shift`, context: 'global', description: 'Show/hide completed tasks', category: 'View' },
  { key: 'S', modifiers: `${mod}+Alt`, context: 'global', description: 'Save current view (filters + color)', category: 'View' },
  { key: '2', modifiers: mod, context: 'global', description: 'Load saved view 1', category: 'View' },
  { key: '3', modifiers: mod, context: 'global', description: 'Load saved view 2', category: 'View' },
  { key: '4', modifiers: mod, context: 'global', description: 'Load saved view 3', category: 'View' },
  { key: '5', modifiers: mod, context: 'global', description: 'Load saved view 4', category: 'View' },
  { key: '6', modifiers: mod, context: 'global', description: 'Load saved view 5', category: 'View' },
  { key: '7', modifiers: mod, context: 'global', description: 'Load saved view 6', category: 'View' },
  { key: '8', modifiers: mod, context: 'global', description: 'Load saved view 7', category: 'View' },
  { key: '9', modifiers: mod, context: 'global', description: 'Load saved view 8', category: 'View' },
  { key: 'N', modifiers: mod, context: 'global', description: 'Create (T for task, D for directory)', category: 'Actions' },
  { key: 'N', modifiers: `${mod}+Shift`, context: 'global', description: 'Create (same as Cmd+N)', category: 'Actions' },
  { key: ',', modifiers: mod, context: 'global', description: 'Open settings', category: 'View' },
  { key: 'Enter', context: 'settings', description: 'Save settings', category: 'Actions' },
  { key: 'Escape', context: 'settings', description: 'Close settings', category: 'Navigation' },
  { key: 'Z', modifiers: mod, context: 'global', description: 'Undo', category: 'Actions' },
  { key: 'Z', modifiers: `${mod}+Shift`, context: 'global', description: 'Redo', category: 'Actions' },
  { key: 'E', modifiers: 'Option', context: 'navigation', description: 'Quick edit (inline rename)', category: 'Actions' },
  { key: 'E', modifiers: `${mod}+Shift`, context: 'navigation', description: 'Full edit (metadata panel)', category: 'Actions' },
  { key: 'F', modifiers: `${mod}+Shift`, context: 'editing', description: 'Add attachment (when task open)', category: 'Actions' },
  { key: 'O', modifiers: `${mod}+Shift`, context: 'editing', description: 'Open all attachments', category: 'Actions' },
  { key: 'Escape', context: 'editing', description: 'Close task panel', category: 'Navigation' },
  { key: 'Delete', modifiers: mod, context: 'navigation', description: 'Delete selected item(s)', category: 'Actions' },
  { key: 'C', modifiers: mod, context: 'navigation', description: 'Copy selected items', category: 'Actions' },
  { key: 'C', modifiers: `${mod}+Shift`, context: 'navigation', description: 'Copy recursive (with children)', category: 'Actions' },
  { key: 'V', modifiers: mod, context: 'navigation', description: 'Paste', category: 'Actions' },
  { key: 'V', modifiers: `${mod}+Shift`, context: 'navigation', description: 'Paste with metadata', category: 'Actions' },
  { key: 'X', modifiers: mod, context: 'navigation', description: 'Cut selected items', category: 'Actions' },
  { key: '←', modifiers: `${mod}+Shift`, context: 'global', description: 'Scroll column left', category: 'View' },
  { key: '→', modifiers: `${mod}+Shift`, context: 'global', description: 'Scroll column right', category: 'View' },
  { key: 'Home', context: 'global', description: 'First column, focus first item', category: 'Navigation' },
  { key: 'End', context: 'global', description: 'Last column, focus first item', category: 'Navigation' },
  { key: 'N', modifiers: `${mod}+Alt`, context: 'global', description: 'Color: none', category: 'View' },
  { key: 'C', modifiers: `${mod}+Alt`, context: 'global', description: 'Color: category', category: 'View' },
  { key: 'P', modifiers: `${mod}+Alt`, context: 'global', description: 'Color: priority', category: 'View' },
  { key: '↑', context: 'navigation', description: 'Move focus up', category: 'Navigation' },
  { key: '↓', context: 'navigation', description: 'Move focus down', category: 'Navigation' },
  { key: '←', context: 'navigation', description: 'Collapse column', category: 'Navigation' },
  { key: '→', context: 'navigation', description: 'Expand directory / open task', category: 'Navigation' },
  { key: 'Enter', context: 'navigation', description: 'Expand directory / open task', category: 'Navigation' },
  { key: 'Escape', context: 'navigation', description: 'Clear selection or collapse column', category: 'Navigation' },
  { key: 'Space', context: 'navigation', description: 'Toggle task completion', category: 'Actions' },
  { key: '↑', modifiers: 'Shift', context: 'navigation', description: 'Extend selection up', category: 'Selection' },
  { key: '↓', modifiers: 'Shift', context: 'navigation', description: 'Extend selection down', category: 'Selection' },
  { key: 'A', modifiers: mod, context: 'navigation', description: 'Select all in column', category: 'Selection' },
  { key: '↑', modifiers: mod, context: 'navigation', description: 'First item in column', category: 'Navigation' },
  { key: '↓', modifiers: mod, context: 'navigation', description: 'Last item in column', category: 'Navigation' },
  { key: '/', modifiers: mod, context: 'global', description: 'Show keyboard shortcuts', category: 'View' },
]

const CATEGORY_ORDER: ShortcutCategory[] = [
  'Navigation',
  'Selection',
  'Actions',
  'View',
  'Other',
]

export function getShortcutsByCategory(): Map<ShortcutCategory, KeyboardShortcut[]> {
  const map = new Map<ShortcutCategory, KeyboardShortcut[]>()
  for (const cat of CATEGORY_ORDER) {
    map.set(cat, [])
  }
  for (const s of KEYBOARD_SHORTCUTS) {
    const list = map.get(s.category) ?? []
    list.push(s)
    map.set(s.category, list)
  }
  return map
}
