import { useRef, useEffect } from 'react'
import type { TreeNode as TreeNodeType } from '../../types/sidebar'

interface TreeNodeProps {
  node: TreeNodeType
  depth: number
  isActive: boolean
  isFocusedItem?: boolean
  isFocused: boolean
  isExpanded: boolean
  childCount?: number
  breadcrumb?: string
  onChevronClick: (e: React.MouseEvent) => void
  onNodeClick: () => void
  onFocus: () => void
}

export function TreeNode({
  node,
  depth,
  isActive,
  isFocusedItem = false,
  isFocused,
  isExpanded,
  childCount = 0,
  breadcrumb,
  onChevronClick,
  onNodeClick,
  onFocus,
}: TreeNodeProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isFocused && ref.current) {
      ref.current.focus()
      ref.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [isFocused])

  const isDir = node.type === 'directory'
  const showChevron = isDir && childCount > 0

  const bgClass = isActive
    ? 'bg-flow-focus/10 text-flow-focus'
    : isFocusedItem
      ? 'bg-flow-focus/5 text-flow-focus'
      : isFocused
        ? 'bg-flow-columnBorder/30'
        : 'hover:bg-flow-columnBorder/20'

  return (
    <div
      ref={ref}
      role="treeitem"
      tabIndex={isFocused ? 0 : -1}
      data-node-id={node.id}
      className={`flex items-center gap-1 min-h-[28px] px-2 py-1 cursor-pointer rounded transition-colors outline-none ${bgClass}`}
      style={{ paddingLeft: 8 + depth * 16 }}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('[data-chevron]')) return
        onNodeClick()
      }}
      onFocus={onFocus}
    >
      <span className="flex-shrink-0 w-4 flex items-center justify-center">
        {showChevron ? (
          <button
            type="button"
            data-chevron
            className="p-0 border-0 bg-transparent cursor-pointer text-flow-textSecondary hover:text-flow-textPrimary text-xs leading-none"
            onClick={(e) => {
              e.stopPropagation()
              onChevronClick(e)
            }}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        ) : (
          <span className="w-4 inline-block" aria-hidden />
        )}
      </span>
      <span className="flex-shrink-0 text-base" aria-hidden>
        {isDir ? '📁' : node.isCompleted ? '✅' : '☐'}
      </span>
      <span className="flex-1 min-w-0 truncate font-flow-medium text-flow-task">
        {breadcrumb ? (
          <span className="text-flow-textSecondary text-flow-meta truncate block">
            {breadcrumb} ›
          </span>
        ) : null}
        <span
          className={
            node.type === 'task' && node.isCompleted
              ? 'opacity-50 line-through'
              : ''
          }
        >
          {node.name}
        </span>
      </span>
      {isDir && (
        <span className="flex-shrink-0 text-flow-meta text-flow-textSecondary">
          ({childCount})
        </span>
      )}
    </div>
  )
}
