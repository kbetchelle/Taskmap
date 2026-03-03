import { create } from 'zustand'

export type ConnectionQuality = 'good' | 'slow' | 'offline'

interface NetworkState {
  isOnline: boolean
  lastOnlineAt: number
  lastSyncedAt: number
  connectionQuality: ConnectionQuality

  setOnline: (online: boolean) => void
  setConnectionQuality: (q: ConnectionQuality) => void
  setLastSyncedAt: (ts: number) => void
}

export const useNetworkStore = create<NetworkState>((set, get) => ({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  lastOnlineAt: Date.now(),
  lastSyncedAt: 0,
  connectionQuality: 'good',

  setOnline: (online) => {
    const prev = get().isOnline
    const updates: Partial<NetworkState> = { isOnline: online }
    if (online) {
      updates.lastOnlineAt = Date.now()
    }
    if (!online) {
      updates.connectionQuality = 'offline'
    }
    // Only update if changed (avoid unnecessary re-renders)
    if (prev !== online) {
      set(updates as NetworkState)
    }
  },

  setConnectionQuality: (q) => set({ connectionQuality: q }),

  setLastSyncedAt: (ts) => set({ lastSyncedAt: ts }),
}))
