/**
 * View preferences store — manages per-directory view type preferences.
 *
 * Persisted to localStorage. Global default falls back to 'list'.
 */

import { create } from 'zustand'
import type { ViewType } from '../types/views'

const STORAGE_KEY = 'taskmap-view-prefs'

interface ViewPrefsData {
  viewPreferences: Record<string, ViewType>
  globalDefault: ViewType
}

function loadFromStorage(): ViewPrefsData {
  if (typeof window === 'undefined') {
    return { viewPreferences: {}, globalDefault: 'list' }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { viewPreferences: {}, globalDefault: 'list' }
    const parsed = JSON.parse(raw) as Partial<ViewPrefsData>
    return {
      viewPreferences: parsed.viewPreferences ?? {},
      globalDefault: parsed.globalDefault ?? 'list',
    }
  } catch {
    return { viewPreferences: {}, globalDefault: 'list' }
  }
}

function saveToStorage(data: ViewPrefsData): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // ignore
  }
}

interface ViewStoreState {
  viewPreferences: Record<string, ViewType>
  globalDefault: ViewType
  getViewForDirectory: (directoryId: string | null) => ViewType
  setViewForDirectory: (directoryId: string, view: ViewType) => void
  setGlobalDefault: (view: ViewType) => void
}

const initialData = typeof window !== 'undefined' ? loadFromStorage() : { viewPreferences: {}, globalDefault: 'list' as ViewType }

export const useViewStore = create<ViewStoreState>((set, get) => ({
  viewPreferences: initialData.viewPreferences,
  globalDefault: initialData.globalDefault,

  getViewForDirectory: (directoryId) => {
    if (directoryId == null) return 'list' // Root/Home always list
    return get().viewPreferences[directoryId] ?? get().globalDefault
  },

  setViewForDirectory: (directoryId, view) => {
    const next = {
      ...get().viewPreferences,
      [directoryId]: view,
    }
    set({ viewPreferences: next })
    saveToStorage({ viewPreferences: next, globalDefault: get().globalDefault })
  },

  setGlobalDefault: (view) => {
    set({ globalDefault: view })
    saveToStorage({ viewPreferences: get().viewPreferences, globalDefault: view })
  },
}))
