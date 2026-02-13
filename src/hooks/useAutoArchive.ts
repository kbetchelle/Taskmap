import { useEffect } from 'react'
import { useTaskStore } from '../stores/taskStore'

const SIX_HOURS_MS = 6 * 60 * 60 * 1000
const POLL_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Background timer that auto-archives completed tasks after 6 hours.
 * Runs every 5 minutes, scanning for tasks where status === 'completed'
 * and completed_at is older than 6 hours.
 * Mount once at the app root level (AppContainer).
 */
export function useAutoArchive() {
  const archiveTask = useTaskStore((s) => s.archiveTask)

  useEffect(() => {
    const check = () => {
      const tasks = useTaskStore.getState().tasks
      const now = Date.now()

      for (const task of tasks) {
        if (
          task.status === 'completed' &&
          task.completed_at &&
          !task.archived_at
        ) {
          const elapsed = now - new Date(task.completed_at).getTime()
          if (elapsed >= SIX_HOURS_MS) {
            archiveTask(task.id, 'auto_archived').catch(() => {
              // Silently ignore — will retry on next poll
            })
          }
        }
      }
    }

    // Run once immediately on mount
    check()

    const intervalId = setInterval(check, POLL_INTERVAL_MS)

    return () => {
      clearInterval(intervalId)
    }
  }, [archiveTask])
}
