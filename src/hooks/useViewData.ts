/**
 * useViewData — Memoized data grouping for different view types.
 *
 * Takes items (tasks and directories) and a view type, returns
 * appropriately grouped data:
 * - list: items sorted by position (passthrough)
 * - calendar: tasks grouped by due_date, plus noDateTasks
 * - kanban: tasks grouped by status, each sorted by position
 */

import { useMemo } from 'react'
import type { Task, Directory, TaskStatus } from '../types/database'
import type { ViewType } from '../types/views'

function isTask(item: Task | Directory): item is Task {
  return 'directory_id' in item
}

export interface CalendarViewData {
  tasksByDate: Record<string, Task[]>  // key: YYYY-MM-DD
  noDateTasks: Task[]
  directories: Directory[]
}

export interface KanbanViewData {
  columns: Record<TaskStatus, Task[]>
  directories: Directory[]
}

export interface ListViewData {
  items: (Task | Directory)[]
}

export type ViewData =
  | { type: 'list'; data: ListViewData }
  | { type: 'calendar'; data: CalendarViewData }
  | { type: 'kanban'; data: KanbanViewData }

const STATUS_ORDER: TaskStatus[] = [
  'not_started',
  'in_progress',
  'finishing_touches',
  'completed',
]

export function useViewData(
  items: (Task | Directory)[],
  viewType: ViewType
): ViewData {
  return useMemo(() => {
    if (viewType === 'list') {
      return {
        type: 'list',
        data: { items },
      }
    }

    const tasks = items.filter((item): item is Task => isTask(item))
    const dirs = items.filter((item): item is Directory => !isTask(item))

    if (viewType === 'calendar') {
      const tasksByDate: Record<string, Task[]> = {}
      const noDateTasks: Task[] = []

      for (const task of tasks) {
        if (task.due_date) {
          const dateKey = task.due_date.slice(0, 10) // YYYY-MM-DD
          if (!tasksByDate[dateKey]) tasksByDate[dateKey] = []
          tasksByDate[dateKey].push(task)
        } else {
          noDateTasks.push(task)
        }
      }

      // Sort tasks within each date by position
      for (const dateKey of Object.keys(tasksByDate)) {
        tasksByDate[dateKey].sort((a, b) => a.position - b.position)
      }
      noDateTasks.sort((a, b) => a.position - b.position)

      return {
        type: 'calendar',
        data: { tasksByDate, noDateTasks, directories: dirs },
      }
    }

    // kanban
    const columns: Record<TaskStatus, Task[]> = {
      not_started: [],
      in_progress: [],
      finishing_touches: [],
      completed: [],
    }

    for (const task of tasks) {
      const status = task.status ?? 'not_started'
      if (columns[status]) {
        columns[status].push(task)
      } else {
        columns.not_started.push(task)
      }
    }

    // Sort within each column by position
    for (const status of STATUS_ORDER) {
      columns[status].sort((a, b) => a.position - b.position)
    }

    return {
      type: 'kanban',
      data: { columns, directories: dirs },
    }
  }, [items, viewType])
}

export { STATUS_ORDER }
