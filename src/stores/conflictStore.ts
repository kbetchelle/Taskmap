import { create } from 'zustand'
import type { Task, Directory } from '../types'
import type { ConflictInfo } from '../api/conflictResolution'

export type ConflictResolution = 'local' | 'remote' | 'merge'

export interface ConflictResolveResult {
  resolution: ConflictResolution
  data: Task | Directory
}

interface ConflictStoreState {
  pendingConflict: ConflictInfo | null
  _resolve: ((value: ConflictResolveResult) => void) | null
  _reject: ((reason?: unknown) => void) | null
  showConflictDialog: (conflict: ConflictInfo) => Promise<ConflictResolveResult | null>
  resolveConflict: (resolution: ConflictResolution, data?: Task | Directory) => void
  cancelConflict: () => void
}

export const useConflictStore = create<ConflictStoreState>((set, get) => ({
  pendingConflict: null,
  _resolve: null,
  _reject: null,

  showConflictDialog: (conflict: ConflictInfo) => {
    return new Promise<ConflictResolveResult | null>((resolve, reject) => {
      set({
        pendingConflict: conflict,
        _resolve: resolve,
        _reject: reject,
      })
    })
  },

  resolveConflict: (resolution: ConflictResolution, data?: Task | Directory) => {
    const { pendingConflict, _resolve } = get()
    if (!pendingConflict || !_resolve) return
    const resolvedData =
      data ??
      (resolution === 'local' ? pendingConflict.localData : pendingConflict.remoteData)
    _resolve({ resolution, data: resolvedData })
    set({ pendingConflict: null, _resolve: null, _reject: null })
  },

  cancelConflict: () => {
    const { _reject } = get()
    if (_reject) _reject(null)
    set({ pendingConflict: null, _resolve: null, _reject: null })
  },
}))
