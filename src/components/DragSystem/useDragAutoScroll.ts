/**
 * useDragAutoScroll — Auto-scroll near viewport/container edges during drag.
 *
 * Activates when dragState === 'dragging'. Uses requestAnimationFrame for
 * smooth performance.
 *
 * - Vertical: scrolls column containers when pointer is within 60px of top/bottom
 * - Horizontal: scrolls the columns container when pointer is within 60px of left/right viewport edge
 */

import { useEffect, useRef } from 'react'
import { useUIStore } from '../../stores/uiStore'

const EDGE_THRESHOLD = 60
const MAX_SCROLL_SPEED = 12
const SPEED_FACTOR = 0.2

interface UseDragAutoScrollOptions {
  /** Ref to the horizontal columns scroll container */
  horizontalScrollRef: React.RefObject<HTMLElement | null>
  /** Refs to vertical column scroll containers */
  verticalScrollRefs?: React.RefObject<HTMLElement | null>[]
}

export function useDragAutoScroll({
  horizontalScrollRef,
  verticalScrollRefs = [],
}: UseDragAutoScrollOptions) {
  const dragState = useUIStore((s) => s.dragState)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (dragState !== 'dragging') {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      return
    }

    const tick = () => {
      const pos = useUIStore.getState().dragGhostPosition
      if (!pos) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      const { x, y } = pos

      // Horizontal auto-scroll (columns container)
      const hEl = horizontalScrollRef.current
      if (hEl) {
        const hRect = hEl.getBoundingClientRect()
        const leftDist = x - hRect.left
        const rightDist = hRect.right - x

        if (leftDist < EDGE_THRESHOLD && leftDist >= 0) {
          const speed = Math.min((EDGE_THRESHOLD - leftDist) * SPEED_FACTOR, MAX_SCROLL_SPEED)
          hEl.scrollLeft -= speed
        } else if (rightDist < EDGE_THRESHOLD && rightDist >= 0) {
          const speed = Math.min((EDGE_THRESHOLD - rightDist) * SPEED_FACTOR, MAX_SCROLL_SPEED)
          hEl.scrollLeft += speed
        }
      }

      // Vertical auto-scroll (column scroll containers)
      for (const vRef of verticalScrollRefs) {
        const vEl = vRef.current
        if (!vEl) continue

        const vRect = vEl.getBoundingClientRect()
        // Only process if the pointer is horizontally within this column
        if (x < vRect.left || x > vRect.right) continue

        const topDist = y - vRect.top
        const bottomDist = vRect.bottom - y

        if (topDist < EDGE_THRESHOLD && topDist >= 0) {
          const speed = Math.min((EDGE_THRESHOLD - topDist) * SPEED_FACTOR, MAX_SCROLL_SPEED)
          vEl.scrollTop -= speed
        } else if (bottomDist < EDGE_THRESHOLD && bottomDist >= 0) {
          const speed = Math.min((EDGE_THRESHOLD - bottomDist) * SPEED_FACTOR, MAX_SCROLL_SPEED)
          vEl.scrollTop += speed
        }
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [dragState, horizontalScrollRef, verticalScrollRefs])
}
