import { create } from 'zustand'
import type {
  CurrentView,
  ColorMode,
  ClipboardItem,
  FilterState,
  ActionHistoryItem,
  SavedView,
} from '../types/state'
import type { KeyboardContext, FocusHistoryItem } from '../types/keyboard'
import { DEFAULT_FILTER_STATE } from '../types/state'

interface AppStoreState {
  currentView: CurrentView
  previousView: CurrentView | null
  colorMode: ColorMode
  selectedItems: string[]
  clipboardItems: ClipboardItem[]
  cutItemIds: string[]
  activeFilters: FilterState
  navigationPath: string[]
  expandedTaskId: string | null
  undoStack: ActionHistoryItem[]
  undoCurrentIndex: number
  focusedItemId: string | null
  focusedColumnIndex: number
  focusHistory: FocusHistoryItem[]
  selectionAnchorIndex: number | null
  keyboardContextStack: KeyboardContext[]
  shortcutSheetOpen: boolean
  commandPaletteOpen: boolean
  searchBarOpen: boolean
  searchResultTaskIds: string[] | null
  savedViews: Record<string, SavedView>
  onboardingOpen: boolean
  helpOpen: boolean
  commandPaletteCommands: Array<{ id: string; label: string; category: string; action: () => void; shortcut?: string }>

  setCurrentView: (view: CurrentView) => void
  setCommandPaletteCommands: (commands: Array<{ id: string; label: string; category: string; action: () => void; shortcut?: string }>) => void
  setPreviousView: (view: CurrentView | null) => void
  setOnboardingOpen: (open: boolean) => void
  setHelpOpen: (open: boolean) => void
  setShortcutSheetOpen: (open: boolean) => void
  setCommandPaletteOpen: (open: boolean) => void
  setSearchBarOpen: (open: boolean) => void
  setSearchResultTaskIds: (ids: string[] | null) => void
  clearSearchResults: () => void
  setSavedViews: (views: Record<string, SavedView>) => void
  addSavedView: (view: SavedView) => void
  removeSavedView: (id: string) => void
  setFocusedItem: (id: string | null) => void
  setFocusedColumnIndex: (index: number) => void
  addToFocusHistory: (columnIndex: number, itemId: string) => void
  popFocusHistory: () => FocusHistoryItem | undefined
  setSelectionAnchorIndex: (index: number | null) => void
  pushKeyboardContext: (context: KeyboardContext) => void
  popKeyboardContext: () => void
  getCurrentKeyboardContext: () => KeyboardContext
  setColorMode: (mode: ColorMode) => void
  setSelectedItems: (ids: string[]) => void
  toggleSelectedItem: (id: string) => void
  clearSelection: () => void
  setClipboardItems: (items: ClipboardItem[]) => void
  setCutItemIds: (ids: string[]) => void
  addClipboardItem: (item: ClipboardItem) => void
  clearClipboard: () => void
  setActiveFilters: (filters: Partial<FilterState>) => void
  resetFilters: () => void
  setNavigationPath: (path: string[]) => void
  pushNavigation: (directoryId: string) => void
  popNavigation: () => void
  setExpandedTaskId: (id: string | null) => void
  pushUndo: (item: ActionHistoryItem) => void
  popUndo: () => ActionHistoryItem | null
  redo: () => ActionHistoryItem | null
  clearUndoStack: () => void
  setUndoStack: (items: ActionHistoryItem[]) => void
  setUndoCurrentIndex: (index: number) => void
  prependUndoHistory: (items: ActionHistoryItem[]) => void
}

export const useAppStore = create<AppStoreState>((set, get) => ({
  currentView: 'main_db',
  previousView: null,
  colorMode: 'none',
  selectedItems: [],
  clipboardItems: [],
  cutItemIds: [],
  activeFilters: DEFAULT_FILTER_STATE,
  navigationPath: [],
  expandedTaskId: null,
  undoStack: [],
  undoCurrentIndex: -1,
  focusedItemId: null,
  focusedColumnIndex: 0,
  focusHistory: [],
  selectionAnchorIndex: null,
  keyboardContextStack: ['navigation'],
  shortcutSheetOpen: false,
  commandPaletteOpen: false,
  searchBarOpen: false,
  searchResultTaskIds: null,
  savedViews: {},
  onboardingOpen: false,
  helpOpen: false,
  commandPaletteCommands: [],

  setCurrentView: (view) => set({ currentView: view }),
  setCommandPaletteCommands: (commands) => set({ commandPaletteCommands: commands }),
  setPreviousView: (view) => set({ previousView: view }),
  setOnboardingOpen: (open) => set({ onboardingOpen: open }),
  setHelpOpen: (open) => set({ helpOpen: open }),
  setShortcutSheetOpen: (open) => set({ shortcutSheetOpen: open }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setSearchBarOpen: (open) => set({ searchBarOpen: open }),
  setSearchResultTaskIds: (ids) => set({ searchResultTaskIds: ids }),
  clearSearchResults: () => set({ searchResultTaskIds: null }),
  setSavedViews: (views) => set({ savedViews: views }),
  addSavedView: (view) =>
    set((s) => ({ savedViews: { ...s.savedViews, [view.id]: view } })),
  removeSavedView: (id) =>
    set((s) => {
      const next = { ...s.savedViews }
      delete next[id]
      return { savedViews: next }
    }),
  setFocusedItem: (id) => set({ focusedItemId: id }),
  setFocusedColumnIndex: (index) => set({ focusedColumnIndex: index }),
  addToFocusHistory: (columnIndex, itemId) =>
    set((s) => ({
      focusHistory: [...s.focusHistory, { columnIndex, itemId }],
    })),
  popFocusHistory: () => {
    const stack = get().focusHistory
    if (stack.length === 0) return undefined
    const item = stack[stack.length - 1]
    set({ focusHistory: stack.slice(0, -1) })
    return item
  },
  setSelectionAnchorIndex: (index) => set({ selectionAnchorIndex: index }),
  pushKeyboardContext: (context) =>
    set((s) => ({ keyboardContextStack: [...s.keyboardContextStack, context] })),
  popKeyboardContext: () =>
    set((s) => ({
      keyboardContextStack:
        s.keyboardContextStack.length > 1 ? s.keyboardContextStack.slice(0, -1) : ['navigation'],
    })),
  getCurrentKeyboardContext: () => get().keyboardContextStack[get().keyboardContextStack.length - 1] ?? 'navigation',
  setColorMode: (mode) => set({ colorMode: mode }),
  setSelectedItems: (ids) => set({ selectedItems: ids }),
  toggleSelectedItem: (id) =>
    set((s) => ({
      selectedItems: s.selectedItems.includes(id)
        ? s.selectedItems.filter((x) => x !== id)
        : [...s.selectedItems, id],
    })),
  clearSelection: () => set({ selectedItems: [], selectionAnchorIndex: null }),
  setClipboardItems: (items) => set({ clipboardItems: items }),
  setCutItemIds: (ids) => set({ cutItemIds: ids }),
  addClipboardItem: (item) =>
    set((s) => ({ clipboardItems: [...s.clipboardItems, item] })),
  clearClipboard: () => set({ clipboardItems: [] }),
  setActiveFilters: (filters) =>
    set((s) => ({ activeFilters: { ...s.activeFilters, ...filters } })),
  resetFilters: () =>
    set({ activeFilters: DEFAULT_FILTER_STATE, searchResultTaskIds: null }),
  setNavigationPath: (path) => set({ navigationPath: path }),
  pushNavigation: (id) =>
    set((s) => ({ navigationPath: [...s.navigationPath, id] })),
  popNavigation: () =>
    set((s) => ({
      navigationPath: s.navigationPath.length > 1 ? s.navigationPath.slice(0, -1) : [],
    })),
  setExpandedTaskId: (id) => set({ expandedTaskId: id }),
  pushUndo: (item) =>
    set((s) => {
      const maxItems = 100
      const truncated = s.undoStack.slice(0, s.undoCurrentIndex + 1)
      const next = [...truncated, item]
      const over = next.length - maxItems
      const stack = over > 0 ? next.slice(over) : next
      const index = over > 0 ? s.undoCurrentIndex - over + 1 : next.length - 1
      return { undoStack: stack, undoCurrentIndex: Math.min(index, stack.length - 1) }
    }),
  popUndo: () => {
    const { undoStack, undoCurrentIndex } = get()
    if (undoCurrentIndex < 0 || undoStack.length === 0) return null
    const item = undoStack[undoCurrentIndex]
    set({ undoCurrentIndex: undoCurrentIndex - 1 })
    return item
  },
  redo: () => {
    const { undoStack, undoCurrentIndex } = get()
    if (undoCurrentIndex >= undoStack.length - 1) return null
    const item = undoStack[undoCurrentIndex + 1]
    set({ undoCurrentIndex: undoCurrentIndex + 1 })
    return item
  },
  clearUndoStack: () => set({ undoStack: [], undoCurrentIndex: -1 }),
  setUndoStack: (items) => set({ undoStack: items }),
  setUndoCurrentIndex: (index) => set({ undoCurrentIndex: index }),
  prependUndoHistory: (items) =>
    set((s) => {
      if (items.length === 0) return s
      const stack = [...items, ...s.undoStack]
      const index =
        s.undoCurrentIndex < 0 ? items.length - 1 : s.undoCurrentIndex + items.length
      return { undoStack: stack, undoCurrentIndex: index }
    }),
}))
