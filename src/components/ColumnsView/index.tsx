import { useRef, useMemo, useEffect, useCallback, useState } from 'react'
import { useDirectoryStore } from '../../stores/directoryStore'
import { useTaskStore } from '../../stores/taskStore'
import { useAppStore } from '../../stores/appStore'
import { useUIStore } from '../../stores/uiStore'
import { useAppContext } from '../../contexts/AppContext'
import { COLUMN_WIDTH_PX } from '../../lib/theme'
import { useColumnScroll } from '../../hooks/useColumnScroll'
import { useKeyboard } from '../../hooks/useKeyboard'
import { showInlineError } from '../../lib/inlineError'
import { pushUndoAndPersist, performUndo, performRedo, loadMoreUndoHistory } from '../../lib/undo'
import { useFeedbackStore } from '../../stores/feedbackStore'
import type { Task, Directory, RecurringTask } from '../../types'
import { createNextRecurrence } from '../../api/tasks'
import type { ColorMode, ClipboardItem, SavedView, FilterState } from '../../types/state'
import { savedViewToRow } from '../../lib/savedViews'
import { formatShortcutForDisplay } from '../../lib/platform'
import { getEmptySlotId, isEmptySlotId, getColumnIndexFromEmptySlotId } from '../../lib/emptySlot'
import { useShortcutStore } from '../../lib/shortcutManager'
import { useSettingsStore } from '../../stores/settingsStore'
import { searchTasks as searchTasksApi } from '../../api/search'
import { Column } from '../Column'
import { TaskCreationPanel } from '../TaskCreationPanel'
import { TaskEditPanel } from '../TaskEditPanel'
import { DirectoryEditPanel } from '../DirectoryEditPanel'
import { DeleteConfirmationDialog } from '../DeleteConfirmationDialog'
import { ExpandedTaskPanel } from '../ExpandedTaskPanel'

interface ColumnsViewProps {
  viewMode: 'main_db' | 'upcoming'
  navigationPath: string[]
  colorMode: ColorMode
}

function isTask(item: Task | Directory): item is Task {
  return 'directory_id' in item
}

function filterByViewMode<T extends { start_date: string | null }>(
  items: T[],
  viewMode: 'main_db' | 'upcoming'
): T[] {
  if (viewMode === 'upcoming') return items
  const today = new Date().toISOString().slice(0, 10)
  return items.filter((i) => i.start_date == null || i.start_date.slice(0, 10) <= today)
}

function itemMatchesFilters(item: Task | Directory, filters: FilterState): boolean {
  const q = filters.searchQuery.trim().toLowerCase()
  if (q) {
    const title = isTask(item) ? item.title : item.name
    const desc = isTask(item) ? item.description ?? '' : ''
    const combined = `${title} ${desc}`.toLowerCase()
    if (!combined.includes(q)) return false
  }
  if (isTask(item)) {
    if (filters.tags.length > 0) {
      const hasTag = filters.tags.some((t) => item.tags?.includes(t))
      if (!hasTag) return false
    }
    if (filters.priorities.length > 0 && (!item.priority || !filters.priorities.includes(item.priority)))
      return false
    if (filters.categories.length > 0 && (!item.category || !filters.categories.includes(item.category)))
      return false
    if (filters.dateRange) {
      const sd = item.start_date ? new Date(item.start_date).getTime() : null
      if (filters.dateRange.start != null && (sd == null || sd < filters.dateRange.start.getTime()))
        return false
      if (filters.dateRange.end != null && (sd == null || sd > filters.dateRange.end.getTime()))
        return false
    }
  } else {
    if (filters.dateRange) {
      const sd = item.start_date ? new Date(item.start_date).getTime() : null
      if (filters.dateRange.start != null && (sd == null || sd < filters.dateRange.start.getTime()))
        return false
      if (filters.dateRange.end != null && (sd == null || sd > filters.dateRange.end.getTime()))
        return false
    }
  }
  return true
}

function sortByStartDateThenPosition(a: Task | Directory, b: Task | Directory): number {
  const aDate = a.start_date ? new Date(a.start_date).getTime() : Number.MAX_SAFE_INTEGER
  const bDate = b.start_date ? new Date(b.start_date).getTime() : Number.MAX_SAFE_INTEGER
  if (aDate !== bDate) return aDate - bDate
  return a.position - b.position
}

export function ColumnsView({ viewMode, navigationPath, colorMode }: ColumnsViewProps) {
  const { userId } = useAppContext()
  const directories = useDirectoryStore((s) => s.directories)
  const addDirectory = useDirectoryStore((s) => s.addDirectory)
  const updateDirectory = useDirectoryStore((s) => s.updateDirectory)
  const removeDirectory = useDirectoryStore((s) => s.removeDirectory)
  const tasks = useTaskStore((s) => s.tasks)
  const addTask = useTaskStore((s) => s.addTask)
  const updateTask = useTaskStore((s) => s.updateTask)
  const removeTask = useTaskStore((s) => s.removeTask)
  const archiveTask = useTaskStore((s) => s.archiveTask)
  const patchTaskActualDuration = useTaskStore((s) => s.patchTaskActualDuration)
  const selectedItemIds = useAppStore((s) => s.selectedItems)
  const pushNavigation = useAppStore((s) => s.pushNavigation)
  const popNavigation = useAppStore((s) => s.popNavigation)
  const toggleSelectedItem = useAppStore((s) => s.toggleSelectedItem)
  const setSelectedItems = useAppStore((s) => s.setSelectedItems)
  const clearSelection = useAppStore((s) => s.clearSelection)
  const focusedItemId = useAppStore((s) => s.focusedItemId)
  const focusedColumnIndex = useAppStore((s) => s.focusedColumnIndex)
  const setFocusedItem = useAppStore((s) => s.setFocusedItem)
  const setFocusedColumnIndex = useAppStore((s) => s.setFocusedColumnIndex)
  const addToFocusHistory = useAppStore((s) => s.addToFocusHistory)
  const popFocusHistory = useAppStore((s) => s.popFocusHistory)
  const selectionAnchorIndex = useAppStore((s) => s.selectionAnchorIndex)
  const setSelectionAnchorIndex = useAppStore((s) => s.setSelectionAnchorIndex)
  const expandedTaskId = useAppStore((s) => s.expandedTaskId)
  const setExpandedTaskId = useAppStore((s) => s.setExpandedTaskId)
  const pushKeyboardContext = useAppStore((s) => s.pushKeyboardContext)
  const setShortcutSheetOpen = useAppStore((s) => s.setShortcutSheetOpen)
  const popKeyboardContext = useAppStore((s) => s.popKeyboardContext)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const setColorMode = useAppStore((s) => s.setColorMode)
  const setCurrentView = useAppStore((s) => s.setCurrentView)
  const setSearchBarOpen = useAppStore((s) => s.setSearchBarOpen)
  const activeFilters = useAppStore((s) => s.activeFilters)
  const setActiveFilters = useAppStore((s) => s.setActiveFilters)
  const savedViews = useAppStore((s) => s.savedViews)
  const setSearchResultTaskIds = useAppStore((s) => s.setSearchResultTaskIds)
  const addSavedView = useAppStore((s) => s.addSavedView)
  const { scrollLeft, scrollRight, scrollToStart, scrollToEnd } = useColumnScroll(scrollContainerRef)
  const creationState = useUIStore((s) => s.creationState)
  const setCreationState = useUIStore((s) => s.setCreationState)
  const cancelCreation = useUIStore((s) => s.cancelCreation)
  const setCreationTimeoutId = useUIStore((s) => s.setCreationTimeoutId)
  const inlineEditState = useUIStore((s) => s.inlineEditState)
  const setInlineEditState = useUIStore((s) => s.setInlineEditState)
  const editPanelState = useUIStore((s) => s.editPanelState)
  const setEditPanelState = useUIStore((s) => s.setEditPanelState)
  const setDraggingItemId = useUIStore((s) => s.setDraggingItemId)
  const setCompletionTimeout = useUIStore((s) => s.setCompletionTimeout)
  const clearCompletionTimeout = useUIStore((s) => s.clearCompletionTimeout)
  const popUndo = useAppStore((s) => s.popUndo)
  const redo = useAppStore((s) => s.redo)
  const clipboardItems = useAppStore((s) => s.clipboardItems)
  const setClipboardItems = useAppStore((s) => s.setClipboardItems)
  const cutItemIds = useAppStore((s) => s.cutItemIds)
  const setCutItemIds = useAppStore((s) => s.setCutItemIds)
  const [deleteConfirmItems, setDeleteConfirmItems] = useState<(Task | Directory)[] | null>(null)
  const warnedDirSize = useRef(false)
  const warnedDepth = useRef(false)

  const columnIds = [null, ...navigationPath] as (string | null)[]

  const searchResultTaskIds = useAppStore((s) => s.searchResultTaskIds)

  const getItemsForColumn = useCallback(
    (columnIndex: number): (Task | Directory)[] => {
      const parentId = columnIndex === 0 ? null : navigationPath[columnIndex - 1]
      let dirs = directories.filter((d) => d.parent_id === parentId)
      const taskFilter = parentId == null ? () => false : (t: Task) => t.directory_id === parentId
      let taskList = tasks.filter(taskFilter)
      dirs = filterByViewMode(dirs, viewMode)
      taskList = filterByViewMode(taskList, viewMode)
      if (viewMode === 'main_db' && !activeFilters.showCompleted)
        taskList = taskList.filter((t) => !t.is_completed)
      let combined: (Task | Directory)[] = [...dirs, ...taskList]
      const hasActiveFilters =
        activeFilters.searchQuery.trim() ||
        activeFilters.tags.length > 0 ||
        activeFilters.priorities.length > 0 ||
        activeFilters.categories.length > 0 ||
        activeFilters.dateRange != null
      if (hasActiveFilters) combined = combined.filter((i) => itemMatchesFilters(i, activeFilters))
      if (searchResultTaskIds != null && searchResultTaskIds.length > 0) {
        const resultSet = new Set(searchResultTaskIds)
        const ancestorDirIds = new Set<string>()
        for (const taskId of resultSet) {
          const task = tasks.find((t) => t.id === taskId)
          if (!task) continue
          let dirId: string | null = task.directory_id
          while (dirId) {
            ancestorDirIds.add(dirId)
            const dir = directories.find((d) => d.id === dirId)
            dirId = dir?.parent_id ?? null
          }
        }
        combined = combined.filter((i) => {
          if (isTask(i)) return resultSet.has(i.id)
          return ancestorDirIds.has(i.id)
        })
      }
      if (viewMode === 'upcoming')
        combined.sort(sortByStartDateThenPosition)
      else
        combined.sort((a, b) => a.position - b.position)
      return combined
    },
    [
      directories,
      tasks,
      navigationPath,
      viewMode,
      activeFilters,
      searchResultTaskIds,
    ]
  )

  const scrollToColumn = useCallback(
    (index: number) => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollLeft = index * COLUMN_WIDTH_PX
      }
    },
    []
  )

  const moveFocusUp = useCallback(() => {
    const items = getItemsForColumn(focusedColumnIndex)
    const idx = items.findIndex((i) => i.id === focusedItemId)
    if (idx <= 0) return
    setFocusedItem(items[idx - 1].id)
  }, [focusedColumnIndex, focusedItemId, setFocusedItem, getItemsForColumn])

  const moveFocusDown = useCallback(() => {
    const items = getItemsForColumn(focusedColumnIndex)
    const idx = items.findIndex((i) => i.id === focusedItemId)
    if (idx < 0 || idx >= items.length - 1) return
    setFocusedItem(items[idx + 1].id)
  }, [focusedColumnIndex, focusedItemId, setFocusedItem, getItemsForColumn])

  const collapseColumn = useCallback(() => {
    if (focusedColumnIndex === 0) return
    const last = popFocusHistory()
    popNavigation()
    const prevCol = focusedColumnIndex - 1
    setFocusedColumnIndex(prevCol)
    const prevItems = getItemsForColumn(prevCol)
    const lastIsEmptySlotForPrev =
      last && isEmptySlotId(last.itemId) && getColumnIndexFromEmptySlotId(last.itemId) === prevCol
    if (last && (prevItems.some((i) => i.id === last.itemId) || lastIsEmptySlotForPrev)) {
      setFocusedItem(last.itemId)
    } else if (prevItems.length > 0) {
      setFocusedItem(prevItems[0].id)
    } else {
      setFocusedItem(getEmptySlotId(prevCol))
    }
    setTimeout(() => scrollToColumn(prevCol), 50)
  }, [
    focusedColumnIndex,
    getItemsForColumn,
    popFocusHistory,
    popNavigation,
    setFocusedColumnIndex,
    setFocusedItem,
    scrollToColumn,
  ])

  const extendSelectionUp = useCallback(() => {
    const items = getItemsForColumn(focusedColumnIndex)
    const idx = items.findIndex((i) => i.id === focusedItemId)
    if (idx <= 0) return
    const anchor = selectionAnchorIndex ?? idx
    setSelectionAnchorIndex(anchor)
    const min = Math.min(anchor, idx - 1)
    const max = Math.max(anchor, idx - 1)
    setSelectedItems(items.slice(min, max + 1).map((i) => i.id))
    setFocusedItem(items[idx - 1].id)
  }, [
    focusedColumnIndex,
    focusedItemId,
    selectionAnchorIndex,
    getItemsForColumn,
    setSelectionAnchorIndex,
    setSelectedItems,
    setFocusedItem,
  ])

  const extendSelectionDown = useCallback(() => {
    const items = getItemsForColumn(focusedColumnIndex)
    const idx = items.findIndex((i) => i.id === focusedItemId)
    if (idx < 0 || idx >= items.length - 1) return
    const anchor = selectionAnchorIndex ?? idx
    setSelectionAnchorIndex(anchor)
    const min = Math.min(anchor, idx + 1)
    const max = Math.max(anchor, idx + 1)
    setSelectedItems(items.slice(min, max + 1).map((i) => i.id))
    setFocusedItem(items[idx + 1].id)
  }, [
    focusedColumnIndex,
    focusedItemId,
    selectionAnchorIndex,
    getItemsForColumn,
    setSelectionAnchorIndex,
    setSelectedItems,
    setFocusedItem,
  ])

  const selectAllInColumn = useCallback(() => {
    const items = getItemsForColumn(focusedColumnIndex)
    setSelectedItems(items.map((i) => i.id))
    setSelectionAnchorIndex(0)
  }, [focusedColumnIndex, getItemsForColumn, setSelectedItems, setSelectionAnchorIndex])

  const handleEnterOrArrowRight = useCallback(() => {
    const items = getItemsForColumn(focusedColumnIndex)
    const item = focusedItemId ? items.find((i) => i.id === focusedItemId) : undefined
    if (!item) return
    if (isTask(item)) {
      setExpandedTaskId(item.id)
      pushKeyboardContext('editing')
      return
    }
    addToFocusHistory(focusedColumnIndex, item.id)
    pushNavigation(item.id)
    const newCol = columnIds.length
    setFocusedColumnIndex(newCol)
    const newItems = getItemsForColumn(newCol)
    setFocusedItem(newItems.length > 0 ? newItems[0].id : getEmptySlotId(newCol))
    setTimeout(() => scrollToColumn(newCol), 50)
  }, [
    focusedColumnIndex,
    focusedItemId,
    columnIds.length,
    getItemsForColumn,
    addToFocusHistory,
    pushNavigation,
    setFocusedColumnIndex,
    setFocusedItem,
    setExpandedTaskId,
    pushKeyboardContext,
    scrollToColumn,
  ])

  const handleEscape = useCallback(() => {
    if (selectedItemIds.length > 0) {
      clearSelection()
      return
    }
    collapseColumn()
  }, [selectedItemIds.length, clearSelection, collapseColumn])

  const COMPLETION_DELETE_MS = 6 * 60 * 60 * 1000

  const setTasks = useTaskStore((s) => s.setTasks)
  const handleSpace = useCallback(async () => {
    const items = getItemsForColumn(focusedColumnIndex)
    const item = focusedItemId ? items.find((i) => i.id === focusedItemId) : undefined
    if (!item || !isTask(item)) return
    const completed = !item.is_completed
    const prevTasks = useTaskStore.getState().tasks
    if (completed) {
      const maxPosition = items.length === 0 ? 0 : Math.max(...items.map((i) => i.position))
      const completedAt = new Date().toISOString()
      const optimistic = prevTasks.map((t) =>
        t.id === item.id
          ? { ...t, is_completed: true, completed_at: completedAt, position: maxPosition + 1 }
          : t
      )
      setTasks(optimistic)
      try {
        await updateTask(item.id, {
          is_completed: true,
          completed_at: completedAt,
          position: maxPosition + 1,
        })
        if (item.recurrence_pattern) {
          try {
            const nextTask = await createNextRecurrence(item as RecurringTask)
            if (nextTask) {
              const currentTasks = useTaskStore.getState().tasks
              setTasks([...currentTasks, nextTask])
              useFeedbackStore.getState().showSuccess('Created next occurrence')
            }
          } catch {
            useFeedbackStore.getState().showError('Failed to create next occurrence')
          }
        }
        const timeoutId = setTimeout(() => {
          archiveTask(item.id, 'completed')
          clearCompletionTimeout(item.id)
        }, COMPLETION_DELETE_MS)
        setCompletionTimeout(item.id, timeoutId)
      } catch {
        setTasks(prevTasks)
        useFeedbackStore.getState().showError('Failed to complete task')
      }
    } else {
      const optimistic = prevTasks.map((t) =>
        t.id === item.id ? { ...t, is_completed: false, completed_at: null } : t
      )
      setTasks(optimistic)
      clearCompletionTimeout(item.id)
      try {
        await updateTask(item.id, { is_completed: false, completed_at: null })
      } catch {
        setTasks(prevTasks)
        useFeedbackStore.getState().showError('Failed to uncomplete task')
      }
    }
  }, [
    focusedColumnIndex,
    focusedItemId,
    getItemsForColumn,
    setTasks,
    updateTask,
    archiveTask,
    setCompletionTimeout,
    clearCompletionTimeout,
  ])

  const handleScrollHome = useCallback(() => {
    scrollToStart()
    setFocusedColumnIndex(0)
    const items = getItemsForColumn(0)
    setFocusedItem(items.length > 0 ? items[0].id : getEmptySlotId(0))
  }, [scrollToStart, setFocusedColumnIndex, setFocusedItem, getItemsForColumn])

  const handleScrollEnd = useCallback(() => {
    scrollToEnd()
    const lastCol = columnIds.length - 1
    setFocusedColumnIndex(lastCol)
    const items = getItemsForColumn(lastCol)
    setFocusedItem(items.length > 0 ? items[0].id : getEmptySlotId(lastCol))
  }, [scrollToEnd, columnIds.length, setFocusedColumnIndex, setFocusedItem, getItemsForColumn])

  const handleCmdArrowUp = useCallback(() => {
    const items = getItemsForColumn(focusedColumnIndex)
    if (items.length === 0) return
    setFocusedItem(items[0].id)
  }, [focusedColumnIndex, setFocusedItem, getItemsForColumn])

  const handleCmdArrowDown = useCallback(() => {
    const items = getItemsForColumn(focusedColumnIndex)
    if (items.length === 0) return
    setFocusedItem(items[items.length - 1].id)
  }, [focusedColumnIndex, setFocusedItem, getItemsForColumn])

  const CREATION_TIMEOUT_MS = 10_000

  const initiateCreation = useCallback(() => {
    const items = getItemsForColumn(focusedColumnIndex)
    const idx = focusedItemId ? items.findIndex((i) => i.id === focusedItemId) : -1
    const itemIndex = idx >= 0 ? idx : items.length
    const newItemId = crypto.randomUUID()
    setCreationState({
      mode: 'type-select',
      itemId: newItemId,
      columnIndex: focusedColumnIndex,
      itemIndex,
    })
    pushKeyboardContext('creation')
    const timeoutId = setTimeout(() => {
      cancelCreation()
      popKeyboardContext()
    }, CREATION_TIMEOUT_MS)
    setCreationTimeoutId(timeoutId)
  }, [
    focusedColumnIndex,
    focusedItemId,
    getItemsForColumn,
    setCreationState,
    pushKeyboardContext,
    setCreationTimeoutId,
    cancelCreation,
    popKeyboardContext,
  ])

  const handleCancelCreation = useCallback(() => {
    cancelCreation()
    popKeyboardContext()
  }, [cancelCreation, popKeyboardContext])

  const handleCreationTypeTask = useCallback(() => {
    if (!creationState?.itemId) return
    if (focusedColumnIndex === 0) {
      showInlineError(creationState.itemId, "No tasks in Home. Press D for Directory or Esc to cancel.")
      return
    }
    const tid = useUIStore.getState().creationTimeoutId
    if (tid != null) clearTimeout(tid)
    setCreationTimeoutId(null)
    setCreationState({
      ...creationState,
      mode: 'task-panel',
    })
  }, [creationState, focusedColumnIndex, setCreationState, setCreationTimeoutId])

  const handleCreationTypeDirectory = useCallback(() => {
    if (!creationState?.itemId) return
    const tid = useUIStore.getState().creationTimeoutId
    if (tid != null) clearTimeout(tid)
    setCreationTimeoutId(null)
    setCreationState({
      ...creationState,
      mode: 'directory-naming',
    })
  }, [creationState, setCreationState, setCreationTimeoutId])

  const handleCreationInvalidKey = useCallback(
    (_key: string) => {
      if (creationState?.itemId) {
        showInlineError(
          creationState.itemId,
          "Press T for Task or D for Directory",
          "'T' or 'D'"
        )
      }
    },
    [creationState?.itemId]
  )

  // New item is scoped to the column by creationState.columnIndex (degree of separation from root).
  const saveDirectory = useCallback(
    async (itemId: string, name: string) => {
      if (!creationState || !userId) return
      const parentId = creationState.columnIndex === 0 ? null : (columnIds[creationState.columnIndex - 1] ?? null)
      const depthLevel =
        parentId == null ? 0 : (directories.find((d) => d.id === parentId)?.depth_level ?? 0) + 1
      const dir = {
        id: itemId,
        name,
        parent_id: parentId,
        start_date: null,
        position: creationState.itemIndex,
        user_id: userId,
        depth_level: depthLevel,
      }
      try {
        const created = await addDirectory(dir)
        if (userId) {
          pushUndoAndPersist(userId, {
            actionType: 'create',
            entityType: 'directory',
            entityData: created as unknown as Record<string, unknown>,
          })
        }
        cancelCreation()
        popKeyboardContext()
        moveFocusUp()
      } catch (err) {
        showInlineError(itemId, err instanceof Error ? err.message : 'Failed to create directory')
      }
    },
    [
      creationState,
      userId,
      columnIds,
      directories,
      addDirectory,
      cancelCreation,
      popKeyboardContext,
      moveFocusUp,
    ]
  )

  const handleDirectoryCancel = useCallback(() => {
    cancelCreation()
    popKeyboardContext()
  }, [cancelCreation, popKeyboardContext])

  const saveTask = useCallback(
    async (task: Omit<Task, 'created_at' | 'updated_at'>) => {
      if (!userId) return
      try {
        const created = await addTask(task)
        if (userId) {
          pushUndoAndPersist(userId, {
            actionType: 'create',
            entityType: 'task',
            entityData: created as unknown as Record<string, unknown>,
          })
        }
        cancelCreation()
        popKeyboardContext()
        moveFocusUp()
      } catch (err) {
        if (creationState?.itemId) {
          showInlineError(
            creationState.itemId,
            err instanceof Error ? err.message : 'Failed to create task'
          )
        }
      }
    },
    [userId, addTask, pushUndoAndPersist, cancelCreation, popKeyboardContext, moveFocusUp, creationState?.itemId]
  )

  const handleTaskPanelCancel = useCallback(() => {
    cancelCreation()
    popKeyboardContext()
  }, [cancelCreation, popKeyboardContext])

  const startQuickEdit = useCallback(() => {
    const items = getItemsForColumn(focusedColumnIndex)
    const item = focusedItemId ? items.find((i) => i.id === focusedItemId) : undefined
    if (!item) return
    if (isTask(item)) {
      setInlineEditState({ itemId: item.id, type: 'task', initialValue: item.title })
    } else {
      setInlineEditState({ itemId: item.id, type: 'directory', initialValue: item.name })
    }
    pushKeyboardContext('editing')
  }, [focusedColumnIndex, focusedItemId, getItemsForColumn, setInlineEditState, pushKeyboardContext])

  const saveInlineEdit = useCallback(
    async (itemId: string, value: string) => {
      if (!inlineEditState || !userId) return
      const trimmed = value.trim()
      if (trimmed.length < 3) {
        showInlineError(itemId, '3 or more characters needed')
        return
      }
      try {
        if (inlineEditState.type === 'task') {
          const prev = tasks.find((t) => t.id === itemId)
          if (!prev) return
          await updateTask(itemId, { title: trimmed })
          const newState = { ...prev, title: trimmed }
          pushUndoAndPersist(userId, {
            actionType: 'update',
            entityType: 'task',
            entityData: { ...prev, new_state: newState } as unknown as Record<string, unknown>,
          })
        } else {
          const prev = directories.find((d) => d.id === itemId)
          if (!prev) return
          await updateDirectory(itemId, { name: trimmed })
          const newState = { ...prev, name: trimmed }
          pushUndoAndPersist(userId, {
            actionType: 'update',
            entityType: 'directory',
            entityData: { ...prev, new_state: newState } as unknown as Record<string, unknown>,
          })
        }
        setInlineEditState(null)
        popKeyboardContext()
      } catch (err) {
        showInlineError(itemId, err instanceof Error ? err.message : 'Failed to save')
      }
    },
    [inlineEditState, userId, tasks, directories, updateTask, updateDirectory, pushUndoAndPersist, setInlineEditState, popKeyboardContext]
  )

  const handleInlineCancel = useCallback(() => {
    setInlineEditState(null)
    popKeyboardContext()
  }, [setInlineEditState, popKeyboardContext])

  const startFullEdit = useCallback(() => {
    const items = getItemsForColumn(focusedColumnIndex)
    const item = focusedItemId ? items.find((i) => i.id === focusedItemId) : undefined
    if (!item) return
    setEditPanelState({
      itemId: item.id,
      type: isTask(item) ? 'task' : 'directory',
    })
    pushKeyboardContext('editing')
  }, [focusedColumnIndex, focusedItemId, getItemsForColumn, setEditPanelState, pushKeyboardContext])

  const handleEditPanelSaveTask = useCallback(
    async (id: string, updates: Partial<Task>) => {
      if (!userId) return
      try {
        const prev = tasks.find((t) => t.id === id)
        if (!prev) return
        await updateTask(id, updates)
        const newState = { ...prev, ...updates }
        pushUndoAndPersist(userId, {
          actionType: 'update',
          entityType: 'task',
          entityData: { ...prev, new_state: newState } as unknown as Record<string, unknown>,
        })
        setEditPanelState(null)
        popKeyboardContext()
      } catch (err) {
        if (editPanelState?.itemId) {
          showInlineError(
            editPanelState.itemId,
            err instanceof Error ? err.message : 'Failed to save'
          )
        }
      }
    },
    [userId, tasks, updateTask, pushUndoAndPersist, setEditPanelState, popKeyboardContext, editPanelState?.itemId]
  )

  const handleEditPanelSaveDirectory = useCallback(
    async (id: string, updates: Partial<Pick<Directory, 'name' | 'start_date' | 'due_date'>>) => {
      if (!userId) return
      try {
        const prev = directories.find((d) => d.id === id)
        if (!prev) return
        await updateDirectory(id, updates)
        const newState = { ...prev, ...updates }
        pushUndoAndPersist(userId, {
          actionType: 'update',
          entityType: 'directory',
          entityData: { ...prev, new_state: newState } as unknown as Record<string, unknown>,
        })
        setEditPanelState(null)
        popKeyboardContext()
      } catch (err) {
        if (editPanelState?.itemId) {
          showInlineError(
            editPanelState.itemId,
            err instanceof Error ? err.message : 'Failed to save'
          )
        }
      }
    },
    [userId, directories, updateDirectory, pushUndoAndPersist, setEditPanelState, popKeyboardContext, editPanelState?.itemId]
  )

  const handleEditPanelCancel = useCallback(() => {
    setEditPanelState(null)
    popKeyboardContext()
  }, [setEditPanelState, popKeyboardContext])

  const handleExitEditing = useCallback(() => {
    if (expandedTaskId) {
      setExpandedTaskId(null)
      popKeyboardContext()
      return
    }
    if (editPanelState) {
      setEditPanelState(null)
      popKeyboardContext()
    }
  }, [expandedTaskId, editPanelState, setExpandedTaskId, setEditPanelState, popKeyboardContext])

  const addAttachmentTriggerRef = useRef<(() => void) | null>(null)
  const openAllAttachmentsTriggerRef = useRef<(() => void) | null>(null)

  const handleAddAttachment = useCallback(() => {
    addAttachmentTriggerRef.current?.()
  }, [])
  const handleOpenAllAttachments = useCallback(() => {
    openAllAttachmentsTriggerRef.current?.()
  }, [])

  const initiateDelete = useCallback(() => {
    const items = getItemsForColumn(focusedColumnIndex)
    const selected =
      selectedItemIds.length > 0
        ? selectedItemIds
            .map((id) => items.find((i) => i.id === id))
            .filter((i): i is Task | Directory => i != null)
        : focusedItemId
          ? items.filter((i) => i.id === focusedItemId)
          : []
    if (selected.length === 0) return
    setDeleteConfirmItems(selected)
    pushKeyboardContext('confirmation')
  }, [
    getItemsForColumn,
    focusedColumnIndex,
    selectedItemIds,
    focusedItemId,
    pushKeyboardContext,
  ])

  const performDelete = useCallback(
    async (toDelete: (Task | Directory)[]) => {
      const tasksToDelete = toDelete.filter((i): i is Task => isTask(i))
      const dirsToDelete = toDelete.filter((i): i is Directory => !isTask(i))
      if (userId) {
        if (tasksToDelete.length > 0) {
          pushUndoAndPersist(userId, {
            actionType: 'delete',
            entityType: 'task',
            entityData: tasksToDelete as unknown as Record<string, unknown>,
          })
        }
        if (dirsToDelete.length > 0) {
          pushUndoAndPersist(userId, {
            actionType: 'delete',
            entityType: 'directory',
            entityData: dirsToDelete as unknown as Record<string, unknown>,
          })
        }
      }
      for (const t of tasksToDelete) await removeTask(t.id)
      for (const d of dirsToDelete) await removeDirectory(d.id)
      setDeleteConfirmItems(null)
      popKeyboardContext()
      const items = getItemsForColumn(focusedColumnIndex)
      const remaining = items.filter((i) => !toDelete.some((d) => d.id === i.id))
      if (remaining.length > 0) {
        const idx = Math.min(
          items.findIndex((i) => i.id === focusedItemId),
          remaining.length - 1
        )
        setFocusedItem(remaining[idx >= 0 ? idx : 0].id)
      } else {
        setFocusedItem(getEmptySlotId(focusedColumnIndex))
      }
    },
    [
      userId,
      pushUndoAndPersist,
      removeTask,
      removeDirectory,
      popKeyboardContext,
      getItemsForColumn,
      focusedColumnIndex,
      focusedItemId,
      setFocusedItem,
    ]
  )

  const handleDeleteConfirm = useCallback(() => {
    if (deleteConfirmItems) performDelete(deleteConfirmItems)
  }, [deleteConfirmItems, performDelete])

  const handleDeleteCancel = useCallback(() => {
    setDeleteConfirmItems(null)
    popKeyboardContext()
  }, [popKeyboardContext])

  const buildDirectoryTree = useCallback(
    (directoryId: string): ClipboardItem[] => {
      const result: ClipboardItem[] = []
      const childDirs = directories
        .filter((d) => d.parent_id === directoryId)
        .sort((a, b) => a.position - b.position)
      const childTasks = tasks
        .filter((t) => t.directory_id === directoryId)
        .sort((a, b) => a.position - b.position)
      for (const d of childDirs) {
        result.push({
          type: 'directory',
          data: d,
          children: buildDirectoryTree(d.id),
          timestamp: Date.now(),
        })
      }
      for (const t of childTasks) {
        result.push({
          type: 'task',
          data: t,
          timestamp: Date.now(),
        })
      }
      return result
    },
    [directories, tasks]
  )

  const copyRecursive = useCallback(() => {
    const items = getItemsForColumn(focusedColumnIndex)
    const toCopy =
      selectedItemIds.length > 0
        ? selectedItemIds
            .map((id) => items.find((i) => i.id === id))
            .filter((i): i is Task | Directory => i != null)
        : focusedItemId
          ? items.filter((i) => i.id === focusedItemId)
          : []
    if (toCopy.length === 0) return
    const clipboard: ClipboardItem[] = toCopy.map((item) => {
      if (isTask(item)) {
        return { type: 'task' as const, data: item, timestamp: Date.now() }
      }
      return {
        type: 'directory' as const,
        data: item,
        children: buildDirectoryTree(item.id),
        timestamp: Date.now(),
      }
    })
    setClipboardItems(clipboard)
    setCutItemIds([])
  }, [
    getItemsForColumn,
    focusedColumnIndex,
    selectedItemIds,
    focusedItemId,
    buildDirectoryTree,
    setClipboardItems,
    setCutItemIds,
  ])

  const copyShallow = useCallback(() => {
    const items = getItemsForColumn(focusedColumnIndex)
    const toCopy =
      selectedItemIds.length > 0
        ? selectedItemIds
            .map((id) => items.find((i) => i.id === id))
            .filter((i): i is Task | Directory => i != null)
        : focusedItemId
          ? items.filter((i) => i.id === focusedItemId)
          : []
    if (toCopy.length === 0) return
    const clipboard: ClipboardItem[] = toCopy.map((item) => ({
      type: isTask(item) ? 'task' : 'directory',
      data: item,
      timestamp: Date.now(),
    }))
    setClipboardItems(clipboard)
    setCutItemIds([])
  }, [
    getItemsForColumn,
    focusedColumnIndex,
    selectedItemIds,
    focusedItemId,
    setClipboardItems,
    setCutItemIds,
  ])

  const cut = useCallback(() => {
    const items = getItemsForColumn(focusedColumnIndex)
    const toCut =
      selectedItemIds.length > 0
        ? selectedItemIds
            .map((id) => items.find((i) => i.id === id))
            .filter((i): i is Task | Directory => i != null)
        : focusedItemId
          ? items.filter((i) => i.id === focusedItemId)
          : []
    if (toCut.length === 0) return
    const clipboard: ClipboardItem[] = toCut.map((item) => ({
      type: isTask(item) ? 'task' : 'directory',
      data: item,
      timestamp: Date.now(),
    }))
    setClipboardItems(clipboard)
    setCutItemIds(toCut.map((i) => i.id))
  }, [
    getItemsForColumn,
    focusedColumnIndex,
    selectedItemIds,
    focusedItemId,
    setClipboardItems,
    setCutItemIds,
  ])

  const moveItems = useCallback(
    async (toMove: (Task | Directory)[], newParentId: string | null, newPosition: number) => {
      const originalParentId: Record<string, string | null> = {}
      const originalPosition: Record<string, number> = {}
      const newPositions: Record<string, number> = {}
      toMove.forEach((item, i) => {
        originalParentId[item.id] = isTask(item) ? item.directory_id : item.parent_id
        originalPosition[item.id] = item.position
        newPositions[item.id] = newPosition + i
      })
      const tasksToMove = toMove.filter((i): i is Task => isTask(i))
      const dirsToMove = toMove.filter((i): i is Directory => !isTask(i))
      const depthLevel =
        newParentId == null
          ? 0
          : (directories.find((d) => d.id === newParentId)?.depth_level ?? 0) + 1
      for (let i = 0; i < toMove.length; i++) {
        const item = toMove[i]
        const pos = newPosition + i
        if (isTask(item)) {
          await updateTask(item.id, {
            directory_id: newParentId!,
            position: pos,
          })
        } else {
          await updateDirectory(item.id, {
            parent_id: newParentId,
            position: pos,
            depth_level: depthLevel,
          })
        }
      }
      if (userId) {
        if (tasksToMove.length > 0) {
          pushUndoAndPersist(userId, {
            actionType: 'move',
            entityType: 'task',
            entityData: {
              items: tasksToMove,
              originalParentId,
              originalPosition,
              newParentId,
              newPositions,
            } as unknown as Record<string, unknown>,
          })
        }
        if (dirsToMove.length > 0) {
          pushUndoAndPersist(userId, {
            actionType: 'move',
            entityType: 'directory',
            entityData: {
              items: dirsToMove,
              originalParentId,
              originalPosition,
              newParentId,
              newPositions,
            } as unknown as Record<string, unknown>,
          })
        }
      }
      setCutItemIds([])
      setClipboardItems([])
    },
    [
      userId,
      directories,
      updateTask,
      updateDirectory,
      pushUndoAndPersist,
      setCutItemIds,
      setClipboardItems,
    ]
  )

  const pasteItems = useCallback(
    async (
      data: ClipboardItem[],
      parentDirectoryId: string | null,
      startPosition: number,
      preserveMetadata: boolean
    ): Promise<(Task | Directory)[]> => {
      const result: (Task | Directory)[] = []
      for (let i = 0; i < data.length; i++) {
        const item = data[i]
        const pos = startPosition + i
        if (item.type === 'task') {
          const task = item.data as Task
          if (parentDirectoryId == null) continue
          const newTask: Omit<Task, 'created_at' | 'updated_at'> = {
            id: crypto.randomUUID(),
            title: task.title,
            directory_id: parentDirectoryId,
            position: pos,
            user_id: userId!,
            is_completed: false,
            completed_at: null,
            archived_at: null,
            archive_reason: null,
            priority: preserveMetadata ? task.priority : null,
            start_date: preserveMetadata ? task.start_date : null,
            due_date: preserveMetadata ? task.due_date : null,
            background_color: preserveMetadata ? task.background_color : null,
            category: preserveMetadata ? task.category : null,
            tags: preserveMetadata ? task.tags ?? [] : [],
            description: preserveMetadata ? task.description : null,
          }
          const created = await addTask(newTask)
          result.push(created)
        } else {
          const dir = item.data as Directory
          const newDir = {
            id: crypto.randomUUID(),
            name: dir.name,
            parent_id: parentDirectoryId,
            start_date: preserveMetadata ? dir.start_date : null,
            position: pos,
            user_id: userId!,
            depth_level:
              parentDirectoryId == null
                ? 0
                : (directories.find((d) => d.id === parentDirectoryId)?.depth_level ?? 0) + 1,
          }
          const created = await addDirectory(newDir)
          result.push(created)
          if (item.children && item.children.length > 0) {
            const children = await pasteItems(
              item.children,
              created.id,
              0,
              preserveMetadata
            )
            result.push(...children)
          }
        }
      }
      return result
    },
    [userId, addTask, addDirectory, directories]
  )

  const paste = useCallback(async () => {
    if (!clipboardItems.length) return
    const parentId = columnIds[focusedColumnIndex] as string | null
    if (focusedColumnIndex === 0 && clipboardItems.some((c) => c.type === 'task')) {
      showInlineError(
        focusedItemId ?? 'paste',
        'Cannot paste tasks in Home. Navigate into a directory first.'
      )
      return
    }
    const items = getItemsForColumn(focusedColumnIndex)
    const idx = focusedItemId ? items.findIndex((i) => i.id === focusedItemId) : -1
    const startPosition = idx >= 0 ? idx + 1 : items.length

    const isCut =
      cutItemIds.length > 0 &&
      clipboardItems.every((c) => cutItemIds.includes(c.data.id))
    if (isCut) {
      const toMove = clipboardItems.map((c) => c.data)
      await moveItems(toMove, parentId, startPosition)
      return
    }

    if (!userId) return
    const pasted = await pasteItems(clipboardItems, parentId, startPosition, false)
    if (pasted.length > 0 && userId) {
      const pastedTasks = pasted.filter((i): i is Task => isTask(i))
      const pastedDirs = pasted.filter((i): i is Directory => !isTask(i))
      if (pastedTasks.length > 0) {
        pushUndoAndPersist(userId, {
          actionType: 'create',
          entityType: 'task',
          entityData: pastedTasks as unknown as Record<string, unknown>,
        })
      }
      if (pastedDirs.length > 0) {
        pushUndoAndPersist(userId, {
          actionType: 'create',
          entityType: 'directory',
          entityData: pastedDirs as unknown as Record<string, unknown>,
        })
      }
    }
  }, [
    clipboardItems,
    userId,
    cutItemIds,
    focusedColumnIndex,
    columnIds,
    focusedItemId,
    getItemsForColumn,
    pasteItems,
    moveItems,
    pushUndoAndPersist,
  ])

  const pasteWithMetadata = useCallback(async () => {
    if (!clipboardItems.length || !userId) return
    const parentId = columnIds[focusedColumnIndex] as string | null
    if (focusedColumnIndex === 0 && clipboardItems.some((c) => c.type === 'task')) {
      showInlineError(
        focusedItemId ?? 'paste',
        'Cannot paste tasks in Home. Navigate into a directory first.'
      )
      return
    }
    const items = getItemsForColumn(focusedColumnIndex)
    const idx = focusedItemId ? items.findIndex((i) => i.id === focusedItemId) : -1
    const startPosition = idx >= 0 ? idx + 1 : items.length
    const pasted = await pasteItems(clipboardItems, parentId, startPosition, true)
    if (pasted.length > 0 && userId) {
      const pastedTasks = pasted.filter((i): i is Task => isTask(i))
      const pastedDirs = pasted.filter((i): i is Directory => !isTask(i))
      if (pastedTasks.length > 0) {
        pushUndoAndPersist(userId, {
          actionType: 'create',
          entityType: 'task',
          entityData: pastedTasks as unknown as Record<string, unknown>,
        })
      }
      if (pastedDirs.length > 0) {
        pushUndoAndPersist(userId, {
          actionType: 'create',
          entityType: 'directory',
          entityData: pastedDirs as unknown as Record<string, unknown>,
        })
      }
    }
  }, [
    clipboardItems,
    userId,
    focusedColumnIndex,
    columnIds,
    focusedItemId,
    getItemsForColumn,
    pasteItems,
    pushUndoAndPersist,
  ])

  const handleOpenSearch = useCallback(() => {
    setSearchBarOpen(true)
    pushKeyboardContext('search')
  }, [setSearchBarOpen, pushKeyboardContext])

  const handleSearchClose = useCallback(() => {
    const state = useAppStore.getState()
    if (state.commandPaletteOpen) state.setCommandPaletteOpen(false)
    else state.setSearchBarOpen(false)
    popKeyboardContext()
  }, [popKeyboardContext])

  const handleToggleShowCompleted = useCallback(() => {
    setActiveFilters({ showCompleted: !activeFilters.showCompleted })
  }, [activeFilters.showCompleted, setActiveFilters])

  const savedViewsList = useMemo(() => Object.values(savedViews), [savedViews])

  const handleSaveView = useCallback(async () => {
    const name = window.prompt('Save view', 'Enter view name:')
    if (!name?.trim()) return
    if (savedViewsList.length >= 8) {
      return
    }
    if (!userId) return
    const shortcutNum = savedViewsList.length + 2
    const shortcut = `Cmd+${shortcutNum}`
    const view: SavedView = {
      id: crypto.randomUUID(),
      name: name.trim(),
      filters: { ...activeFilters },
      colorMode: useAppStore.getState().colorMode,
      shortcut,
      createdAt: Date.now(),
    }
    addSavedView(view)
    const nextViews = { ...useAppStore.getState().savedViews, [view.id]: view }
    const rows = Object.values(nextViews).map(savedViewToRow)
    await useSettingsStore.getState().upsertSettings(userId, { saved_views: rows })
  }, [userId, activeFilters, savedViewsList.length, addSavedView])

  const handleLoadSavedView = useCallback(
    async (index: number) => {
      const view = savedViewsList[index]
      if (!view || !userId) return
      setActiveFilters(view.filters)
      setColorMode(view.colorMode)
      try {
        const tasks = await searchTasksApi(userId, view.filters)
        setSearchResultTaskIds(tasks.map((t) => t.id))
      } catch {
        setSearchResultTaskIds([])
      }
    },
    [userId, savedViewsList, setActiveFilters, setColorMode, setSearchResultTaskIds]
  )

  const handleOpenSettings = useCallback(() => {
    const state = useAppStore.getState()
    if (state.currentView === 'settings') return
    state.setPreviousView(state.currentView)
    state.setCurrentView('settings')
  }, [])

  const handleOpenArchive = useCallback(() => {
    const state = useAppStore.getState()
    if (state.currentView === 'archive') return
    state.setPreviousView(state.currentView)
    state.setCurrentView('archive')
  }, [])

  const handleUndo = useCallback(async () => {
    let item = popUndo()
    if (!item && userId) {
      const loaded = await loadMoreUndoHistory(userId)
      if (loaded) item = popUndo()
    }
    if (!item) {
      useFeedbackStore.getState().showInfo('Nothing to undo')
      return
    }
    await performUndo(item)
  }, [popUndo, userId])

  const handleRedo = useCallback(async () => {
    const item = redo()
    if (!item) {
      useFeedbackStore.getState().showInfo('Nothing to redo')
      return
    }
    await performRedo(item)
  }, [redo])

  const handleOpenCommandPalette = useCallback(() => {
    useAppStore.getState().setCommandPaletteOpen(true)
    pushKeyboardContext('search')
  }, [pushKeyboardContext])

  const setCommandPaletteCommands = useAppStore((s) => s.setCommandPaletteCommands)
  const shortcutMappings = useShortcutStore((s) => s.mappings)
  useEffect(() => {
    const getShortcut = (action: string) =>
      formatShortcutForDisplay(useShortcutStore.getState().getShortcut(action) || '')
    const commands = [
      { id: 'goto-main', label: 'Go to Today View', category: 'Navigation', action: () => setCurrentView('main_db'), shortcut: getShortcut('mainView') },
      { id: 'goto-upcoming', label: 'Go to Upcoming View', category: 'Navigation', action: () => setCurrentView('upcoming'), shortcut: getShortcut('upcomingView') },
      { id: 'goto-root', label: 'Go to Home', category: 'Navigation', action: handleScrollHome, shortcut: 'Home' },
      { id: 'create', label: 'Create task or directory', category: 'Creation', action: initiateCreation, shortcut: getShortcut('newTask') },
      { id: 'color-none', label: 'No color mode', category: 'View', action: () => setColorMode('none'), shortcut: getShortcut('colorNone') },
      { id: 'color-category', label: 'Category color mode', category: 'View', action: () => setColorMode('category'), shortcut: getShortcut('colorCategory') },
      { id: 'color-priority', label: 'Priority color mode', category: 'View', action: () => setColorMode('priority'), shortcut: getShortcut('colorPriority') },
      { id: 'toggle-completed', label: 'Show/hide completed tasks', category: 'View', action: handleToggleShowCompleted, shortcut: getShortcut('completedToggle') },
      { id: 'search', label: 'Search & filter', category: 'Search', action: handleOpenSearch, shortcut: getShortcut('searchOpen') },
      { id: 'settings', label: 'Open settings', category: 'Settings', action: handleOpenSettings, shortcut: getShortcut('settings') },
      { id: 'shortcuts', label: 'Keyboard shortcuts', category: 'Help', action: () => setShortcutSheetOpen(true), shortcut: getShortcut('cmdSlash') },
      ...savedViewsList.slice(0, 8).map((view, i) => ({
        id: `saved-view-${view.id}`,
        label: `Load view: ${view.name}`,
        category: 'Saved Views',
        action: () => handleLoadSavedView(i),
        shortcut: getShortcut(['savedView2', 'savedView3', 'savedView4', 'savedView5', 'savedView6', 'savedView7', 'savedView8', 'savedView9'][i]!),
      })),
    ]
    setCommandPaletteCommands(commands)
  }, [
    setCommandPaletteCommands,
    setCurrentView,
    handleScrollHome,
    initiateCreation,
    setColorMode,
    handleToggleShowCompleted,
    handleOpenSearch,
    handleOpenSettings,
    setShortcutSheetOpen,
    savedViewsList,
    handleLoadSavedView,
    shortcutMappings,
  ])

  useKeyboard({
    onMainView: () => setCurrentView('main_db'),
    onUpcomingView: () => setCurrentView('upcoming'),
    onArchiveView: handleOpenArchive,
    onSettings: handleOpenSettings,
    onUndo: handleUndo,
    onRedo: handleRedo,
    onCommandPalette: handleOpenCommandPalette,
    onSearch: handleOpenSearch,
    onSearchClose: handleSearchClose,
    onToggleShowCompleted: handleToggleShowCompleted,
    onSaveView: handleSaveView,
    onLoadSavedView: handleLoadSavedView,
    onScrollLeft: scrollLeft,
    onScrollRight: scrollRight,
    onScrollHome: handleScrollHome,
    onScrollEnd: handleScrollEnd,
    onColorNone: () => setColorMode('none'),
    onColorCategory: () => setColorMode('category'),
    onColorPriority: () => setColorMode('priority'),
    onInitiateCreation: initiateCreation,
    onCreationTypeTask: handleCreationTypeTask,
    onCreationTypeDirectory: handleCreationTypeDirectory,
    onCreationEscape: handleCancelCreation,
    onCreationInvalidKey: handleCreationInvalidKey,
    onQuickEdit: startQuickEdit,
    onFullEdit: startFullEdit,
    onDelete: initiateDelete,
    onCopy: copyShallow,
    onCopyRecursive: copyRecursive,
    onCut: cut,
    onPaste: paste,
    onPasteWithMetadata: pasteWithMetadata,
    onArrowUp: moveFocusUp,
    onArrowDown: moveFocusDown,
    onArrowLeft: collapseColumn,
    onArrowRight: handleEnterOrArrowRight,
    onEnter: handleEnterOrArrowRight,
    onEscape: handleEscape,
    onExitEditing: handleExitEditing,
    onAddAttachment: handleAddAttachment,
    onOpenAllAttachments: handleOpenAllAttachments,
    onSpace: handleSpace,
    onShiftArrowUp: extendSelectionUp,
    onShiftArrowDown: extendSelectionDown,
    onCmdA: selectAllInColumn,
    onCmdArrowUp: handleCmdArrowUp,
    onCmdArrowDown: handleCmdArrowDown,
    onCmdSlash: () => setShortcutSheetOpen(true),
    enabled: true,
  })

  useEffect(() => {
    if (navigationPath.length > 0) return
    setFocusedColumnIndex(0)
    const items = getItemsForColumn(0)
    if (items.length > 0 && focusedItemId == null) {
      setFocusedItem(items[0].id)
    } else if (items.length === 0) {
      setFocusedItem(getEmptySlotId(0))
    }
  }, [navigationPath.length, focusedItemId, setFocusedItem, setFocusedColumnIndex, directories.length, tasks.length])

  const childCountByDirectoryId = useMemo(() => {
    const counts: Record<string, number> = {}
    directories.forEach((d) => {
      if (d.parent_id != null) {
        counts[d.parent_id] = (counts[d.parent_id] ?? 0) + 1
      }
    })
    tasks.forEach((t) => {
      counts[t.directory_id] = (counts[t.directory_id] ?? 0) + 1
    })
    return counts
  }, [directories, tasks])

  const handleItemExpand = (item: Task | Directory) => {
    if (isTask(item)) {
      setExpandedTaskId(item.id)
      pushKeyboardContext('editing')
      return
    }
    addToFocusHistory(focusedColumnIndex, item.id)
    pushNavigation(item.id)
    const newCol = columnIds.length
    setFocusedColumnIndex(newCol)
    const newItems = getItemsForColumn(newCol)
    if (newItems.length > 500 && !warnedDirSize.current) {
      warnedDirSize.current = true
      useFeedbackStore.getState().showInfo(
        `This directory has ${newItems.length} items. Consider splitting for better performance.`
      )
    }
    if (newCol >= 13 && !warnedDepth.current) {
      warnedDepth.current = true
      useFeedbackStore.getState().showInfo(
        `This path is ${newCol} levels deep (max 15). Consider restructuring.`
      )
    }
    setFocusedItem(newItems.length > 0 ? newItems[0].id : getEmptySlotId(newCol))
    setTimeout(() => scrollToColumn(newCol), 50)

    // When a new column opens, assume the user is adding a task or directory and wait for typing.
    const tid = useUIStore.getState().creationTimeoutId
    if (tid != null) clearTimeout(tid)
    setCreationTimeoutId(null)
    const newItemId = crypto.randomUUID()
    setCreationState({
      mode: 'directory-naming',
      itemId: newItemId,
      columnIndex: newCol,
      itemIndex: newItems.length,
    })
    pushKeyboardContext('creation')
    const timeoutId = setTimeout(() => {
      cancelCreation()
      popKeyboardContext()
    }, CREATION_TIMEOUT_MS)
    setCreationTimeoutId(timeoutId)
  }

  const handleItemSelect = (id: string, event?: React.MouseEvent) => {
    if (event?.metaKey) {
      toggleSelectedItem(id)
      setFocusedItem(id)
      return
    }
    clearSelection()
    setSelectedItems([id])
    setFocusedItem(id)
    setSelectionAnchorIndex(null)
  }

  // Task panel uses creationState.columnIndex so the new task appears only in its assigned column.
  const taskPanelDirectoryId =
    creationState?.mode === 'task-panel' && creationState.columnIndex > 0
      ? (columnIds[creationState.columnIndex] as string)
      : null

  return (
    <div
      ref={scrollContainerRef}
      className="columns-container flex-1 flex flex-row overflow-x-auto overflow-y-hidden bg-flow-background relative"
      style={{ scrollSnapType: 'x mandatory' }}
    >
      {columnIds.map((directoryId, columnIndex) => (
        <Column
          key={columnIndex}
          columnIndex={columnIndex}
          directoryId={directoryId}
          directoryName={
            directoryId
              ? directories.find((d) => d.id === directoryId)?.name ?? ''
              : null
          }
          items={getItemsForColumn(columnIndex)}
          usePagination={
            !!directoryId &&
            !activeFilters.searchQuery.trim() &&
            activeFilters.tags.length === 0 &&
            activeFilters.priorities.length === 0 &&
            activeFilters.categories.length === 0 &&
            activeFilters.dateRange == null &&
            searchResultTaskIds == null &&
            (childCountByDirectoryId[directoryId] ?? 0) > 200
          }
          selectedItemIds={selectedItemIds}
          focusedItemId={focusedItemId}
          isActive={focusedColumnIndex === columnIndex}
          onItemSelect={handleItemSelect}
          onItemExpand={handleItemExpand}
          colorMode={colorMode}
          viewMode={viewMode}
          searchQuery={activeFilters.searchQuery.trim() || undefined}
          onColumnFocus={() => {
            setFocusedColumnIndex(columnIndex)
            const colItems = getItemsForColumn(columnIndex)
            setFocusedItem(colItems.length > 0 ? colItems[0].id : getEmptySlotId(columnIndex))
          }}
          childCountByDirectoryId={childCountByDirectoryId}
          creationState={creationState}
          onDirectorySave={saveDirectory}
          onDirectoryCancel={handleDirectoryCancel}
          inlineEditState={inlineEditState}
          onInlineSave={saveInlineEdit}
          onInlineCancel={handleInlineCancel}
          cutItemIds={cutItemIds}
          onItemDragStart={setDraggingItemId}
          onItemDragEnd={() => setDraggingItemId(null)}
          onDrop={(targetDirectoryId, position, itemId) => {
            const task = tasks.find((t) => t.id === itemId)
            const directory = directories.find((d) => d.id === itemId)
            const item = task ?? directory
            if (!item) {
              setDraggingItemId(null)
              return
            }
            if (isTask(item) && targetDirectoryId == null) return
            moveItems([item], targetDirectoryId, position)
            setDraggingItemId(null)
          }}
        />
      ))}
      {        creationState?.mode === 'task-panel' &&
        creationState.itemId &&
        taskPanelDirectoryId &&
        userId && (
          <TaskCreationPanel
            itemId={creationState.itemId}
            directoryId={taskPanelDirectoryId}
            position={creationState.itemIndex}
            userId={userId}
            onSave={saveTask}
            onCancel={handleTaskPanelCancel}
          />
        )}
      {editPanelState?.type === 'task' && (() => {
        const task = tasks.find((t) => t.id === editPanelState.itemId)
        return task ? (
          <TaskEditPanel
            task={task}
            onSave={handleEditPanelSaveTask}
            onCancel={handleEditPanelCancel}
          />
        ) : null
      })()}
      {editPanelState?.type === 'directory' && (() => {
        const directory = directories.find((d) => d.id === editPanelState.itemId)
        return directory ? (
          <DirectoryEditPanel
            directory={directory}
            onSave={handleEditPanelSaveDirectory}
            onCancel={handleEditPanelCancel}
          />
        ) : null
      })()}
      {deleteConfirmItems != null && deleteConfirmItems.length > 0 && (
        <DeleteConfirmationDialog
          items={deleteConfirmItems}
          childCountByDirectoryId={childCountByDirectoryId}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      )}
      {expandedTaskId && (() => {
        const expandedTask = tasks.find((t) => t.id === expandedTaskId)
        return expandedTask ? (
          <ExpandedTaskPanel
            task={expandedTask}
            onClose={handleExitEditing}
            onEdit={() => {
              setEditPanelState({ type: 'task', itemId: expandedTask.id })
              setExpandedTaskId(null)
              popKeyboardContext()
            }}
            onAddAttachmentRef={(trigger) => {
              addAttachmentTriggerRef.current = trigger
            }}
            onOpenAllAttachmentsRef={(trigger) => {
              openAllAttachmentsTriggerRef.current = trigger
            }}
            onTaskUpdated={(updates) => {
              patchTaskActualDuration(expandedTask.id, updates.actual_duration_minutes)
            }}
          />
        ) : null
      })()}
    </div>
  )
}
