import { type ReactNode, createContext, useContext, useMemo, useState } from 'react'
import { useUIStore } from '../stores/uiStore'

export type ViewMode = 'main_db' | 'upcoming'

interface ViewContextValue {
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  searchQuery: string | null
  setSearchQuery: (query: string | null) => void
}

const ViewContext = createContext<ViewContextValue | null>(null)

export function ViewContextProvider({ children }: { children: ReactNode }) {
  const defaultView = useUIStore((s) => s.defaultView)
  const setDefaultView = useUIStore((s) => s.setDefaultView)
  const [searchQuery, setSearchQuery] = useState<string | null>(null)

  const viewMode = (defaultView === 'upcoming' ? 'upcoming' : 'main_db') as ViewMode
  const setViewMode = useMemo(
    () => (mode: ViewMode) => setDefaultView(mode === 'upcoming' ? 'upcoming' : 'main_db'),
    [setDefaultView]
  )

  const value = useMemo<ViewContextValue>(
    () => ({
      viewMode,
      setViewMode,
      searchQuery,
      setSearchQuery,
    }),
    [viewMode, setViewMode, searchQuery, setSearchQuery]
  )

  return <ViewContext.Provider value={value}>{children}</ViewContext.Provider>
}

export function useViewContext(): ViewContextValue {
  const ctx = useContext(ViewContext)
  if (ctx == null) throw new Error('useViewContext must be used within ViewContextProvider')
  return ctx
}
