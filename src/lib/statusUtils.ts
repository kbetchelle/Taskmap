import type { TaskStatus } from '../types/database'

export const STATUS_ORDER: TaskStatus[] = [
  'not_started',
  'in_progress',
  'finishing_touches',
  'completed',
]

// Hardcoded fallbacks — at runtime, prefer reading from CSS variables so dark mode
// automatically picks up the adjusted colors (e.g. not_started becomes #E0E0E0 in dark).
const STATUS_COLORS: Record<TaskStatus, string> = {
  not_started: '#1A1A1A',
  in_progress: '#FF9500',
  finishing_touches: '#FFD60A',
  completed: '#34C759',
}

/** CSS variable names for each status color (set on :root by the theme system). */
const STATUS_CSS_VARS: Record<TaskStatus, string> = {
  not_started: '--flow-status-not-started',
  in_progress: '--flow-status-in-progress',
  finishing_touches: '--flow-status-finishing-touches',
  completed: '--flow-status-completed',
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  finishing_touches: 'Finishing Touches',
  completed: 'Completed',
}

export function getNextStatus(current: TaskStatus): TaskStatus {
  const idx = STATUS_ORDER.indexOf(current)
  return STATUS_ORDER[(idx + 1) % STATUS_ORDER.length]
}

/**
 * Get the status color. Reads the CSS variable value at runtime so it adapts to
 * the current theme (light/dark). Falls back to the hardcoded value if the
 * variable is not available (e.g. in tests).
 */
export function getStatusColor(status: TaskStatus): string {
  if (typeof document !== 'undefined') {
    const varName = STATUS_CSS_VARS[status]
    const value = getComputedStyle(document.documentElement).getPropertyValue(varName)?.trim()
    if (value) return value
  }
  return STATUS_COLORS[status]
}

export function getStatusLabel(status: TaskStatus): string {
  return STATUS_LABELS[status]
}

export function isTaskCompleted(status: TaskStatus): boolean {
  return status === 'completed'
}

/**
 * Derive is_completed and completed_at from a status value.
 * When transitioning TO completed, sets completed_at to now.
 * When transitioning FROM completed, clears completed_at.
 */
export function deriveCompletionFields(
  status: TaskStatus,
  currentCompletedAt?: string | null
): { is_completed: boolean; completed_at: string | null } {
  if (status === 'completed') {
    return {
      is_completed: true,
      completed_at: currentCompletedAt ?? new Date().toISOString(),
    }
  }
  return { is_completed: false, completed_at: null }
}

/**
 * Compute a human-readable "Auto-archives in Xh Xm" string.
 * Returns null if not applicable.
 */
export function getAutoArchiveCountdown(completedAt: string | null): string | null {
  if (!completedAt) return null
  const SIX_HOURS_MS = 6 * 60 * 60 * 1000
  const elapsed = Date.now() - new Date(completedAt).getTime()
  const remaining = SIX_HOURS_MS - elapsed
  if (remaining <= 0) return null
  const hours = Math.floor(remaining / (60 * 60 * 1000))
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000))
  if (hours > 0) return `Auto-archives in ${hours}h ${minutes}m`
  return `Auto-archives in ${minutes}m`
}
