/**
 * KanbanColumn — Single status column in the Kanban view.
 *
 * Header: status icon + label + count. 4px top border in status color.
 * Scrollable card list. Drop target for status changes.
 * "+ Add Task" button at bottom.
 */

import { useCallback, useRef, useMemo } from 'react'
import type { Task, TaskStatus } from '../../types/database'
import { StatusIcon } from '../StatusIcon'
import { getStatusLabel, getStatusColor } from '../../lib/statusUtils'
import { useDrop } from '../DragSystem/useDrop'
import { DropHighlight } from '../DragSystem/DropIndicator'
import { KanbanCard } from './KanbanCard'

interface KanbanColumnProps {
  status: TaskStatus
  tasks: Task[]
  onAddTask?: (status: TaskStatus) => void
}

export function KanbanColumn({ status, tasks, onAddTask }: KanbanColumnProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const statusColor = getStatusColor(status)
  const statusLabel = getStatusLabel(status)

  const dropItems = useMemo(
    () => tasks.map((t) => ({ id: t.id })),
    [tasks]
  )

  const { dropRef, isOver } = useDrop({
    targetId: status,
    type: 'kanban-column',
    items: dropItems,
    extraData: status,
  })

  const mergedRef = useCallback(
    (el: HTMLDivElement | null) => {
      ;(scrollRef as React.MutableRefObject<HTMLDivElement | null>).current = el
      ;(dropRef as React.MutableRefObject<HTMLElement | null>).current = el
    },
    [dropRef]
  )

  return (
    <div className="flex-1 flex flex-col min-w-[200px] min-h-0">
      {/* Header with status color top border */}
      <div
        className="px-3 py-2 border-b border-flow-columnBorder"
        style={{ borderTop: `4px solid ${statusColor}` }}
      >
        <div className="flex items-center gap-2">
          <StatusIcon status={status} size={16} />
          <span className="font-flow-semibold text-flow-task text-flow-textPrimary">
            {statusLabel}
          </span>
          <span className="ml-auto text-flow-meta text-flow-textSecondary bg-flow-columnBorder/30 rounded-full px-2 py-0.5">
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Scrollable card list */}
      <div
        ref={mergedRef}
        className={`
          flex-1 overflow-y-auto p-2 flex flex-col gap-2 relative
          ${isOver ? 'bg-flow-focus/5' : ''}
        `}
      >
        {tasks.map((task) => (
          <KanbanCard key={task.id} task={task} />
        ))}

        {tasks.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-flow-meta text-flow-textSecondary opacity-50 py-8">
            No tasks
          </div>
        )}

        <DropHighlight isOver={isOver} type="column" />
      </div>

      {/* Add task button */}
      {onAddTask && (
        <button
          type="button"
          className="mx-2 mb-2 px-3 py-2 text-flow-meta text-flow-textSecondary hover:text-flow-focus hover:bg-flow-focus/10 rounded-lg transition-colors text-left"
          onClick={() => onAddTask(status)}
        >
          + Add Task
        </button>
      )}
    </div>
  )
}
