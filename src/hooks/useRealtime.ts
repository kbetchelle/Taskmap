import { useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useAppStore } from '../stores/appStore'
import { useDirectoryStore } from '../stores/directoryStore'
import { useTaskStore } from '../stores/taskStore'
import { getSubscriptionManager } from '../lib/subscriptionManager'

export function useRealtimeSubscriptions() {
  const userId = useAuthStore((s) => s.user?.id)
  const navigationPath = useAppStore((s) => s.navigationPath)
  const currentView = useAppStore((s) => s.currentView)
  const fetchDirectories = useDirectoryStore((s) => s.fetchDirectories)
  const fetchTasksByUser = useTaskStore((s) => s.fetchTasksByUser)

  useEffect(() => {
    if (!userId) return

    const manager = getSubscriptionManager()
    manager.setCallbacks({
      onDirectoriesChange: () => fetchDirectories(userId),
      onTasksChange: () => fetchTasksByUser(userId),
    })

    if (currentView === 'main_db' || currentView === 'upcoming') {
      manager.subscribeToView(currentView, [null, ...navigationPath])
    } else {
      manager.unsubscribeAll()
    }

    return () => {
      manager.unsubscribeAll()
    }
  }, [userId, navigationPath, currentView, fetchDirectories, fetchTasksByUser])
}
