import type { Directory } from '../../types'
import { ListItem } from '../ListItem'
import { highlightSearchTerms } from '../../lib/utils'

interface DirectoryItemProps {
  directory: Directory
  hasChildren: boolean
  isOverdue: boolean
  isSelected: boolean
  isFocused: boolean
  isCut?: boolean
  daysUntilActive?: number
  searchQuery?: string
  draggable?: boolean
  onDragStart?: (e: React.DragEvent) => void
  onDragEnd?: (e: React.DragEvent) => void
  itemCount?: number
  onSelect: (event?: React.MouseEvent) => void
  onExpand: () => void
}

export function DirectoryItem({
  directory,
  hasChildren,
  isOverdue,
  isSelected,
  isFocused,
  isCut = false,
  daysUntilActive = 0,
  searchQuery,
  draggable = false,
  onDragStart,
  onDragEnd,
  itemCount = 0,
  onSelect,
  onExpand,
}: DirectoryItemProps) {
  return (
    <ListItem
      id={directory.id}
      title={directory.name}
      isSelected={isSelected}
      isFocused={isFocused}
      isCut={isCut}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      type="directory"
      onSelect={onSelect}
      onExpand={onExpand}
    >
      {isOverdue && (
        <span
          className="flex-shrink-0 w-4 h-4 rounded-full bg-flow-error text-white text-flow-meta font-flow-semibold flex items-center justify-center mr-2"
          aria-label="Overdue"
        >
          !
        </span>
      )}
      {searchQuery ? (
        <span
          className="flex-1 truncate font-flow-semibold text-flow-dir text-flow-textPrimary"
          dangerouslySetInnerHTML={{ __html: highlightSearchTerms(directory.name, searchQuery) }}
        />
      ) : (
        <span className="flex-1 truncate font-flow-semibold text-flow-dir text-flow-textPrimary">
          {directory.name}
        </span>
      )}
      {daysUntilActive > 0 && (
        <span className="flex-shrink-0 text-flow-meta text-flow-textSecondary ml-1">
          {daysUntilActive === 1 ? 'Tomorrow' : `in ${daysUntilActive} days`}
        </span>
      )}
      {hasChildren && (
        <span className="flex-shrink-0 text-flow-textSecondary text-lg ml-auto" aria-hidden>
          ›
        </span>
      )}
      {itemCount > 0 && (
        <span className="flex-shrink-0 text-flow-meta text-flow-textSecondary ml-1">
          {itemCount} items
        </span>
      )}
    </ListItem>
  )
}
