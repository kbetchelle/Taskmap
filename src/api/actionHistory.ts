import { supabase } from '../lib/supabase'
import type { ActionHistory } from '../types'

export async function insertActionHistory(
  entry: Omit<ActionHistory, 'id' | 'created_at' | 'expires_at'> & { expires_at?: string }
): Promise<ActionHistory> {
  const { data, error } = await supabase
    .from('action_history')
    .insert(entry)
    .select()
    .single()
  if (error) throw error
  return data as ActionHistory
}

export async function fetchActionHistoryByUser(userId: string): Promise<ActionHistory[]> {
  const { data, error } = await supabase
    .from('action_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as ActionHistory[]) ?? []
}

/** Fetch unexpired action history for undo stack (ascending by created_at). */
export async function fetchUnexpiredActionHistory(userId: string): Promise<ActionHistory[]> {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('action_history')
    .select('*')
    .eq('user_id', userId)
    .gte('expires_at', now)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data as ActionHistory[]) ?? []
}

// Server-side cleanup (call from cron or manually)
export async function cleanupExpiredActions(): Promise<number> {
  const { data, error } = await supabase.rpc('cleanup_expired_actions')
  if (error) throw error
  return (data as number) ?? 0
}

export async function cleanupCompletedTasks(): Promise<number> {
  const { data, error } = await supabase.rpc('cleanup_completed_tasks')
  if (error) throw error
  return (data as number) ?? 0
}
