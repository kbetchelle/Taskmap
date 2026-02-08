import { useEffect, useState, useCallback } from 'react'
import { useAppContext } from '../../contexts/AppContext'
import { useAppStore } from '../../stores/appStore'
import { useTaskStore } from '../../stores/taskStore'
import { useFeedbackStore } from '../../stores/feedbackStore'
import { fetchArchivedTasks, permanentlyDeleteTasks } from '../../api/tasks'
import type { Task } from '../../types'
import { formatRelativeTime } from '../../lib/utils/dateFormat'
import { Button } from '../ui/Button'

type ReasonFilter = 'all' | 'completed' | 'user_deleted' | 'auto_archived'

function reasonLabel(r: string): string {
  switch (r) {
    case 'completed':
      return 'Completed (auto-archived)'
    case 'user_deleted':
      return 'Manually deleted'
    case 'auto_archived':
      return 'Auto-archived'
    default:
      return r
  }
}

export function ArchiveView() {
  const { userId } = useAppContext()
  const setCurrentView = useAppStore((s) => s.setCurrentView)
  const setPreviousView = useAppStore((s) => s.setPreviousView)
  const previousView = useAppStore((s) => s.previousView)
  const unarchiveTask = useTaskStore((s) => s.unarchiveTask)
  const fetchTasksByUser = useTaskStore((s) => s.fetchTasksByUser)
  const showSuccess = useFeedbackStore((s) => s.showSuccess)
  const showError = useFeedbackStore((s) => s.showError)

  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [reasonFilter, setReasonFilter] = useState<ReasonFilter>('all')
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const list = await fetchArchivedTasks(userId, {
        limit: 100,
        reason: reasonFilter === 'all' ? undefined : reasonFilter,
        search: search.trim() || undefined,
      })
      setTasks(list)
    } catch {
      showError('Failed to load archived tasks')
    } finally {
      setLoading(false)
    }
  }, [userId, reasonFilter, search, showError])

  useEffect(() => {
    load()
  }, [load])

  const handleClose = useCallback(() => {
    setCurrentView(previousView ?? 'main_db')
    setPreviousView(null)
  }, [setCurrentView, setPreviousView, previousView])

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleRestoreOne = useCallback(
    async (taskId: string) => {
      if (!window.confirm('Restore this task? It will return to its original location.')) return
      try {
        await unarchiveTask(taskId)
        if (userId) await fetchTasksByUser(userId)
        setTasks((prev) => prev.filter((t) => t.id !== taskId))
        setSelectedIds((prev) => {
          const next = new Set(prev)
          next.delete(taskId)
          return next
        })
        showSuccess('Task restored')
      } catch {
        showError('Failed to restore task')
      }
    },
    [unarchiveTask, userId, fetchTasksByUser, showSuccess, showError]
  )

  const handleRestoreSelected = useCallback(async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    if (!window.confirm(`Restore ${ids.length} tasks? They will return to their original locations.`)) return
    try {
      for (const id of ids) {
        await unarchiveTask(id)
      }
      if (userId) await fetchTasksByUser(userId)
      setTasks((prev) => prev.filter((t) => !selectedIds.has(t.id)))
      setSelectedIds(new Set())
      showSuccess(`Restored ${ids.length} tasks`)
    } catch {
      showError('Failed to restore some tasks')
    }
  }, [selectedIds, unarchiveTask, userId, fetchTasksByUser, showSuccess, showError])

  const handlePermanentDeleteSelected = useCallback(async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    if (!window.confirm(`Permanently delete ${ids.length} tasks? This cannot be undone.`)) return
    try {
      await permanentlyDeleteTasks(ids)
      setTasks((prev) => prev.filter((t) => !selectedIds.has(t.id)))
      setSelectedIds(new Set())
      showSuccess(`Deleted ${ids.length} tasks`)
    } catch {
      showError('Failed to delete tasks')
    }
  }, [selectedIds, showSuccess, showError])

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-flow-background">
      <div className="flex-shrink-0 flex items-center justify-between gap-4 px-4 py-3 border-b border-flow-columnBorder">
        <h2 className="text-lg font-flow-semibold text-flow-textPrimary">Archived Tasks</h2>
        <Button variant="secondary" onClick={handleClose}>
          Close
        </Button>
      </div>
      <div className="flex-shrink-0 flex flex-wrap items-center gap-3 px-4 py-2 border-b border-flow-columnBorder">
        <select
          className="rounded border border-flow-columnBorder bg-flow-background px-2 py-1.5 text-sm text-flow-textPrimary"
          value={reasonFilter}
          onChange={(e) => setReasonFilter(e.target.value as ReasonFilter)}
        >
          <option value="all">All Archived</option>
          <option value="completed">Completed (auto-archived)</option>
          <option value="user_deleted">Manually deleted</option>
          <option value="auto_archived">Auto-archived</option>
        </select>
        <input
          type="text"
          placeholder="Search archived tasks..."
          className="flex-1 min-w-[160px] rounded border border-flow-columnBorder bg-flow-background px-2 py-1.5 text-sm text-flow-textPrimary placeholder:text-flow-textDisabled"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {selectedIds.size > 0 && (
        <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-flow-columnBorder/30">
          <Button variant="secondary" onClick={handleRestoreSelected}>
            Restore selected ({selectedIds.size})
          </Button>
          <Button
            variant="primary"
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={handlePermanentDeleteSelected}
          >
            Permanently delete ({selectedIds.size})
          </Button>
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-auto px-4 py-2">
        {loading ? (
          <p className="text-flow-textSecondary text-sm">Loading...</p>
        ) : tasks.length === 0 ? (
          <p className="text-flow-textSecondary text-sm">No archived tasks.</p>
        ) : (
          <ul className="space-y-1">
            {tasks.map((task) => (
              <li
                key={task.id}
                className="flex items-center gap-3 rounded border border-flow-columnBorder bg-white dark:bg-neutral-800 p-2"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(task.id)}
                  onChange={() => toggleSelect(task.id)}
                  className="rounded"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-flow-textPrimary truncate">{task.title}</div>
                  <div className="text-xs text-flow-textSecondary">
                    Archived {task.archived_at ? formatRelativeTime(task.archived_at) : '—'} •{' '}
                    {task.archive_reason ? reasonLabel(task.archive_reason) : '—'}
                  </div>
                </div>
                <Button variant="secondary" onClick={() => handleRestoreOne(task.id)}>
                  Restore
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
