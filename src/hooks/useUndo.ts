import { useState, useCallback } from 'react'
import { insertActionHistory } from '../api/actionHistory'
import type { ActionType, EntityType } from '../types'

interface UndoEntry {
  id: string
  actionType: ActionType
  entityType: EntityType
  entityData: Record<string, unknown> | null
  createdAt: number
}

interface UseUndoOptions {
  userId: string | undefined
  maxStackSize?: number
}

export function useUndo({ userId, maxStackSize = 50 }: UseUndoOptions) {
  const [stack, setStack] = useState<UndoEntry[]>([])

  const push = useCallback(
    async (
      actionType: ActionType,
      entityType: EntityType,
      entityData: Record<string, unknown> | null
    ) => {
      if (!userId) return
      try {
        await insertActionHistory({
          user_id: userId,
          action_type: actionType,
          entity_type: entityType,
          entity_data: entityData,
        })
      } catch {
        // Non-blocking: undo stack is best-effort
      }
      setStack((prev) => {
        const next = [
          ...prev,
          {
            id: crypto.randomUUID(),
            actionType,
            entityType,
            entityData,
            createdAt: Date.now(),
          },
        ]
        return next.slice(-maxStackSize)
      })
    },
    [userId, maxStackSize]
  )

  const undo = useCallback((): UndoEntry | null => {
    if (stack.length === 0) return null
    const entry = stack[stack.length - 1]
    setStack((prev) => prev.slice(0, -1))
    return entry
  }, [stack])

  const clear = useCallback(() => setStack([]), [])

  return {
    stack,
    canUndo: stack.length > 0,
    push,
    undo,
    clear,
  }
}
