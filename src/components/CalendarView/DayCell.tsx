/**
 * DayCell — Individual day cell in the month calendar grid.
 *
 * Shows up to 3 task pills. "+N more" if overflow.
 * Registers as a drop target — dropping updates due_date.
 * Click on empty area: opens task creation with that date.
 */

import { useState, useCallback, useRef } from 'react'
import type { Task } from '../../types/database'
import { TaskPill } from './TaskPill'
import { useDrop } from '../DragSystem/useDrop'
import { DropHighlight } from '../DragSystem/DropIndicator'

const MAX_VISIBLE_TASKS = 3

interface DayCellProps {
  date: Date
  dateKey: string // YYYY-MM-DD
  tasks: Task[]
  isToday: boolean
  isCurrentMonth: boolean
  onCreateTask?: (dateKey: string) => void
}

export function DayCell({
  date,
  dateKey,
  tasks,
  isToday,
  isCurrentMonth,
  onCreateTask,
}: DayCellProps) {
  const [expanded, setExpanded] = useState(false)
  const cellRef = useRef<HTMLDivElement>(null)

  // Register as calendar-date drop target
  const { dropRef, isOver } = useDrop({
    targetId: dateKey,
    type: 'calendar-date',
    extraData: dateKey,
  })

  const mergedRef = useCallback(
    (el: HTMLDivElement | null) => {
      ;(cellRef as React.MutableRefObject<HTMLDivElement | null>).current = el
      ;(dropRef as React.MutableRefObject<HTMLElement | null>).current = el
    },
    [dropRef]
  )

  const visibleTasks = expanded ? tasks : tasks.slice(0, MAX_VISIBLE_TASKS)
  const overflow = tasks.length - MAX_VISIBLE_TASKS
  const dayNumber = date.getDate()

  return (
    <div
      ref={mergedRef}
      className={`
        relative border border-flow-columnBorder/30 p-1 min-h-[100px] overflow-hidden
        transition-colors cursor-pointer
        ${isCurrentMonth ? '' : 'opacity-40'}
        ${isToday ? 'bg-flow-focus/10 ring-1 ring-flow-focus' : ''}
        ${isOver ? 'bg-flow-focus/5' : ''}
      `}
      onClick={(e) => {
        // Only create task if clicked on empty area (not on a task pill)
        if ((e.target as HTMLElement).closest('[data-task-id]')) return
        onCreateTask?.(dateKey)
      }}
    >
      {/* Day number */}
      <div
        className={`
          text-flow-meta font-flow-medium mb-1
          ${isToday ? 'text-flow-focus font-flow-semibold' : 'text-flow-textSecondary'}
        `}
      >
        {dayNumber}
      </div>

      {/* Task pills */}
      <div className="flex flex-col gap-0.5">
        {visibleTasks.map((task) => (
          <TaskPill key={task.id} task={task} />
        ))}
        {!expanded && overflow > 0 && (
          <button
            type="button"
            className="text-flow-meta text-flow-focus hover:underline text-left px-1"
            onClick={(e) => {
              e.stopPropagation()
              setExpanded(true)
            }}
          >
            +{overflow} more
          </button>
        )}
        {expanded && overflow > 0 && (
          <button
            type="button"
            className="text-flow-meta text-flow-focus hover:underline text-left px-1"
            onClick={(e) => {
              e.stopPropagation()
              setExpanded(false)
            }}
          >
            Show less
          </button>
        )}
      </div>

      {/* Drop highlight */}
      <DropHighlight isOver={isOver} type="column" />
    </div>
  )
}
