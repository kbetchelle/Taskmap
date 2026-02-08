import { create } from 'zustand'
import { getMobileMode } from '../lib/mobileDetection'

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

export const useUIStore = create<UIState>((set, get) => ({
  mobileMode: typeof window !== 'undefined' ? getMobileMode() : false,
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
