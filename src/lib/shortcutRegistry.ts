// Unified shortcut registry — single source of truth for all keyboard bindings

import type { KeyboardContext, ShortcutCategory } from '../types/keyboard'

export interface ShortcutBinding {
  id: string                          // unique ID, e.g., 'view.main', 'nav.up'
  keys: string                        // shortcut string, e.g., 'mod+1', 'arrowup'
  altKeys?: string                    // alternative binding
  layer: 'global' | 'contextual'
  contexts?: KeyboardContext[]         // which contexts this is active in (contextual layer only)
  blockedContexts?: KeyboardContext[]  // contexts where this is suppressed (global layer only)
  action: string                      // action identifier for execution
  label: string                       // display label for ShortcutSheet
  category: ShortcutCategory          // grouping for ShortcutSheet
  preventDefault?: boolean            // whether to call e.preventDefault() (default true)
  isChord?: boolean                   // true for multi-key sequences
  chordSecondKey?: string             // key to complete the chord (e.g., 'g')
}

// Contexts that block global shortcut fallthrough entirely
export const EXCLUSIVE_CONTEXTS: readonly KeyboardContext[] = ['sidebar', 'creation', 'command_menu']

// Default blocked contexts for most global shortcuts
const GLOBAL_BLOCKED: KeyboardContext[] = ['sidebar', 'creation', 'command_menu']

export const SHORTCUT_BINDINGS: ShortcutBinding[] = [
  // ─── Global Layer ────────────────────────────────────────────────────────────

  // View switching
  { id: 'view.main', keys: 'mod+1', layer: 'global', blockedContexts: GLOBAL_BLOCKED, action: 'mainView', label: 'Main view', category: 'View' },
  { id: 'view.upcoming', keys: 'mod+shift+l', layer: 'global', blockedContexts: GLOBAL_BLOCKED, action: 'upcomingView', label: 'Upcoming view', category: 'View' },
  { id: 'view.archive', keys: 'mod+shift+a', layer: 'global', blockedContexts: GLOBAL_BLOCKED, action: 'archiveView', label: 'View archived tasks', category: 'View' },

  // Directory view type switching (List / Calendar / Kanban)
  { id: 'view.list', keys: 'mod+shift+1', layer: 'global', blockedContexts: GLOBAL_BLOCKED, action: 'viewList', label: 'Switch to List view', category: 'View' },
  { id: 'view.calendar', keys: 'mod+shift+2', layer: 'global', blockedContexts: GLOBAL_BLOCKED, action: 'viewCalendar', label: 'Switch to Calendar view', category: 'View' },
  { id: 'view.kanban', keys: 'mod+shift+3', layer: 'global', blockedContexts: GLOBAL_BLOCKED, action: 'viewKanban', label: 'Switch to Kanban view', category: 'View' },

  // Command palette / search
  { id: 'command.palette', keys: 'mod+k', altKeys: 'ctrl+p', layer: 'global', blockedContexts: GLOBAL_BLOCKED, action: 'commandPalette', label: 'Quick actions (command palette)', category: 'View' },
  { id: 'search.open', keys: 'mod+shift+s', layer: 'global', blockedContexts: GLOBAL_BLOCKED, action: 'searchOpen', label: 'Open search overlay', category: 'View' },

  // View options
  { id: 'view.completedToggle', keys: 'mod+shift+h', layer: 'global', blockedContexts: GLOBAL_BLOCKED, action: 'completedToggle', label: 'Show/hide completed tasks', category: 'View' },
  { id: 'view.save', keys: 'mod+alt+s', layer: 'global', blockedContexts: GLOBAL_BLOCKED, action: 'saveView', label: 'Save current view (filters + color)', category: 'View' },
  { id: 'view.shortcutSheet', keys: 'mod+/', layer: 'global', blockedContexts: GLOBAL_BLOCKED, action: 'cmdSlash', label: 'Show keyboard shortcuts', category: 'View' },

  // Saved views Cmd+2 .. Cmd+9
  { id: 'view.savedView2', keys: 'mod+2', layer: 'global', blockedContexts: GLOBAL_BLOCKED, action: 'savedView2', label: 'Load saved view 1', category: 'View' },
  { id: 'view.savedView3', keys: 'mod+3', layer: 'global', blockedContexts: GLOBAL_BLOCKED, action: 'savedView3', label: 'Load saved view 2', category: 'View' },
  { id: 'view.savedView4', keys: 'mod+4', layer: 'global', blockedContexts: GLOBAL_BLOCKED, action: 'savedView4', label: 'Load saved view 3', category: 'View' },
  { id: 'view.savedView5', keys: 'mod+5', layer: 'global', blockedContexts: GLOBAL_BLOCKED, action: 'savedView5', label: 'Load saved view 4', category: 'View' },
  { id: 'view.savedView6', keys: 'mod+6', layer: 'global', blockedContexts: GLOBAL_BLOCKED, action: 'savedView6', label: 'Load saved view 5', category: 'View' },
  { id: 'view.savedView7', keys: 'mod+7', layer: 'global', blockedContexts: GLOBAL_BLOCKED, action: 'savedView7', label: 'Load saved view 6', category: 'View' },
  { id: 'view.savedView8', keys: 'mod+8', layer: 'global', blockedContexts: GLOBAL_BLOCKED, action: 'savedView8', label: 'Load saved view 7', category: 'View' },
  { id: 'view.savedView9', keys: 'mod+9', layer: 'global', blockedContexts: GLOBAL_BLOCKED, action: 'savedView9', label: 'Load saved view 8', category: 'View' },

  // Create
  { id: 'task.create', keys: 'mod+ctrl+n', layer: 'global', blockedContexts: GLOBAL_BLOCKED, action: 'newTask', label: 'Create (task or directory)', category: 'Actions' },
  { id: 'directory.create', keys: 'mod+ctrl+shift+n', layer: 'global', blockedContexts: GLOBAL_BLOCKED, action: 'newDirectory', label: 'Create directory', category: 'Actions' },

  // Settings
  { id: 'settings.open', keys: 'mod+,', layer: 'global', blockedContexts: GLOBAL_BLOCKED, action: 'settings', label: 'Open settings', category: 'View' },

  // Undo / redo (also blocked in editing context where editor handles it)
  { id: 'action.undo', keys: 'mod+z', layer: 'global', blockedContexts: [...GLOBAL_BLOCKED, 'editing'], action: 'undo', label: 'Undo', category: 'Actions' },
  { id: 'action.redo', keys: 'mod+shift+z', layer: 'global', blockedContexts: [...GLOBAL_BLOCKED, 'editing'], action: 'redo', label: 'Redo', category: 'Actions' },

  // Scroll
  { id: 'view.scrollLeft', keys: 'mod+shift+arrowleft', layer: 'global', blockedContexts: GLOBAL_BLOCKED, action: 'scrollLeft', label: 'Scroll column left', category: 'View' },
  { id: 'view.scrollRight', keys: 'mod+shift+arrowright', layer: 'global', blockedContexts: GLOBAL_BLOCKED, action: 'scrollRight', label: 'Scroll column right', category: 'View' },
  { id: 'view.scrollHome', keys: 'home', layer: 'global', blockedContexts: GLOBAL_BLOCKED, action: 'scrollHome', label: 'First column', category: 'Navigation' },
  { id: 'view.scrollEnd', keys: 'end', layer: 'global', blockedContexts: GLOBAL_BLOCKED, action: 'scrollEnd', label: 'Last column', category: 'Navigation' },

  // Color mode
  { id: 'color.none', keys: 'mod+alt+n', layer: 'global', blockedContexts: GLOBAL_BLOCKED, action: 'colorNone', label: 'Color: none', category: 'View' },
  { id: 'color.category', keys: 'mod+alt+c', layer: 'global', blockedContexts: GLOBAL_BLOCKED, action: 'colorCategory', label: 'Color: category', category: 'View' },
  { id: 'color.priority', keys: 'mod+alt+p', layer: 'global', blockedContexts: GLOBAL_BLOCKED, action: 'colorPriority', label: 'Color: priority', category: 'View' },

  // ─── Contextual Layer: Navigation ───────────────────────────────────────────

  // Arrow keys
  { id: 'nav.up', keys: 'arrowup', layer: 'contextual', contexts: ['navigation'], action: 'arrowUp', label: 'Move focus up', category: 'Navigation' },
  { id: 'nav.down', keys: 'arrowdown', layer: 'contextual', contexts: ['navigation'], action: 'arrowDown', label: 'Move focus down', category: 'Navigation' },
  { id: 'nav.left', keys: 'arrowleft', layer: 'contextual', contexts: ['navigation'], action: 'arrowLeft', label: 'Collapse column', category: 'Navigation' },
  { id: 'nav.right', keys: 'arrowright', layer: 'contextual', contexts: ['navigation'], action: 'arrowRight', label: 'Expand / open', category: 'Navigation' },
  { id: 'nav.enter', keys: 'enter', layer: 'contextual', contexts: ['navigation'], action: 'enter', label: 'Expand / open', category: 'Navigation' },
  { id: 'nav.escape', keys: 'escape', layer: 'contextual', contexts: ['navigation'], action: 'escape', label: 'Clear selection', category: 'Navigation' },
  { id: 'nav.space', keys: ' ', layer: 'contextual', contexts: ['navigation'], action: 'space', label: 'Toggle completion', category: 'Actions' },

  // Selection
  { id: 'select.up', keys: 'shift+arrowup', layer: 'contextual', contexts: ['navigation'], action: 'shiftArrowUp', label: 'Extend selection up', category: 'Selection' },
  { id: 'select.down', keys: 'shift+arrowdown', layer: 'contextual', contexts: ['navigation'], action: 'shiftArrowDown', label: 'Extend selection down', category: 'Selection' },
  { id: 'select.all', keys: 'mod+a', layer: 'contextual', contexts: ['navigation'], action: 'cmdA', label: 'Select all in column', category: 'Selection' },

  // Navigation jumps
  { id: 'nav.first', keys: 'mod+arrowup', layer: 'contextual', contexts: ['navigation'], action: 'cmdArrowUp', label: 'First item in column', category: 'Navigation' },
  { id: 'nav.last', keys: 'mod+arrowdown', layer: 'contextual', contexts: ['navigation'], action: 'cmdArrowDown', label: 'Last item in column', category: 'Navigation' },

  // Edit actions (navigation context)
  { id: 'edit.quick', keys: 'alt+e', layer: 'contextual', contexts: ['navigation'], action: 'optionE', label: 'Quick edit (inline rename)', category: 'Actions' },
  { id: 'edit.full', keys: 'mod+shift+e', layer: 'contextual', contexts: ['navigation'], action: 'cmdShiftE', label: 'Full edit (metadata panel)', category: 'Actions' },
  { id: 'task.delete', keys: 'mod+delete', layer: 'contextual', contexts: ['navigation'], action: 'cmdDelete', label: 'Delete selected', category: 'Actions' },

  // Clipboard (navigation context)
  { id: 'clipboard.copy', keys: 'mod+c', layer: 'contextual', contexts: ['navigation'], action: 'cmdC', label: 'Copy', category: 'Actions' },
  { id: 'clipboard.copyRecursive', keys: 'mod+shift+c', layer: 'contextual', contexts: ['navigation'], action: 'cmdShiftC', label: 'Copy recursive', category: 'Actions' },
  { id: 'clipboard.paste', keys: 'mod+v', layer: 'contextual', contexts: ['navigation'], action: 'cmdV', label: 'Paste', category: 'Actions' },
  { id: 'clipboard.pasteWithMetadata', keys: 'mod+shift+v', layer: 'contextual', contexts: ['navigation'], action: 'cmdShiftV', label: 'Paste with metadata', category: 'Actions' },
  { id: 'clipboard.cut', keys: 'mod+x', layer: 'contextual', contexts: ['navigation'], action: 'cmdX', label: 'Cut', category: 'Actions' },

  // Backslash command menu trigger
  { id: 'menu.backslash', keys: '\\', layer: 'contextual', contexts: ['navigation'], action: 'backslashMenu', label: 'Open command menu', category: 'Actions' },

  // ─── Contextual Layer: Creation ──────────────────────────────────────────────

  { id: 'creation.task', keys: 't', layer: 'contextual', contexts: ['creation'], action: 'creationTypeTask', label: 'Create task', category: 'Actions' },
  { id: 'creation.directory', keys: 'd', layer: 'contextual', contexts: ['creation'], action: 'creationTypeDirectory', label: 'Create directory', category: 'Actions' },
  { id: 'creation.cancel', keys: 'escape', layer: 'contextual', contexts: ['creation'], action: 'creationEscape', label: 'Cancel creation', category: 'Navigation' },

  // ─── Contextual Layer: Editing ───────────────────────────────────────────────

  { id: 'edit.close', keys: 'escape', layer: 'contextual', contexts: ['editing'], action: 'exitEditing', label: 'Close task panel', category: 'Navigation' },
  { id: 'edit.attachment', keys: 'mod+shift+f', layer: 'contextual', contexts: ['editing'], action: 'cmdShiftF', label: 'Add attachment', category: 'Actions' },
  { id: 'edit.openAttachments', keys: 'mod+shift+o', layer: 'contextual', contexts: ['editing'], action: 'cmdShiftO', label: 'Open all attachments', category: 'Actions' },

  // ─── Contextual Layer: Search ────────────────────────────────────────────────

  { id: 'search.close', keys: 'escape', layer: 'contextual', contexts: ['search'], action: 'searchClose', label: 'Close search', category: 'Navigation' },

  // ─── Contextual Layer: Settings ──────────────────────────────────────────────

  { id: 'settings.save', keys: 'enter', layer: 'contextual', contexts: ['settings'], action: 'settingsSave', label: 'Save settings', category: 'Actions' },
  { id: 'settings.close', keys: 'escape', layer: 'contextual', contexts: ['settings'], action: 'settingsClose', label: 'Close settings', category: 'Navigation' },

  // ─── Contextual Layer: Sidebar ───────────────────────────────────────────────

  { id: 'sidebar.up', keys: 'arrowup', layer: 'contextual', contexts: ['sidebar'], action: 'sidebarArrowUp', label: 'Move up', category: 'Navigation' },
  { id: 'sidebar.down', keys: 'arrowdown', layer: 'contextual', contexts: ['sidebar'], action: 'sidebarArrowDown', label: 'Move down', category: 'Navigation' },
  { id: 'sidebar.left', keys: 'arrowleft', layer: 'contextual', contexts: ['sidebar'], action: 'sidebarArrowLeft', label: 'Collapse', category: 'Navigation' },
  { id: 'sidebar.right', keys: 'arrowright', layer: 'contextual', contexts: ['sidebar'], action: 'sidebarArrowRight', label: 'Expand', category: 'Navigation' },
  { id: 'sidebar.enter', keys: 'enter', layer: 'contextual', contexts: ['sidebar'], action: 'sidebarEnter', label: 'Navigate', category: 'Navigation' },
  { id: 'sidebar.escape', keys: 'escape', layer: 'contextual', contexts: ['sidebar'], action: 'sidebarEscape', label: 'Return to main', category: 'Navigation' },

  // ─── Contextual Layer: Confirmation ──────────────────────────────────────────

  { id: 'confirm.yes', keys: 'enter', layer: 'contextual', contexts: ['confirmation'], action: 'confirm.yes', label: 'Confirm', category: 'Actions' },
  { id: 'confirm.cancel', keys: 'escape', layer: 'contextual', contexts: ['confirmation'], action: 'confirm.cancel', label: 'Cancel', category: 'Navigation' },

  // ─── Contextual Layer: Grab Mode (new) ───────────────────────────────────────

  { id: 'grab.activate', keys: 'ctrl+ ', layer: 'contextual', contexts: ['navigation'], action: 'grab.activate', label: 'Enter grab mode', category: 'Actions', isChord: true, chordSecondKey: 'g' },
  { id: 'grab.up', keys: 'arrowup', layer: 'contextual', contexts: ['grab'], action: 'grab.up', label: 'Move item up', category: 'Actions' },
  { id: 'grab.down', keys: 'arrowdown', layer: 'contextual', contexts: ['grab'], action: 'grab.down', label: 'Move item down', category: 'Actions' },
  { id: 'grab.left', keys: 'arrowleft', layer: 'contextual', contexts: ['grab'], action: 'grab.left', label: 'Move to parent', category: 'Actions' },
  { id: 'grab.right', keys: 'arrowright', layer: 'contextual', contexts: ['grab'], action: 'grab.right', label: 'Move into directory', category: 'Actions' },
  { id: 'grab.commit', keys: 'enter', layer: 'contextual', contexts: ['grab'], action: 'grab.commit', label: 'Drop (commit move)', category: 'Actions' },
  { id: 'grab.cancel', keys: 'escape', layer: 'contextual', contexts: ['grab'], action: 'grab.cancel', label: 'Cancel grab', category: 'Navigation' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CATEGORY_ORDER: ShortcutCategory[] = ['Navigation', 'Selection', 'Actions', 'View', 'Other']

export function getBindingsByCategory(): Map<ShortcutCategory, ShortcutBinding[]> {
  const map = new Map<ShortcutCategory, ShortcutBinding[]>()
  for (const cat of CATEGORY_ORDER) {
    map.set(cat, [])
  }
  for (const b of SHORTCUT_BINDINGS) {
    const list = map.get(b.category) ?? []
    list.push(b)
    map.set(b.category, list)
  }
  return map
}

export function getBindingById(id: string): ShortcutBinding | undefined {
  return SHORTCUT_BINDINGS.find(b => b.id === id)
}

export function getBindingByAction(action: string): ShortcutBinding | undefined {
  return SHORTCUT_BINDINGS.find(b => b.action === action)
}

// Actions that existed in the original SHORTCUT_DEFINITIONS and are remappable
export const REMAPPABLE_ACTIONS = new Set([
  'mainView', 'upcomingView', 'archiveView', 'viewList', 'viewCalendar', 'viewKanban',
  'commandPalette', 'searchOpen',
  'completedToggle', 'saveView', 'newTask', 'newDirectory', 'settings',
  'undo', 'redo', 'optionE', 'cmdShiftE', 'cmdDelete', 'cmdC', 'cmdShiftC',
  'cmdV', 'cmdShiftV', 'cmdX', 'scrollLeft', 'scrollRight', 'scrollHome',
  'scrollEnd', 'colorNone', 'colorCategory', 'colorPriority', 'arrowUp',
  'arrowDown', 'arrowLeft', 'arrowRight', 'enter', 'escape', 'space',
  'shiftArrowUp', 'shiftArrowDown', 'cmdA', 'cmdArrowUp', 'cmdArrowDown',
  'cmdSlash', 'cmdShiftF', 'cmdShiftO', 'savedView2', 'savedView3',
  'savedView4', 'savedView5', 'savedView6', 'savedView7', 'savedView8',
  'savedView9',
])
