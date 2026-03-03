/**
 * @deprecated — Replaced by the two-layer shortcut dispatcher.
 *
 * All callers have been migrated to use:
 *   - `useActions()` from `src/lib/actionRegistry.ts` for registering handlers
 *   - `useShortcutDispatcher()` from `src/hooks/useShortcutDispatcher.ts` for the global listener
 *   - `SHORTCUT_BINDINGS` from `src/lib/shortcutRegistry.ts` for binding definitions
 *
 * This file is kept temporarily to avoid breaking any external imports.
 * It will be deleted in a future cleanup pass.
 */
export function useKeyboard(_options?: Record<string, unknown>): void {
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      '[useKeyboard] DEPRECATED — migrate to useActions() and useShortcutDispatcher(). ' +
      'See src/lib/actionRegistry.ts and src/hooks/useShortcutDispatcher.ts.'
    )
  }
}
