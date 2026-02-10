/**
 * Sentinel id for the focusable "empty slot" in a column when it has no items.
 * Ensures there is always a visible active space (keyboard focus target).
 */
export const EMPTY_SLOT_PREFIX = '__empty-'

export function getEmptySlotId(columnIndex: number): string {
  return `${EMPTY_SLOT_PREFIX}${columnIndex}`
}

export function isEmptySlotId(id: string | null): id is string {
  return id != null && id.startsWith(EMPTY_SLOT_PREFIX)
}

export function getColumnIndexFromEmptySlotId(id: string): number | null {
  if (!id.startsWith(EMPTY_SLOT_PREFIX)) return null
  const num = parseInt(id.slice(EMPTY_SLOT_PREFIX.length), 10)
  return Number.isNaN(num) ? null : num
}
