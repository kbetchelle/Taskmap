import { useEffect, useRef } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useAppStore } from '../stores/appStore'
import { useDirectoryStore } from '../stores/directoryStore'
import { useTaskStore } from '../stores/taskStore'
import { useLinkStore } from '../stores/linkStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useNetworkStore } from '../stores/networkStore'
import { getSubscriptionManager } from '../lib/subscriptionManager'

export function useRealtimeSubscriptions() {
  const userId = useAuthStore((s) => s.user?.id)
  const navigationPath = useAppStore((s) => s.navigationPath)
  const currentView = useAppStore((s) => s.currentView)
  const fetchDirectories = useDirectoryStore((s) => s.fetchDirectories)
  const fetchTasksByUser = useTaskStore((s) => s.fetchTasksByUser)
  const fetchLinksForUser = useLinkStore((s) => s.fetchLinksForUser)
  const fetchActiveItems = useTaskStore((s) => s.fetchActiveItems)
  const fetchSettings = useSettingsStore((s) => s.fetchSettings)
  const isOnline = useNetworkStore((s) => s.isOnline)
  const prevOnlineRef = useRef(isOnline)

  // Normal realtime subscription management
  useEffect(() => {
    if (!userId) return

    const manager = getSubscriptionManager()
    manager.setCallbacks({
      onDirectoriesChange: () => fetchDirectories(userId),
      onTasksChange: () => fetchTasksByUser(userId),
      onLinksChange: () => fetchLinksForUser(userId),
    })

    if (currentView === 'main_db' || currentView === 'upcoming') {
      manager.subscribeToView(currentView, [null, ...navigationPath])
    } else {
      manager.unsubscribeAll()
    }

    return () => {
      manager.unsubscribeAll()
    }
  }, [userId, navigationPath, currentView, fetchDirectories, fetchTasksByUser, fetchLinksForUser])

  // Reconnection handling: refetch all data and resubscribe when coming back online
  useEffect(() => {
    const wasOffline = !prevOnlineRef.current
    prevOnlineRef.current = isOnline

    if (isOnline && wasOffline && userId) {
      // Refetch all data from server
      Promise.all([
        fetchDirectories(userId),
        fetchActiveItems(userId),
        fetchLinksForUser(userId),
        fetchSettings(userId),
      ]).then(() => {
        useNetworkStore.getState().setLastSyncedAt(Date.now())
      }).catch(() => {
        // Individual fetches handle their own errors
      })

      // Force resubscribe to realtime channels
      const manager = getSubscriptionManager()
      manager.unsubscribeAll()
      if (currentView === 'main_db' || currentView === 'upcoming') {
        manager.setCallbacks({
          onDirectoriesChange: () => fetchDirectories(userId),
          onTasksChange: () => fetchTasksByUser(userId),
          onLinksChange: () => fetchLinksForUser(userId),
        })
        manager.subscribeToView(currentView, [null, ...navigationPath])
      }
    }
  }, [isOnline, userId, navigationPath, currentView, fetchDirectories, fetchTasksByUser, fetchLinksForUser, fetchActiveItems, fetchSettings])
}
