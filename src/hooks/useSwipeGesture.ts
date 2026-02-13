import { useRef, useCallback, useState } from 'react'

export type SwipeDirection = 'left' | 'right' | null

interface UseSwipeGestureOptions {
  /** Minimum horizontal displacement (px) to trigger the action */
  threshold?: number
  /** Called when a swipe action is triggered */
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  /** Whether swipe is enabled */
  enabled?: boolean
}

interface UseSwipeGestureReturn {
  /** Current horizontal translation in px (for animating the row) */
  translateX: number
  /** Whether the user is actively swiping */
  isSwiping: boolean
  /** Direction of the current swipe */
  direction: SwipeDirection
  /** Whether the swipe exceeds the action threshold */
  isTriggered: boolean
  /** Attach these to the swipeable element */
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void
    onTouchMove: (e: React.TouchEvent) => void
    onTouchEnd: () => void
  }
}

/**
 * Reusable swipe gesture detection hook using touch events.
 * Discriminates horizontal vs vertical within the first 10px of movement.
 */
export function useSwipeGesture({
  threshold = 80,
  onSwipeLeft,
  onSwipeRight,
  enabled = true,
}: UseSwipeGestureOptions = {}): UseSwipeGestureReturn {
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const lockedRef = useRef<'horizontal' | 'vertical' | null>(null)
  const [translateX, setTranslateX] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)

  const direction: SwipeDirection =
    translateX > 0 ? 'right' : translateX < 0 ? 'left' : null
  const isTriggered = Math.abs(translateX) >= threshold

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled) return
      // Ignore multi-touch (pinch zoom)
      if (e.touches.length > 1) return
      const touch = e.touches[0]
      startRef.current = { x: touch.clientX, y: touch.clientY }
      lockedRef.current = null
      setIsSwiping(false)
      setTranslateX(0)
    },
    [enabled]
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || !startRef.current) return
      if (e.touches.length > 1) {
        // Multi-touch: abort swipe
        startRef.current = null
        setTranslateX(0)
        setIsSwiping(false)
        return
      }
      const touch = e.touches[0]
      const dx = touch.clientX - startRef.current.x
      const dy = touch.clientY - startRef.current.y

      // Determine gesture direction within first 10px of movement
      if (!lockedRef.current) {
        const absDx = Math.abs(dx)
        const absDy = Math.abs(dy)
        if (absDx < 10 && absDy < 10) return // Not enough movement yet
        lockedRef.current = absDx > absDy ? 'horizontal' : 'vertical'
      }

      // If vertical movement detected, abort swipe (let browser scroll)
      if (lockedRef.current === 'vertical') {
        startRef.current = null
        setIsSwiping(false)
        setTranslateX(0)
        return
      }

      // Horizontal swipe
      setIsSwiping(true)
      // Apply rubber-band effect past threshold
      const clamped = Math.abs(dx) > threshold
        ? Math.sign(dx) * (threshold + (Math.abs(dx) - threshold) * 0.3)
        : dx
      setTranslateX(clamped)
    },
    [enabled, threshold]
  )

  const handleTouchEnd = useCallback(() => {
    if (!enabled) return
    const triggered = Math.abs(translateX) >= threshold
    if (triggered) {
      if (translateX > 0 && onSwipeRight) {
        onSwipeRight()
      } else if (translateX < 0 && onSwipeLeft) {
        onSwipeLeft()
      }
    }
    // Snap back
    startRef.current = null
    lockedRef.current = null
    setTranslateX(0)
    setIsSwiping(false)
  }, [enabled, translateX, threshold, onSwipeLeft, onSwipeRight])

  return {
    translateX,
    isSwiping,
    direction,
    isTriggered,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  }
}
