// Phase 6: priority and category display helpers

import type { TaskPriority, UserSettings } from '../../types'
import { colors } from '../theme'
import { getCategoryColor as getThemeCategoryColor } from '../theme/index'
import { PRESET_CATEGORIES } from '../constants'

export function formatPriority(priority: TaskPriority): string {
  const labels: Record<TaskPriority, string> = {
    LOW: 'Low Priority',
    MED: 'Medium Priority',
    HIGH: 'High Priority',
  }
  return labels[priority]
}

export function getPriorityIcon(priority: TaskPriority): string {
  const icons: Record<TaskPriority, string> = {
    LOW: '🟢',
    MED: '🟡',
    HIGH: '🔴',
  }
  return icons[priority]
}

export function getPriorityColor(
  priority: TaskPriority,
  settings?: UserSettings | null
): string {
  if (priority === 'HIGH') {
    return settings?.priority_high_color ?? colors.priority.high
  }
  if (priority === 'MED') {
    return settings?.priority_med_color ?? colors.priority.med
  }
  return colors.text.primary
}

export function getCategoryName(
  category: string | null,
  settings?: UserSettings | null
): string {
  if (!category) return ''
  if (settings?.category_names) {
    for (const [, name] of Object.entries(settings.category_names)) {
      if (name?.toLowerCase() === category.toLowerCase()) return name
    }
    const name = (settings.category_names as Record<string, string>)[category]
    if (name) return name
  }
  const name = PRESET_CATEGORIES.find((c) => c.toLowerCase() === category.toLowerCase())
  return name ?? `Category ${category}`
}

export function getCategoryColor(
  category: string | null,
  settings?: UserSettings | null
): string | null {
  return getThemeCategoryColor(category, settings)
}
