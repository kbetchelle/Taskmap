// Client-side validation: min length, natural language dates, enums, file path

import type { TaskPriority } from '../../types'
import { PRESET_CATEGORIES } from '../constants'

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

/** Parse date input: natural language (within 13 days) or mm/dd/yy. */
export function parseDateInput(input: string, refDate: Date = new Date()): Date | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  const natural = parseNaturalDate(trimmed, refDate)
  if (natural != null) return natural
  const mmddyy = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/
  const match = trimmed.match(mmddyy)
  if (match) {
    const [, month, day, year] = match
    const fullYear = year.length === 2 ? `20${year}` : year
    const d = new Date(`${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
    return isNaN(d.getTime()) ? null : d
  }
  return null
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
