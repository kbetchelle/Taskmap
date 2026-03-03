import type { ReactNode } from 'react'
import { usePullToRefresh } from '../../hooks/usePullToRefresh'

interface PullToRefreshProps {
  children: ReactNode
  /** Called when pull-to-refresh is triggered */
  onRefresh: () => Promise<void>
  /** Whether PTR is enabled (typically only on mobile) */
  enabled?: boolean
}

/**
 * Pull-to-refresh wrapper component for mobile.
 * Shows a circular spinner above the content proportional to pull distance.
 */
export function PullToRefresh({
  children,
  onRefresh,
  enabled = true,
}: PullToRefreshProps) {
  const { pullDistance, isRefreshing, handlers } = usePullToRefresh({
    onRefresh,
    enabled,
  })

  const showIndicator = pullDistance > 0 || isRefreshing

  return (
    <div
      className="relative h-full overflow-y-auto"
      data-scroll-container=""
      {...handlers}
    >
      {/* Pull indicator */}
      {showIndicator && (
        <div
          className="flex items-center justify-center overflow-hidden transition-[height] duration-150"
          style={{ height: pullDistance }}
        >
          <div
            className={`w-6 h-6 border-2 border-flow-focus border-t-transparent rounded-full ${
              isRefreshing ? 'animate-[ptrSpin_800ms_linear_infinite]' : ''
            }`}
            style={{
              opacity: Math.min(pullDistance / 60, 1),
              transform: `rotate(${pullDistance * 4}deg)`,
            }}
          />
        </div>
      )}

      {/* Content */}
      <div
        style={{
          transform: showIndicator ? `translateY(${pullDistance > 0 && !isRefreshing ? pullDistance : 0}px)` : undefined,
        }}
      >
        {children}
      </div>
    </div>
  )
}
