import { useEffect, useRef, useCallback } from 'react'
import { isTouch } from '../lib/mobileDetection'
import { useUIStore } from '../stores/uiStore'
import { haptic } from '../lib/haptics'

export interface TouchGestureCallbacks {
  onSwipeRight?: () => void
  onSwipeLeft?: () => void
  onLongPress?: (clientX: number, clientY: number) => void
}

export function useTouchGestures(
  elementRef: React.RefObject<HTMLElement | null>,
  callbacks: TouchGestureCallbacks,
  enabled = true
): void {
  const { onSwipeRight, onSwipeLeft, onLongPress } = callbacks
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const touchStartTime = useRef(0)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled || !isTouch()) return
      const el = elementRef.current
      if (!el || !el.hasAttribute('data-task-id')) return
      if (e.touches.length === 0) return
      const touch = e.touches[0]
      touchStartX.current = touch.clientX
      touchStartY.current = touch.clientY
      touchStartTime.current = Date.now()

      // Start a long-press timer (500ms) to initiate drag
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
      const startX = touch.clientX
      const startY = touch.clientY
      longPressTimerRef.current = setTimeout(() => {
        longPressTimerRef.current = null
        const itemId = el.getAttribute('data-task-id') ?? el.getAttribute('data-item-id')
        if (itemId) {
          haptic.medium()
          // Initiate new drag system on long-press
          const elementRect = el.getBoundingClientRect()
          const uiStore = useUIStore.getState()
          uiStore.startGrab([itemId], {
            x: startX,
            y: startY,
            elementRect,
          })
          uiStore.startDrag()
          uiStore.updateGhostPosition({ x: startX, y: startY })
        }
        // Also call the legacy callback
        onLongPress?.(startX, startY)
      }, 500)
    },
    [elementRef, enabled, onLongPress]
  )

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!enabled || !isTouch()) return
      const el = elementRef.current
      if (!el || !el.hasAttribute('data-task-id')) return
      if (e.touches.length === 0) return
      const touch = e.touches[0]
      const deltaX = Math.abs(touch.clientX - touchStartX.current)
      const deltaY = Math.abs(touch.clientY - touchStartY.current)

      // Cancel long-press if finger moves too much
      if ((deltaX > 10 || deltaY > 10) && longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
      }

      // If a drag is in progress, update ghost position
      const uiStore = useUIStore.getState()
      if (uiStore.dragState === 'dragging') {
        e.preventDefault()
        uiStore.updateGhostPosition({ x: touch.clientX, y: touch.clientY })
        return
      }

      if (deltaX > deltaY) {
        e.preventDefault()
      }
    },
    [elementRef, enabled]
  )

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!enabled || !isTouch()) return

      // Cancel any pending long-press timer
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
      }

      const el = elementRef.current
      if (!el || !el.hasAttribute('data-task-id')) return

      // If a drag is in progress, complete or cancel it
      const uiStore = useUIStore.getState()
      if (uiStore.dragState === 'dragging') {
        if (uiStore.dropTarget && !uiStore.dropTarget.isInvalid) {
          haptic.double()
          uiStore.completeDrop()
        } else {
          uiStore.cancelDrag()
        }
        return
      }

      if (e.changedTouches.length === 0) return
      const touch = e.changedTouches[0]
      const deltaX = touch.clientX - touchStartX.current
      const deltaTime = Date.now() - touchStartTime.current

      if (Math.abs(deltaX) > 50 && deltaTime < 300) {
        if (deltaX > 0) {
          onSwipeRight?.()
        } else {
          onSwipeLeft?.()
        }
        return
      }
    },
    [elementRef, enabled, onSwipeRight, onSwipeLeft]
  )

  useEffect(() => {
    const el = elementRef.current
    if (!el || !isTouch() || !enabled) return
    if (!el.hasAttribute('data-task-id')) return

    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    el.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
      }
    }
  }, [elementRef, enabled, handleTouchStart, handleTouchMove, handleTouchEnd])
}
