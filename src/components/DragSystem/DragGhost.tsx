/**
 * DragGhost — Custom drag ghost element rendered via React Portal.
 *
 * Shows a semi-transparent clone of the dragged item(s) following the cursor.
 * For multi-item drag, shows a stacked card effect with count badge.
 * Animates on drop (slides to target) and cancel (returns to origin).
 */

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useUIStore } from '../../stores/uiStore'

interface DragGhostProps {
  /** Map of item IDs to their display titles */
  itemTitles: Record<string, string>
  /** Map of item IDs to their types */
  itemTypes: Record<string, 'task' | 'directory'>
}

export function DragGhost({ itemTitles, itemTypes }: DragGhostProps) {
  const dragState = useUIStore((s) => s.dragState)
  const draggedItemIds = useUIStore((s) => s.draggedItemIds)
  const ghostPosition = useUIStore((s) => s.dragGhostPosition)
  const dragOrigin = useUIStore((s) => s.dragOrigin)
  const dropTarget = useUIStore((s) => s.dropTarget)

  const [animating, setAnimating] = useState<'none' | 'drop' | 'cancel'>('none')
  const [animationTarget, setAnimationTarget] = useState<{ x: number; y: number } | null>(null)
  const ghostRef = useRef<HTMLDivElement>(null)
  const prevDragStateRef = useRef(dragState)

  // Detect state transitions for animation
  useEffect(() => {
    const prev = prevDragStateRef.current
    prevDragStateRef.current = dragState

    if (prev === 'dragging' && dragState === 'idle') {
      // Drag ended — determine if it was a drop or cancel
      if (dropTarget?.rect) {
        setAnimating('drop')
        setAnimationTarget({
          x: dropTarget.rect.left + dropTarget.rect.width / 2,
          y: dropTarget.rect.top + dropTarget.rect.height / 2,
        })
      } else if (dragOrigin) {
        setAnimating('cancel')
        setAnimationTarget({
          x: dragOrigin.elementRect.left + dragOrigin.elementRect.width / 2,
          y: dragOrigin.elementRect.top + dragOrigin.elementRect.height / 2,
        })
      }

      // Clean up after animation
      const timer = setTimeout(() => {
        setAnimating('none')
        setAnimationTarget(null)
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [dragState, dropTarget, dragOrigin])

  // Don't render if not dragging and not animating
  if (dragState !== 'dragging' && animating === 'none') return null
  if (!ghostPosition && animating === 'none') return null

  const count = draggedItemIds.length
  const primaryId = draggedItemIds[0]
  const primaryTitle = primaryId ? (itemTitles[primaryId] ?? 'Item') : 'Item'
  const primaryType = primaryId ? (itemTypes[primaryId] ?? 'task') : 'task'

  // Determine position
  let x: number
  let y: number

  if (animating !== 'none' && animationTarget) {
    x = animationTarget.x
    y = animationTarget.y
  } else if (ghostPosition) {
    x = ghostPosition.x
    y = ghostPosition.y
  } else {
    return null
  }

  const ghost = (
    <div
      ref={ghostRef}
      className="fixed pointer-events-none z-[9999]"
      style={{
        left: 0,
        top: 0,
        transform: `translate(${x - 120}px, ${y - 20}px)`,
        transition: animating !== 'none' ? 'transform 200ms ease-out, opacity 200ms ease-out' : 'none',
        opacity: animating !== 'none' ? 0 : 1,
      }}
    >
      {/* Stacked card shadows for multi-item */}
      {count > 1 && (
        <>
          <div
            className="absolute inset-0 bg-flow-background border border-flow-columnBorder rounded-lg shadow-md"
            style={{ transform: 'translate(4px, 4px) rotate(2deg)' }}
          />
          {count > 2 && (
            <div
              className="absolute inset-0 bg-flow-background border border-flow-columnBorder rounded-lg shadow-md"
              style={{ transform: 'translate(8px, 8px) rotate(3deg)' }}
            />
          )}
        </>
      )}

      {/* Main ghost card */}
      <div
        className="relative bg-flow-background border border-flow-columnBorder rounded-lg shadow-xl px-4 py-2 min-w-[200px] max-w-[260px]"
        style={{
          opacity: 0.85,
          transform: 'scale(1.05) rotate(1deg)',
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm opacity-60">
            {primaryType === 'directory' ? '📁' : '☐'}
          </span>
          <span className="text-flow-task text-flow-textPrimary truncate flex-1">
            {primaryTitle}
          </span>
        </div>
      </div>

      {/* Count badge for multi-item */}
      {count > 1 && (
        <div
          className="absolute -top-2 -right-2 bg-flow-focus text-white text-xs font-flow-semibold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5"
        >
          {count}
        </div>
      )}
    </div>
  )

  return createPortal(ghost, document.body)
}
