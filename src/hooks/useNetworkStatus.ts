import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useNetworkStore } from '../stores/networkStore'
import type { ConnectionQuality } from '../stores/networkStore'

const HEARTBEAT_INTERVAL_MS = 30_000
const SLOW_THRESHOLD_MS = 2_000

/**
 * Detects online/offline state using:
 *  1. `navigator.onLine` + `online`/`offline` window events
 *  2. A 30-second heartbeat ping to Supabase to detect "technically online but server unreachable"
 *
 * Updates `useNetworkStore` with current state.
 */
export function useNetworkStatus() {
  const isOnline = useNetworkStore((s) => s.isOnline)
  const lastOnlineAt = useNetworkStore((s) => s.lastOnlineAt)
  const connectionQuality = useNetworkStore((s) => s.connectionQuality)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const store = useNetworkStore.getState()

    const handleOnline = () => {
      store.setOnline(true)
      store.setConnectionQuality('good')
      // Immediately run a heartbeat to confirm
      runHeartbeat()
    }

    const handleOffline = () => {
      store.setOnline(false)
      store.setConnectionQuality('offline')
    }

    async function runHeartbeat() {
      const start = performance.now()
      try {
        await supabase.from('directories').select('id').limit(1)
        const latency = performance.now() - start
        const quality: ConnectionQuality = latency >= SLOW_THRESHOLD_MS ? 'slow' : 'good'
        useNetworkStore.getState().setOnline(true)
        useNetworkStore.getState().setConnectionQuality(quality)
      } catch {
        // Server unreachable even if navigator.onLine is true
        useNetworkStore.getState().setOnline(false)
        useNetworkStore.getState().setConnectionQuality('offline')
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Start heartbeat interval
    intervalRef.current = setInterval(runHeartbeat, HEARTBEAT_INTERVAL_MS)
    // Run initial heartbeat
    runHeartbeat()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  return {
    isOnline,
    isOffline: !isOnline,
    lastOnlineAt,
    connectionQuality,
  }
}
