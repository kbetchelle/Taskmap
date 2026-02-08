import type { ChecklistItem } from '../../types'

export function calculateChecklistProgress(items: ChecklistItem[]): number {
  if (items.length === 0) return 0
  const completed = items.filter((item) => item.is_completed).length
  return Math.round((completed / items.length) * 100)
}
