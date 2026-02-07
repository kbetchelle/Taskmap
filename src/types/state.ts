// App state structure and related types

import type { Task, Directory, UserSettings } from './database'
import type { TaskPriority } from './database'

export type CurrentView = 'main_db' | 'upcoming' | 'settings'
export type ColorMode = 'none' | 'category' | 'priority'

export interface ClipboardItem {
  type: 'task' | 'directory'
  data: Task | Directory
  children?: ClipboardItem[]
  timestamp: number
}

export interface FilterState {
  searchQuery: string
  tags: string[]
  priorities: TaskPriority[]
  categories: string[]
  dateRange: { start: Date | null; end: Date | null } | null
  showCompleted: boolean
}

export interface SavedView {
  id: string
  name: string
  filters: FilterState
  colorMode: ColorMode
  shortcut: string
  createdAt: number
}

export interface ActionHistoryItem {
  id: string
  actionType: 'create' | 'update' | 'delete' | 'move' | 'complete'
  entityType: 'task' | 'directory'
  entityData: Record<string, unknown> | null
  createdAt: number
  /** Timestamp (ms) after which undo/redo is no longer allowed (createdAt + 2h). */
  expiresAt: number
}

/** Shape of global app state (satisfied by appStore + settingsStore + auth/directory/task stores) */
export interface AppState {
  currentView: CurrentView
  colorMode: ColorMode
  selectedItems: string[]
  clipboardItems: ClipboardItem[]
  activeFilters: FilterState
  navigationPath: string[]
  expandedTaskId: string | null
  undoStack: ActionHistoryItem[]
  settings: UserSettings | null
}

export const DEFAULT_FILTER_STATE: FilterState = {
  searchQuery: '',
  tags: [],
  priorities: [],
  categories: [],
  dateRange: null,
  showCompleted: false,
}
