import { useState, useCallback, useMemo } from 'react'
import { useLinkStore } from '../../stores/linkStore'
import { useTaskStore } from '../../stores/taskStore'
import { useAppStore } from '../../stores/appStore'
import { useAppContext } from '../../contexts/AppContext'
import { useFeedbackStore } from '../../stores/feedbackStore'
import { pushUndoAndPersist } from '../../lib/undo'
import { LinkedItem } from './LinkedItem'
import { LinkPicker } from './LinkPicker'

interface LinkedReferencesProps {
  taskId: string
}

export function LinkedReferences({ taskId }: LinkedReferencesProps) {
  const [expanded, setExpanded] = useState(true)
  const [pickerOpen, setPickerOpen] = useState(false)
  const { userId } = useAppContext()

  const links = useLinkStore((s) => s.links)
  const removeLink = useLinkStore((s) => s.removeLink)
  const tasks = useTaskStore((s) => s.tasks)
  const setNavigationPath = useAppStore((s) => s.setNavigationPath)
  const setExpandedTaskId = useAppStore((s) => s.setExpandedTaskId)
  const setFocusedItem = useAppStore((s) => s.setFocusedItem)

  const outgoing = useMemo(
    () => links.filter((l) => l.source_id === taskId),
    [links, taskId]
  )

  const incoming = useMemo(
    () => links.filter((l) => l.target_id === taskId),
    [links, taskId]
  )

  const totalCount = outgoing.length + incoming.length
  const taskMap = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks])

  const handleNavigate = useCallback(
    (targetTaskId: string) => {
      const task = taskMap.get(targetTaskId)
      if (!task) return
      // Navigate to the task's directory and focus it
      setNavigationPath([task.directory_id])
      setExpandedTaskId(targetTaskId)
      setFocusedItem(targetTaskId)
    },
    [taskMap, setNavigationPath, setExpandedTaskId, setFocusedItem]
  )

  const handleRemove = useCallback(
    async (linkId: string) => {
      const link = links.find((l) => l.id === linkId)
      try {
        await removeLink(linkId)
        // Push undo for link deletion
        if (link && userId) {
          pushUndoAndPersist(userId, {
            actionType: 'link',
            entityType: 'task',
            entityData: {
              undoAction: 'recreate',
              link,
              linkId: link.id,
            },
          })
        }
        useFeedbackStore.getState().showSuccess('Link removed')
      } catch {
        useFeedbackStore.getState().showError('Failed to remove link')
      }
    },
    [removeLink, links]
  )

  return (
    <div className="flex flex-col gap-2">
      <button
        className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-flow-textSecondary m-0 cursor-pointer hover:text-flow-textPrimary transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <span
          className="transition-transform duration-150"
          style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
        >
          &#x25B6;
        </span>
        Linked References
        {totalCount > 0 && (
          <span className="text-flow-meta bg-neutral-100 rounded-full px-1.5 py-0.5 font-flow-normal normal-case">
            {totalCount}
          </span>
        )}
      </button>

      {expanded && (
        <div className="flex flex-col gap-1">
          {outgoing.length > 0 && (
            <div>
              <div className="text-flow-meta text-flow-textSecondary font-flow-medium px-2 py-1">
                Links from this task
              </div>
              {outgoing.map((link) => (
                <LinkedItem
                  key={link.id}
                  link={link}
                  linkedTask={taskMap.get(link.target_id)}
                  direction="outgoing"
                  onNavigate={handleNavigate}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          )}

          {incoming.length > 0 && (
            <div>
              <div className="text-flow-meta text-flow-textSecondary font-flow-medium px-2 py-1">
                Referenced by
              </div>
              {incoming.map((link) => (
                <LinkedItem
                  key={link.id}
                  link={link}
                  linkedTask={taskMap.get(link.source_id)}
                  direction="incoming"
                  onNavigate={handleNavigate}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          )}

          {totalCount === 0 && (
            <div className="text-flow-meta text-flow-textDisabled px-2 py-1">
              No linked references
            </div>
          )}

          <button
            className="text-flow-meta text-flow-focus hover:text-flow-focus/80 px-2 py-1 text-left transition-colors"
            onClick={() => setPickerOpen(true)}
          >
            + Add Link
          </button>
        </div>
      )}

      {pickerOpen && (
        <LinkPicker
          sourceTaskId={taskId}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  )
}
