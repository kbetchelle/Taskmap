// Date parsing, validation, helpers

export {
  isOverdue,
  getDaysOverdue,
  formatDateNatural,
  formatDateTimeNatural,
  formatRelativeTime,
  formatFileSize,
} from './dateFormat'

export {
  formatPriority,
  getPriorityIcon,
  getPriorityColor,
  getCategoryName,
  getCategoryColor,
} from './priorityCategory'

export { getFileIcon } from './fileIcons'
export { debounce } from './debounce'

export function parseISODate(s: string | null | undefined): Date | null {
  if (s == null || s === '') return null
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

export function formatDate(d: Date | string | null | undefined): string {
  const date = typeof d === 'string' ? parseISODate(d) : d
  if (!date) return ''
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(d: Date | string | null | undefined): string {
  const date = typeof d === 'string' ? parseISODate(d) : d
  if (!date) return ''
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function minLength(value: string, min: number): boolean {
  return value.trim().length >= min
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

/** Escape special regex characters in a string for use in RegExp */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Wrap matches of searchQuery (case-insensitive) in text with <mark>.
 * Returns HTML string for use with dangerouslySetInnerHTML (only <mark> is injected).
 */
export function highlightSearchTerms(text: string, searchQuery: string): string {
  if (!searchQuery.trim()) return text
  const regex = new RegExp(`(${escapeRegex(searchQuery)})`, 'gi')
  return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">$1</mark>')
}
