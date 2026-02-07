import { create } from 'zustand'
import type { UserSettings } from '../types'
import * as api from '../api/userSettings'
import { useAppStore } from './appStore'
import { rowToSavedView } from '../lib/savedViews'
import { applySettingsToUI } from '../lib/applySettingsToUI'

interface SettingsState {
  settings: UserSettings | null
  setSettings: (s: UserSettings | null) => void
  fetchSettings: (userId: string) => Promise<void>
  upsertSettings: (
    userId: string,
    updates: Partial<Omit<UserSettings, 'user_id' | 'created_at' | 'updated_at'>>
  ) => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  setSettings: (s) => set({ settings: s }),
  fetchSettings: async (userId) => {
    let settings = await api.fetchUserSettings(userId)
    // Create default user_settings on first login
    if (settings == null) {
      useAppStore.getState().setOnboardingOpen(true)
      set({ settings: null })
      return
    }
    set({ settings })
    applySettingsToUI(settings)
    if (settings?.saved_views?.length) {
      const views = settings.saved_views.map(rowToSavedView)
      useAppStore.getState().setSavedViews(Object.fromEntries(views.map((v) => [v.id, v])))
    }
  },
  upsertSettings: async (userId, updates) => {
    const updated = await api.upsertUserSettings({ user_id: userId, ...updates })
    set({ settings: updated })
  },
}))
