// Grab mode hook — keyboard-driven drag-and-drop for items

import { useCallback } from 'react'
import { useAppStore } from '../stores/appStore'
import { useTaskStore } from '../stores/taskStore'
import { useDirectoryStore } from '../stores/directoryStore'
import { useActions } from '../lib/actionRegistry'
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
  const updateTask = useTaskStore((s) => s.updateTask)
  const updateDirectory = useDirectoryStore((s) => s.updateDirectory)
  const tasks = useTaskStore((s) => s.tasks)
  const directories = useDirectoryStore((s) => s.directories)

  const enterGrabMode = useCallback(() => {
    if (!focusedItemId) return
    const items = getItemsForColumn(focusedColumnIndex)
    const item = items.find(i => i.id === focusedItemId)
    if (!item) return

    const parentId = isTask(item) ? item.directory_id : (item.parent_id ?? '')
    setGrabModeItem(focusedItemId, parentId, item.position)
    pushKeyboardContext('grab')
  }, [focusedItemId, focusedColumnIndex, getItemsForColumn, setGrabModeItem, pushKeyboardContext])

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
    }
    setGrabModeItem(null)
    popKeyboardContext()
  }, [grabModeItemId, setGrabModeItem, popKeyboardContext, updateTask, updateDirectory])

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
  }, [grabModeItemId, focusedColumnIndex, getItemsForColumn, updateTask, updateDirectory])

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
  }, [grabModeItemId, focusedColumnIndex, getItemsForColumn, updateTask, updateDirectory])

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
