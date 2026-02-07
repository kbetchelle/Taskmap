import { useEffect, useRef, useState } from 'react'

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

export function ListItem({
  id,
  title,
  isSelected,
  isFocused,
  isCut = false,
  draggable = false,
  onDragStart,
  onDragEnd,
  onSelect,
  onExpand,
  className: extraClass = '',
  children,
}: ListItemProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    if (isFocused && ref.current) {
      ref.current.focus()
      ref.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
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
        flex items-center gap-2 py-2 px-3 min-h-[32px] cursor-pointer
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
}
