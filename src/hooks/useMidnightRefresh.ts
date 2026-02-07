import { useEffect, useRef } from 'react'
import { useAppStore } from '../stores/appStore'
import { useDirectoryStore } from '../stores/directoryStore'
import { useTaskStore } from '../stores/taskStore'
import { useAuthStore } from '../stores/authStore'

function getMsUntilMidnight(): number {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)
  return tomorrow.getTime() - now.getTime()
}

export function useMidnightRefresh() {
  const userId = useAuthStore((s) => s.user?.id)
  const fetchDirectories = useDirectoryStore((s) => s.fetchDirectories)
  const fetchTasksByUser = useTaskStore((s) => s.fetchTasksByUser)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!userId) return

    const schedule = () => {
      const ms = getMsUntilMidnight()
      timeoutRef.current = setTimeout(() => {
        if (useAppStore.getState().currentView === 'main_db') {
          fetchDirectories(userId)
          fetchTasksByUser(userId)
        }
        timeoutRef.current = null
        schedule()
      }, ms)
    }

    schedule()
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [userId, fetchDirectories, fetchTasksByUser])
}
