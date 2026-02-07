// Platform detection for keyboard shortcuts (Cmd vs Ctrl)

const plat =
  typeof navigator !== 'undefined' ? navigator.platform : ''

export const IS_MAC = /Mac|iPhone|iPad|iPod/.test(plat)
export const IS_WINDOWS = /Win/.test(plat)
export const IS_LINUX = /Linux/.test(plat)

const modKey = IS_MAC ? 'Cmd' : 'Ctrl'

/** Convert shortcut to platform-specific version (Cmd on Mac, Ctrl on Windows/Linux). */
export function getPlatformShortcut(shortcut: string): string {
  if (IS_MAC) {
    return shortcut.replace(/Ctrl/g, 'Cmd')
  }
  return shortcut.replace(/Cmd/g, 'Ctrl')
}

/** Format shortcut for display (⌘N on Mac, Ctrl+N on Windows/Linux). */
export function formatShortcutForDisplay(shortcut: string): string {
  if (!shortcut) return ''
  // Normalize 'mod' to platform-specific Cmd/Ctrl before formatting
  const normalized = shortcut.replace(/mod/gi, IS_MAC ? 'Cmd' : 'Ctrl')
  if (IS_MAC) {
    return normalized
      .replace(/Cmd/gi, '⌘')
      .replace(/Option/gi, '⌥')
      .replace(/Shift/gi, '⇧')
      .replace(/Ctrl/gi, '⌃')
  }
  return normalized.replace(/Cmd/gi, 'Ctrl')
}

/** Get the platform's modifier key name for building shortcuts. */
export function getModKey(): string {
  return modKey
}
