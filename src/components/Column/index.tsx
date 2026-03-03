import { useCallback, useRef, useLayoutEffect, useMemo, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { Task, Directory, TaskStatus } from '../../types'
import { useDirectoryContents } from '../../hooks/useDirectoryContents'
import type { ColorMode } from '../../types/state'
import type { CreationState, InlineEditState } from '../../stores/uiStore'
import { COLUMN_WIDTH_PX } from '../../lib/theme'
import { getEmptySlotId } from '../../lib/emptySlot'
import { DirectoryItem } from '../DirectoryItem'
import { TaskItem } from '../TaskItem'
import { TypeSelectorRow } from '../TypeSelectorRow'
import { DirectoryInlineInput } from '../DirectoryInlineInput'
import { useDrop } from '../DragSystem/useDrop'
import { DropIndicator } from '../DragSystem/DropIndicator'

function isTask(item: Task | Directory): item is Task {
  return 'directory_id' in item
}

function isOverdueTask(task: Task): boolean {
  if (task.status === 'completed' || task.due_date == null) return false
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
  onStatusClick?: (taskId: string) => void
  onStatusContextMenu?: (taskId: string, status: TaskStatus) => void
  linkCountByTaskId?: Record<string, number>
  blockedTaskIds?: Set<string>
  blockedByTitlesMap?: Record<string, string[]>
  /** For column 0 only: editable root header label (e.g. "Home") */
  rootDisplayName?: string
  /** For column 0 only: called when user saves the root display name */
  onRootDisplayNameSave?: (name: string) => void
}

export function Column({
  columnIndex,
  directoryId,
  directoryName,
  items,
  selectedItemIds,
  focusedItemId,
  isActive,
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
  onStatusClick,
  onStatusContextMenu,
  linkCountByTaskId = {},
  blockedTaskIds,
  blockedByTitlesMap = {},
  rootDisplayName,
  onRootDisplayNameSave,
}: ColumnProps) {
  const headerLabel = directoryId == null ? (rootDisplayName ?? 'Home') : (directoryName ?? '')
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isEditingRootName, setIsEditingRootName] = useState(false)
  const ROW_ESTIMATE = 40
  const VIRTUAL_THRESHOLD = 80

  const {
    data: queryData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useDirectoryContents(directoryId, usePagination)

  const paginatedItems = queryData?.pages.flatMap((p) => p.items) ?? []
  const rawDisplayItems = usePagination && directoryId != null ? paginatedItems : items
  // Sort completed tasks to the bottom while preserving relative position order
  const displayItems = useMemo(() => {
    const nonCompleted: (Task | Directory)[] = []
    const completed: (Task | Directory)[] = []
    for (const item of rawDisplayItems) {
      if (isTask(item) && item.status === 'completed') {
        completed.push(item)
      } else {
        nonCompleted.push(item)
      }
    }
    return [...nonCompleted, ...completed]
  }, [rawDisplayItems])
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

  // New drop system: register this column as a drop target
  const dropItems = useMemo(
    () => displayItems.map((item) => ({ id: item.id })),
    [displayItems]
  )
  const { dropRef, isOver } = useDrop({
    targetId: directoryId ?? 'home',
    type: 'between',
    items: dropItems,
    isVirtual: displayItems.length >= VIRTUAL_THRESHOLD,
    onDrop: (target) => {
      if (onDrop && target.targetId) {
        // Legacy bridge: call onDrop with the first dragged item
        // The new system handles multi-item via ColumnsView
        onDrop(directoryId, target.position, '')
      }
    },
  })

  // Merge scrollRef into dropRef
  const mergedScrollRef = useCallback(
    (el: HTMLDivElement | null) => {
      (scrollRef as React.MutableRefObject<HTMLDivElement | null>).current = el
      ;(dropRef as React.MutableRefObject<HTMLElement | null>).current = el
    },
    [dropRef]
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

  // FLIP animation for completed-to-bottom reordering
  const itemPositionsRef = useRef<Map<string, number>>(new Map())
  const itemRefsMap = useRef<Map<string, HTMLDivElement>>(new Map())
  const animatingRef = useRef(false)

  useLayoutEffect(() => {
    if (useVirtual || animatingRef.current) return
    const prevPositions = itemPositionsRef.current
    const newPositions = new Map<string, number>()
    const animations: { el: HTMLDivElement; delta: number }[] = []

    for (const [id, el] of itemRefsMap.current) {
      const rect = el.getBoundingClientRect()
      newPositions.set(id, rect.top)
      const prevTop = prevPositions.get(id)
      if (prevTop !== undefined) {
        const delta = prevTop - rect.top
        if (Math.abs(delta) > 1) {
          animations.push({ el, delta })
        }
      }
    }

    if (animations.length > 0) {
      animatingRef.current = true
      for (const { el, delta } of animations) {
        el.style.transform = `translateY(${delta}px)`
        el.style.transition = 'none'
      }
      requestAnimationFrame(() => {
        for (const { el } of animations) {
          el.style.transition = 'transform 400ms ease'
          el.style.transform = ''
        }
        setTimeout(() => {
          animatingRef.current = false
        }, 420)
      })
    }

    itemPositionsRef.current = newPositions
  })

  const setItemRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) {
      itemRefsMap.current.set(id, el)
    } else {
      itemRefsMap.current.delete(id)
    }
  }, [])

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
      {/* Column header: editable for col 0, read-only for col >= 1 */}
      <div className="flex-shrink-0 border-b border-flow-columnBorder px-3 py-2 bg-flow-background">
        {columnIndex === 0 && rootDisplayName != null && onRootDisplayNameSave != null ? (
          isEditingRootName ? (
            <DirectoryInlineInput
              itemId="root-display-name"
              initialValue={rootDisplayName}
              onSave={(name) => {
                onRootDisplayNameSave(name)
                setIsEditingRootName(false)
              }}
              onCancel={() => setIsEditingRootName(false)}
              minLength={1}
            />
          ) : (
            <button
              type="button"
              className="w-full text-left text-flow-dir font-flow-semibold text-flow-textPrimary truncate py-0.5 px-0 rounded hover:bg-flow-columnBorder/30 transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                setIsEditingRootName(true)
              }}
            >
              {rootDisplayName || 'Home'}
            </button>
          )
        ) : (
          <span className="block text-flow-dir font-flow-semibold text-flow-textPrimary truncate py-0.5">
            {headerLabel || ' '}
          </span>
        )}
      </div>
      <div
        ref={mergedScrollRef}
        className={`column-content flex-1 overflow-y-auto overflow-x-hidden py-2 relative ${isOver ? 'bg-flow-focus/5' : ''}`}
        onScroll={usePagination && directoryId != null ? handleScroll : undefined}
      >
        {/* Drop indicator line */}
        <DropIndicator targetId={directoryId ?? 'home'} containerRef={scrollRef} />
        {!hasRows &&
        !(creationState?.mode === 'type-select' && creationState?.columnIndex === columnIndex && creationState?.itemId) &&
        !(creationState?.mode === 'directory-naming' && creationState?.columnIndex === columnIndex && creationState?.itemId) ? (
          isActive ? (
            <div
              id={`item-${getEmptySlotId(columnIndex)}`}
              role="row"
              tabIndex={-1}
              data-item-id={getEmptySlotId(columnIndex)}
              className={`min-h-[32px] py-2 px-3 flex items-center text-flow-meta text-flow-textSecondary border-b border-transparent ${focusedItemId === getEmptySlotId(columnIndex) ? 'item-focused' : ''}`}
              onClick={(e) => {
                e.stopPropagation()
                onColumnFocus()
              }}
            >
              <span className="text-flow-textDisabled">Add task or directory</span>
            </div>
          ) : (
            <p className="text-flow-meta text-flow-textSecondary px-4 py-3">Add task or directory</p>
          )
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
                          onStatusClick={onStatusClick}
                          onStatusContextMenu={onStatusContextMenu}
                          linkCount={linkCountByTaskId[item.id] ?? 0}
                          isBlocked={blockedTaskIds?.has(item.id) ?? false}
                          blockedByTitles={blockedByTitlesMap[item.id] ?? []}
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
                <div key={item.id} ref={(el) => setItemRef(item.id, el)} data-item-id={item.id}>
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
                    onStatusClick={onStatusClick}
                    onStatusContextMenu={onStatusContextMenu}
                    linkCount={linkCountByTaskId[item.id] ?? 0}
                    isBlocked={blockedTaskIds?.has(item.id) ?? false}
                    blockedByTitles={blockedByTitlesMap[item.id] ?? []}
                  />
                </div>
              )
            }
            const childCount = childCountByDirectoryId[item.id] ?? 0
            return (
              <div key={item.id} ref={(el) => setItemRef(item.id, el)} data-item-id={item.id}>
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
              </div>
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
