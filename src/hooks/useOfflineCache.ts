import { useEffect, useRef } from 'react'
import { useTaskStore } from '../stores/taskStore'
import { useDirectoryStore } from '../stores/directoryStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useLinkStore } from '../stores/linkStore'
import { useAppStore } from '../stores/appStore'
import { saveToCache, loadFromCache, type OfflineCache } from '../lib/offlineCache'

const DEBOUNCE_MS = 5_000

/**
 * Watches Zustand stores and debounce-writes a snapshot to the offline cache.
 * Also hydrates stores from cache on mount (before Supabase fetch completes).
 */
export function useOfflineCache() {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hydratedRef = useRef(false)

  // ── Hydrate stores from cache on mount ──────────────────────────────
  useEffect(() => {
    if (hydratedRef.current) return
    hydratedRef.current = true

    loadFromCache().then((cached) => {
      if (!cached) return

      const taskStore = useTaskStore.getState()
      const dirStore = useDirectoryStore.getState()
      const settingsStore = useSettingsStore.getState()
      const linkStore = useLinkStore.getState()
      const appStore = useAppStore.getState()

      // Only hydrate if stores are still empty (no fresh fetch yet)
      if (taskStore.tasks.length === 0 && cached.tasks.length > 0) {
        taskStore.setTasks(cached.tasks)
      }
      if (dirStore.directories.length === 0 && cached.directories.length > 0) {
        dirStore.setDirectories(cached.directories)
      }
      if (!settingsStore.settings && cached.settings) {
        settingsStore.setSettings(cached.settings)
      }
      if (linkStore.links.length === 0 && cached.links.length > 0) {
        linkStore.setLinks(cached.links)
      }
      // Restore navigation state if no navigation has happened yet
      if (appStore.navigationPath.length === 0 && cached.navigationState.navigationPath.length > 0) {
        appStore.setNavigationPath(cached.navigationState.navigationPath)
      }
    })
  }, [])

  // ── Subscribe to store changes and debounce-write to cache ──────────
  useEffect(() => {
    function scheduleWrite() {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        const tasks = useTaskStore.getState().tasks
        const directories = useDirectoryStore.getState().directories
        const settings = useSettingsStore.getState().settings
        const links = useLinkStore.getState().links
        const { navigationPath, currentView } = useAppStore.getState()

        // Don't write empty caches
        if (tasks.length === 0 && directories.length === 0) return

        const data: OfflineCache = {
          cachedAt: Date.now(),
          directories,
          tasks,
          settings: settings ?? null,
          links,
          navigationState: {
            navigationPath,
            currentView,
          },
        }
        saveToCache(data)
      }, DEBOUNCE_MS)
    }

    // Subscribe to each store
    const unsubs = [
      useTaskStore.subscribe(scheduleWrite),
      useDirectoryStore.subscribe(scheduleWrite),
      useSettingsStore.subscribe(scheduleWrite),
      useLinkStore.subscribe(scheduleWrite),
    ]

    return () => {
      unsubs.forEach((u) => u())
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])
}
