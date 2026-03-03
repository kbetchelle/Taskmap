// Two-layer keyboard shortcut dispatcher

import { matchShortcut } from './keyboardUtils'
import { executeAction } from './actionRegistry'
import { SHORTCUT_BINDINGS, EXCLUSIVE_CONTEXTS, type ShortcutBinding } from './shortcutRegistry'
import type { KeyboardContext } from '../types/keyboard'

// ─── Chord state ───────────────────────────────────────────────────────────────

interface ChordState {
  binding: ShortcutBinding
  timeout: ReturnType<typeof setTimeout>
}

let pendingChord: ChordState | null = null

function clearPendingChord(): void {
  if (pendingChord) {
    clearTimeout(pendingChord.timeout)
    pendingChord = null
  }
}

// ─── Core dispatch types ───────────────────────────────────────────────────────

export interface DispatcherOptions {
  getContext: () => KeyboardContext
  getEffectiveKeys: (binding: ShortcutBinding) => string
}

// ─── Matching helpers ──────────────────────────────────────────────────────────

function matchesBinding(
  event: KeyboardEvent,
  binding: ShortcutBinding,
  getEffectiveKeys: (b: ShortcutBinding) => string
): boolean {
  const keys = getEffectiveKeys(binding)
  if (keys && matchShortcut(event, keys)) return true
  if (binding.altKeys && matchShortcut(event, binding.altKeys)) return true
  return false
}

export function findMatchingBindings(
  event: KeyboardEvent,
  bindings: ShortcutBinding[],
  getEffectiveKeys: (b: ShortcutBinding) => string
): ShortcutBinding[] {
  return bindings.filter(b => !b.isChord && matchesBinding(event, b, getEffectiveKeys))
}

export function resolveBinding(
  matches: ShortcutBinding[],
  currentContext: KeyboardContext
): ShortcutBinding | null {
  // 1. Contextual match for current context wins
  const contextual = matches.find(
    b => b.layer === 'contextual' && b.contexts?.includes(currentContext)
  )
  if (contextual) return contextual

  // 2. If current context is exclusive, don't fall through to global
  if (EXCLUSIVE_CONTEXTS.includes(currentContext)) return null

  // 3. Global match not blocked by current context
  const global = matches.find(
    b => b.layer === 'global' && !b.blockedContexts?.includes(currentContext)
  )
  return global ?? null
}

// ─── Main handler ──────────────────────────────────────────────────────────────

export function handleKeyDown(
  event: KeyboardEvent,
  options: DispatcherOptions
): void {
  // Skip shortcuts if target is an input/textarea with data-keyboard-ignore
  if (
    event.target instanceof HTMLInputElement ||
    event.target instanceof HTMLTextAreaElement
  ) {
    if ((event.target as HTMLElement).getAttribute('data-keyboard-ignore') != null) return
  }
  // Always skip shortcuts when a select element is focused
  if (event.target instanceof HTMLSelectElement) return

  const currentContext = options.getContext()

  // ─── Chord completion ──────────────────────────────────────────────
  if (pendingChord) {
    const { binding } = pendingChord
    const secondKey = binding.chordSecondKey?.toLowerCase()
    const isCorrectKey = secondKey && event.key.toLowerCase() === secondKey
    // Also verify the context is still valid — the user may have opened a modal
    // between the first and second key of the chord.
    const isValidContext = !binding.contexts || binding.contexts.includes(currentContext)
    if (isCorrectKey && isValidContext) {
      event.preventDefault()
      clearPendingChord()
      executeAction(binding.action, event)
      return
    }
    // Wrong key or stale context — cancel chord and fall through to normal handling
    clearPendingChord()
  }

  // ─── Chord initiation ─────────────────────────────────────────────
  const chordBindings = SHORTCUT_BINDINGS.filter(b => b.isChord)
  for (const cb of chordBindings) {
    // Chord must be active in the current context
    if (cb.layer === 'contextual' && cb.contexts && !cb.contexts.includes(currentContext)) continue
    if (matchesBinding(event, cb, options.getEffectiveKeys)) {
      event.preventDefault()
      clearPendingChord()
      pendingChord = {
        binding: cb,
        timeout: setTimeout(clearPendingChord, 1000),
      }
      return
    }
  }

  // ─── Normal dispatch ───────────────────────────────────────────────
  const matches = findMatchingBindings(event, SHORTCUT_BINDINGS, options.getEffectiveKeys)
  const binding = resolveBinding(matches, currentContext)

  if (binding) {
    if (binding.preventDefault !== false) event.preventDefault()
    executeAction(binding.action, event)
    return
  }

  // ─── Exclusive context fallback ────────────────────────────────────
  if (EXCLUSIVE_CONTEXTS.includes(currentContext)) {
    // Creation: fire invalidKey action for unmatched keys
    if (currentContext === 'creation') {
      event.preventDefault()
      executeAction('creation.invalidKey', event)
      return
    }
    // Command menu: block all keys (component handles its own via focused input)
    if (currentContext === 'command_menu') {
      event.preventDefault()
      return
    }
    // Sidebar: block without action (no fallthrough to global)
    return
  }
}

// ─── Conflict detection (dev aid) ────────────────────────────────────────────

export function detectConflicts(): void {
  const bindings = SHORTCUT_BINDINGS.filter(b => !b.isChord)
  const warnings: string[] = []

  for (let i = 0; i < bindings.length; i++) {
    for (let j = i + 1; j < bindings.length; j++) {
      const a = bindings[i]
      const b = bindings[j]

      // Check if keys overlap
      if (a.keys !== b.keys) continue

      // Both contextual: check for overlapping contexts
      if (a.layer === 'contextual' && b.layer === 'contextual') {
        const aCtx = new Set(a.contexts ?? [])
        const bCtx = new Set(b.contexts ?? [])
        const overlap = [...aCtx].some(c => bCtx.has(c))
        if (overlap) {
          warnings.push(
            `Conflict: "${a.id}" and "${b.id}" share key "${a.keys}" in overlapping contexts`
          )
        }
      } else if (a.layer === 'global' && b.layer === 'global') {
        // Both global: same key is a conflict
        warnings.push(
          `Conflict: "${a.id}" and "${b.id}" are both global with key "${a.keys}"`
        )
      }
      // Contextual vs global is resolved by priority — not a conflict
    }
  }

  if (warnings.length > 0) {
    console.warn('[ShortcutDispatcher] Binding conflicts detected:')
    for (const w of warnings) {
      console.warn(`  ${w}`)
    }
  }
}
