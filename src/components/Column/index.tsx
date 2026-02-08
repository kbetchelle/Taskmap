import { useState, useCallback, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { Task, Directory } from '../../types'
import { useDirectoryContents } from '../../hooks/useDirectoryContents'
import type { ColorMode } from '../../types/state'
import type { CreationState, InlineEditState } from '../../stores/uiStore'
import { COLUMN_WIDTH_PX } from '../../lib/theme'
import { DirectoryItem } from '../DirectoryItem'
import { TaskItem } from '../TaskItem'
import { TypeSelectorRow } from '../TypeSelectorRow'
import { DirectoryInlineInput } from '../DirectoryInlineInput'

function isTask(item: Task | Directory): item is Task {
  return 'directory_id' in item
}

function isOverdueTask(task: Task): boolean {
  if (task.is_completed || task.due_date == null) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(task.due_date)
  due.setHours(0, 0, 0, 0)
  return due < today
}

function isOverdueDirectory(_dir: Directory): boolean {
  return false
}

function daysUntilActive(startDate: string | null): number {
  if (!startDate) return 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(startDate)
  target.setHours(0, 0, 0, 0)
  if (target <= today) return 0
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

interface ColumnProps {
  columnIndex: number
  directoryId: string | null
  directoryName: string | null
  items: (Task | Directory)[]
  selectedItemIds: string[]
  focusedItemId: string | null
  isActive: boolean
  onItemSelect: (id: string, event?: React.MouseEvent) => void
  onItemExpand: (item: Task | Directory) => void
  colorMode: ColorMode
  viewMode?: 'main_db' | 'upcoming'
  searchQuery?: string
  onColumnFocus: () => void
  childCountByDirectoryId: Record<string, number>
  creationState: CreationState | null
  onDirectorySave?: (itemId: string, name: string) => void
  onDirectoryCancel?: () => void
  inlineEditState: InlineEditState | null
  onInlineSave?: (itemId: string, value: string) => void
  onInlineCancel?: () => void
  cutItemIds: string[]
  onItemDragStart?: (id: string) => void
  onItemDragEnd?: () => void
  onDrop?: (targetDirectoryId: string | null, position: number, itemId: string) => void
  usePagination?: boolean
  fullWidth?: boolean
  onTaskSwipeRight?: (taskId: string) => void
  onTaskSwipeLeft?: (taskId: string) => void
  onTaskLongPress?: (taskId: string, clientX: number, clientY: number) => void
}

export function Column({
  columnIndex,
  directoryId,
  directoryName,
  items,
  selectedItemIds,
  focusedItemId,
  onItemSelect,
  onItemExpand,
  colorMode,
  viewMode = 'main_db',
  searchQuery,
  onColumnFocus,
  childCountByDirectoryId,
  creationState,
  onDirectorySave,
  onDirectoryCancel,
  inlineEditState,
  onInlineSave,
  onInlineCancel,
  cutItemIds = [],
  onItemDragStart,
  onItemDragEnd,
  onDrop,
  usePagination = false,
  fullWidth = false,
  onTaskSwipeRight,
  onTaskSwipeLeft,
  onTaskLongPress,
}: ColumnProps) {
  const headerLabel = directoryId == null ? 'Root' : directoryName ?? ''
  const [dropIndex, setDropIndex] = useState<number>(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const ROW_ESTIMATE = 40
  const VIRTUAL_THRESHOLD = 80

  const {
    data: queryData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useDirectoryContents(directoryId, usePagination)

  const paginatedItems = queryData?.pages.flatMap((p) => p.items) ?? []
  const displayItems = usePagination && directoryId != null ? paginatedItems : items
  const loadingMore = isFetchingNextPage

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget
      const { scrollTop, scrollHeight, clientHeight } = el
      if (hasNextPage && !isFetchingNextPage && scrollHeight - scrollTop <= clientHeight * 1.5) {
        fetchNextPage()
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const container = e.currentTarget
      const y = e.clientY
      const rows = container.querySelectorAll('[data-item-id]')
      let idx = 0
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i].getBoundingClientRect()
        if (y < r.top + r.height / 2) {
          idx = i
          break
        }
        idx = i + 1
      }
      setDropIndex(idx)
    },
    []
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const itemId = e.dataTransfer.getData('text/plain')
      if (itemId && onDrop) onDrop(directoryId, dropIndex, itemId)
    },
    [directoryId, dropIndex, onDrop]
  )

  type Row =
    | { type: 'creation'; itemId: string }
    | { type: 'directory-naming'; itemId: string }
    | { type: 'inline-edit'; itemId: string; initialValue: string }
    | { type: 'item'; item: Task | Directory }
  const rows: Row[] = []
  for (let i = 0; i < displayItems.length; i++) {
    if (
      creationState?.mode === 'type-select' &&
      creationState.columnIndex === columnIndex &&
      creationState.itemIndex === i &&
      creationState.itemId
    ) {
      rows.push({ type: 'creation', itemId: creationState.itemId })
    }
    if (
      creationState?.mode === 'directory-naming' &&
      creationState.columnIndex === columnIndex &&
      creationState.itemIndex === i &&
      creationState.itemId
    ) {
      rows.push({ type: 'directory-naming', itemId: creationState.itemId })
    }
    if (inlineEditState && displayItems[i].id === inlineEditState.itemId) {
      rows.push({
        type: 'inline-edit',
        itemId: inlineEditState.itemId,
        initialValue: inlineEditState.initialValue,
      })
    } else {
      rows.push({ type: 'item', item: displayItems[i] })
    }
  }
  if (
    creationState?.mode === 'type-select' &&
    creationState.columnIndex === columnIndex &&
    creationState.itemIndex === displayItems.length &&
    creationState.itemId
  ) {
    rows.push({ type: 'creation', itemId: creationState.itemId })
  }
  if (
    creationState?.mode === 'directory-naming' &&
    creationState.columnIndex === columnIndex &&
    creationState.itemIndex === displayItems.length &&
    creationState.itemId
  ) {
    rows.push({ type: 'directory-naming', itemId: creationState.itemId })
  }

  const hasRows = rows.length > 0
  const useVirtual = rows.length >= VIRTUAL_THRESHOLD
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_ESTIMATE,
    overscan: 5,
  })
  const virtualItems = useVirtual ? virtualizer.getVirtualItems() : []

  const handleDragOverVirtual = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const container = scrollRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      const y = e.clientY - rect.top + container.scrollTop
      const index = Math.floor(y / ROW_ESTIMATE)
      setDropIndex(Math.max(0, Math.min(index, rows.length)))
    },
    [rows.length]
  )

  return (
    <section
      className="flex flex-col flex-shrink-0 border-r border-flow-columnBorder bg-flow-background"
      style={
        fullWidth
          ? { flex: 1, minWidth: 0, height: '100%' }
          : {
              minWidth: COLUMN_WIDTH_PX,
              maxWidth: COLUMN_WIDTH_PX,
              height: '100%',
              scrollSnapAlign: 'start',
            }
      }
      onClick={onColumnFocus}
      role="region"
      aria-label={`Column ${columnIndex + 1}: ${headerLabel}`}
    >
      <header
        className="flex-shrink-0 h-11 px-4 border-b border-flow-columnBorder flex items-center justify-between"
        style={{ minHeight: 44 }}
      >
        <span className="text-flow-dir font-flow-semibold text-flow-textPrimary truncate">
          {headerLabel}
        </span>
        <span className="text-flow-meta text-flow-textSecondary flex-shrink-0 ml-2">
          {displayItems.length} {displayItems.length === 1 ? 'item' : 'items'}
        </span>
      </header>
      <div
        ref={scrollRef}
        className="column-content flex-1 overflow-y-auto overflow-x-hidden py-2"
        onDragOver={useVirtual ? handleDragOverVirtual : handleDragOver}
        onDrop={handleDrop}
        onScroll={usePagination && directoryId != null ? handleScroll : undefined}
      >
        {!hasRows && creationState?.mode !== 'type-select' ? (
          <p className="text-flow-meta text-flow-textSecondary px-4 py-2">No items</p>
        ) : !hasRows && creationState?.mode === 'type-select' && creationState.columnIndex === columnIndex && creationState.itemId ? (
          <TypeSelectorRow itemId={creationState.itemId} />
        ) : !hasRows && creationState?.mode === 'directory-naming' && creationState.columnIndex === columnIndex && creationState.itemId ? (
          <DirectoryInlineInput
            itemId={creationState.itemId}
            onSave={(name) => onDirectorySave?.(creationState!.itemId!, name)}
            onCancel={onDirectoryCancel ?? (() => {})}
          />
        ) : useVirtual ? (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualItems.map((virtualRow) => {
              const row = rows[virtualRow.index]
              return (
                <div
                  key={virtualRow.key}
                  data-row-index={virtualRow.index}
                  data-item-id={row.type === 'item' ? row.item.id : undefined}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {row.type === 'creation' && <TypeSelectorRow itemId={row.itemId} />}
                  {row.type === 'directory-naming' && (
                    <DirectoryInlineInput
                      itemId={row.itemId}
                      onSave={(name) => onDirectorySave?.(row.itemId, name)}
                      onCancel={onDirectoryCancel ?? (() => {})}
                    />
                  )}
                  {row.type === 'inline-edit' && (
                    <DirectoryInlineInput
                      itemId={row.itemId}
                      initialValue={row.initialValue}
                      onSave={(value) => onInlineSave?.(row.itemId, value)}
                      onCancel={onInlineCancel ?? (() => {})}
                    />
                  )}
                  {row.type === 'item' && (() => {
                    const item = row.item
                    const daysUntil = viewMode === 'upcoming' ? daysUntilActive(item.start_date) : 0
                    if (isTask(item)) {
                      return (
                        <TaskItem
                          task={item}
                          colorMode={colorMode}
                          isCompleted={item.is_completed}
                          isOverdue={isOverdueTask(item)}
                          isSelected={selectedItemIds.includes(item.id)}
                          isFocused={focusedItemId === item.id}
                          isCut={cutItemIds.includes(item.id)}
                          daysUntilActive={daysUntil}
                          searchQuery={searchQuery}
                          draggable
                          onDragStart={() => onItemDragStart?.(item.id)}
                          onDragEnd={onItemDragEnd}
                          onSelect={(e) => onItemSelect(item.id, e)}
                          onExpand={() => onItemExpand(item)}
                          onSwipeRight={onTaskSwipeRight ? () => onTaskSwipeRight(item.id) : undefined}
                          onSwipeLeft={onTaskSwipeLeft ? () => onTaskSwipeLeft(item.id) : undefined}
                          onLongPress={onTaskLongPress ? (x, y) => onTaskLongPress(item.id, x, y) : undefined}
                        />
                      )
                    }
                    const childCount = childCountByDirectoryId[item.id] ?? 0
                    return (
                      <DirectoryItem
                        directory={item}
                        hasChildren={childCount > 0}
                        isOverdue={isOverdueDirectory(item)}
                        isSelected={selectedItemIds.includes(item.id)}
                        isFocused={focusedItemId === item.id}
                        isCut={cutItemIds.includes(item.id)}
                        daysUntilActive={daysUntil}
                        searchQuery={searchQuery}
                        draggable
                        onDragStart={() => onItemDragStart?.(item.id)}
                        onDragEnd={onItemDragEnd}
                        itemCount={childCount}
                        onSelect={(e) => onItemSelect(item.id, e)}
                        onExpand={() => onItemExpand(item)}
                      />
                    )
                  })()}
                </div>
              )
            })}
          </div>
        ) : (
          rows.map((row) => {
            if (row.type === 'creation') {
              return <TypeSelectorRow key={`creation-${row.itemId}`} itemId={row.itemId} />
            }
            if (row.type === 'directory-naming') {
              return (
                <DirectoryInlineInput
                  key={`dir-input-${row.itemId}`}
                  itemId={row.itemId}
                  onSave={(name) => onDirectorySave?.(row.itemId, name)}
                  onCancel={onDirectoryCancel ?? (() => {})}
                />
              )
            }
            if (row.type === 'inline-edit') {
              return (
                <DirectoryInlineInput
                  key={`inline-edit-${row.itemId}`}
                  itemId={row.itemId}
                  initialValue={row.initialValue}
                  onSave={(value) => onInlineSave?.(row.itemId, value)}
                  onCancel={onInlineCancel ?? (() => {})}
                />
              )
            }
            const item = row.item
            const daysUntil = viewMode === 'upcoming' ? daysUntilActive(item.start_date) : 0
            if (isTask(item)) {
              return (
                <TaskItem
                  key={item.id}
                  task={item}
                  colorMode={colorMode}
                  isCompleted={item.is_completed}
                  isOverdue={isOverdueTask(item)}
                  isSelected={selectedItemIds.includes(item.id)}
                  isFocused={focusedItemId === item.id}
                  isCut={cutItemIds.includes(item.id)}
                  daysUntilActive={daysUntil}
                  searchQuery={searchQuery}
                  draggable
                  onDragStart={() => onItemDragStart?.(item.id)}
                  onDragEnd={onItemDragEnd}
                  onSelect={(e) => onItemSelect(item.id, e)}
                  onExpand={() => onItemExpand(item)}
                  onSwipeRight={onTaskSwipeRight ? () => onTaskSwipeRight(item.id) : undefined}
                  onSwipeLeft={onTaskSwipeLeft ? () => onTaskSwipeLeft(item.id) : undefined}
                  onLongPress={onTaskLongPress ? (x, y) => onTaskLongPress(item.id, x, y) : undefined}
                />
              )
            }
            const childCount = childCountByDirectoryId[item.id] ?? 0
            return (
              <DirectoryItem
                key={item.id}
                directory={item}
                hasChildren={childCount > 0}
                isOverdue={isOverdueDirectory(item)}
                isSelected={selectedItemIds.includes(item.id)}
                isFocused={focusedItemId === item.id}
                isCut={cutItemIds.includes(item.id)}
                daysUntilActive={daysUntil}
                searchQuery={searchQuery}
                draggable
                onDragStart={() => onItemDragStart?.(item.id)}
                onDragEnd={onItemDragEnd}
                itemCount={childCount}
                onSelect={(e) => onItemSelect(item.id, e)}
                onExpand={() => onItemExpand(item)}
              />
            )
          })
        )}
        {usePagination && loadingMore && (
          <div className="text-flow-meta text-flow-textSecondary px-4 py-2">Loading...</div>
        )}
      </div>
    </section>
  )
}
