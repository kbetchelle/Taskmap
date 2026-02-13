/**
 * KanbanView — Four columns, one per task status.
 *
 * | Not Started | In Progress | Finishing Touches | Completed |
 *
 * Cards can be dragged between columns to change status,
 * or reordered within columns.
 */

import type { TaskStatus } from '../../types/database'
import type { KanbanViewData } from '../../hooks/useViewData'
import { STATUS_ORDER } from '../../hooks/useViewData'
import { KanbanColumn } from './KanbanColumn'

interface KanbanViewProps {
  data: KanbanViewData
  onAddTask?: (status: TaskStatus) => void
}

export function KanbanView({ data, onAddTask }: KanbanViewProps) {
  return (
    <div className="flex flex-1 gap-0 h-full overflow-x-auto bg-flow-background">
      {STATUS_ORDER.map((status) => (
        <KanbanColumn
          key={status}
          status={status}
          tasks={data.columns[status]}
          onAddTask={onAddTask}
        />
      ))}
    </div>
  )
}
