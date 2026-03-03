// Central keyboard shortcut hook — single keydown listener using the two-layer dispatcher

import { useEffect, useRef } from 'react'
import { handleKeyDown, detectConflicts } from '../lib/shortcutDispatcher'
import { useShortcutStore } from '../lib/shortcutManager'
import { useAppStore } from '../stores/appStore'
import type { ShortcutBinding } from '../lib/shortcutRegistry'

/**
 * Installs the global two-layer keyboard dispatcher.
 *
 * Call this once at the app root (e.g., AppContainer).
 * Attaches a single keydown listener on `document` that delegates
 * to the shortcutDispatcher for matching and action execution.
 */
export function useShortcutDispatcher(): void {
  const conflictsChecked = useRef(false)

  useEffect(() => {
    // Run conflict detection once (dev aid)
    if (!conflictsChecked.current) {
      conflictsChecked.current = true
      detectConflicts()
    }

    const listener = (event: KeyboardEvent) => {
      handleKeyDown(event, {
        getContext: () => useAppStore.getState().getCurrentKeyboardContext(),
        getEffectiveKeys: (binding: ShortcutBinding) => {
          // Check if user has remapped this shortcut via shortcutManager
          const remapped = useShortcutStore.getState().getShortcut(binding.action)
          return remapped || binding.keys
        },
      })
    }

    document.addEventListener('keydown', listener)
    return () => document.removeEventListener('keydown', listener)
  }, [])
}
