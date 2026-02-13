/**
 * useDrop – Hook for drop target behavior.
 *
 * Registers an element as a drop zone. When a drag is in progress,
 * listens for pointer movement to compute drop targets using hit-testing.
 * Supports directory hover timers for "drop into" behavior.
 */

import { useRef, useEffect } from 'react'
import { useUIStore } from '../../stores/uiStore'
import type { DropTarget, DropTargetType } from '../../stores/uiStore'
import { computeDropTarget } from '../../lib/dragUtils'

const DIRECTORY_HOVER_DELAY = 400

interface UseDropOptions {
  /** The directory/target ID this drop zone represents */
  targetId: string | null
  /** The type of drop zone */
  type: DropTargetType
  /** Items in this drop zone (for between-item calculation) */
  items?: { id: string }[]
  /** Whether this drop zone uses virtual scrolling */
  isVirtual?: boolean
  /** Whether this drop zone is disabled */
  disabled?: boolean
  /** Callback when a drop occurs on this target */
  onDrop?: (dropTarget: DropTarget) => void
  /** Whether this is a directory item that accepts "into" drops */
  acceptsInto?: boolean
  /** For kanban-column / calendar-date: extra data like status or date */
  extraData?: string
}

interface UseDropReturn {
  /** Ref to attach to the drop target container element */
  dropRef: React.RefObject<HTMLElement | null>
  /** Whether this drop zone is the current target */
  isOver: boolean
  /** Whether the current drop is invalid (e.g., circular parent) */
  isInvalid: boolean
}

// Global registry of active drop zones
interface DropZoneEntry {
  element: HTMLElement
  targetId: string | null
  type: DropTargetType
  items?: { id: string }[]
  isVirtual?: boolean
  acceptsInto?: boolean
  extraData?: string
  onDrop?: (dropTarget: DropTarget) => void
}

const dropZoneRegistry = new Map<string, DropZoneEntry>()

/**
 * Get all registered drop zones — used by the global pointer move handler.
 */
export function getDropZones(): Map<string, DropZoneEntry> {
  return dropZoneRegistry
}

let globalListenerAttached = false
let directoryHoverTimer: ReturnType<typeof setTimeout> | null = null
let directoryHoverTargetId: string | null = null

function attachGlobalListener() {
  if (globalListenerAttached) return
  globalListenerAttached = true

  const handlePointerMove = (e: PointerEvent) => {
    const state = useUIStore.getState()
    if (state.dragState !== 'dragging') return

    const pointerX = e.clientX
    const pointerY = e.clientY

    let bestMatch: {
      zoneKey: string
      entry: DropZoneEntry
      target: DropTarget
    } | null = null
    let bestDistance = Infinity

    // Hit-test all registered drop zones
    for (const [key, entry] of dropZoneRegistry) {
      const rect = entry.element.getBoundingClientRect()
      // Check if pointer is within the element
      if (
        pointerX >= rect.left &&
        pointerX <= rect.right &&
        pointerY >= rect.top &&
        pointerY <= rect.bottom
      ) {
        // Prefer smaller (more specific) elements
        const area = rect.width * rect.height

        if (area < bestDistance) {
          bestDistance = area

          if (entry.type === 'between' || entry.type === 'column') {
            // Compute insertion position within the column
            const dropResult = entry.items
              ? computeDropTarget(pointerY, entry.element, entry.items, {
                  isVirtual: entry.isVirtual,
                })
              : { position: 0, adjacentItemId: null, relativeY: 0 }

            bestMatch = {
              zoneKey: key,
              entry,
              target: {
                type: 'between',
                targetId: entry.targetId ?? '',
                position: dropResult.position,
                rect: rect,
              },
            }
          } else if (entry.type === 'into') {
            bestMatch = {
              zoneKey: key,
              entry,
              target: {
                type: 'into',
                targetId: entry.targetId ?? '',
                position: 0,
                rect: rect,
              },
            }
          } else if (entry.type === 'calendar-date') {
            bestMatch = {
              zoneKey: key,
              entry,
              target: {
                type: 'calendar-date',
                targetId: entry.extraData ?? entry.targetId ?? '',
                position: 0,
                rect: rect,
              },
            }
          } else if (entry.type === 'kanban-column') {
            const dropResult = entry.items
              ? computeDropTarget(pointerY, entry.element, entry.items, {
                  isVirtual: false,
                })
              : { position: 0, adjacentItemId: null, relativeY: 0 }
            bestMatch = {
              zoneKey: key,
              entry,
              target: {
                type: 'kanban-column',
                targetId: entry.extraData ?? entry.targetId ?? '',
                position: dropResult.position,
                rect: rect,
              },
            }
          }
        }
      }
    }

    // Handle directory hover timer for "into" targets
    if (bestMatch) {
      // Check if we're hovering over a column/between zone and an item in it is a directory
      if (
        (bestMatch.target.type === 'between' || bestMatch.target.type === 'column') &&
        bestMatch.entry.items
      ) {
        // Check if pointer is directly over a directory item
        const hoveredEl = document.elementFromPoint(pointerX, pointerY)
        const itemEl = hoveredEl?.closest('[data-item-id]')
        const itemId = itemEl?.getAttribute('data-item-id')
        const isDir = itemEl?.getAttribute('data-item-type') === 'directory'

        if (isDir && itemId) {
          if (directoryHoverTargetId !== itemId) {
            // Start new hover timer
            if (directoryHoverTimer) clearTimeout(directoryHoverTimer)
            directoryHoverTargetId = itemId
            directoryHoverTimer = setTimeout(() => {
              const currentState = useUIStore.getState()
              if (currentState.dragState === 'dragging') {
                const dirRect = itemEl?.getBoundingClientRect()
                useUIStore.getState().updateDropTarget({
                  type: 'into',
                  targetId: itemId,
                  position: 0,
                  rect: dirRect ?? undefined,
                })
              }
              directoryHoverTargetId = null
              directoryHoverTimer = null
            }, DIRECTORY_HOVER_DELAY)
          }
          // Don't update target yet, let timer handle it
        } else {
          // Clear directory hover
          if (directoryHoverTimer) {
            clearTimeout(directoryHoverTimer)
            directoryHoverTimer = null
          }
          directoryHoverTargetId = null
        }
      }

      useUIStore.getState().updateDropTarget(bestMatch.target)
    } else {
      // Clear
      if (directoryHoverTimer) {
        clearTimeout(directoryHoverTimer)
        directoryHoverTimer = null
      }
      directoryHoverTargetId = null
      useUIStore.getState().updateDropTarget(null)
    }
  }

  window.addEventListener('pointermove', handlePointerMove, { passive: true })
}

export function useDrop({
  targetId,
  type,
  items,
  isVirtual,
  disabled = false,
  onDrop,
  acceptsInto,
  extraData,
}: UseDropOptions): UseDropReturn {
  const dropRef = useRef<HTMLElement | null>(null)
  const dragState = useUIStore((s) => s.dragState)
  const dropTarget = useUIStore((s) => s.dropTarget)

  // Generate a stable key for this drop zone
  const zoneKeyRef = useRef<string>(
    `drop-${targetId ?? 'null'}-${type}-${Math.random().toString(36).slice(2, 8)}`
  )

  // Register/unregister drop zone
  useEffect(() => {
    if (disabled || !dropRef.current) return

    const key = zoneKeyRef.current
    dropZoneRegistry.set(key, {
      element: dropRef.current,
      targetId: targetId,
      type,
      items,
      isVirtual,
      acceptsInto,
      extraData,
      onDrop,
    })

    // Ensure global listener is attached
    attachGlobalListener()

    return () => {
      dropZoneRegistry.delete(key)
    }
  }, [targetId, type, items, isVirtual, disabled, acceptsInto, extraData, onDrop])

  // Update the items in registry when they change (without re-registering)
  useEffect(() => {
    const key = zoneKeyRef.current
    const entry = dropZoneRegistry.get(key)
    if (entry) {
      entry.items = items
      entry.isVirtual = isVirtual
    }
  }, [items, isVirtual])

  const isOver =
    dragState === 'dragging' &&
    dropTarget != null &&
    dropTarget.targetId === (targetId ?? '') &&
    dropTarget.type === type

  const isInvalid = isOver && dropTarget?.isInvalid === true

  return {
    dropRef,
    isOver,
    isInvalid,
  }
}
