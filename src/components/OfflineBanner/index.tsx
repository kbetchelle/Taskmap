import { useState, useEffect, useCallback, useRef } from 'react'
import { useNetworkStore } from '../../stores/networkStore'

/**
 * Format a timestamp as a relative time string (e.g. "2 minutes ago").
 */
function formatRelativeTime(ts: number): string {
  if (!ts) return 'unknown'
  const diff = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  if (diff < 10) return 'just now'
  if (diff < 60) return `${diff} seconds ago`
  const mins = Math.floor(diff / 60)
  if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''} ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days !== 1 ? 's' : ''} ago`
}

export function OfflineBanner() {
  const isOnline = useNetworkStore((s) => s.isOnline)
  const lastSyncedAt = useNetworkStore((s) => s.lastSyncedAt)
  const [dismissed, setDismissed] = useState(false)
  const [showReconnected, setShowReconnected] = useState(false)
  const wasOfflineRef = useRef(false)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Track online/offline transitions
  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true
      setDismissed(false) // Reset dismiss when going offline again
      setShowReconnected(false)
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
    } else if (wasOfflineRef.current) {
      // Transitioned from offline → online
      wasOfflineRef.current = false
      setShowReconnected(true)
      setDismissed(false)
      reconnectTimerRef.current = setTimeout(() => {
        setShowReconnected(false)
        reconnectTimerRef.current = null
      }, 3000)
    }

    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
    }
  }, [isOnline])

  // Periodically re-render to update the "X ago" text
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!isOnline) {
      const interval = setInterval(() => setTick((t) => t + 1), 30_000)
      return () => clearInterval(interval)
    }
  }, [isOnline])

  const handleDismiss = useCallback(() => {
    setDismissed(true)
  }, [])

  // Nothing to show
  if (isOnline && !showReconnected) return null
  if (!isOnline && dismissed) return null

  // Reconnection banner
  if (showReconnected) {
    return (
      <div
        className="flex items-center justify-center gap-2 px-4 border-b border-green-200 bg-green-50 text-green-800 text-flow-meta font-flow-medium"
        style={{ height: 36 }}
        role="status"
        aria-live="polite"
      >
        <span>Back online — syncing...</span>
      </div>
    )
  }

  // Offline banner
  const syncedLabel = lastSyncedAt
    ? `Viewing data from ${formatRelativeTime(lastSyncedAt)}.`
    : 'Viewing cached data.'

  return (
    <div
      className="flex items-center justify-between gap-2 px-4 border-b border-amber-200 bg-amber-50 text-amber-800 text-flow-meta font-flow-medium"
      style={{ height: 36 }}
      role="alert"
      aria-live="polite"
    >
      <span>
        You&apos;re offline — viewing in read-only mode. {syncedLabel}
      </span>
      <button
        type="button"
        className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-amber-200/50 text-amber-600 transition-colors"
        onClick={handleDismiss}
        aria-label="Dismiss offline banner"
      >
        ✕
      </button>
    </div>
  )
}
