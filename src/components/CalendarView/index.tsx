/**
 * CalendarView — Month/week grid showing tasks by due date.
 *
 * Container component with navigation controls (prev/next, Today button)
 * and Month/Week toggle.
 */

import { useState, useMemo, useCallback } from 'react'
import type { CalendarViewData } from '../../hooks/useViewData'
import { useSettingsStore } from '../../stores/settingsStore'
import { MonthGrid } from './MonthGrid'
import { WeekGrid } from './WeekGrid'
import { TaskPill } from './TaskPill'

interface CalendarViewProps {
  data: CalendarViewData
  onCreateTask?: (directoryId: string, prefilledDate?: string) => void
  directoryId: string
}

type CalendarMode = 'month' | 'week'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function getWeekStart(date: Date, weekStartDay: 'sunday' | 'monday'): Date {
  const d = new Date(date)
  const dow = d.getDay()
  const offset = weekStartDay === 'monday'
    ? (dow === 0 ? 6 : dow - 1)
    : dow
  d.setDate(d.getDate() - offset)
  d.setHours(0, 0, 0, 0)
  return d
}

export function CalendarView({ data, onCreateTask, directoryId }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [mode, setMode] = useState<CalendarMode>('month')
  const settings = useSettingsStore((s) => s.settings)
  const weekStartDay = settings?.week_start_day ?? 'sunday'

  const handlePrev = useCallback(() => {
    setCurrentDate((prev) => {
      const d = new Date(prev)
      if (mode === 'month') {
        d.setMonth(d.getMonth() - 1)
      } else {
        d.setDate(d.getDate() - 7)
      }
      return d
    })
  }, [mode])

  const handleNext = useCallback(() => {
    setCurrentDate((prev) => {
      const d = new Date(prev)
      if (mode === 'month') {
        d.setMonth(d.getMonth() + 1)
      } else {
        d.setDate(d.getDate() + 7)
      }
      return d
    })
  }, [mode])

  const handleToday = useCallback(() => {
    setCurrentDate(new Date())
  }, [])

  const handleCreateTask = useCallback(
    (dateKey: string) => {
      onCreateTask?.(directoryId, dateKey)
    },
    [onCreateTask, directoryId]
  )

  const headerLabel = mode === 'month'
    ? `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    : (() => {
        const ws = getWeekStart(currentDate, weekStartDay)
        const we = new Date(ws)
        we.setDate(we.getDate() + 6)
        const startMonth = MONTH_NAMES[ws.getMonth()].slice(0, 3)
        const endMonth = MONTH_NAMES[we.getMonth()].slice(0, 3)
        return `${startMonth} ${ws.getDate()} - ${endMonth} ${we.getDate()}, ${we.getFullYear()}`
      })()

  const weekStart = useMemo(
    () => getWeekStart(currentDate, weekStartDay),
    [currentDate, weekStartDay]
  )

  return (
    <div className="flex flex-col h-full bg-flow-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-flow-columnBorder">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrev}
            className="px-2 py-1 text-flow-textSecondary hover:text-flow-textPrimary hover:bg-flow-columnBorder/20 rounded transition-colors"
            aria-label="Previous"
          >
            ←
          </button>
          <h2 className="text-lg font-flow-semibold text-flow-textPrimary min-w-[200px] text-center">
            {headerLabel}
          </h2>
          <button
            type="button"
            onClick={handleNext}
            className="px-2 py-1 text-flow-textSecondary hover:text-flow-textPrimary hover:bg-flow-columnBorder/20 rounded transition-colors"
            aria-label="Next"
          >
            →
          </button>
          <button
            type="button"
            onClick={handleToday}
            className="px-3 py-1 text-flow-meta text-flow-focus hover:bg-flow-focus/10 rounded transition-colors"
          >
            Today
          </button>
        </div>

        {/* Month/Week toggle */}
        <div className="border border-flow-columnBorder rounded-lg overflow-hidden inline-flex">
          <button
            type="button"
            className={`px-3 py-1 text-flow-meta font-flow-medium transition-colors ${
              mode === 'month'
                ? 'bg-flow-focus text-white'
                : 'bg-flow-background text-flow-textSecondary hover:bg-flow-hover'
            }`}
            onClick={() => setMode('month')}
          >
            Month
          </button>
          <button
            type="button"
            className={`px-3 py-1 text-flow-meta font-flow-medium transition-colors ${
              mode === 'week'
                ? 'bg-flow-focus text-white'
                : 'bg-flow-background text-flow-textSecondary hover:bg-flow-hover'
            }`}
            onClick={() => setMode('week')}
          >
            Week
          </button>
        </div>
      </div>

      {/* Grid */}
      {mode === 'month' ? (
        <MonthGrid
          currentDate={currentDate}
          tasksByDate={data.tasksByDate}
          weekStartDay={weekStartDay}
          onCreateTask={handleCreateTask}
        />
      ) : (
        <WeekGrid
          weekStart={weekStart}
          tasksByDate={data.tasksByDate}
          weekStartDay={weekStartDay}
          onCreateTask={handleCreateTask}
        />
      )}

      {/* No-date tasks section */}
      {data.noDateTasks.length > 0 && (
        <div className="border-t border-flow-columnBorder px-4 py-2">
          <h3 className="text-flow-meta font-flow-semibold text-flow-textSecondary mb-1">
            No Date ({data.noDateTasks.length})
          </h3>
          <div className="flex flex-wrap gap-1 max-h-[120px] overflow-y-auto">
            {data.noDateTasks.map((task) => (
              <TaskPill key={task.id} task={task} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
