/**
 * Drag-and-drop utility functions:
 * - Circular parent detection for directory moves
 * - Drop target computation from pointer coordinates
 * - Position recalculation after reorder
 */

import type { Directory, Task } from '../types/database'
import type { DropTarget } from '../stores/uiStore'

const ROW_ESTIMATE = 40
const VIRTUAL_THRESHOLD = 80

// Type guard
export function isTask(item: Task | Directory): item is Task {
  return 'directory_id' in item
}

/**
 * Walks the ancestor chain of targetParentId to check if draggedDirId
 * is an ancestor. Returns true if moving draggedDirId into targetParentId
 * would create a circular reference.
 */
export function isCircularParent(
  draggedDirId: string,
  targetParentId: string | null,
  directories: Directory[]
): boolean {
  if (targetParentId == null) return false
  if (draggedDirId === targetParentId) return true
  const dirMap = new Map(directories.map((d) => [d.id, d]))
  let currentId: string | null = targetParentId
  const visited = new Set<string>()
  while (currentId != null) {
    if (currentId === draggedDirId) return true
    if (visited.has(currentId)) break // prevent infinite loop on bad data
    visited.add(currentId)
    const dir = dirMap.get(currentId)
    currentId = dir?.parent_id ?? null
  }
  return false
}

/**
 * Given a pointer Y coordinate and a column container element, compute
 * the drop target (between which items the drop should occur).
 *
 * For virtual-scrolled columns (itemCount >= VIRTUAL_THRESHOLD), uses
 * estimated row height instead of DOM querying.
 */
export function computeDropTarget(
  pointerY: number,
  containerEl: HTMLElement,
  items: { id: string }[],
  options?: { isVirtual?: boolean; scrollTop?: number }
): { position: number; adjacentItemId: string | null; relativeY: number } {
  const rect = containerEl.getBoundingClientRect()
  const isVirtual = options?.isVirtual ?? items.length >= VIRTUAL_THRESHOLD

  if (isVirtual) {
    const scrollTop = options?.scrollTop ?? containerEl.scrollTop
    const y = pointerY - rect.top + scrollTop
    const index = Math.floor(y / ROW_ESTIMATE)
    const position = Math.max(0, Math.min(index, items.length))
    const adjacentItemId = position < items.length ? items[position].id : null
    return { position, adjacentItemId, relativeY: y }
  }

  // DOM-based calculation
  const rows = containerEl.querySelectorAll('[data-item-id]')
  let position = 0
  for (let i = 0; i < rows.length; i++) {
    const rowRect = rows[i].getBoundingClientRect()
    const midY = rowRect.top + rowRect.height / 2
    if (pointerY < midY) {
      position = i
      return {
        position,
        adjacentItemId: rows[i].getAttribute('data-item-id'),
        relativeY: pointerY - rect.top,
      }
    }
    position = i + 1
  }
  return {
    position,
    adjacentItemId: null,
    relativeY: pointerY - rect.top,
  }
}

/**
 * Given an element representing a drop target item, determine the rect
 * for positioning the drop indicator line.
 */
export function getDropIndicatorRect(
  containerEl: HTMLElement,
  position: number
): DOMRect | null {
  const rows = containerEl.querySelectorAll('[data-item-id]')
  if (rows.length === 0) {
    return containerEl.getBoundingClientRect()
  }
  if (position === 0) {
    return rows[0].getBoundingClientRect()
  }
  if (position >= rows.length) {
    return rows[rows.length - 1].getBoundingClientRect()
  }
  return rows[position].getBoundingClientRect()
}

/**
 * After a reorder, recalculate positions for all items.
 * Items in draggedIds are removed from their current position and
 * inserted at insertIndex, maintaining their relative order.
 * Returns a map of { id: newPosition } for all items that changed.
 */
export function recalculatePositions(
  allItems: { id: string; position: number }[],
  draggedIds: string[],
  insertIndex: number
): Map<string, number> {
  const draggedSet = new Set(draggedIds)
  // Separate dragged items (maintaining relative order) from remaining items
  const remaining = allItems.filter((item) => !draggedSet.has(item.id))
  const dragged = draggedIds
    .map((id) => allItems.find((item) => item.id === id))
    .filter((item): item is { id: string; position: number } => item != null)

  // Clamp insert index to remaining length
  const clampedIndex = Math.max(0, Math.min(insertIndex, remaining.length))

  // Insert dragged items at the target position
  const reordered = [
    ...remaining.slice(0, clampedIndex),
    ...dragged,
    ...remaining.slice(clampedIndex),
  ]

  // Re-index with integers 0, 1, 2, ...
  const changes = new Map<string, number>()
  reordered.forEach((item, i) => {
    if (item.position !== i) {
      changes.set(item.id, i)
    }
  })
  return changes
}

/**
 * Resolve a multi-item insert: given all items in a column, the dragged items,
 * and the target insert index, returns the full reordered list with new positions.
 */
export function resolveMultiItemInsert(
  allItems: { id: string; position: number }[],
  draggedIds: string[],
  insertIndex: number
): { id: string; position: number }[] {
  const draggedSet = new Set(draggedIds)
  const remaining = allItems.filter((item) => !draggedSet.has(item.id))
  const dragged = draggedIds
    .map((id) => allItems.find((item) => item.id === id))
    .filter((item): item is { id: string; position: number } => item != null)

  const clampedIndex = Math.max(0, Math.min(insertIndex, remaining.length))
  const reordered = [
    ...remaining.slice(0, clampedIndex),
    ...dragged,
    ...remaining.slice(clampedIndex),
  ]

  return reordered.map((item, i) => ({ id: item.id, position: i }))
}

/**
 * Check if a drop target is valid for the given dragged items.
 * Returns an object describing validity and reason.
 */
export function validateDrop(
  draggedIds: string[],
  dropTarget: DropTarget,
  items: (Task | Directory)[],
  directories: Directory[]
): { valid: boolean; reason?: string } {
  // Check circular parent for directory moves
  const draggedDirs = items.filter(
    (item) => !isTask(item) && draggedIds.includes(item.id)
  ) as Directory[]

  if (dropTarget.type === 'into' || dropTarget.type === 'column') {
    for (const dir of draggedDirs) {
      if (isCircularParent(dir.id, dropTarget.targetId, directories)) {
        return {
          valid: false,
          reason: 'Cannot move a directory into one of its own descendants',
        }
      }
    }
  }

  return { valid: true }
}

/**
 * Get the element rect for a given item ID in the DOM.
 */
export function getItemElementRect(itemId: string): DOMRect | null {
  const el = document.querySelector(`[data-item-id="${itemId}"]`)
  return el?.getBoundingClientRect() ?? null
}
