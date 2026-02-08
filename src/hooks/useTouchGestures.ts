import { useEffect, useRef, useCallback } from 'react'
import { isTouch } from '../lib/mobileDetection'

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
    },
    [elementRef, enabled]
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
      if (deltaX > deltaY) {
        e.preventDefault()
      }
    },
    [elementRef, enabled]
  )

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!enabled || !isTouch()) return
      const el = elementRef.current
      if (!el || !el.hasAttribute('data-task-id')) return
      if (e.changedTouches.length === 0) return
      const touch = e.changedTouches[0]
      const deltaX = touch.clientX - touchStartX.current
      const deltaY = touch.clientY - touchStartY.current
      const deltaTime = Date.now() - touchStartTime.current

      if (Math.abs(deltaX) > 50 && deltaTime < 300) {
        if (deltaX > 0) {
          onSwipeRight?.()
        } else {
          onSwipeLeft?.()
        }
        return
      }

      if (deltaTime > 500 && Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
        onLongPress?.(touch.clientX, touch.clientY)
      }
    },
    [elementRef, enabled, onSwipeRight, onSwipeLeft, onLongPress]
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
    }
  }, [elementRef, enabled, handleTouchStart, handleTouchMove, handleTouchEnd])
}
