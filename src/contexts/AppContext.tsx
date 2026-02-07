import { type ReactNode, createContext, useContext, useMemo } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useDirectoryStore } from '../stores/directoryStore'
import { useTaskStore } from '../stores/taskStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useUIStore } from '../stores/uiStore'

interface AppContextValue {
  userId: string | null
  session: ReturnType<typeof useAuthStore.getState>['session']
  directories: ReturnType<typeof useDirectoryStore.getState>['directories']
  activeItems: ReturnType<typeof useTaskStore.getState>['activeItems']
  settings: ReturnType<typeof useSettingsStore.getState>['settings']
  currentDirectoryId: ReturnType<typeof useUIStore.getState>['currentDirectoryId']
  setCurrentDirectoryId: ReturnType<typeof useUIStore.getState>['setCurrentDirectoryId']
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppContextProvider({ children }: { children: ReactNode }) {
  const userId = useAuthStore((s) => s.user?.id ?? null)
  const session = useAuthStore((s) => s.session)
  const directories = useDirectoryStore((s) => s.directories)
  const activeItems = useTaskStore((s) => s.activeItems)
  const settings = useSettingsStore((s) => s.settings)
  const currentDirectoryId = useUIStore((s) => s.currentDirectoryId)
  const setCurrentDirectoryId = useUIStore((s) => s.setCurrentDirectoryId)

  const value = useMemo<AppContextValue>(
    () => ({
      userId,
      session,
      directories,
      activeItems,
      settings,
      currentDirectoryId,
      setCurrentDirectoryId,
    }),
    [
      userId,
      session,
      directories,
      activeItems,
      settings,
      currentDirectoryId,
      setCurrentDirectoryId,
    ]
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext)
  if (ctx == null) throw new Error('useAppContext must be used within AppContextProvider')
  return ctx
}
