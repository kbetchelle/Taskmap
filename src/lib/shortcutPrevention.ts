// Capture-phase keyboard handler to prevent critical browser shortcuts

import type { KeyboardContext } from '../types/keyboard'
import { matchShortcut } from './keyboardUtils'
import { useAppStore } from '../stores/appStore'

// Critical browser shortcuts to prevent (use mod for platform-agnostic: Cmd on Mac, Ctrl on Windows/Linux)
const PREVENTED_SHORTCUTS = [
  'mod+w',
  'mod+t',
  'mod+r',
  'mod+f',
  'mod+p',
  'mod+s',
  'mod+o',
  'mod+shift+t',
  ' ',
  'shift+ ',
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
      // Space and Shift+Space: only prevent when in navigation context
      if (shortcut === ' ' || shortcut === 'shift+ ') {
        return context === 'navigation'
      }
      return true
    }
  }
  return false
}

export function installShortcutPrevention(): void {
  const handler = (e: KeyboardEvent) => {
    const context = getContext()
    if (shouldPreventBrowserShortcut(e, context)) {
      e.preventDefault()
    }
  }
  document.addEventListener('keydown', handler as EventListener, { capture: true })
}
