// Grab mode hook — keyboard-driven drag-and-drop for items
// Integrated with the new drag visual system (Build 3C):
// - Sets dragState/draggedItemIds in uiStore for shared visual treatment
// - Updates dropTarget for DropIndicator feedback
// - Uses the same ring/shadow styling as mouse drag

import { useCallback } from 'react'
import { useAppStore } from '../stores/appStore'
import { useUIStore } from '../stores/uiStore'
import { useTaskStore } from '../stores/taskStore'
import { useDirectoryStore } from '../stores/directoryStore'
import { useActions } from '../lib/actionRegistry'
import { getItemElementRect } from '../lib/dragUtils'
import type { Task, Directory } from '../types'

function isTask(item: Task | Directory): item is Task {
  return 'directory_id' in item
}

interface UseGrabModeOptions {
  /** Returns the sorted list of items in a given column */
  getItemsForColumn: (columnIndex: number) => (Task | Directory)[]
}

export function useGrabMode({ getItemsForColumn }: UseGrabModeOptions) {
  const focusedItemId = useAppStore((s) => s.focusedItemId)
  const focusedColumnIndex = useAppStore((s) => s.focusedColumnIndex)
  const grabModeItemId = useAppStore((s) => s.grabModeItemId)
  const setGrabModeItem = useAppStore((s) => s.setGrabModeItem)
  const pushKeyboardContext = useAppStore((s) => s.pushKeyboardContext)
  const popKeyboardContext = useAppStore((s) => s.popKeyboardContext)
  const navigationPath = useAppStore((s) => s.navigationPath)
  const selectedItems = useAppStore((s) => s.selectedItems)
  const updateTask = useTaskStore((s) => s.updateTask)
  const updateDirectory = useDirectoryStore((s) => s.updateDirectory)
  const tasks = useTaskStore((s) => s.tasks)
  const directories = useDirectoryStore((s) => s.directories)

  // Drag system integration
  const startGrab = useUIStore((s) => s.startGrab)
  const startDrag = useUIStore((s) => s.startDrag)
  const updateDropTarget = useUIStore((s) => s.updateDropTarget)
  const cancelDrag = useUIStore((s) => s.cancelDrag)
  const completeDrop = useUIStore((s) => s.completeDrop)

  const enterGrabMode = useCallback(() => {
    if (!focusedItemId) return
    const items = getItemsForColumn(focusedColumnIndex)
    const item = items.find(i => i.id === focusedItemId)
    if (!item) return

    const parentId = isTask(item) ? item.directory_id : (item.parent_id ?? '')
    setGrabModeItem(focusedItemId, parentId, item.position)
    pushKeyboardContext('grab')

    // Set drag visual state — grab all selected items or just the focused one
    const itemIds = selectedItems.includes(focusedItemId)
      ? [...selectedItems]
      : [focusedItemId]
    const elementRect = getItemElementRect(focusedItemId) ?? new DOMRect(0, 0, 0, 0)
    startGrab(itemIds, { x: elementRect.x, y: elementRect.y, elementRect })
    startDrag() // Immediately transition to dragging for keyboard grab

    // Set initial drop indicator at current position
    const idx = items.findIndex(i => i.id === focusedItemId)
    const columnDirId = focusedColumnIndex === 0 ? null : navigationPath[focusedColumnIndex - 1]
    updateDropTarget({
      type: 'between',
      targetId: columnDirId ?? 'home',
      position: idx,
      rect: elementRect,
    })
  }, [focusedItemId, focusedColumnIndex, getItemsForColumn, setGrabModeItem, pushKeyboardContext, selectedItems, startGrab, startDrag, updateDropTarget, navigationPath])

  const exitGrabMode = useCallback(async (commit: boolean) => {
    if (!commit && grabModeItemId) {
      // Restore original position
      const orig = useAppStore.getState().grabModeOriginalPosition
      if (orig) {
        const allTasks = useTaskStore.getState().tasks
        const allDirs = useDirectoryStore.getState().directories
        const task = allTasks.find(t => t.id === grabModeItemId)
        const dir = allDirs.find(d => d.id === grabModeItemId)
        if (task) {
          await updateTask(grabModeItemId, {
            position: orig.position,
            directory_id: orig.parentId,
          })
        } else if (dir) {
          await updateDirectory(grabModeItemId, {
            position: orig.position,
            parent_id: orig.parentId || null,
          })
        }
      }
      cancelDrag() // Clear drag visual state on cancel
    } else {
      completeDrop() // Clear drag visual state on commit
    }
    setGrabModeItem(null)
    popKeyboardContext()
  }, [grabModeItemId, setGrabModeItem, popKeyboardContext, updateTask, updateDirectory, cancelDrag, completeDrop])

  const moveUp = useCallback(async () => {
    if (!grabModeItemId) return
    const items = getItemsForColumn(focusedColumnIndex)
    const idx = items.findIndex(i => i.id === grabModeItemId)
    if (idx <= 0) return

    const current = items[idx]
    const above = items[idx - 1]

    // Swap positions
    if (isTask(current)) {
      await updateTask(current.id, { position: above.position })
    } else {
      await updateDirectory(current.id, { position: above.position })
    }
    if (isTask(above)) {
      await updateTask(above.id, { position: current.position })
    } else {
      await updateDirectory(above.id, { position: current.position })
    }

    // Keep focus on the grabbed item
    useAppStore.getState().setFocusedItem(grabModeItemId)

    // Update drop indicator to new position
    const columnDirId = focusedColumnIndex === 0 ? null : navigationPath[focusedColumnIndex - 1]
    updateDropTarget({
      type: 'between',
      targetId: columnDirId ?? 'home',
      position: idx - 1,
    })
  }, [grabModeItemId, focusedColumnIndex, getItemsForColumn, updateTask, updateDirectory, updateDropTarget, navigationPath])

  const moveDown = useCallback(async () => {
    if (!grabModeItemId) return
    const items = getItemsForColumn(focusedColumnIndex)
    const idx = items.findIndex(i => i.id === grabModeItemId)
    if (idx < 0 || idx >= items.length - 1) return

    const current = items[idx]
    const below = items[idx + 1]

    // Swap positions
    if (isTask(current)) {
      await updateTask(current.id, { position: below.position })
    } else {
      await updateDirectory(current.id, { position: below.position })
    }
    if (isTask(below)) {
      await updateTask(below.id, { position: current.position })
    } else {
      await updateDirectory(below.id, { position: current.position })
    }

    useAppStore.getState().setFocusedItem(grabModeItemId)

    // Update drop indicator to new position
    const columnDirId = focusedColumnIndex === 0 ? null : navigationPath[focusedColumnIndex - 1]
    updateDropTarget({
      type: 'between',
      targetId: columnDirId ?? 'home',
      position: idx + 1,
    })
  }, [grabModeItemId, focusedColumnIndex, getItemsForColumn, updateTask, updateDirectory, updateDropTarget, navigationPath])

  const moveLeft = useCallback(async () => {
    if (!grabModeItemId || focusedColumnIndex <= 0) return
    // Move item to the parent's parent directory
    const parentId = navigationPath[focusedColumnIndex - 1] ?? null
    if (!parentId) return
    const parentDir = directories.find(d => d.id === parentId)
    const grandParentId = parentDir?.parent_id ?? null

    const item = [...tasks, ...directories].find(i => i.id === grabModeItemId)
    if (!item) return

    // grandParentId is null when the parent is a root-level directory.
    // In that case the item is already at the shallowest column that has
    // a parent, so there is nowhere further left to go.
    if (grandParentId === null) return

    if (isTask(item)) {
      await updateTask(grabModeItemId, {
        directory_id: grandParentId,
        position: Date.now(), // Append to end
      })
    } else {
      await updateDirectory(grabModeItemId, {
        parent_id: grandParentId,
        position: Date.now(),
      })
    }
  }, [grabModeItemId, focusedColumnIndex, navigationPath, tasks, directories, updateTask, updateDirectory])

  const moveRight = useCallback(async () => {
    if (!grabModeItemId) return
    const items = getItemsForColumn(focusedColumnIndex)
    const idx = items.findIndex(i => i.id === grabModeItemId)
    if (idx < 0) return

    // Find the nearest directory above the current item to move into
    let targetDir: Directory | null = null
    for (let i = idx - 1; i >= 0; i--) {
      if (!isTask(items[i])) {
        targetDir = items[i] as Directory
        break
      }
    }
    if (!targetDir) return

    const item = items[idx]
    if (isTask(item)) {
      await updateTask(grabModeItemId, {
        directory_id: targetDir.id,
        position: Date.now(), // Append to end
      })
    } else {
      await updateDirectory(grabModeItemId, {
        parent_id: targetDir.id,
        position: Date.now(),
      })
    }
  }, [grabModeItemId, focusedColumnIndex, getItemsForColumn, updateTask, updateDirectory])

  // Register all grab mode actions
  useActions({
    'grab.activate': enterGrabMode,
    'grab.up': moveUp,
    'grab.down': moveDown,
    'grab.left': moveLeft,
    'grab.right': moveRight,
    'grab.commit': () => exitGrabMode(true),
    'grab.cancel': () => exitGrabMode(false),
  })

  return {
    isGrabMode: grabModeItemId !== null,
    grabModeItemId,
  }
}
