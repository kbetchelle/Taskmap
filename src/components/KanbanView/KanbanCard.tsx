/**
 * KanbanCard — Task card component for Kanban columns.
 *
 * Shows title (2 lines max), due date, priority badge.
 * Click opens ExpandedTaskPanel. Has grab handle for drag.
 */

import type { Task } from '../../types/database'
import { useAppStore } from '../../stores/appStore'
import { useDrag } from '../DragSystem/useDrag'

interface KanbanCardProps {
  task: Task
}

function getPriorityLabel(priority: string | null): string | null {
  switch (priority) {
    case 'HIGH': return 'High'
    case 'MED': return 'Med'
    case 'LOW': return 'Low'
    default: return null
  }
}

function getPriorityDotColor(priority: string | null): string {
  switch (priority) {
    case 'HIGH': return 'bg-flow-error'
    case 'MED': return 'bg-[#FF9500]'
    default: return 'bg-flow-textSecondary'
  }
}

function isOverdue(task: Task): boolean {
  if (task.status === 'completed' || !task.due_date) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(task.due_date)
  due.setHours(0, 0, 0, 0)
  return due < today
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[date.getMonth()]} ${date.getDate()}`
}

export function KanbanCard({ task }: KanbanCardProps) {
  const setExpandedTaskId = useAppStore((s) => s.setExpandedTaskId)
  const pushKeyboardContext = useAppStore((s) => s.pushKeyboardContext)
  const { handlePointerDown, isDragging, isAnyDragActive } = useDrag({
    itemId: task.id,
  })

  const overdue = isOverdue(task)
  const priorityLabel = getPriorityLabel(task.priority)

  return (
    <div
      data-item-id={task.id}
      data-task-id={task.id}
      data-item-type="task"
      className={`
        group bg-flow-background border border-flow-columnBorder rounded-lg p-3 shadow-sm
        cursor-pointer hover:shadow-md transition-shadow
        ${isDragging ? 'opacity-30' : ''}
        ${isAnyDragActive ? 'transition-transform duration-200' : ''}
      `}
      onClick={() => {
        setExpandedTaskId(task.id)
        pushKeyboardContext('editing')
      }}
    >
      {/* Grab handle + Title */}
      <div className="flex items-start gap-1.5">
        <div
          className={`
            flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity
            ${isAnyDragActive ? 'cursor-grabbing' : 'cursor-grab'}
            text-flow-textSecondary hover:text-flow-textPrimary
          `}
          onPointerDown={handlePointerDown}
          aria-label="Drag handle"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="5" cy="3" r="1.5" />
            <circle cx="11" cy="3" r="1.5" />
            <circle cx="5" cy="8" r="1.5" />
            <circle cx="11" cy="8" r="1.5" />
            <circle cx="5" cy="13" r="1.5" />
            <circle cx="11" cy="13" r="1.5" />
          </svg>
        </div>
        <h4 className="text-flow-task font-flow-medium text-flow-textPrimary line-clamp-2 flex-1 min-w-0">
          {task.title}
        </h4>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {task.due_date && (
          <span className={`text-flow-meta ${overdue ? 'text-flow-error font-flow-semibold' : 'text-flow-textSecondary'}`}>
            {overdue ? '!' : ''} {formatDate(task.due_date)}
          </span>
        )}
        {priorityLabel && (
          <span className="flex items-center gap-1 text-flow-meta text-flow-textSecondary">
            <span className={`w-2 h-2 rounded-full ${getPriorityDotColor(task.priority)}`} />
            {priorityLabel}
          </span>
        )}
      </div>
    </div>
  )
}
