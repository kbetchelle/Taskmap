import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import type { LinkType } from '../../types/links'
import type { Task } from '../../types'
import { useTaskStore } from '../../stores/taskStore'
import { useDirectoryStore } from '../../stores/directoryStore'
import { useLinkStore } from '../../stores/linkStore'
import { useAppContext } from '../../contexts/AppContext'
import { useFeedbackStore } from '../../stores/feedbackStore'
import { fuzzyMatch } from '../../lib/fuzzyMatch'
import { StatusIcon } from '../StatusIcon'
import { detectCycle } from '../../lib/dependencyUtils'
import { pushUndoAndPersist } from '../../lib/undo'

interface LinkPickerProps {
  sourceTaskId: string
  onClose: () => void
}

export function LinkPicker({ sourceTaskId, onClose }: LinkPickerProps) {
  const [query, setQuery] = useState('')
  const [linkType, setLinkType] = useState<LinkType>('reference')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const tasks = useTaskStore((s) => s.tasks)
  const directories = useDirectoryStore((s) => s.directories)
  const links = useLinkStore((s) => s.links)
  const addLink = useLinkStore((s) => s.addLink)
  const { userId } = useAppContext()

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 10)
  }, [])

  // Click-outside
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [onClose])

  const filteredTasks = useMemo(() => {
    const candidates = tasks.filter((t) => t.id !== sourceTaskId && !t.archived_at)
    if (!query.trim()) return candidates.slice(0, 20)

    return candidates
      .map((t) => ({ task: t, result: fuzzyMatch(query, t.title) }))
      .filter((r) => r.result.match)
      .sort((a, b) => b.result.score - a.result.score)
      .slice(0, 20)
      .map((r) => r.task)
  }, [tasks, query, sourceTaskId])

  const getDirectoryName = useCallback(
    (dirId: string) => {
      const dir = directories.find((d) => d.id === dirId)
      return dir?.name ?? ''
    },
    [directories]
  )

  const handleCreateLink = useCallback(
    async (targetTask: Task) => {
      if (!userId) return

      // Check for duplicates
      const existing = links.find(
        (l) =>
          l.source_id === sourceTaskId &&
          l.target_id === targetTask.id &&
          l.link_type === linkType
      )
      if (existing) {
        useFeedbackStore.getState().showError('This link already exists')
        return
      }

      // Cycle detection for dependencies
      if (linkType === 'dependency') {
        const wouldCycle = detectCycle(sourceTaskId, targetTask.id, links)
        if (wouldCycle) {
          useFeedbackStore
            .getState()
            .showError('Cannot create dependency: this would create a circular dependency chain')
          return
        }
      }

      try {
        const created = await addLink(sourceTaskId, targetTask.id, linkType, userId)
        // Push undo for link creation
        pushUndoAndPersist(userId, {
          actionType: 'link',
          entityType: 'task',
          entityData: {
            undoAction: 'delete',
            link: created,
            linkId: created.id,
          },
        })
        useFeedbackStore.getState().showSuccess(`Linked to "${targetTask.title}"`)
        onClose()
      } catch {
        useFeedbackStore.getState().showError('Failed to create link')
      }
    },
    [userId, sourceTaskId, linkType, links, addLink, onClose]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setHighlightedIndex((prev) =>
            filteredTasks.length === 0 ? 0 : (prev + 1) % filteredTasks.length
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setHighlightedIndex((prev) =>
            filteredTasks.length === 0
              ? 0
              : (prev - 1 + filteredTasks.length) % filteredTasks.length
          )
          break
        case 'Enter':
          e.preventDefault()
          if (filteredTasks[highlightedIndex]) {
            handleCreateLink(filteredTasks[highlightedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
        default:
          break
      }
    },
    [filteredTasks, highlightedIndex, handleCreateLink, onClose]
  )

  useEffect(() => {
    setHighlightedIndex(0)
  }, [query])

  return (
    <div
      ref={menuRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-flow-background rounded-lg shadow-xl border border-flow-columnBorder w-[400px] max-h-[480px] flex flex-col">
        <div className="px-4 pt-4 pb-2">
          <h3 className="text-sm font-flow-semibold text-flow-textPrimary mb-2">Link to Task</h3>
          <input
            ref={inputRef}
            type="text"
            className="w-full rounded-md border border-flow-columnBorder bg-flow-background px-3 py-1.5 text-flow-task text-flow-textPrimary placeholder:text-flow-textDisabled outline-none focus:border-flow-focus focus:ring-1 focus:ring-flow-focus/30"
            placeholder="Search tasks..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            data-keyboard-ignore
          />
        </div>

        {/* Link type selector */}
        <div className="px-4 py-2 flex gap-3">
          <label className="flex items-center gap-1.5 text-flow-meta cursor-pointer">
            <input
              type="radio"
              name="linkType"
              value="reference"
              checked={linkType === 'reference'}
              onChange={() => setLinkType('reference')}
              className="accent-flow-focus"
            />
            Reference
          </label>
          <label className="flex items-center gap-1.5 text-flow-meta cursor-pointer">
            <input
              type="radio"
              name="linkType"
              value="dependency"
              checked={linkType === 'dependency'}
              onChange={() => setLinkType('dependency')}
              className="accent-flow-focus"
            />
            Dependency
          </label>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-2 pb-2" style={{ maxHeight: 320 }}>
          {filteredTasks.length > 0 ? (
            filteredTasks.map((task, idx) => (
              <button
                key={task.id}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left rounded transition-colors ${
                  idx === highlightedIndex ? 'bg-flow-surface' : 'hover:bg-flow-hover'
                }`}
                onClick={() => handleCreateLink(task)}
              >
                <StatusIcon status={task.status} size={14} />
                <div className="flex-1 min-w-0">
                  <div className="text-flow-task text-flow-textPrimary truncate">{task.title}</div>
                  <div className="text-flow-meta text-flow-textSecondary truncate">
                    {getDirectoryName(task.directory_id)}
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="px-3 py-4 text-center text-flow-meta text-flow-textDisabled">
              {query ? 'No matching tasks' : 'No tasks available'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
