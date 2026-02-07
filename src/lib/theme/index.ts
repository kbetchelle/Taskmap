export { colors, typography, COLUMN_WIDTH_PX, EXPANDED_PANEL_WIDTH_PX } from '../theme'

import type { UserSettings } from '../../types'
import { colors } from '../theme'

const THEME_CATEGORY_MAP: Record<string, string> = {
  Work: colors.categories.category1,
  Personal: colors.categories.category2,
  Health: colors.categories.category3,
  Finance: colors.categories.category4,
  Other: colors.categories.category5,
}

export function getCategoryColor(
  category: string | null,
  settings?: UserSettings | null
): string | null {
  if (!category) return null
  if (settings?.category_colors && settings?.category_names) {
    const names = settings.category_names
    const colorsMap = settings.category_colors
    for (const key of ['1', '2', '3', '4', '5']) {
      if (names[key]?.toLowerCase() === category.toLowerCase()) {
        return colorsMap[key] ?? null
      }
    }
    const key = category in colorsMap ? category : null
    if (key) return colorsMap[key]
  }
  return THEME_CATEGORY_MAP[category] ?? null
}
