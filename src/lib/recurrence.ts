import type { RecurrencePattern } from '../types'
import { formatDateNatural } from './utils/dateFormat'

/**
 * Compute the next occurrence date after fromDate for the given recurrence pattern.
 * Returns null if the next occurrence would be after end_date or past end_after_count (caller checks count).
 */
export function calculateNextOccurrence(
  pattern: RecurrencePattern,
  fromDate: Date
): Date | null {
  const next = new Date(fromDate)

  switch (pattern.frequency) {
    case 'daily': {
      next.setDate(next.getDate() + pattern.interval)
      break
    }

    case 'weekly': {
      next.setDate(next.getDate() + 7 * pattern.interval)
      if (pattern.days_of_week && pattern.days_of_week.length > 0) {
        const currentDay = next.getDay()
        const sortedDays = [...pattern.days_of_week].sort((a, b) => a - b)
        const nextDayInWeek = sortedDays.find((d) => d > currentDay) ?? sortedDays[0]
        let daysToAdd = nextDayInWeek - currentDay
        if (daysToAdd < 0) daysToAdd += 7
        next.setDate(next.getDate() + daysToAdd)
      }
      break
    }

    case 'monthly': {
      next.setMonth(next.getMonth() + pattern.interval)
      const dayOfMonth = pattern.day_of_month ?? fromDate.getDate()
      const maxDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
      next.setDate(Math.min(dayOfMonth, maxDay))
      break
    }

    case 'yearly': {
      next.setFullYear(next.getFullYear() + pattern.interval)
      if (pattern.month_of_year != null) {
        next.setMonth(pattern.month_of_year - 1)
      }
      const dayOfMonth = pattern.day_of_month ?? fromDate.getDate()
      const maxDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
      next.setDate(Math.min(dayOfMonth, maxDay))
      break
    }
  }

  if (pattern.end_date) {
    const end = new Date(pattern.end_date)
    end.setHours(23, 59, 59, 999)
    if (next > end) return null
  }

  return next
}

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/**
 * Human-readable summary of a recurrence pattern for tooltips and display.
 */
export function formatRecurrence(pattern: RecurrencePattern): string {
  const interval = pattern.interval
  const freq = pattern.frequency
  const unit =
    freq === 'daily'
      ? 'day'
      : freq === 'weekly'
        ? 'week'
        : freq === 'monthly'
          ? 'month'
          : 'year'
  const plural = interval !== 1 ? 's' : ''
  let text = `Repeats every ${interval} ${unit}${plural}`

  if (freq === 'weekly' && pattern.days_of_week && pattern.days_of_week.length > 0) {
    const names = pattern.days_of_week
      .slice()
      .sort((a, b) => a - b)
      .map((d) => WEEKDAY_NAMES[d])
    text += ` on ${names.join(', ')}`
  }

  if (pattern.end_date) {
    text += ` until ${formatDateNatural(pattern.end_date)}`
  } else if (pattern.end_after_count != null && pattern.end_after_count > 0) {
    text += ` for ${pattern.end_after_count} time${pattern.end_after_count !== 1 ? 's' : ''}`
  }

  return text
}
