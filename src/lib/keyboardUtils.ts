// Keyboard shortcut parsing and matching

import { IS_MAC } from './platform'

/** Parse shortcut string into parts for matching. */
export function parseShortcut(shortcut: string): {
  key: string
  meta: boolean
  shift?: boolean
  alt?: boolean
} {
  const parts = shortcut.toLowerCase().split('+')
  const meta = parts.includes('mod') || parts.includes('meta') || parts.includes('ctrl')
  const shift = parts.includes('shift')
  const alt = parts.includes('alt')
  const key = parts.find((p) => !['mod', 'meta', 'ctrl', 'shift', 'alt'].includes(p)) ?? ''
  return { key, meta, shift, alt }
}

/** Convert KeyboardEvent to normalized shortcut string (e.g. "mod+n", "mod+shift+s"). */
export function parseKeyboardShortcut(e: KeyboardEvent): string {
  const modKey = IS_MAC ? e.metaKey : e.ctrlKey
  const parts: string[] = []
  if (modKey) parts.push('mod')
  if (e.shiftKey) parts.push('shift')
  if (e.altKey) parts.push('alt')
  const key = normalizeKey(e.key)
  if (key) parts.push(key)
  return parts.join('+').toLowerCase()
}

function normalizeKey(key: string): string {
  const k = key.toLowerCase()
  switch (k) {
    case 'arrowleft':
      return 'arrowleft'
    case 'arrowright':
      return 'arrowright'
    case 'arrowup':
      return 'arrowup'
    case 'arrowdown':
      return 'arrowdown'
    case ' ':
      return ' '
    default:
      return k
  }
}

/** Check if KeyboardEvent matches a shortcut string. */
export function matchShortcut(e: KeyboardEvent, shortcut: string): boolean {
  const { key, meta, shift, alt } = parseShortcut(shortcut)
  const metaKey = IS_MAC ? e.metaKey : e.ctrlKey
  const keyNorm =
    key === 'arrowleft'
      ? 'arrowleft'
      : key === 'arrowright'
        ? 'arrowright'
        : key === 'arrowup'
          ? 'arrowup'
          : key === 'arrowdown'
            ? 'arrowdown'
            : key
  const eKey = e.key.toLowerCase()
  if (keyNorm !== eKey) return false
  if (meta !== metaKey) return false
  if (shift !== undefined && shift !== e.shiftKey) return false
  if (alt !== undefined && alt !== e.altKey) return false
  return true
}
