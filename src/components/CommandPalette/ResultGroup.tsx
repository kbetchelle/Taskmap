import type { ResultGroup as ResultGroupType, SearchResult } from './useQuickSearch'
import { ResultRow } from './ResultRow'

interface ResultGroupProps {
  group: ResultGroupType
  startIndex: number
  selectedIndex: number
  onSelect: (index: number) => void
  onExecute: (result: SearchResult) => void
}

export function ResultGroup({
  group,
  startIndex,
  selectedIndex,
  onSelect,
  onExecute,
}: ResultGroupProps) {
  return (
    <div className="mb-1" role="group" aria-label={group.label}>
      <div className="text-flow-meta text-flow-textSecondary uppercase tracking-wider font-flow-semibold px-3 py-1.5">
        {group.label}
      </div>
      {group.results.map((result, i) => {
        const flatIndex = startIndex + i
        return (
          <ResultRow
            key={result.id}
            result={result}
            isSelected={flatIndex === selectedIndex}
            flatIndex={flatIndex}
            onSelect={onSelect}
            onExecute={onExecute}
          />
        )
      })}
    </div>
  )
}
