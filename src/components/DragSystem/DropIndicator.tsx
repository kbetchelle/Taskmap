/**
 * DropIndicator — Visual drop zone feedback.
 *
 * - Between items: 2px blue horizontal line with circles at each end
 * - Into directory: ring highlight on the directory item
 * - Column: subtle background tint
 * - Invalid: red border with not-allowed cursor
 */

import { useUIStore } from '../../stores/uiStore'

interface DropIndicatorProps {
  /** The directory/column ID this indicator is for */
  targetId: string | null
  /** The container element ref for positioning */
  containerRef: React.RefObject<HTMLElement | null>
}

export function DropIndicator({ targetId, containerRef }: DropIndicatorProps) {
  const dragState = useUIStore((s) => s.dragState)
  const dropTarget = useUIStore((s) => s.dropTarget)

  if (dragState !== 'dragging' || !dropTarget) return null

  // Only render for this column/target
  const isTargetMatch = dropTarget.targetId === (targetId ?? '')

  if (!isTargetMatch) return null

  if (dropTarget.type === 'between') {
    return <BetweenIndicator position={dropTarget.position} containerRef={containerRef} />
  }

  if (dropTarget.type === 'into') {
    return <IntoIndicator targetId={dropTarget.targetId} isInvalid={dropTarget.isInvalid} />
  }

  if (dropTarget.type === 'column') {
    return <ColumnIndicator />
  }

  return null
}

/**
 * Line indicator shown between items at the insertion point.
 */
function BetweenIndicator({
  position,
  containerRef,
}: {
  position: number
  containerRef: React.RefObject<HTMLElement | null>
}) {
  // Calculate Y position based on the item at `position`
  const container = containerRef.current
  if (!container) return null

  const rows = container.querySelectorAll('[data-item-id]')
  let topOffset = 0

  if (rows.length === 0) {
    topOffset = 0
  } else if (position === 0) {
    const firstRect = rows[0].getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    topOffset = firstRect.top - containerRect.top - 1
  } else if (position >= rows.length) {
    const lastRect = rows[rows.length - 1].getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    topOffset = lastRect.bottom - containerRect.top - 1
  } else {
    const prevRect = rows[position - 1].getBoundingClientRect()
    const currentRect = rows[position].getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    topOffset = (prevRect.bottom + currentRect.top) / 2 - containerRect.top
  }

  return (
    <div
      className="absolute left-2 right-2 pointer-events-none z-10"
      style={{
        top: `${topOffset}px`,
        transition: 'top 150ms ease-out',
      }}
    >
      {/* Line */}
      <div className="h-[2px] bg-flow-focus rounded-full relative">
        {/* Left circle */}
        <div className="absolute -left-1 -top-[2px] w-[6px] h-[6px] rounded-full bg-flow-focus" />
        {/* Right circle */}
        <div className="absolute -right-1 -top-[2px] w-[6px] h-[6px] rounded-full bg-flow-focus" />
      </div>
    </div>
  )
}

/**
 * Highlight shown when hovering over a directory (drop into).
 */
function IntoIndicator({
  targetId,
  isInvalid,
}: {
  targetId: string
  isInvalid?: boolean
}) {
  const el = document.querySelector(`[data-item-id="${targetId}"]`)
  if (!el) return null

  const ringClass = isInvalid
    ? 'ring-2 ring-flow-error ring-inset cursor-not-allowed'
    : 'ring-2 ring-flow-focus ring-inset bg-flow-focus/10'

  // Apply the class directly to the element via a portal-free approach
  // We use a positioned overlay instead
  const rect = el.getBoundingClientRect()
  const parentRect = el.parentElement?.getBoundingClientRect()
  if (!parentRect) return null

  return (
    <div
      className={`absolute pointer-events-none z-10 rounded ${ringClass}`}
      style={{
        top: `${rect.top - parentRect.top}px`,
        left: `${rect.left - parentRect.left}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        transition: 'all 150ms ease-out',
      }}
    />
  )
}

/**
 * Subtle tint shown when hovering over an entire column.
 */
function ColumnIndicator() {
  return (
    <div className="absolute inset-0 bg-flow-focus/5 pointer-events-none z-0 rounded" />
  )
}

/**
 * Standalone component for use in non-column contexts (sidebar, kanban, etc.)
 */
export function DropHighlight({
  isOver,
  isInvalid,
  type = 'into',
}: {
  isOver: boolean
  isInvalid?: boolean
  type?: 'into' | 'column'
}) {
  if (!isOver) return null

  if (type === 'into') {
    const ringClass = isInvalid
      ? 'ring-2 ring-flow-error ring-inset'
      : 'ring-2 ring-flow-focus ring-inset bg-flow-focus/10'
    return (
      <div className={`absolute inset-0 pointer-events-none z-10 rounded ${ringClass}`} />
    )
  }

  return (
    <div className="absolute inset-0 bg-flow-focus/5 pointer-events-none z-0 rounded" />
  )
}
