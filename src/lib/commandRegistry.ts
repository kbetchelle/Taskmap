import type { LucideIcon } from 'lucide-react'
import {
  CheckSquare,
  Folder,
  FileText,
  Trash2,
  Copy,
  FolderInput,
  Link,
  Circle,
  LayoutGrid,
} from 'lucide-react'

export type CommandContext = 'single' | 'multi' | 'any'

export interface Command {
  id: string
  label: string
  icon: LucideIcon
  shortcut?: string
  category: string
  action: () => void
  context: CommandContext
}

/**
 * Centralized command registry used by the backslash menu and (future) Cmd+K palette.
 * Actions are placeholder no-ops for now — later phases wire up real behavior.
 */
export function getCommands(): Command[] {
  return [
    {
      id: 'new-task',
      label: 'New Task',
      icon: CheckSquare,
      category: 'Creation',
      action: () => console.log('Command executed:', 'New Task'),
      context: 'any',
    },
    {
      id: 'new-directory',
      label: 'New Directory',
      icon: Folder,
      category: 'Creation',
      action: () => console.log('Command executed:', 'New Directory'),
      context: 'any',
    },
    {
      id: 'new-file',
      label: 'New File',
      icon: FileText,
      category: 'Creation',
      action: () => console.log('Command executed:', 'New File'),
      context: 'any',
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: Trash2,
      shortcut: 'Del',
      category: 'Actions',
      action: () => console.log('Command executed:', 'Delete'),
      context: 'single',
    },
    {
      id: 'duplicate',
      label: 'Duplicate',
      icon: Copy,
      category: 'Actions',
      action: () => console.log('Command executed:', 'Duplicate'),
      context: 'single',
    },
    {
      id: 'move-to',
      label: 'Move To…',
      icon: FolderInput,
      category: 'Actions',
      action: () => console.log('Command executed:', 'Move To…'),
      context: 'single',
    },
    {
      id: 'link-reference',
      label: 'Link Reference',
      icon: Link,
      category: 'Actions',
      action: () => console.log('Command executed:', 'Link Reference'),
      context: 'single',
    },
    {
      id: 'change-status',
      label: 'Change Status…',
      icon: Circle,
      category: 'Actions',
      action: () => console.log('Command executed:', 'Change Status…'),
      context: 'single',
    },
    {
      id: 'switch-view',
      label: 'Switch View',
      icon: LayoutGrid,
      category: 'View',
      action: () => console.log('Command executed:', 'Switch View'),
      context: 'any',
    },
  ]
}
