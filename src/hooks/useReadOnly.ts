import { useNetworkStore } from '../stores/networkStore'

/**
 * Returns whether the app is in read-only mode (offline).
 * Uses a Zustand selector for efficient re-renders.
 */
export function useReadOnly(): { isReadOnly: boolean } {
  const isReadOnly = useNetworkStore((s) => !s.isOnline)
  return { isReadOnly }
}
