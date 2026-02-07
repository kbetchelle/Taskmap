import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useDirectoryStore } from '../stores/directoryStore'
import { useTaskStore } from '../stores/taskStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useAppStore } from '../stores/appStore'
import { fetchUnexpiredActionHistory } from '../api/actionHistory'
import type { ActionHistoryItem } from '../types/state'

export function useAuth() {
  const { user, session, setAuth } = useAuthStore()

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setAuth(newSession?.user ?? null, newSession ?? null)
    })

    // Set initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setAuth(s?.user ?? null, s ?? null)
    })

    return () => subscription.unsubscribe()
  }, [setAuth])

  return { user, session, isAuthenticated: !!session }
}

export function useAuthSyncStores() {
  const { user } = useAuthStore()
  const fetchDirectories = useDirectoryStore((s) => s.fetchDirectories)
  const fetchActiveItems = useTaskStore((s) => s.fetchActiveItems)
  const fetchSettings = useSettingsStore((s) => s.fetchSettings)
  const setUndoStack = useAppStore((s) => s.setUndoStack)
  const setUndoCurrentIndex = useAppStore((s) => s.setUndoCurrentIndex)

  useEffect(() => {
    if (!user?.id) return
    fetchDirectories(user.id)
    fetchActiveItems(user.id)
    fetchSettings(user.id)
    fetchUnexpiredActionHistory(user.id).then((rows) => {
      const currentStack = useAppStore.getState().undoStack
      if (currentStack.length > 0) return
      const items: ActionHistoryItem[] = rows.map((r) => ({
        id: r.id,
        actionType: r.action_type,
        entityType: r.entity_type,
        entityData: r.entity_data,
        createdAt: new Date(r.created_at).getTime(),
        expiresAt: new Date(r.expires_at).getTime(),
      }))
      const capped = items.length > 100 ? items.slice(-100) : items
      setUndoStack(capped)
      setUndoCurrentIndex(capped.length - 1)
    })
  }, [user?.id, fetchDirectories, fetchActiveItems, fetchSettings, setUndoStack, setUndoCurrentIndex])
}
