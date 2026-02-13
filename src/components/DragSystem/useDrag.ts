/**
 * useDrag – Hook for drag source behavior.
 *
 * Attaches pointer events to a grab handle element. Implements the drag
 * state machine with a 5px dead zone before transitioning to dragging.
 * Supports multi-select drag when the grabbed item is part of the selection.
 */

import { useCallback, useRef, useEffect } from 'react'
import { useUIStore } from '../../stores/uiStore'
import { useAppStore } from '../../stores/appStore'

const DRAG_THRESHOLD = 5

interface UseDragOptions {
  itemId: string
  /** Whether this item is enabled for dragging */
  disabled?: boolean
}

interface UseDragReturn {
  /** Attach this to the grab handle's onPointerDown */
  handlePointerDown: (e: React.PointerEvent) => void
  /** Whether this item is currently being dragged */
  isDragging: boolean
  /** Whether any drag is in progress (for cursor styling) */
  isAnyDragActive: boolean
}

export function useDrag({ itemId, disabled = false }: UseDragOptions): UseDragReturn {
  const dragState = useUIStore((s) => s.dragState)
  const draggedItemIds = useUIStore((s) => s.draggedItemIds)
  const startGrab = useUIStore((s) => s.startGrab)
  const startDrag = useUIStore((s) => s.startDrag)
  const updateGhostPosition = useUIStore((s) => s.updateGhostPosition)
  const completeDrop = useUIStore((s) => s.completeDrop)
  const cancelDrag = useUIStore((s) => s.cancelDrag)
  const selectedItems = useAppStore((s) => s.selectedItems)

  const startPosRef = useRef<{ x: number; y: number } | null>(null)
  const isLocalGrabRef = useRef(false)
  const pointerIdRef = useRef<number | null>(null)
  const handleElRef = useRef<HTMLElement | null>(null)

  const isDragging = draggedItemIds.includes(itemId)
  const isAnyDragActive = dragState !== 'idle'

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return
      if (e.button !== 0) return // Only left mouse button

      e.preventDefault()
      e.stopPropagation()

      const target = e.currentTarget as HTMLElement
      handleElRef.current = target
      target.setPointerCapture(e.pointerId)
      pointerIdRef.current = e.pointerId
      startPosRef.current = { x: e.clientX, y: e.clientY }
      isLocalGrabRef.current = true

      // Determine which items to drag
      const itemIds = selectedItems.includes(itemId)
        ? [...selectedItems]
        : [itemId]

      // Get the element rect for origin
      const itemEl = document.querySelector(`[data-item-id="${itemId}"]`)
      const elementRect = itemEl?.getBoundingClientRect() ?? new DOMRect(e.clientX, e.clientY, 0, 0)

      startGrab(itemIds, {
        x: e.clientX,
        y: e.clientY,
        elementRect,
      })
    },
    [disabled, itemId, selectedItems, startGrab]
  )

  // Global pointer move/up handlers
  useEffect(() => {
    if (!isLocalGrabRef.current) return

    const handlePointerMove = (e: PointerEvent) => {
      if (pointerIdRef.current !== null && e.pointerId !== pointerIdRef.current) return
      if (!startPosRef.current) return

      const dx = e.clientX - startPosRef.current.x
      const dy = e.clientY - startPosRef.current.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      const currentDragState = useUIStore.getState().dragState

      if (currentDragState === 'grabbed' && distance >= DRAG_THRESHOLD) {
        startDrag()
      }

      if (currentDragState === 'dragging' || distance >= DRAG_THRESHOLD) {
        updateGhostPosition({ x: e.clientX, y: e.clientY })
      }
    }

    const handlePointerUp = (e: PointerEvent) => {
      if (pointerIdRef.current !== null && e.pointerId !== pointerIdRef.current) return

      const currentState = useUIStore.getState()
      if (currentState.dragState === 'dragging' && currentState.dropTarget && !currentState.dropTarget.isInvalid) {
        completeDrop()
      } else {
        cancelDrag()
      }

      cleanup()
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelDrag()
        cleanup()
      }
    }

    const cleanup = () => {
      isLocalGrabRef.current = false
      startPosRef.current = null
      if (handleElRef.current && pointerIdRef.current !== null) {
        try {
          handleElRef.current.releasePointerCapture(pointerIdRef.current)
        } catch {
          // ignore if already released
        }
      }
      pointerIdRef.current = null
      handleElRef.current = null
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [dragState, startDrag, updateGhostPosition, completeDrop, cancelDrag])

  return {
    handlePointerDown,
    isDragging,
    isAnyDragActive,
  }
}
