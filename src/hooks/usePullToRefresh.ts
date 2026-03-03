import { useRef, useCallback, useState } from 'react'

const THRESHOLD = 60
const MAX_PULL = 120

interface UsePullToRefreshOptions {
  /** Called when pull-to-refresh is triggered */
  onRefresh: () => Promise<void>
  /** Whether PTR is enabled */
  enabled?: boolean
}

interface UsePullToRefreshReturn {
  /** Current pull distance in px */
  pullDistance: number
  /** Whether a refresh is currently in progress */
  isRefreshing: boolean
  /** Attach these to the scrollable container */
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void
    onTouchMove: (e: React.TouchEvent) => void
    onTouchEnd: () => void
  }
}

/**
 * Pull-to-refresh detection hook for mobile.
 * Only activates when the scroll container is at scrollTop === 0.
 */
export function usePullToRefresh({
  onRefresh,
  enabled = true,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const startYRef = useRef<number | null>(null)
  const isPullingRef = useRef(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || isRefreshing) return
      if (e.touches.length > 1) return

      // Only activate if at scroll top
      const container = e.currentTarget as HTMLElement
      if (container.scrollTop > 0) return

      startYRef.current = e.touches[0].clientY
      isPullingRef.current = false
    },
    [enabled, isRefreshing]
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || isRefreshing || startYRef.current === null) return

      const container = e.currentTarget as HTMLElement
      if (container.scrollTop > 0) {
        // User has scrolled down — abort PTR
        startYRef.current = null
        setPullDistance(0)
        return
      }

      const dy = e.touches[0].clientY - startYRef.current
      if (dy < 0) {
        // Pulling up — not a refresh gesture
        startYRef.current = null
        setPullDistance(0)
        return
      }

      isPullingRef.current = true
      // Apply diminishing returns past threshold
      const clamped = dy > THRESHOLD
        ? THRESHOLD + (dy - THRESHOLD) * 0.4
        : dy
      setPullDistance(Math.min(clamped, MAX_PULL))
    },
    [enabled, isRefreshing]
  )

  const handleTouchEnd = useCallback(() => {
    if (!enabled || !isPullingRef.current) {
      startYRef.current = null
      return
    }

    if (pullDistance >= THRESHOLD && !isRefreshing) {
      setIsRefreshing(true)
      setPullDistance(THRESHOLD) // Hold at threshold during refresh
      onRefresh().finally(() => {
        setIsRefreshing(false)
        setPullDistance(0)
      })
    } else {
      setPullDistance(0)
    }

    startYRef.current = null
    isPullingRef.current = false
  }, [enabled, pullDistance, isRefreshing, onRefresh])

  return {
    pullDistance,
    isRefreshing,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  }
}
