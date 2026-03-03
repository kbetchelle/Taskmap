import { useCallback, useRef, useEffect } from 'react'
import type { SearchResult } from './useQuickSearch'

interface ResultRowProps {
  result: SearchResult
  isSelected: boolean
  flatIndex: number
  onSelect: (index: number) => void
  onExecute: (result: SearchResult) => void
}

export function ResultRow({
  result,
  isSelected,
  flatIndex,
  onSelect,
  onExecute,
}: ResultRowProps) {
  const rowRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isSelected && rowRef.current) {
      rowRef.current.scrollIntoView({ block: 'nearest' })
    }
  }, [isSelected])

  const handleMouseEnter = useCallback(() => {
    onSelect(flatIndex)
  }, [flatIndex, onSelect])

  const handleClick = useCallback(() => {
    onExecute(result)
  }, [result, onExecute])

  const Icon = result.icon

  return (
    <button
      ref={rowRef}
      type="button"
      role="option"
      aria-selected={isSelected}
      data-result-id={result.id}
      className={`w-full h-10 px-3 flex items-center gap-3 rounded-md cursor-pointer text-left transition-colors ${
        isSelected ? 'bg-flow-focus/10' : 'hover:bg-flow-columnBorder/30'
      }`}
      onMouseEnter={handleMouseEnter}
      onClick={handleClick}
    >
      <Icon size={18} className="shrink-0 text-flow-textSecondary" />
      <span className="flex-1 text-flow-task text-flow-textPrimary truncate">
        {result.label}
      </span>
      {result.breadcrumb && (
        <span className="shrink-0 text-flow-meta text-flow-textSecondary truncate max-w-[200px]">
          {result.breadcrumb}
        </span>
      )}
      {result.shortcutHint && !result.breadcrumb && (
        <span className="shrink-0 text-flow-meta text-flow-textSecondary">
          {result.shortcutHint}
        </span>
      )}
    </button>
  )
}
