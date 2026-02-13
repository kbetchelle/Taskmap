import { useEffect, useRef, forwardRef } from 'react'
import { useAppStore } from '../../stores/appStore'
import { useUIStore } from '../../stores/uiStore'
import { useDrag } from '../DragSystem/useDrag'

interface ListItemProps {
  id: string
  title: string
  isSelected: boolean
  isFocused: boolean
  isCut?: boolean
  type: 'task' | 'directory'
  draggable?: boolean
  onDragStart?: (e: React.DragEvent) => void
  onDragEnd?: (e: React.DragEvent) => void
  onSelect: (event?: React.MouseEvent) => void
  onExpand: () => void
  className?: string
  children?: React.ReactNode
}

function mergeRefs<T>(...refs: (React.Ref<T> | undefined)[]) {
  return (el: T | null) => {
    refs.forEach((r) => {
      if (typeof r === 'function') r(el)
      else if (r) (r as React.MutableRefObject<T | null>).current = el
    })
  }
}

/** 6-dot grip SVG icon for drag handle */
function GripIcon({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <circle cx="5" cy="3" r="1.5" />
      <circle cx="11" cy="3" r="1.5" />
      <circle cx="5" cy="8" r="1.5" />
      <circle cx="11" cy="8" r="1.5" />
      <circle cx="5" cy="13" r="1.5" />
      <circle cx="11" cy="13" r="1.5" />
    </svg>
  )
}

export const ListItem = forwardRef<HTMLDivElement, ListItemProps>(function ListItem(
  {
    id,
    title,
    isSelected,
    isFocused,
    isCut = false,
    type,
    draggable = false,
    onDragStart: _onDragStart,
    onDragEnd: _onDragEnd,
    onSelect,
    onExpand,
    className: extraClass = '',
    children,
  },
  forwardedRef
) {
  const internalRef = useRef<HTMLDivElement>(null)
  const ref = mergeRefs(internalRef, forwardedRef)
  const isGrabbed = useAppStore((s) => s.grabModeItemId === id)
  const dragState = useUIStore((s) => s.dragState)

  // New pointer-events drag system
  const { handlePointerDown, isDragging, isAnyDragActive } = useDrag({
    itemId: id,
    disabled: !draggable,
  })

  useEffect(() => {
    if (isFocused && internalRef.current) {
      internalRef.current.focus()
      internalRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [isFocused])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      onExpand()
    }
  }

  const bgClass = isSelected && isFocused
    ? 'bg-[#E8E8E8]'
    : isSelected
    ? 'bg-[#F5F5F5]'
    : 'bg-transparent'

  // Item is a ghost placeholder when being dragged
  const isBeingDragged = isDragging && dragState === 'dragging'

  return (
    <div
      ref={ref}
      id={`item-${id}`}
      data-item-id={id}
      data-item-type={type}
      {...(type === 'task' ? { 'data-task-id': id } : {})}
      role="button"
      tabIndex={isFocused ? 0 : -1}
      className={`
        group flex items-center gap-1 min-h-[44px] py-3 px-1 md:min-h-[32px] md:py-2 md:px-1 cursor-pointer
        text-flow-task text-flow-textPrimary
        ${bgClass}
        ${isFocused ? 'item-focused' : ''}
        ${isCut ? 'opacity-50' : ''}
        ${isBeingDragged ? 'opacity-30' : ''}
        ${isGrabbed ? 'ring-2 ring-flow-focus shadow-md animate-pulse' : ''}
        ${isAnyDragActive ? 'transition-transform duration-200 ease-in-out' : ''}
        ${extraClass}
      `}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(e)
      }}
      onDoubleClick={(e) => {
        e.stopPropagation()
        onExpand()
      }}
      onKeyDown={handleKeyDown}
    >
      {/* Grab handle — visible on hover, hidden on touch */}
      {draggable && (
        <div
          className={`
            flex-shrink-0 flex items-center justify-center w-4 h-4
            opacity-0 group-hover:opacity-100 transition-opacity duration-150
            touch:hidden
            ${isAnyDragActive ? 'cursor-grabbing' : 'cursor-grab'}
            text-flow-textSecondary hover:text-flow-textPrimary
          `}
          onPointerDown={handlePointerDown}
          aria-label="Drag handle"
        >
          <GripIcon />
        </div>
      )}
      {/* Content: children or default title */}
      <div className="flex-1 min-w-0 flex items-center gap-2 px-2">
        {children ?? <span className="flex-1 truncate">{title}</span>}
      </div>
    </div>
  )
})
