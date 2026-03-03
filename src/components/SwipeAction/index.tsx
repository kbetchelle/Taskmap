import type { ReactNode } from 'react'
import { Check, Trash2 } from 'lucide-react'
import { useSwipeGesture } from '../../hooks/useSwipeGesture'
import { haptic } from '../../lib/haptics'

interface SwipeActionProps {
  children: ReactNode
  /** Called when swiped right past threshold (complete/cycle status) */
  onSwipeRight?: () => void
  /** Called when swiped left past threshold (trash) */
  onSwipeLeft?: () => void
  /** Disable swipe actions */
  disabled?: boolean
}

/**
 * Swipeable row wrapper for task items on mobile.
 * Swipe right reveals green "Complete" action.
 * Swipe left reveals red "Trash" action.
 */
export function SwipeAction({
  children,
  onSwipeRight,
  onSwipeLeft,
  disabled = false,
}: SwipeActionProps) {
  const { translateX, isSwiping, direction, isTriggered, handlers } = useSwipeGesture({
    threshold: 80,
    onSwipeRight: () => {
      haptic.light()
      onSwipeRight?.()
    },
    onSwipeLeft: () => {
      haptic.light()
      onSwipeLeft?.()
    },
    enabled: !disabled,
  })

  const showRight = direction === 'right' && Math.abs(translateX) > 5
  const showLeft = direction === 'left' && Math.abs(translateX) > 5

  return (
    <div
      className="relative overflow-hidden"
      {...handlers}
    >
      {/* Right swipe background (Complete - green) */}
      {showRight && (
        <div
          className={`absolute inset-y-0 left-0 flex items-center pl-4 transition-colors ${
            isTriggered ? 'bg-green-500' : 'bg-green-400'
          }`}
          style={{ width: Math.abs(translateX) }}
        >
          <Check size={20} className="text-white" />
        </div>
      )}

      {/* Left swipe background (Trash - red) */}
      {showLeft && (
        <div
          className={`absolute inset-y-0 right-0 flex items-center justify-end pr-4 transition-colors ${
            isTriggered ? 'bg-red-500' : 'bg-red-400'
          }`}
          style={{ width: Math.abs(translateX) }}
        >
          <Trash2 size={20} className="text-white" />
        </div>
      )}

      {/* Content row — slides horizontally */}
      <div
        className="relative bg-flow-background"
        style={{
          transform: isSwiping ? `translateX(${translateX}px)` : 'translateX(0)',
          transition: isSwiping ? 'none' : 'transform 200ms ease-out',
        }}
      >
        {children}
      </div>
    </div>
  )
}
