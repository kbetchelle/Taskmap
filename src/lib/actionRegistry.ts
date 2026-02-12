// Action registration and execution for keyboard shortcuts

import { useEffect, useRef } from 'react'

export type ActionHandler = (event?: KeyboardEvent) => void

const handlers = new Map<string, ActionHandler>()

export function registerAction(id: string, handler: ActionHandler): void {
  handlers.set(id, handler)
}

export function unregisterAction(id: string): void {
  handlers.delete(id)
}

export function executeAction(id: string, event?: KeyboardEvent): boolean {
  const handler = handlers.get(id)
  if (handler) {
    handler(event)
    return true
  }
  return false
}

export function hasAction(id: string): boolean {
  return handlers.has(id)
}

/**
 * React hook for lifecycle-safe action registration.
 *
 * Registers a set of action handlers on mount and unregisters them on unmount.
 * Uses refs internally so handler functions are always fresh (no stale closures),
 * even though the registrations themselves only happen once.
 *
 * @param actions - Record mapping action IDs to handler functions.
 *                  The set of keys should be stable across renders.
 */
export function useActions(actions: Record<string, ActionHandler>): void {
  // Always keep fresh handlers in ref (updated every render)
  const actionsRef = useRef(actions)
  actionsRef.current = actions

  // Track registered IDs for cleanup
  const registeredRef = useRef<string[]>([])

  // Register on mount, unregister on unmount.
  // Stable wrappers delegate through actionsRef so handlers are never stale.
  useEffect(() => {
    const ids = Object.keys(actionsRef.current)
    registeredRef.current = ids

    for (const id of ids) {
      registerAction(id, (event) => {
        actionsRef.current[id]?.(event)
      })
    }

    return () => {
      for (const id of registeredRef.current) {
        unregisterAction(id)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Handle dynamic action ID changes (rare but supported)
  const prevIdsRef = useRef<string[]>([])
  useEffect(() => {
    const currentIds = Object.keys(actions)
    const prevIds = prevIdsRef.current

    if (prevIds.length === 0) {
      // First render handled by mount effect above
      prevIdsRef.current = currentIds
      return
    }

    // Detect added/removed IDs
    const added = currentIds.filter(id => !prevIds.includes(id))
    const removed = prevIds.filter(id => !currentIds.includes(id))

    if (added.length === 0 && removed.length === 0) return

    for (const id of added) {
      registerAction(id, (event) => {
        actionsRef.current[id]?.(event)
      })
    }
    for (const id of removed) {
      unregisterAction(id)
    }

    registeredRef.current = currentIds
    prevIdsRef.current = currentIds
  })
}
