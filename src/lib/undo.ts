/**
 * Undo/redo service: performUndo, performRedo, and pushUndoAndPersist.
 * Entity_data shapes:
 * - create: full entity (single object with id)
 * - delete: array of full entities (tasks or directories)
 * - update: full previous snapshot (single task or directory); optional new_state for redo
 * - move: { items, originalParentId: Record<id, string|null>, originalPosition: Record<id, number>, newParentId?, newPositions?: Record<id, number> }
 */

import type { Task, Directory } from '../types'
import type { ActionHistoryItem } from '../types/state'
import { useAppStore } from '../stores/appStore'
import { useTaskStore } from '../stores/taskStore'
import { useDirectoryStore } from '../stores/directoryStore'
import { useFeedbackStore } from '../stores/feedbackStore'
import { insertActionHistory, loadMoreActionHistory } from '../api/actionHistory'

const UNDO_EXPIRY_MS = 2 * 60 * 60 * 1000

export type PushUndoPayload = Omit<ActionHistoryItem, 'id' | 'createdAt' | 'expiresAt'>

function isTaskEntity(data: unknown): data is Task {
  return typeof data === 'object' && data !== null && 'directory_id' in data
}

function isDirectoryEntity(data: unknown): data is Directory {
  return typeof data === 'object' && data !== null && 'parent_id' in data && !('directory_id' in data)
}

/** Push an undo item to the store and persist to action_history. Call from ColumnsView after mutations. */
export function pushUndoAndPersist(userId: string, payload: PushUndoPayload): void {
  const now = Date.now()
  const expiresAt = now + UNDO_EXPIRY_MS
  const item: ActionHistoryItem = {
    id: crypto.randomUUID(),
    ...payload,
    createdAt: now,
    expiresAt,
  }
  useAppStore.getState().pushUndo(item)
  insertActionHistory({
    user_id: userId,
    action_type: payload.actionType,
    entity_type: payload.entityType,
    entity_data: payload.entityData,
    expires_at: new Date(expiresAt).toISOString(),
  }).catch(() => {
    // Non-blocking: persistence is best-effort
  })
  if (useAppStore.getState().undoStack.length >= 80) {
    useFeedbackStore.getState().showInfo('Undo history is nearly full. Older actions will be removed automatically.')
  }
}

/** Load more undo history when at boundary. Returns true if more was loaded. */
export async function loadMoreUndoHistory(userId: string): Promise<boolean> {
  const { undoStack, undoCurrentIndex, prependUndoHistory } = useAppStore.getState()
  if (undoCurrentIndex > 0) return false
  const oldestLoaded = undoStack[0]
  if (!oldestLoaded) return false
  const beforeCreatedAt = new Date(oldestLoaded.createdAt).toISOString()
  const rows = await loadMoreActionHistory(userId, beforeCreatedAt, 20)
  if (rows.length === 0) return false
  const items: ActionHistoryItem[] = rows.map((r) => ({
    id: r.id,
    actionType: r.action_type,
    entityType: r.entity_type,
    entityData: r.entity_data,
    createdAt: new Date(r.created_at).getTime(),
    expiresAt: new Date(r.expires_at).getTime(),
  }))
  prependUndoHistory(items)
  return true
}

/** Perform undo for the given action; call popUndo first to get the action. */
export async function performUndo(action: ActionHistoryItem): Promise<void> {
  if (Date.now() > action.expiresAt) {
    useFeedbackStore.getState().showInfo('Undo history expired (2 hour limit)')
    return
  }
  const taskStore = useTaskStore.getState()
  const directoryStore = useDirectoryStore.getState()
  try {
    switch (action.actionType) {
      case 'create': {
        const data = action.entityData
        if (!data) break
        const ids = Array.isArray(data)
          ? (data as Array<{ id: string }>).map((x) => x.id).filter(Boolean)
          : (data as { id?: string }).id
            ? [(data as { id: string }).id]
            : []
        for (const id of ids) {
          if (action.entityType === 'task') {
            await taskStore.removeTask(id)
          } else {
            await directoryStore.removeDirectory(id)
          }
        }
        break
      }
      case 'delete': {
        const arr = Array.isArray(action.entityData) ? action.entityData : [action.entityData]
        for (const raw of arr) {
          if (!raw || typeof raw !== 'object') continue
          const obj = raw as Record<string, unknown>
          const id = obj.id as string
          if (!id) continue
          if (action.entityType === 'task' && isTaskEntity(raw)) {
            await taskStore.restoreTask(raw as Task)
          } else if (action.entityType === 'directory' && isDirectoryEntity(raw)) {
            await directoryStore.restoreDirectory(raw as Directory)
          }
        }
        break
      }
      case 'update': {
        const data = action.entityData as Record<string, unknown> | null
        if (!data?.id) break
        const id = data.id as string
        if (action.entityType === 'task') {
          const prev = data as unknown as Task
          await taskStore.updateTask(id, {
            title: prev.title,
            priority: prev.priority ?? undefined,
            start_date: prev.start_date ?? undefined,
            due_date: prev.due_date ?? undefined,
            background_color: prev.background_color ?? undefined,
            category: prev.category ?? undefined,
            tags: prev.tags ?? undefined,
            description: prev.description ?? undefined,
            is_completed: prev.is_completed,
            completed_at: prev.completed_at ?? undefined,
            position: prev.position,
            directory_id: prev.directory_id,
          })
        } else {
          const prev = data as unknown as Directory
          await directoryStore.updateDirectory(id, {
            name: prev.name,
            parent_id: prev.parent_id ?? undefined,
            start_date: prev.start_date ?? undefined,
            due_date: prev.due_date ?? undefined,
            position: prev.position,
            depth_level: prev.depth_level,
          })
        }
        break
      }
      case 'move': {
        const data = action.entityData as {
          items?: Array<Record<string, unknown>>
          originalParentId?: Record<string, string | null>
          originalPosition?: Record<string, number>
        } | null
        if (!data?.items?.length || !data.originalParentId || !data.originalPosition) break
        for (const item of data.items) {
          const id = item.id as string
          if (!id) continue
          const origParent = data.originalParentId[id]
          const origPos = data.originalPosition[id]
          if (action.entityType === 'task') {
            await taskStore.updateTask(id, {
              directory_id: origParent ?? undefined,
              position: origPos ?? 0,
            })
          } else {
            await directoryStore.updateDirectory(id, {
              parent_id: origParent ?? undefined,
              position: origPos ?? 0,
            })
          }
        }
        break
      }
      case 'complete':
        // Optional: restore previous is_completed state
        break
      default:
        break
    }
    useFeedbackStore.getState().showSuccess('Undone')
  } catch {
    useFeedbackStore.getState().showError('Failed to undo action')
  }
}

/** Perform redo for the given action; call redo() first to get the action. */
export async function performRedo(action: ActionHistoryItem): Promise<void> {
  if (Date.now() > action.expiresAt) {
    useFeedbackStore.getState().showInfo('Redo history expired (2 hour limit)')
    return
  }
  const taskStore = useTaskStore.getState()
  const directoryStore = useDirectoryStore.getState()
  try {
    switch (action.actionType) {
      case 'create': {
        const data = action.entityData as Record<string, unknown> | null
        if (!data?.id) break
        if (action.entityType === 'task') {
          await taskStore.restoreTask(data as unknown as Task)
        } else {
          await directoryStore.restoreDirectory(data as unknown as Directory)
        }
        break
      }
      case 'delete': {
        const arr = Array.isArray(action.entityData) ? action.entityData : [action.entityData]
        for (const raw of arr) {
          if (!raw || typeof raw !== 'object') continue
          const id = (raw as Record<string, unknown>).id as string
          if (!id) continue
          if (action.entityType === 'task') {
            await taskStore.removeTask(id)
          } else {
            await directoryStore.removeDirectory(id)
          }
        }
        break
      }
      case 'update': {
        const data = action.entityData as { new_state?: Record<string, unknown> } | null
        const newState = data?.new_state as Record<string, unknown> | undefined
        if (!newState?.id) break
        const id = newState.id as string
        if (action.entityType === 'task') {
          await taskStore.updateTask(id, {
            title: newState.title as string,
            priority: newState.priority as Task['priority'],
            start_date: newState.start_date as string | null,
            due_date: newState.due_date as string | null,
            background_color: newState.background_color as string | null,
            category: newState.category as string | null,
            tags: newState.tags as string[],
            description: newState.description as string | null,
            is_completed: newState.is_completed as boolean,
            completed_at: newState.completed_at as string | null,
            position: newState.position as number,
            directory_id: newState.directory_id as string,
          })
        } else {
          await directoryStore.updateDirectory(id, {
            name: newState.name as string,
            parent_id: newState.parent_id as string | null,
            start_date: newState.start_date as string | null,
            due_date: newState.due_date as string | null,
            position: newState.position as number,
            depth_level: newState.depth_level as number,
          })
        }
        break
      }
      case 'move': {
        const data = action.entityData as {
          items?: Array<Record<string, unknown>>
          newParentId?: string | null
          newPositions?: Record<string, number>
        } | null
        if (!data?.items?.length) break
        const newParentId = data.newParentId ?? null
        const newPositions = data.newPositions ?? {}
        for (const item of data.items) {
          const id = item.id as string
          if (!id) continue
          const pos = newPositions[id] ?? 0
          if (action.entityType === 'task') {
            await taskStore.updateTask(id, {
              directory_id: newParentId ?? undefined,
              position: pos,
            })
          } else {
            await directoryStore.updateDirectory(id, {
              parent_id: newParentId ?? undefined,
              position: pos,
            })
          }
        }
        break
      }
      case 'complete':
        break
      default:
        break
    }
    useFeedbackStore.getState().showSuccess('Redone')
  } catch {
    useFeedbackStore.getState().showError('Failed to redo action')
  }
}
