import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useDirectoryStore } from '../stores/directoryStore'
import { useTaskStore } from '../stores/taskStore'

export function useRealtimeSubscriptions() {
  const userId = useAuthStore((s) => s.user?.id)
  const fetchDirectories = useDirectoryStore((s) => s.fetchDirectories)
  const fetchTasksByUser = useTaskStore((s) => s.fetchTasksByUser)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel('taskmap-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'directories', filter: `user_id=eq.${userId}` },
        () => {
          fetchDirectories(userId)
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` },
        () => {
          fetchTasksByUser(userId)
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [userId, fetchDirectories, fetchTasksByUser])
}
