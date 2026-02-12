import type { LucideIcon } from 'lucide-react'
import {
  Pencil,
  CheckSquare,
  Copy,
  Link,
  FolderInput,
  Palette,
  CalendarDays,
  Trash2,
  Plus,
  FolderPlus,
  CheckCheck,
  FolderOutput,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────

export interface CommandContext {
  focusedItemId: string | null
  focusedItemType: 'task' | 'directory' | null
  selectedItems: string[]
  selectedItemTypes: ('task' | 'directory' | null)[]
  currentDirectoryId: string | null
}

export type CommandScope = 'single' | 'multi' | 'empty'

export interface CommandDescriptor {
  id: string
  label: string
  icon: LucideIcon
  shortcutHint?: string
  category: string
  scopes: CommandScope[]
  /** Return true if this command should be shown given the current context */
  isApplicable: (ctx: CommandContext) => boolean
}

// ── Helpers ──────────────────────────────────────────────────────────────

function hasTask(ctx: CommandContext): boolean {
  if (ctx.selectedItems.length > 1) {
    return ctx.selectedItemTypes.includes('task')
  }
  return ctx.focusedItemType === 'task'
}

function hasFocusedItem(ctx: CommandContext): boolean {
  return ctx.focusedItemId !== null
}

// ── Single-item commands ─────────────────────────────────────────────────

const singleItemCommands: CommandDescriptor[] = [
  {
    id: 'edit',
    label: 'Edit',
    icon: Pencil,
    shortcutHint: 'E',
    category: 'Actions',
    scopes: ['single'],
    isApplicable: hasFocusedItem,
  },
  {
    id: 'complete',
    label: 'Complete',
    icon: CheckSquare,
    shortcutHint: 'Space',
    category: 'Actions',
    scopes: ['single'],
    isApplicable: (ctx) => hasFocusedItem(ctx) && hasTask(ctx),
  },
  {
    id: 'duplicate',
    label: 'Duplicate',
    icon: Copy,
    shortcutHint: 'Cmd+D',
    category: 'Actions',
    scopes: ['single'],
    isApplicable: hasFocusedItem,
  },
  {
    id: 'link-to',
    label: 'Link to...',
    icon: Link,
    shortcutHint: 'L',
    category: 'Actions',
    scopes: ['single'],
    isApplicable: hasFocusedItem,
  },
  {
    id: 'move-to',
    label: 'Move to...',
    icon: FolderInput,
    shortcutHint: 'M',
    category: 'Actions',
    scopes: ['single'],
    isApplicable: hasFocusedItem,
  },
  {
    id: 'set-priority',
    label: 'Set Priority',
    icon: Palette,
    shortcutHint: 'P',
    category: 'Actions',
    scopes: ['single'],
    isApplicable: (ctx) => hasFocusedItem(ctx) && hasTask(ctx),
  },
  {
    id: 'set-due-date',
    label: 'Set Due Date',
    icon: CalendarDays,
    shortcutHint: 'D',
    category: 'Actions',
    scopes: ['single'],
    isApplicable: (ctx) => hasFocusedItem(ctx) && hasTask(ctx),
  },
  {
    id: 'delete',
    label: 'Delete',
    icon: Trash2,
    shortcutHint: 'Del',
    category: 'Actions',
    scopes: ['single'],
    isApplicable: hasFocusedItem,
  },
]

// ── Multi-item commands ─────────────────────────────────────────────────

const multiItemCommands: CommandDescriptor[] = [
  {
    id: 'complete-all',
    label: 'Complete All',
    icon: CheckCheck,
    category: 'Bulk Actions',
    scopes: ['multi'],
    isApplicable: (ctx) => ctx.selectedItems.length > 1 && hasTask(ctx),
  },
  {
    id: 'move-all',
    label: 'Move All to...',
    icon: FolderOutput,
    category: 'Bulk Actions',
    scopes: ['multi'],
    isApplicable: (ctx) => ctx.selectedItems.length > 1,
  },
  {
    id: 'set-priority-all',
    label: 'Set Priority (All)',
    icon: Palette,
    category: 'Bulk Actions',
    scopes: ['multi'],
    isApplicable: (ctx) => ctx.selectedItems.length > 1 && hasTask(ctx),
  },
  {
    id: 'delete-all',
    label: 'Delete All',
    icon: Trash2,
    shortcutHint: 'Del',
    category: 'Bulk Actions',
    scopes: ['multi'],
    isApplicable: (ctx) => ctx.selectedItems.length > 1,
  },
]

// ── Creation commands (always available) ────────────────────────────────

const creationCommands: CommandDescriptor[] = [
  {
    id: 'new-task',
    label: 'New Task',
    icon: Plus,
    shortcutHint: 'T',
    category: 'Creation',
    scopes: ['single', 'multi', 'empty'],
    isApplicable: () => true,
  },
  {
    id: 'new-directory',
    label: 'New Directory',
    icon: FolderPlus,
    shortcutHint: 'Shift+D',
    category: 'Creation',
    scopes: ['single', 'multi', 'empty'],
    isApplicable: () => true,
  },
]

// ── Public API ───────────────────────────────────────────────────────────

/** All registered command descriptors */
export const allCommands: CommandDescriptor[] = [
  ...singleItemCommands,
  ...multiItemCommands,
  ...creationCommands,
]

/**
 * Return the commands applicable to the given context.
 * Filters by scope (single vs multi vs empty) and by the isApplicable predicate.
 */
export function getApplicableCommands(ctx: CommandContext): CommandDescriptor[] {
  const scope: CommandScope =
    ctx.selectedItems.length > 1
      ? 'multi'
      : ctx.focusedItemId
        ? 'single'
        : 'empty'

  return allCommands.filter(
    (cmd) => cmd.scopes.includes(scope) && cmd.isApplicable(ctx),
  )
}

// ── Backward-compatible types for ContentEditor's slash menu ─────────────

/** Legacy Command interface used by the ContentEditor backslash menu */
export interface Command {
  id: string
  label: string
  icon: LucideIcon
  shortcut?: string
  category: string
  action: () => void
  context: 'single' | 'multi' | 'any'
}

/**
 * Legacy helper: returns Command objects with no-op actions.
 * Used by the ContentEditor's inline backslash menu (src/hooks/useBackslashMenu.ts).
 */
export function getCommands(): Command[] {
  return allCommands.map((desc) => ({
    id: desc.id,
    label: desc.label,
    icon: desc.icon,
    shortcut: desc.shortcutHint,
    category: desc.category,
    action: () => {
      /* no-op — actions are wired at consumption site */
    },
    context: desc.scopes.length >= 3 ? 'any' : desc.scopes.includes('multi') ? 'multi' : desc.scopes.includes('single') ? 'single' : 'any',
  }))
}

// ── Fuzzy subsequence match ──────────────────────────────────────────────

/**
 * Simple case-insensitive character-subsequence matcher.
 * Returns true if every character in `query` appears in `text` in order.
 * e.g. fuzzyMatch('dl', 'Delete') => true, fuzzyMatch('mv', 'Move to...') => true
 */
export function fuzzyMatch(query: string, text: string): boolean {
  const q = query.toLowerCase()
  const t = text.toLowerCase()
  let qi = 0
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++
  }
  return qi === q.length
}
