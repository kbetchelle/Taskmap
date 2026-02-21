import { create } from 'zustand'
import type { SidebarFilterMode } from '../types/sidebar'
import {
  loadExpandedSidebarNodes,
  saveExpandedSidebarNodes,
} from '../lib/treeUtils'

interface SidebarState {
  expandedSidebarNodes: Set<string>
  sidebarFilter: SidebarFilterMode
  focusedSidebarNodeId: string | null

  setExpanded: (id: string, expanded: boolean) => void
  toggleExpanded: (id: string) => void
  setSidebarFilter: (mode: SidebarFilterMode) => void
  setFocusedSidebarNodeId: (id: string | null) => void
  /** Call when directories are loaded to ensure root dirs are expanded if no saved state. */
  ensureRootExpanded: (rootDirectoryIds: string[]) => void
}

export const useSidebarStore = create<SidebarState>((set, get) => ({
  expandedSidebarNodes: loadExpandedSidebarNodes(),
  sidebarFilter: 'all',
  focusedSidebarNodeId: null,

  setExpanded: (id, expanded) =>
    set((s) => {
      const next = new Set(s.expandedSidebarNodes)
      if (expanded) next.add(id)
      else next.delete(id)
      saveExpandedSidebarNodes(next)
      return { expandedSidebarNodes: next }
    }),

  toggleExpanded: (id) => {
    const { expandedSidebarNodes } = get()
    get().setExpanded(id, !expandedSidebarNodes.has(id))
  },

  setSidebarFilter: (mode) => set({ sidebarFilter: mode }),
  setFocusedSidebarNodeId: (id) => set({ focusedSidebarNodeId: id }),

  ensureRootExpanded: (rootDirectoryIds) => {
    const { expandedSidebarNodes } = get()
    if (expandedSidebarNodes.size > 0) return
    const next = new Set(rootDirectoryIds)
    saveExpandedSidebarNodes(next)
    set({ expandedSidebarNodes: next })
  },
}))
