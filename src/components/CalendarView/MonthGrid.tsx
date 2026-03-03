/**
 * MonthGrid — Standard calendar grid with 7 columns (days) and 5-6 rows (weeks).
 * Uses CSS Grid: grid-cols-7. Respects week_start_day setting.
 */

import type { Task } from '../../types/database'
import { DayCell } from './DayCell'

interface MonthGridProps {
  currentDate: Date  // Any date in the displayed month
  tasksByDate: Record<string, Task[]>
  weekStartDay: 'sunday' | 'monday'
  onCreateTask?: (dateKey: string) => void
}

// Get day names starting from the configured start day
function getDayNames(weekStartDay: 'sunday' | 'monday'): string[] {
  const allDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  if (weekStartDay === 'monday') {
    return [...allDays.slice(1), allDays[0]]
  }
  return allDays
}

// Get all dates to display in the month grid
function getMonthGridDates(year: number, month: number, weekStartDay: 'sunday' | 'monday'): Date[] {
  const firstOfMonth = new Date(year, month, 1)
  const lastOfMonth = new Date(year, month + 1, 0)

  // What day of the week does the month start on? (0 = Sunday)
  let startDow = firstOfMonth.getDay()
  if (weekStartDay === 'monday') {
    startDow = startDow === 0 ? 6 : startDow - 1
  }

  const dates: Date[] = []

  // Fill days before the first of the month
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month, 1)
    d.setDate(d.getDate() - (i + 1))
    dates.push(d)
  }

  // Fill the days of the month
  for (let day = 1; day <= lastOfMonth.getDate(); day++) {
    dates.push(new Date(year, month, day))
  }

  // Fill remaining days to complete the last week (up to 42 cells = 6 weeks)
  while (dates.length % 7 !== 0) {
    const lastDate = dates[dates.length - 1]
    const next = new Date(lastDate)
    next.setDate(next.getDate() + 1)
    dates.push(next)
  }

  return dates
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

export function MonthGrid({
  currentDate,
  tasksByDate,
  weekStartDay,
  onCreateTask,
}: MonthGridProps) {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const dayNames = getDayNames(weekStartDay)
  const dates = getMonthGridDates(year, month, weekStartDay)

  return (
    <div className="flex-1 overflow-auto">
      {/* Day name headers */}
      <div className="grid grid-cols-7 border-b border-flow-columnBorder">
        {dayNames.map((name) => (
          <div
            key={name}
            className="text-center text-flow-meta font-flow-semibold text-flow-textSecondary py-2"
          >
            {name}
          </div>
        ))}
      </div>

      {/* Date cells grid */}
      <div className="grid grid-cols-7">
        {dates.map((date) => {
          const dateKey = formatDateKey(date)
          const isCurrentMonth = date.getMonth() === month
          return (
            <DayCell
              key={dateKey}
              date={date}
              dateKey={dateKey}
              tasks={tasksByDate[dateKey] ?? []}
              isToday={isToday(date)}
              isCurrentMonth={isCurrentMonth}
              onCreateTask={onCreateTask}
            />
          )
        })}
      </div>
    </div>
  )
}
