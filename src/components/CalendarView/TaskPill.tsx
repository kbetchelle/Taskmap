/**
 * TaskPill — Compact task display for calendar cells.
 * Shows [StatusIcon] Title with a status-colored left border.
 */

import type { Task } from '../../types/database'
import { StatusIcon } from '../StatusIcon'
import { getStatusColor } from '../../lib/statusUtils'
import { useAppStore } from '../../stores/appStore'
import { useDrag } from '../DragSystem/useDrag'

interface TaskPillProps {
  task: Task
}

export function TaskPill({ task }: TaskPillProps) {
  const setExpandedTaskId = useAppStore((s) => s.setExpandedTaskId)
  const pushKeyboardContext = useAppStore((s) => s.pushKeyboardContext)
  const { handlePointerDown, isDragging } = useDrag({
    itemId: task.id,
  })

  const borderColor = getStatusColor(task.status ?? 'not_started')

  return (
    <div
      className={`
        group flex items-center gap-1 px-1.5 py-0.5 rounded text-flow-meta
        cursor-pointer hover:bg-flow-columnBorder/20 transition-colors
        ${isDragging ? 'opacity-30' : ''}
      `}
      style={{ borderLeft: `3px solid ${borderColor}` }}
      data-item-id={task.id}
      data-task-id={task.id}
      data-item-type="task"
      onClick={(e) => {
        e.stopPropagation()
        setExpandedTaskId(task.id)
        pushKeyboardContext('editing')
      }}
      onPointerDown={handlePointerDown}
    >
      <StatusIcon status={task.status ?? 'not_started'} size={12} />
      <span className="flex-1 truncate text-flow-textPrimary">
        {task.title}
      </span>
    </div>
  )
}
