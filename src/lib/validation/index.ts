// Client-side validation: min length, natural language dates, enums, file path

import type { TaskPriority } from '../../types'
import { PRESET_CATEGORIES } from '../constants'
import { formatDate } from '../utils'

export interface ParsedDate {
  date: Date | null
  confidence: 'high' | 'medium' | 'low'
  interpretation: string
  alternativeInterpretations?: Array<{ date: Date; interpretation: string }>
}

function getDayOfWeek(day: string): number | null {
  const days: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  }
  return days[day] ?? null
}

function getNextWeekday(targetDay: number, skipToNextWeek = false): Date {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const currentDay = today.getDay()
  let daysAhead = targetDay - currentDay
  if (daysAhead <= 0 || skipToNextWeek) {
    daysAhead += 7
  }
  const result = new Date(today)
  result.setDate(today.getDate() + daysAhead)
  return result
}

function parseMmDdYy(input: string): Date {
  const match = input.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (!match) {
    return new Date(NaN)
  }
  const [, month, day, year] = match
  const fullYear = year!.length === 2 ? `20${year}` : year!
  const d = new Date(`${fullYear}-${month!.padStart(2, '0')}-${day!.padStart(2, '0')}`)
  return d
}

const MIN_NAME_LENGTH = 3
const MIN_TITLE_LENGTH = 3
const NL_DATE_WINDOW_DAYS = 13

const PRIORITIES: TaskPriority[] = ['LOW', 'MED', 'HIGH']
const CATEGORIES = [...PRESET_CATEGORIES]

/** Validates minimum character length (trimmed). */
export function validateMinLength(
  value: string,
  min: number = MIN_NAME_LENGTH,
  fieldName: string = 'Field'
): { valid: true } | { valid: false; message: string } {
  const trimmed = value.trim()
  if (trimmed.length >= min) return { valid: true }
  return {
    valid: false,
    message: `${fieldName} must be at least ${min} characters`,
  }
}

export function validateDirectoryName(value: string) {
  return validateMinLength(value, MIN_NAME_LENGTH, 'Directory name')
}

export function validateTaskTitle(value: string) {
  return validateMinLength(value, MIN_TITLE_LENGTH, 'Task title')
}

/** Parse natural language dates within ~13 days (today, tomorrow, weekday names). */
export function parseNaturalDate(input: string, refDate: Date = new Date()): Date | null {
  const normalized = input.trim().toLowerCase()
  if (!normalized) return null

  const today = new Date(refDate)
  today.setHours(0, 0, 0, 0)

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const weekdayNames = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ]
  const dayOfWeek = today.getDay()

  if (normalized === 'today') return today
  if (normalized === 'tomorrow') return tomorrow
  if (normalized === 'yesterday') {
    const d = new Date(today)
    d.setDate(d.getDate() - 1)
    return d
  }

  const weekdayIndex = weekdayNames.indexOf(normalized)
  if (weekdayIndex !== -1) {
    let daysAhead = weekdayIndex - dayOfWeek
    if (daysAhead <= 0) daysAhead += 7
    if (daysAhead > NL_DATE_WINDOW_DAYS) return null
    const d = new Date(today)
    d.setDate(d.getDate() + daysAhead)
    return d
  }

  // "in N days"
  const inMatch = normalized.match(/^in\s+(\d+)\s+days?$/)
  if (inMatch) {
    const n = parseInt(inMatch[1], 10)
    if (n >= 0 && n <= NL_DATE_WINDOW_DAYS) {
      const d = new Date(today)
      d.setDate(d.getDate() + n)
      return d
    }
  }

  // ISO or locale date string as fallback
  const parsed = new Date(input)
  if (isNaN(parsed.getTime())) return null
  const diffDays = Math.round((parsed.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0 || diffDays > NL_DATE_WINDOW_DAYS) return null
  return parsed
}

/** Parse date input with confidence and interpretations (for UI preview). */
export function parseDateInputWithConfidence(input: string): ParsedDate {
  if (!input) {
    return { date: null, confidence: 'high', interpretation: '' }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const trimmed = input.trim()
  const normalizedInput = trimmed.toLowerCase()

  // High confidence: ISO date YYYY-MM-DD (used by formatDateForInput and when confirming a selection)
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (isoMatch) {
    const [, y, m, d] = isoMatch
    const year = parseInt(y!, 10)
    const month = parseInt(m!, 10) - 1
    const day = parseInt(d!, 10)
    const date = new Date(year, month, day)
    if (!isNaN(date.getTime()) && date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
      return {
        date,
        confidence: 'high',
        interpretation: formatDate(date),
      }
    }
  }

  // High confidence: absolute dates mm/dd/yy
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(trimmed)) {
    const date = parseMmDdYy(trimmed)
    if (!isNaN(date.getTime())) {
      return {
        date,
        confidence: 'high',
        interpretation: formatDate(date),
      }
    }
  }

  // High confidence: unambiguous relative dates
  if (normalizedInput === 'today') {
    return { date: today, confidence: 'high', interpretation: 'Today' }
  }
  if (normalizedInput === 'tomorrow') {
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    return { date: tomorrow, confidence: 'high', interpretation: 'Tomorrow' }
  }

  // Medium confidence: ambiguous relative dates (bare weekday)
  const dayOfWeek = getDayOfWeek(normalizedInput)
  if (dayOfWeek !== null) {
    const thisWeek = getNextWeekday(dayOfWeek)
    const nextWeek = getNextWeekday(dayOfWeek, true)
    const dayLabel = normalizedInput.charAt(0).toUpperCase() + normalizedInput.slice(1)
    return {
      date: thisWeek,
      confidence: 'medium',
      interpretation: `This ${dayLabel} (${formatDate(thisWeek)})`,
      alternativeInterpretations: [
        {
          date: nextWeek,
          interpretation: `Next ${dayLabel} (${formatDate(nextWeek)})`,
        },
      ],
    }
  }

  // Handle "next X" (weekday)
  if (normalizedInput.startsWith('next ')) {
    const day = normalizedInput.replace(/^next\s+/, '')
    const dayNum = getDayOfWeek(day)
    if (dayNum !== null) {
      const nextWeekDate = getNextWeekday(dayNum, true)
      const dayLabel = day.charAt(0).toUpperCase() + day.slice(1)
      return {
        date: nextWeekDate,
        confidence: 'high',
        interpretation: `Next ${dayLabel} (${formatDate(nextWeekDate)})`,
      }
    }
  }

  // Low confidence: couldn't parse
  return {
    date: null,
    confidence: 'low',
    interpretation: 'Could not parse date',
  }
}

/** Parse date input: natural language (within 13 days) or mm/dd/yy. Returns Date or null for backward compatibility. */
export function parseDateInput(input: string, _refDate?: Date): Date | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  const result = parseDateInputWithConfidence(input)
  return result.date
}

/** Validate priority enum. */
export function validatePriority(
  value: string | null | undefined
): { valid: true; value: TaskPriority } | { valid: false; message: string } {
  if (value == null || value === '') return { valid: true, value: 'MED' as TaskPriority }
  const v = value.toUpperCase() as TaskPriority
  if (PRIORITIES.includes(v)) return { valid: true, value: v }
  return {
    valid: false,
    message: `Priority must be one of: ${PRIORITIES.join(', ')}`,
  }
}

/** Validate category (one of preset). */
export function validateCategory(
  value: string | null | undefined
): { valid: true; value: string } | { valid: false; message: string } {
  if (value == null || value === '') return { valid: true, value: '' }
  if ((CATEGORIES as readonly string[]).includes(value)) return { valid: true, value }
  return {
    valid: false,
    message: `Category must be one of: ${CATEGORIES.join(', ')}`,
  }
}

/** File path validation for attachments: no path traversal, reasonable length. */
const MAX_PATH_LENGTH = 512
const FORBIDDEN_PATH_PATTERNS = /\.\.\/|\.\.\\|\/\.\.|\\\.\./

export function validateFilePath(path: string): { valid: true } | { valid: false; message: string } {
  if (path.length === 0) return { valid: false, message: 'File path is required' }
  if (path.length > MAX_PATH_LENGTH)
    return { valid: false, message: `Path must be under ${MAX_PATH_LENGTH} characters` }
  if (FORBIDDEN_PATH_PATTERNS.test(path))
    return { valid: false, message: 'Path cannot contain parent directory references' }
  return { valid: true }
}

export function validateFileName(name: string): { valid: true } | { valid: false; message: string } {
  if (name.trim().length === 0) return { valid: false, message: 'File name is required' }
  if (name.length > 255) return { valid: false, message: 'File name must be under 255 characters' }
  if (/[<>:"/\\|?*]/.test(name))
    return { valid: false, message: 'File name contains invalid characters' }
  return { valid: true }
}
