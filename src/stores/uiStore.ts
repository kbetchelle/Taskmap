import { create } from 'zustand'
import { getMobileMode } from '../lib/mobileDetection'
import type { Breakpoint } from '../lib/theme'
import {
  SIDEBAR_WIDTH_DEFAULT,
  SIDEBAR_WIDTH_MIN,
  SIDEBAR_WIDTH_MAX,
} from '../lib/theme'

const LAYOUT_PREFS_KEY = 'taskmap-layout-prefs'

function getLayoutPrefs(): { sidebarOpen: boolean; sidebarWidth: number } {
  if (typeof window === 'undefined') {
    return { sidebarOpen: true, sidebarWidth: SIDEBAR_WIDTH_DEFAULT }
  }
  try {
    const raw = localStorage.getItem(LAYOUT_PREFS_KEY)
    if (!raw) return { sidebarOpen: true, sidebarWidth: SIDEBAR_WIDTH_DEFAULT }
    const parsed = JSON.parse(raw) as { sidebarOpen?: boolean; sidebarWidth?: number }
    const sidebarOpen = typeof parsed.sidebarOpen === 'boolean' ? parsed.sidebarOpen : true
    const sidebarWidth =
      typeof parsed.sidebarWidth === 'number' &&
      parsed.sidebarWidth >= SIDEBAR_WIDTH_MIN &&
      parsed.sidebarWidth <= SIDEBAR_WIDTH_MAX
        ? parsed.sidebarWidth
        : SIDEBAR_WIDTH_DEFAULT
    return { sidebarOpen, sidebarWidth }
  } catch {
    return { sidebarOpen: true, sidebarWidth: SIDEBAR_WIDTH_DEFAULT }
  }
}

function persistLayoutPrefs(sidebarOpen: boolean, sidebarWidth: number) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LAYOUT_PREFS_KEY, JSON.stringify({ sidebarOpen, sidebarWidth }))
  } catch {
    // ignore
  }
}

export type CreationMode = 'type-select' | 'directory-naming' | 'task-panel' | null

export interface CreationState {
  mode: CreationMode
  itemId: string | null
  columnIndex: number
  itemIndex: number
}

export interface InlineEditState {
  itemId: string
  type: 'task' | 'directory'
  initialValue: string
}

// UI state; currentView/navigationPath also live in appStore for full AppState
interface UIState {
  mobileMode: boolean
  breakpoint: Breakpoint
  sidebarOpen: boolean
  sidebarWidth: number
  currentDirectoryId: string | null
  defaultView: 'main_db' | 'upcoming'
  creationState: CreationState | null
  creationTimeoutId: ReturnType<typeof setTimeout> | null
  inlineEditState: InlineEditState | null
  editPanelState: { itemId: string; type: 'task' | 'directory' } | null
  draggingItemId: string | null
  completionTimeouts: Record<string, ReturnType<typeof setTimeout>>
  mobileMenuOpen: boolean
  setMobileMode: (mode: boolean) => void
  setBreakpoint: (b: Breakpoint) => void
  setSidebarOpen: (open: boolean) => void
  setSidebarWidth: (w: number) => void
  toggleSidebar: () => void
  setMobileMenuOpen: (open: boolean) => void
  setCurrentDirectoryId: (id: string | null) => void
  setDefaultView: (view: 'main_db' | 'upcoming') => void
  setCreationState: (state: CreationState | null) => void
  setCreationTimeoutId: (id: ReturnType<typeof setTimeout> | null) => void
  setInlineEditState: (state: InlineEditState | null) => void
  setEditPanelState: (state: { itemId: string; type: 'task' | 'directory' } | null) => void
  setDraggingItemId: (id: string | null) => void
  setCompletionTimeout: (taskId: string, timeoutId: ReturnType<typeof setTimeout>) => void
  clearCompletionTimeout: (taskId: string) => void
  cancelCreation: () => void
}

const layoutPrefs =
  typeof window !== 'undefined' ? getLayoutPrefs() : { sidebarOpen: true, sidebarWidth: SIDEBAR_WIDTH_DEFAULT }

export const useUIStore = create<UIState>((set, get) => ({
  mobileMode: typeof window !== 'undefined' ? getMobileMode() : false,
  breakpoint: 'desktop',
  sidebarOpen: layoutPrefs.sidebarOpen,
  sidebarWidth: layoutPrefs.sidebarWidth,
  mobileMenuOpen: false,
  currentDirectoryId: null,
  defaultView: 'main_db',
  creationState: null,
  creationTimeoutId: null,
  inlineEditState: null,
  editPanelState: null,
  draggingItemId: null,
  completionTimeouts: {},
  setMobileMode: (mode) => set({ mobileMode: mode }),
  setBreakpoint: (b) => set({ breakpoint: b }),
  setSidebarOpen: (open) => {
    set({ sidebarOpen: open })
    persistLayoutPrefs(open, get().sidebarWidth)
  },
  setSidebarWidth: (w) => {
    const clamped = Math.min(SIDEBAR_WIDTH_MAX, Math.max(SIDEBAR_WIDTH_MIN, w))
    set({ sidebarWidth: clamped })
    persistLayoutPrefs(get().sidebarOpen, clamped)
  },
  toggleSidebar: () => {
    const next = !get().sidebarOpen
    set({ sidebarOpen: next })
    persistLayoutPrefs(next, get().sidebarWidth)
  },
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
  setCurrentDirectoryId: (id) => set({ currentDirectoryId: id }),
  setDefaultView: (view) => set({ defaultView: view }),
  setCreationState: (state) => set({ creationState: state }),
  setCreationTimeoutId: (id) => set({ creationTimeoutId: id }),
  setInlineEditState: (state) => set({ inlineEditState: state }),
  setEditPanelState: (state) => set({ editPanelState: state }),
  setDraggingItemId: (id) => set({ draggingItemId: id }),
  setCompletionTimeout: (taskId, timeoutId) =>
    set((s) => ({
      completionTimeouts: { ...s.completionTimeouts, [taskId]: timeoutId },
    })),
  clearCompletionTimeout: (taskId) =>
    set((s) => {
      const next = { ...s.completionTimeouts }
      const id = next[taskId]
      if (id != null) clearTimeout(id)
      delete next[taskId]
      return { completionTimeouts: next }
    }),
  cancelCreation: () => {
    const { creationTimeoutId } = get()
    if (creationTimeoutId != null) clearTimeout(creationTimeoutId)
    set({
      creationState: null,
      creationTimeoutId: null,
    })
  },
}))
