import { useCallback } from 'react'
import { useAppStore } from '../../stores/appStore'
import { useTaskStore } from '../../stores/taskStore'
import { useNetworkStore } from '../../stores/networkStore'
import { haptic } from '../../lib/haptics'
import { deriveCompletionFields } from '../../lib/statusUtils'
import { useFeedbackStore } from '../../stores/feedbackStore'

/**
 * Mobile multi-select mode toolbar.
 * Replaces the top bar when items are selected via long-press.
 * Shows "[X selected] [Complete All] [Trash] [Cancel]"
 */
export function MultiSelectToolbar() {
  const selectedItems = useAppStore((s) => s.selectedItems)
  const clearSelection = useAppStore((s) => s.clearSelection)
  const updateTask = useTaskStore((s) => s.updateTask)
  const tasks = useTaskStore((s) => s.tasks)
  const showSuccess = useFeedbackStore((s) => s.showSuccess)
  const showInfo = useFeedbackStore((s) => s.showInfo)
  const isReadOnly = useNetworkStore((s) => !s.isOnline)

  const count = selectedItems.length

  const handleCompleteAll = useCallback(async () => {
    if (isReadOnly) {
      showInfo('This action is not available offline')
      return
    }
    haptic.light()
    const selectedTasks = tasks.filter((t) => selectedItems.includes(t.id))
    for (const task of selectedTasks) {
      const completionFields = deriveCompletionFields('completed')
      await updateTask(task.id, {
        status: 'completed',
        ...completionFields,
      })
    }
    showSuccess(`${selectedTasks.length} task${selectedTasks.length !== 1 ? 's' : ''} completed`)
    clearSelection()
  }, [selectedItems, tasks, updateTask, clearSelection, showSuccess, isReadOnly, showInfo])

  const handleTrashAll = useCallback(async () => {
    if (isReadOnly) {
      showInfo('This action is not available offline')
      return
    }
    haptic.light()
    const taskStore = useTaskStore.getState()
    for (const id of selectedItems) {
      const task = tasks.find((t) => t.id === id)
      if (task) {
        await taskStore.removeTask(id)
      }
    }
    showSuccess(`${selectedItems.length} item${selectedItems.length !== 1 ? 's' : ''} trashed`)
    clearSelection()
  }, [selectedItems, tasks, clearSelection, showSuccess, isReadOnly, showInfo])

  const handleCancel = useCallback(() => {
    clearSelection()
  }, [clearSelection])

  if (count === 0) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[1500] bg-flow-focus text-white h-12 px-4 flex items-center justify-between gap-3"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}
    >
      <span className="text-sm font-flow-semibold">
        {count} selected
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={`px-3 py-1.5 text-sm font-flow-medium rounded-md transition-colors ${isReadOnly ? 'bg-white/10 opacity-50 cursor-not-allowed' : 'bg-white/20 hover:bg-white/30'}`}
          onClick={handleCompleteAll}
          disabled={isReadOnly}
          data-write-action=""
        >
          Complete All
        </button>
        <button
          type="button"
          className={`px-3 py-1.5 text-sm font-flow-medium rounded-md transition-colors ${isReadOnly ? 'bg-white/10 opacity-50 cursor-not-allowed' : 'bg-white/20 hover:bg-white/30'}`}
          onClick={handleTrashAll}
          disabled={isReadOnly}
          data-write-action=""
        >
          Trash
        </button>
        <button
          type="button"
          className="px-3 py-1.5 text-sm font-flow-medium rounded-md bg-white/20 hover:bg-white/30 transition-colors"
          onClick={handleCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
