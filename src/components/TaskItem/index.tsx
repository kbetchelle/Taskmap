import type { Task, UserSettings } from '../../types'
import type { ColorMode } from '../../types/state'
import { useSettingsStore } from '../../stores/settingsStore'
import { ListItem } from '../ListItem'
import { getCategoryColor } from '../../lib/theme/index'
import { getPriorityColor } from '../../lib/utils/priorityCategory'
import { highlightSearchTerms } from '../../lib/utils'
import { formatRecurrence } from '../../lib/recurrence'
import { calculateChecklistProgress } from '../../lib/utils/checklist'
import { useTimeTrackerStore } from '../../stores/timeTrackerStore'

interface TaskItemProps {
  task: Task
  colorMode: ColorMode
  isCompleted: boolean
  isOverdue: boolean
  isSelected: boolean
  isFocused: boolean
  isCut?: boolean
  daysUntilActive?: number
  searchQuery?: string
  draggable?: boolean
  onDragStart?: (e: React.DragEvent) => void
  onDragEnd?: (e: React.DragEvent) => void
  onSelect: (event?: React.MouseEvent) => void
  onExpand: () => void
}

function getTaskColor(
  task: Task,
  colorMode: ColorMode,
  settings: UserSettings | null
): string | null {
  if (colorMode === 'priority' && task.priority) {
    if (task.priority === 'HIGH') return getPriorityColor('HIGH', settings)
    if (task.priority === 'MED') return getPriorityColor('MED', settings)
    return null
  }
  if (colorMode === 'category' && task.category) {
    return getCategoryColor(task.category, settings)
  }
  if (colorMode === 'none' && task.background_color) return task.background_color
  return null
}

export function TaskItem({
  task,
  colorMode,
  isCompleted,
  isOverdue,
  isSelected,
  isFocused,
  isCut = false,
  daysUntilActive = 0,
  searchQuery,
  draggable = false,
  onDragStart,
  onDragEnd,
  onSelect,
  onExpand,
}: TaskItemProps) {
  const settings = useSettingsStore((s) => s.settings)
  const isTimerRunning = useTimeTrackerStore((s) => s.isTimerActive(task.id))
  const accentColor = getTaskColor(task, colorMode, settings)

  return (
    <ListItem
      id={task.id}
      title={task.title}
      isSelected={isSelected}
      isFocused={isFocused}
      isCut={isCut}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      type="task"
      onSelect={onSelect}
      onExpand={onExpand}
      className={isCompleted ? 'task-complete' : ''}
    >
      {accentColor != null && (
        <span
          className="flex-shrink-0 w-1 h-5 rounded-full mr-2"
          style={{ backgroundColor: accentColor }}
          aria-hidden
        />
      )}
      {isOverdue && (
        <span
          className="flex-shrink-0 w-4 h-4 rounded-full bg-flow-error text-white text-flow-meta font-flow-semibold flex items-center justify-center mr-2"
          aria-label="Overdue"
        >
          !
        </span>
      )}
      {searchQuery ? (
        <span
          className={`flex-1 truncate text-flow-task ${
            isCompleted
              ? 'line-through text-flow-completed opacity-60 min-h-[32px]'
              : 'text-flow-textPrimary'
          }`}
          dangerouslySetInnerHTML={{ __html: highlightSearchTerms(task.title, searchQuery) }}
        />
      ) : (
        <span
          className={`flex-1 truncate text-flow-task ${
            isCompleted
              ? 'line-through text-flow-completed opacity-60 min-h-[32px]'
              : 'text-flow-textPrimary'
          }`}
        >
          {task.title}
        </span>
      )}
      {daysUntilActive > 0 && (
        <span className="flex-shrink-0 text-flow-meta text-flow-textSecondary ml-1">
          {daysUntilActive === 1 ? 'Tomorrow' : `in ${daysUntilActive} days`}
        </span>
      )}
      {task.recurrence_pattern && (
        <span
          className="recurrence-indicator flex-shrink-0 ml-1 text-flow-meta text-flow-textSecondary"
          title={formatRecurrence(task.recurrence_pattern)}
          aria-label={formatRecurrence(task.recurrence_pattern)}
        >
          &#x1F504;
        </span>
      )}
      {isTimerRunning && (
        <span
          className="timer-running-indicator flex-shrink-0 ml-1 text-flow-meta text-flow-textSecondary"
          title="Timer running"
          aria-label="Timer running"
        >
          &#x23F1;
        </span>
      )}
      {task.checklist_items && task.checklist_items.length > 0 && (() => {
        const completed = task.checklist_items.filter((i) => i.is_completed).length
        const total = task.checklist_items.length
        const progress = calculateChecklistProgress(task.checklist_items)
        return (
          <span
            className="checklist-preview flex-shrink-0 flex items-center gap-1 ml-1 text-flow-meta text-flow-textSecondary"
            title={`Checklist ${completed}/${total} complete`}
            aria-label={`Checklist ${completed} of ${total} items complete`}
          >
            <span className="checklist-icon" aria-hidden>☑</span>
            <span className="checklist-count">{completed}/{total}</span>
            {progress === 100 && (
              <span className="text-[#34C759]" aria-hidden>✓</span>
            )}
          </span>
        )
      })()}
    </ListItem>
  )
}
