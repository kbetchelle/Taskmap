// Capture-phase keyboard handler to prevent critical browser shortcuts

import type { KeyboardContext } from '../types/keyboard'
import { matchShortcut } from './keyboardUtils'
import { useAppStore } from '../stores/appStore'
import { SHORTCUT_BINDINGS } from './shortcutRegistry'

// Browser-only shortcuts that aren't app bindings but must still be blocked
const BROWSER_ONLY_PREVENTED = [
  'mod+w',
  'mod+t',
  'mod+r',
  'mod+f',
  'mod+p',
  'mod+s',
  'mod+o',
  'mod+shift+t',
]

// Derive app shortcuts that should be prevented from the registry
// (all bindings with preventDefault !== false)
const APP_PREVENTED = SHORTCUT_BINDINGS
  .filter(b => b.preventDefault !== false && !b.isChord)
  .map(b => b.keys)

// Combine and deduplicate
const PREVENTED_SHORTCUTS = [
  ...new Set([...BROWSER_ONLY_PREVENTED, ...APP_PREVENTED]),
]

function getContext(): KeyboardContext {
  try {
    return useAppStore.getState().getCurrentKeyboardContext()
  } catch {
    return 'navigation'
  }
}

export function shouldPreventBrowserShortcut(
  e: KeyboardEvent,
  context: KeyboardContext
): boolean {
  for (const shortcut of PREVENTED_SHORTCUTS) {
    if (matchShortcut(e, shortcut)) {
      // Space: only prevent when in navigation context
      if (shortcut === ' ') {
        return context === 'navigation'
      }
      return true
    }
  }
  return false
}

export function installShortcutPrevention(): void {
  const handler = (e: KeyboardEvent) => {
    // Always skip prevention for input, textarea, and contenteditable elements.
    // These need native browser behaviour (typing, undo, select-all, copy/paste).
    // The shortcut dispatcher handles them separately via data-keyboard-ignore.
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      e.target instanceof HTMLSelectElement ||
      (e.target instanceof HTMLElement && e.target.isContentEditable)
    ) {
      return
    }

    const context = getContext()
    if (shouldPreventBrowserShortcut(e, context)) {
      e.preventDefault()
    }
  }
  document.addEventListener('keydown', handler as EventListener, { capture: true })
}
