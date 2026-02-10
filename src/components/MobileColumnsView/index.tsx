import { useRef, useMemo, useEffect, useCallback, useState } from 'react'
import { useDirectoryStore } from '../../stores/directoryStore'
import { useTaskStore } from '../../stores/taskStore'
import { useAppStore } from '../../stores/appStore'
import { useUIStore } from '../../stores/uiStore'
import { useAppContext } from '../../contexts/AppContext'
import { showInlineError } from '../../lib/inlineError'
import { pushUndoAndPersist } from '../../lib/undo'
import { useFeedbackStore } from '../../stores/feedbackStore'
import type { Task, Directory, RecurringTask } from '../../types'
import { createNextRecurrence } from '../../api/tasks'
import type { ColorMode, ClipboardItem, FilterState } from '../../types/state'
import { Column } from '../Column'
import { TaskCreationPanel } from '../TaskCreationPanel'
import { TaskEditPanel } from '../TaskEditPanel'
import { DirectoryEditPanel } from '../DirectoryEditPanel'
import { DeleteConfirmationDialog } from '../DeleteConfirmationDialog'
import { MobileBottomSheet } from '../MobileBottomSheet'
import { Button } from '../ui/Button'

interface MobileColumnsViewProps {
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

export function MobileColumnsView({
  viewMode,
  navigationPath,
  colorMode,
}: MobileColumnsViewProps) {
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
  const setFocusedItem = useAppStore((s) => s.setFocusedItem)
  const expandedTaskId = useAppStore((s) => s.expandedTaskId)
  const setExpandedTaskId = useAppStore((s) => s.setExpandedTaskId)
  const pushKeyboardContext = useAppStore((s) => s.pushKeyboardContext)
  const popKeyboardContext = useAppStore((s) => s.popKeyboardContext)
  const setSearchBarOpen = useAppStore((s) => s.setSearchBarOpen)
  const activeFilters = useAppStore((s) => s.activeFilters)
  const searchResultTaskIds = useAppStore((s) => s.searchResultTaskIds)
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
  const setMobileMenuOpen = useUIStore((s) => s.setMobileMenuOpen)
  const setClipboardItems = useAppStore((s) => s.setClipboardItems)
  const cutItemIds = useAppStore((s) => s.cutItemIds)
  const setCutItemIds = useAppStore((s) => s.setCutItemIds)

  const [columnStack, setColumnStack] = useState<string[]>(() => [...navigationPath])
  const [deleteConfirmItems, setDeleteConfirmItems] = useState<(Task | Directory)[] | null>(null)
  const addAttachmentTriggerRef = useRef<(() => void) | null>(null)
  const openAllAttachmentsTriggerRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    setColumnStack([...navigationPath])
  }, [navigationPath.join(',')])

  const currentDirectoryId = columnStack.length > 0 ? columnStack[columnStack.length - 1] : null
  const columnIndex = columnStack.length
  const columnIds = [null, ...columnStack] as (string | null)[]

  const getItemsForColumn = useCallback(
    (idx: number): (Task | Directory)[] => {
      const parentId = idx === 0 ? null : columnStack[idx - 1]
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
    [directories, tasks, columnStack, viewMode, activeFilters, searchResultTaskIds]
  )

  const COMPLETION_DELETE_MS = 6 * 60 * 60 * 1000
  const CREATION_TIMEOUT_MS = 10_000
  const setTasks = useTaskStore((s) => s.setTasks)

  const navigateForward = useCallback(
    (directoryId: string) => {
      setColumnStack((prev) => [...prev, directoryId])
      pushNavigation(directoryId)
      const items = getItemsForColumn(columnIndex + 1)
      setFocusedItem(items.length > 0 ? items[0].id : null)
    },
    [pushNavigation, getItemsForColumn, columnIndex, setFocusedItem]
  )

  const navigateBack = useCallback(() => {
    if (columnStack.length === 0) return
    setColumnStack((prev) => prev.slice(0, -1))
    popNavigation()
    const prevItems = getItemsForColumn(columnIndex - 1)
    setFocusedItem(prevItems.length > 0 ? prevItems[0].id : null)
  }, [columnStack.length, popNavigation, getItemsForColumn, columnIndex, setFocusedItem])

  const handleItemExpand = useCallback(
    (item: Task | Directory) => {
      if (isTask(item)) {
        setExpandedTaskId(item.id)
        pushKeyboardContext('editing')
        return
      }
      navigateForward(item.id)
    },
    [setExpandedTaskId, pushKeyboardContext, navigateForward]
  )

  const handleItemSelect = useCallback(
    (id: string, event?: React.MouseEvent) => {
      if (event?.metaKey) {
        toggleSelectedItem(id)
        setFocusedItem(id)
        return
      }
      clearSelection()
      setSelectedItems([id])
      setFocusedItem(id)
    },
    [toggleSelectedItem, setFocusedItem, clearSelection, setSelectedItems]
  )

  const initiateCreation = useCallback(() => {
    const items = getItemsForColumn(columnIndex)
    const idx = focusedItemId ? items.findIndex((i) => i.id === focusedItemId) : -1
    const itemIndex = idx >= 0 ? idx : items.length
    const newItemId = crypto.randomUUID()
    setCreationState({
      mode: 'type-select',
      itemId: newItemId,
      columnIndex,
      itemIndex,
    })
    pushKeyboardContext('creation')
    const timeoutId = setTimeout(() => {
      cancelCreation()
      popKeyboardContext()
    }, CREATION_TIMEOUT_MS)
    setCreationTimeoutId(timeoutId)
  }, [
    columnIndex,
    focusedItemId,
    getItemsForColumn,
    setCreationState,
    pushKeyboardContext,
    setCreationTimeoutId,
    cancelCreation,
    popKeyboardContext,
  ])

  const handleOpenSearch = useCallback(() => {
    setSearchBarOpen(true)
    pushKeyboardContext('search')
  }, [setSearchBarOpen, pushKeyboardContext])

  const handleOpenMenu = useCallback(() => {
    setMobileMenuOpen(true)
  }, [setMobileMenuOpen])

  const saveDirectory = useCallback(
    async (itemId: string, name: string) => {
      if (!creationState || !userId) return
      const parentId = creationState.columnIndex === 0 ? null : columnIds[creationState.columnIndex - 1] ?? null
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
        await addDirectory(dir)
        cancelCreation()
        popKeyboardContext()
      } catch (err) {
        showInlineError(itemId, err instanceof Error ? err.message : 'Failed to create directory')
      }
    },
    [creationState, userId, columnIds, directories, addDirectory, cancelCreation, popKeyboardContext]
  )

  const saveTask = useCallback(
    async (task: Omit<Task, 'created_at' | 'updated_at'>) => {
      if (!userId) return
      try {
        const created = await addTask(task)
        pushUndoAndPersist(userId, {
          actionType: 'create',
          entityType: 'task',
          entityData: created as unknown as Record<string, unknown>,
        })
        cancelCreation()
        popKeyboardContext()
      } catch (err) {
        if (creationState?.itemId) {
          showInlineError(creationState.itemId, err instanceof Error ? err.message : 'Failed to create task')
        }
      }
    },
    [userId, addTask, pushUndoAndPersist, cancelCreation, popKeyboardContext, creationState?.itemId]
  )

  const handleTaskPanelCancel = useCallback(() => {
    cancelCreation()
    popKeyboardContext()
  }, [cancelCreation, popKeyboardContext])

  const handleDirectoryCancel = useCallback(() => {
    cancelCreation()
    popKeyboardContext()
  }, [cancelCreation, popKeyboardContext])

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
          pushUndoAndPersist(userId, {
            actionType: 'update',
            entityType: 'task',
            entityData: { ...prev, new_state: { ...prev, title: trimmed } } as unknown as Record<string, unknown>,
          })
        } else {
          const prev = directories.find((d) => d.id === itemId)
          if (!prev) return
          await updateDirectory(itemId, { name: trimmed })
          pushUndoAndPersist(userId, {
            actionType: 'update',
            entityType: 'directory',
            entityData: { ...prev, new_state: { ...prev, name: trimmed } } as unknown as Record<string, unknown>,
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

  const handleEditPanelSaveTask = useCallback(
    async (id: string, updates: Partial<Task>) => {
      if (!userId) return
      try {
        const prev = tasks.find((t) => t.id === id)
        if (!prev) return
        await updateTask(id, updates)
        pushUndoAndPersist(userId, {
          actionType: 'update',
          entityType: 'task',
          entityData: { ...prev, new_state: { ...prev, ...updates } } as unknown as Record<string, unknown>,
        })
        setEditPanelState(null)
        popKeyboardContext()
      } catch (err) {
        if (editPanelState?.itemId) {
          showInlineError(editPanelState.itemId, err instanceof Error ? err.message : 'Failed to save')
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
        pushUndoAndPersist(userId, {
          actionType: 'update',
          entityType: 'directory',
          entityData: { ...prev, new_state: { ...prev, ...updates } } as unknown as Record<string, unknown>,
        })
        setEditPanelState(null)
        popKeyboardContext()
      } catch (err) {
        if (editPanelState?.itemId) {
          showInlineError(editPanelState.itemId, err instanceof Error ? err.message : 'Failed to save')
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

  const moveItems = useCallback(
    async (toMove: (Task | Directory)[], newParentId: string | null, newPosition: number) => {
      const depthLevel =
        newParentId == null
          ? 0
          : (directories.find((d) => d.id === newParentId)?.depth_level ?? 0) + 1
      for (let i = 0; i < toMove.length; i++) {
        const item = toMove[i]
        const pos = newPosition + i
        if (isTask(item)) {
          await updateTask(item.id, { directory_id: newParentId!, position: pos })
        } else {
          await updateDirectory(item.id, {
            parent_id: newParentId,
            position: pos,
            depth_level: depthLevel,
          })
        }
      }
      setCutItemIds([])
      setClipboardItems([])
    },
    [directories, updateTask, updateDirectory, setCutItemIds, setClipboardItems]
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
            const children = await pasteItems(item.children, created.id, 0, preserveMetadata)
            result.push(...children)
          }
        }
      }
      return result
    },
    [userId, addTask, addDirectory, directories]
  )

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
      const items = getItemsForColumn(columnIndex)
      const remaining = items.filter((i) => !toDelete.some((d) => d.id === i.id))
      setFocusedItem(remaining.length > 0 ? remaining[0].id : null)
    },
    [
      userId,
      pushUndoAndPersist,
      removeTask,
      removeDirectory,
      popKeyboardContext,
      getItemsForColumn,
      columnIndex,
      setFocusedItem,
    ]
  )

  const handleCompleteTask = useCallback(
    async (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId)
      if (!task || !isTask(task)) return
      const items = getItemsForColumn(columnIndex)
      const maxPosition = items.length === 0 ? 0 : Math.max(...items.map((i) => i.position))
      const completedAt = new Date().toISOString()
      const prevTasks = useTaskStore.getState().tasks
      const optimistic = prevTasks.map((t) =>
        t.id === task.id
          ? { ...t, is_completed: true, completed_at: completedAt, position: maxPosition + 1 }
          : t
      )
      setTasks(optimistic)
      try {
        await updateTask(task.id, {
          is_completed: true,
          completed_at: completedAt,
          position: maxPosition + 1,
        })
        if (task.recurrence_pattern) {
          try {
            const nextTask = await createNextRecurrence(task as RecurringTask)
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
          archiveTask(task.id, 'completed')
          clearCompletionTimeout(task.id)
        }, COMPLETION_DELETE_MS)
        setCompletionTimeout(task.id, timeoutId)
      } catch {
        setTasks(prevTasks)
        useFeedbackStore.getState().showError('Failed to complete task')
      }
    },
    [getItemsForColumn, columnIndex, setTasks, updateTask, archiveTask, setCompletionTimeout, clearCompletionTimeout]
  )

  const handleTaskSwipeLeft = useCallback(
    (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId)
      if (task) setDeleteConfirmItems([task])
      pushKeyboardContext('confirmation')
    },
    [tasks, pushKeyboardContext]
  )

  const handleTaskLongPress = useCallback(
    (taskId: string, _clientX: number, _clientY: number) => {
      setExpandedTaskId(taskId)
      pushKeyboardContext('editing')
    },
    [setExpandedTaskId, pushKeyboardContext]
  )

  const handleDeleteConfirm = useCallback(() => {
    if (deleteConfirmItems) performDelete(deleteConfirmItems)
  }, [deleteConfirmItems, performDelete])

  const handleDeleteCancel = useCallback(() => {
    setDeleteConfirmItems(null)
    popKeyboardContext()
  }, [popKeyboardContext])

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

  const taskPanelDirectoryId =
    creationState?.mode === 'task-panel' && creationState.columnIndex > 0
      ? (columnIds[creationState.columnIndex] as string)
      : null

  const headerLabel =
    currentDirectoryId == null
      ? 'Home'
      : directories.find((d) => d.id === currentDirectoryId)?.name ?? ''

  return (
    <div className="mobile-columns-view flex-1 min-h-0 flex flex-col bg-flow-background">
      <div className="mobile-breadcrumb flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-flow-columnBorder bg-flow-background">
        <Button
          variant="secondary"
          onClick={navigateBack}
          disabled={columnStack.length === 0}
          className="shrink-0"
        >
          ← Back
        </Button>
        <div className="breadcrumb-path flex-1 truncate text-base font-flow-semibold text-flow-textPrimary">
          {headerLabel}
        </div>
      </div>

      <div className="mobile-column flex-1 min-h-0 overflow-hidden flex">
        <Column
          columnIndex={columnIndex}
          directoryId={currentDirectoryId}
          directoryName={headerLabel === 'Home' ? null : headerLabel}
          items={getItemsForColumn(columnIndex)}
          usePagination={
            !!currentDirectoryId &&
            !activeFilters.searchQuery.trim() &&
            activeFilters.tags.length === 0 &&
            activeFilters.priorities.length === 0 &&
            activeFilters.categories.length === 0 &&
            activeFilters.dateRange == null &&
            searchResultTaskIds == null &&
            (childCountByDirectoryId[currentDirectoryId ?? ''] ?? 0) > 200
          }
          selectedItemIds={selectedItemIds}
          focusedItemId={focusedItemId}
          isActive
          onItemSelect={handleItemSelect}
          onItemExpand={handleItemExpand}
          colorMode={colorMode}
          viewMode={viewMode}
          searchQuery={activeFilters.searchQuery.trim() || undefined}
          onColumnFocus={() => {}}
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
          fullWidth
          onTaskSwipeRight={handleCompleteTask}
          onTaskSwipeLeft={handleTaskSwipeLeft}
          onTaskLongPress={handleTaskLongPress}
        />
      </div>

      {creationState?.mode === 'task-panel' &&
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
          <MobileBottomSheet
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

      <div className="mobile-actions flex-shrink-0 flex gap-2 px-4 py-3 border-t border-flow-columnBorder bg-flow-background">
        <Button variant="secondary" onClick={handleOpenMenu} className="flex-1">
          ☰ Menu
        </Button>
        <Button variant="primary" onClick={initiateCreation} className="flex-1">
          + New
        </Button>
        <Button variant="secondary" onClick={handleOpenSearch} className="flex-1">
          🔍 Search
        </Button>
      </div>
    </div>
  )
}
