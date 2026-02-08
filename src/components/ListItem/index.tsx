import { useEffect, useRef, useState, forwardRef } from 'react'

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

export const ListItem = forwardRef<HTMLDivElement, ListItemProps>(function ListItem(
  {
    id,
    title,
    isSelected,
    isFocused,
    isCut = false,
    type,
    draggable = false,
    onDragStart,
    onDragEnd,
    onSelect,
    onExpand,
    className: extraClass = '',
    children,
  },
  forwardedRef
) {
  const internalRef = useRef<HTMLDivElement>(null)
  const ref = mergeRefs(internalRef, forwardedRef)
  const [isDragging, setIsDragging] = useState(false)

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

  return (
    <div
      ref={ref}
      id={`item-${id}`}
      data-item-id={id}
      {...(type === 'task' ? { 'data-task-id': id } : {})}
      role="button"
      tabIndex={isFocused ? 0 : -1}
      draggable={draggable}
      onDragStart={(e) => {
        if (draggable) {
          e.dataTransfer.setData('text/plain', id)
          onDragStart?.(e)
          setIsDragging(true)
        }
      }}
      onDragEnd={(e) => {
        onDragEnd?.(e)
        setIsDragging(false)
      }}
      className={`
        flex items-center gap-2 min-h-[44px] py-3 px-4 md:min-h-[32px] md:py-2 md:px-3 cursor-pointer
        text-flow-task text-flow-textPrimary
        ${bgClass}
        ${isFocused ? 'item-focused' : ''}
        ${isCut ? 'opacity-50' : ''}
        ${isDragging ? 'dragging' : ''}
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
      {children ?? <span className="flex-1 truncate">{title}</span>}
    </div>
  )
})
