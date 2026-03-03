import { useAppStore } from '../../stores/appStore'
import { QuickActionsOverlay } from './QuickActionsOverlay'

/**
 * CommandPalette entry point.
 * Thin wrapper that renders the QuickActionsOverlay when the palette is open.
 * Keeps the same export name so all existing imports continue to work.
 */
export function CommandPalette() {
  const open = useAppStore((s) => s.commandPaletteOpen)

  if (!open) return null

  return <QuickActionsOverlay />
}
