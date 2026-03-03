import { useRef, useState, useCallback } from 'react'
import type { Task, TaskStatus, UserSettings } from '../../types'
import type { ColorMode } from '../../types/state'
import { useSettingsStore } from '../../stores/settingsStore'
import { useTouchGestures } from '../../hooks/useTouchGestures'
import { useUIStore } from '../../stores/uiStore'
import { ListItem } from '../ListItem'
import { getCategoryColor } from '../../lib/theme/index'
import { getPriorityColor } from '../../lib/utils/priorityCategory'
import { highlightSearchTerms } from '../../lib/utils'
import { formatRecurrence } from '../../lib/recurrence'
import { calculateChecklistProgress } from '../../lib/utils/checklist'
import { useTimeTrackerStore } from '../../stores/timeTrackerStore'
import { StatusIcon } from '../StatusIcon'
import { StatusDropdown } from '../StatusDropdown'
import { getAutoArchiveCountdown, isTaskCompleted } from '../../lib/statusUtils'

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
  onSwipeRight?: () => void
  onSwipeLeft?: () => void
  onLongPress?: (clientX: number, clientY: number) => void
  onStatusClick?: (taskId: string) => void
  onStatusContextMenu?: (taskId: string, status: TaskStatus) => void
  linkCount?: number
  isBlocked?: boolean
  blockedByTitles?: string[]
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
  onSwipeRight,
  onSwipeLeft,
  onLongPress,
  onStatusClick,
  onStatusContextMenu,
  linkCount = 0,
  isBlocked = false,
  blockedByTitles = [],
}: TaskItemProps) {
  const settings = useSettingsStore((s) => s.settings)
  const isTimerRunning = useTimeTrackerStore((s) => s.isTimerActive(task.id))
  const accentColor = getTaskColor(task, colorMode, settings)
  const listItemRef = useRef<HTMLDivElement>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 })

  const completed = isTaskCompleted(task.status)
  const archiveCountdown = completed ? getAutoArchiveCountdown(task.completed_at) : null

  const handleStatusClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onStatusClick?.(task.id)
    },
    [onStatusClick, task.id]
  )

  const handleStatusContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDropdownPos({ top: e.clientY, left: e.clientX })
      setDropdownOpen(true)
    },
    []
  )

  const handleDropdownSelect = useCallback(
    (status: TaskStatus) => {
      onStatusContextMenu?.(task.id, status)
      setDropdownOpen(false)
    },
    [onStatusContextMenu, task.id]
  )

  // For link items: single click opens URL, Cmd+Click opens detail panel
  const handleLinkClick = useCallback(
    (e?: React.MouseEvent) => {
      if (task.url) {
        if (e && (e.metaKey || e.ctrlKey)) {
          // Cmd/Ctrl+Click → open expanded panel
          onExpand()
        } else {
          // Normal click → open URL in new tab
          window.open(task.url, '_blank', 'noopener,noreferrer')
        }
        return
      }
      onSelect(e)
    },
    [task.url, onSelect, onExpand],
  )

  useTouchGestures(
    listItemRef as React.RefObject<HTMLElement | null>,
    {
      onSwipeRight: onSwipeRight ?? undefined,
      onSwipeLeft: onSwipeLeft ?? undefined,
      onLongPress: onLongPress ?? undefined,
    },
    useUIStore((s) => s.mobileMode) && (onSwipeRight != null || onSwipeLeft != null || onLongPress != null)
  )

  return (
    <>
      <ListItem
        ref={listItemRef}
        id={task.id}
        title={task.title}
        isSelected={isSelected}
        isFocused={isFocused}
        isCut={isCut}
        draggable={draggable}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        type="task"
        onSelect={task.url ? handleLinkClick : onSelect}
        onExpand={onExpand}
        className={`${isCompleted ? 'task-complete' : ''} ${completed ? 'transition-opacity duration-300' : ''} ${isBlocked ? 'opacity-75' : ''}`}
      >
        {task.url ? (
          <span
            className="flex-shrink-0 mr-1.5 text-flow-focus cursor-pointer"
            title="Hyperlink"
            aria-label="Link item"
          >
            &#x1F517;
          </span>
        ) : (
          <StatusIcon
            status={task.status}
            size={16}
            onClick={handleStatusClick}
            onContextMenu={handleStatusContextMenu}
            className="mr-1.5"
          />
        )}
        {isBlocked && (
          <span
            className="flex-shrink-0 mr-1 text-flow-meta"
            title={`Blocked by: ${blockedByTitles.join(', ')}`}
            aria-label="Blocked"
          >
            &#x1F512;
          </span>
        )}
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
              completed
                ? 'line-through text-flow-completed opacity-50 min-h-[32px]'
                : 'text-flow-textPrimary'
            }`}
            dangerouslySetInnerHTML={{ __html: highlightSearchTerms(task.title, searchQuery) }}
          />
        ) : (
          <span
            className={`flex-1 truncate text-flow-task ${
              completed
                ? 'line-through text-flow-completed opacity-50 min-h-[32px]'
                : 'text-flow-textPrimary'
            }`}
          >
            {task.title}
          </span>
        )}
        {archiveCountdown && (
          <span className="flex-shrink-0 text-flow-meta text-flow-textSecondary ml-1">
            {archiveCountdown}
          </span>
        )}
        {linkCount > 0 && (
          <span className="flex-shrink-0 text-flow-meta text-flow-textSecondary ml-1">
            &#x1F517;{linkCount}
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
          const completedItems = task.checklist_items.filter((i) => i.is_completed).length
          const total = task.checklist_items.length
          const progress = calculateChecklistProgress(task.checklist_items)
          return (
            <span
              className="checklist-preview flex-shrink-0 flex items-center gap-1 ml-1 text-flow-meta text-flow-textSecondary"
              title={`Checklist ${completedItems}/${total} complete`}
              aria-label={`Checklist ${completedItems} of ${total} items complete`}
            >
              <span className="checklist-icon" aria-hidden>&#x2611;</span>
              <span className="checklist-count">{completedItems}/{total}</span>
              {progress === 100 && (
                <span className="text-[#34C759]" aria-hidden>&#x2713;</span>
              )}
            </span>
          )
        })()}
      </ListItem>
      {dropdownOpen && (
        <StatusDropdown
          currentStatus={task.status}
          onSelect={handleDropdownSelect}
          onClose={() => setDropdownOpen(false)}
          anchorPosition={dropdownPos}
        />
      )}
    </>
  )
}
