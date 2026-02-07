// Phase 3: shortcut registry for Cmd+/ display

import type { KeyboardShortcut, ShortcutCategory } from '../types/keyboard'

const mod = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)
  ? '⌘'
  : 'Ctrl'

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  { key: '1', modifiers: mod, context: 'global', description: 'Main view', category: 'View', action: 'mainView' },
  { key: 'L', modifiers: `${mod}+Shift`, context: 'global', description: 'Upcoming view', category: 'View', action: 'upcomingView' },
  { key: 'K', modifiers: mod, context: 'global', description: 'Command palette', category: 'View', action: 'commandPalette' },
  { key: 'S', modifiers: `${mod}+Shift`, context: 'global', description: 'Open search overlay', category: 'View', action: 'searchOpen' },
  { key: 'H', modifiers: `${mod}+Shift`, context: 'global', description: 'Show/hide completed tasks', category: 'View', action: 'completedToggle' },
  { key: 'S', modifiers: `${mod}+Alt`, context: 'global', description: 'Save current view (filters + color)', category: 'View', action: 'saveView' },
  { key: '2', modifiers: mod, context: 'global', description: 'Load saved view 1', category: 'View', action: 'savedView2' },
  { key: '3', modifiers: mod, context: 'global', description: 'Load saved view 2', category: 'View', action: 'savedView3' },
  { key: '4', modifiers: mod, context: 'global', description: 'Load saved view 3', category: 'View', action: 'savedView4' },
  { key: '5', modifiers: mod, context: 'global', description: 'Load saved view 4', category: 'View', action: 'savedView5' },
  { key: '6', modifiers: mod, context: 'global', description: 'Load saved view 5', category: 'View', action: 'savedView6' },
  { key: '7', modifiers: mod, context: 'global', description: 'Load saved view 6', category: 'View', action: 'savedView7' },
  { key: '8', modifiers: mod, context: 'global', description: 'Load saved view 7', category: 'View', action: 'savedView8' },
  { key: '9', modifiers: mod, context: 'global', description: 'Load saved view 8', category: 'View', action: 'savedView9' },
  { key: 'N', modifiers: mod, context: 'global', description: 'Create (T for task, D for directory)', category: 'Actions', action: 'newTask' },
  { key: 'N', modifiers: `${mod}+Shift`, context: 'global', description: 'Create (same as Cmd+N)', category: 'Actions', action: 'newDirectory' },
  { key: ',', modifiers: mod, context: 'global', description: 'Open settings', category: 'View', action: 'settings' },
  { key: 'Enter', context: 'settings', description: 'Save settings', category: 'Actions', action: 'enter' },
  { key: 'Escape', context: 'settings', description: 'Close settings', category: 'Navigation', action: 'escape' },
  { key: 'Z', modifiers: mod, context: 'global', description: 'Undo', category: 'Actions', action: 'undo' },
  { key: 'Z', modifiers: `${mod}+Shift`, context: 'global', description: 'Redo', category: 'Actions', action: 'redo' },
  { key: 'E', modifiers: 'Option', context: 'navigation', description: 'Quick edit (inline rename)', category: 'Actions', action: 'optionE' },
  { key: 'E', modifiers: `${mod}+Shift`, context: 'navigation', description: 'Full edit (metadata panel)', category: 'Actions', action: 'cmdShiftE' },
  { key: 'F', modifiers: `${mod}+Shift`, context: 'editing', description: 'Add attachment (when task open)', category: 'Actions', action: 'cmdShiftF' },
  { key: 'O', modifiers: `${mod}+Shift`, context: 'editing', description: 'Open all attachments', category: 'Actions', action: 'cmdShiftO' },
  { key: 'Escape', context: 'editing', description: 'Close task panel', category: 'Navigation', action: 'escape' },
  { key: 'Delete', modifiers: mod, context: 'navigation', description: 'Delete selected item(s)', category: 'Actions', action: 'cmdDelete' },
  { key: 'C', modifiers: mod, context: 'navigation', description: 'Copy selected items', category: 'Actions', action: 'cmdC' },
  { key: 'C', modifiers: `${mod}+Shift`, context: 'navigation', description: 'Copy recursive (with children)', category: 'Actions', action: 'cmdShiftC' },
  { key: 'V', modifiers: mod, context: 'navigation', description: 'Paste', category: 'Actions', action: 'cmdV' },
  { key: 'V', modifiers: `${mod}+Shift`, context: 'navigation', description: 'Paste with metadata', category: 'Actions', action: 'cmdShiftV' },
  { key: 'X', modifiers: mod, context: 'navigation', description: 'Cut selected items', category: 'Actions', action: 'cmdX' },
  { key: '←', modifiers: `${mod}+Shift`, context: 'global', description: 'Scroll column left', category: 'View', action: 'scrollLeft' },
  { key: '→', modifiers: `${mod}+Shift`, context: 'global', description: 'Scroll column right', category: 'View', action: 'scrollRight' },
  { key: 'Home', context: 'global', description: 'First column, focus first item', category: 'Navigation', action: 'scrollHome' },
  { key: 'End', context: 'global', description: 'Last column, focus first item', category: 'Navigation', action: 'scrollEnd' },
  { key: 'N', modifiers: `${mod}+Alt`, context: 'global', description: 'Color: none', category: 'View', action: 'colorNone' },
  { key: 'C', modifiers: `${mod}+Alt`, context: 'global', description: 'Color: category', category: 'View', action: 'colorCategory' },
  { key: 'P', modifiers: `${mod}+Alt`, context: 'global', description: 'Color: priority', category: 'View', action: 'colorPriority' },
  { key: '↑', context: 'navigation', description: 'Move focus up', category: 'Navigation', action: 'arrowUp' },
  { key: '↓', context: 'navigation', description: 'Move focus down', category: 'Navigation', action: 'arrowDown' },
  { key: '←', context: 'navigation', description: 'Collapse column', category: 'Navigation', action: 'arrowLeft' },
  { key: '→', context: 'navigation', description: 'Expand directory / open task', category: 'Navigation', action: 'arrowRight' },
  { key: 'Enter', context: 'navigation', description: 'Expand directory / open task', category: 'Navigation', action: 'enter' },
  { key: 'Escape', context: 'navigation', description: 'Clear selection or collapse column', category: 'Navigation', action: 'escape' },
  { key: 'Space', context: 'navigation', description: 'Toggle task completion', category: 'Actions', action: 'space' },
  { key: '↑', modifiers: 'Shift', context: 'navigation', description: 'Extend selection up', category: 'Selection', action: 'shiftArrowUp' },
  { key: '↓', modifiers: 'Shift', context: 'navigation', description: 'Extend selection down', category: 'Selection', action: 'shiftArrowDown' },
  { key: 'A', modifiers: mod, context: 'navigation', description: 'Select all in column', category: 'Selection', action: 'cmdA' },
  { key: '↑', modifiers: mod, context: 'navigation', description: 'First item in column', category: 'Navigation', action: 'cmdArrowUp' },
  { key: '↓', modifiers: mod, context: 'navigation', description: 'Last item in column', category: 'Navigation', action: 'cmdArrowDown' },
  { key: '/', modifiers: mod, context: 'global', description: 'Show keyboard shortcuts', category: 'View', action: 'cmdSlash' },
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
