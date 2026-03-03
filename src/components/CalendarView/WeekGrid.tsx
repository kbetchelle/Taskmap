/**
 * WeekGrid — 7-column expanded layout showing tasks for each day of the week.
 * Each day is a tall column with full task details.
 */

import type { Task } from '../../types/database'
import { useAppStore } from '../../stores/appStore'
import { StatusIcon } from '../StatusIcon'

interface WeekGridProps {
  weekStart: Date  // First day of the displayed week
  tasksByDate: Record<string, Task[]>
  weekStartDay?: 'sunday' | 'monday'
  onCreateTask?: (dateKey: string) => void
}

function formatDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function isToday(date: Date): boolean {
  const now = new Date()
  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  )
}

const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function getPriorityLabel(priority: string | null): string | null {
  if (!priority) return null
  switch (priority) {
    case 'HIGH': return 'High'
    case 'MED': return 'Med'
    case 'LOW': return 'Low'
    default: return null
  }
}

function getPriorityColor(priority: string | null): string {
  switch (priority) {
    case 'HIGH': return 'text-flow-error'
    case 'MED': return 'text-[#FF9500]'
    default: return 'text-flow-textSecondary'
  }
}

export function WeekGrid({
  weekStart,
  tasksByDate,
  onCreateTask,
}: WeekGridProps) {
  const setExpandedTaskId = useAppStore((s) => s.setExpandedTaskId)
  const pushKeyboardContext = useAppStore((s) => s.pushKeyboardContext)

  // Generate 7 days from weekStart
  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    days.push(d)
  }

  return (
    <div className="flex-1 flex overflow-auto">
      {days.map((date) => {
        const dateKey = formatDateKey(date)
        const tasks = tasksByDate[dateKey] ?? []
        const today = isToday(date)
        const dayName = DAY_NAMES_SHORT[date.getDay()]
        const monthName = MONTH_NAMES_SHORT[date.getMonth()]

        return (
          <div
            key={dateKey}
            className={`
              flex-1 min-w-[120px] border-r border-flow-columnBorder flex flex-col
              ${today ? 'bg-flow-focus/5' : ''}
            `}
          >
            {/* Day header */}
            <div
              className={`
                text-center py-2 border-b border-flow-columnBorder
                ${today ? 'text-flow-focus font-flow-semibold' : 'text-flow-textSecondary'}
              `}
            >
              <div className="text-flow-meta font-flow-medium">{dayName}</div>
              <div className="text-sm">
                {monthName} {date.getDate()}
              </div>
            </div>

            {/* Tasks */}
            <div
              className="flex-1 overflow-y-auto p-1 flex flex-col gap-1"
              onClick={(e) => {
                if ((e.target as HTMLElement).closest('[data-task-id]')) return
                onCreateTask?.(dateKey)
              }}
            >
              {tasks.map((task) => (
                <div
                  key={task.id}
                  data-task-id={task.id}
                  data-item-id={task.id}
                  className="bg-flow-background border border-flow-columnBorder rounded p-2 cursor-pointer hover:shadow-sm transition-shadow"
                  onClick={(e) => {
                    e.stopPropagation()
                    setExpandedTaskId(task.id)
                    pushKeyboardContext('editing')
                  }}
                >
                  <div className="flex items-center gap-1 mb-1">
                    <StatusIcon status={task.status ?? 'not_started'} size={14} />
                    <span className="text-flow-task font-flow-medium truncate flex-1">
                      {task.title}
                    </span>
                  </div>
                  {task.priority && (
                    <span className={`text-flow-meta ${getPriorityColor(task.priority)}`}>
                      {getPriorityLabel(task.priority)}
                    </span>
                  )}
                </div>
              ))}
              {tasks.length === 0 && (
                <div className="flex-1 flex items-center justify-center text-flow-meta text-flow-textSecondary opacity-50">
                  No tasks
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
