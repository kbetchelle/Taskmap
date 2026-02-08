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

/** Fetch recent unexpired action history (lazy load). Returns items in chronological order (oldest first). */
export async function loadRecentActionHistory(
  userId: string,
  limit = 20
): Promise<ActionHistory[]> {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('action_history')
    .select('*')
    .eq('user_id', userId)
    .gte('expires_at', now)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  const rows = (data as ActionHistory[]) ?? []
  return rows.reverse()
}

/** Fetch older action history for lazy load (items with created_at < beforeCreatedAt). */
export async function loadMoreActionHistory(
  userId: string,
  beforeCreatedAt: string,
  limit = 20
): Promise<ActionHistory[]> {
  const { data, error } = await supabase
    .from('action_history')
    .select('*')
    .eq('user_id', userId)
    .gte('expires_at', new Date().toISOString())
    .lt('created_at', beforeCreatedAt)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  const rows = (data as ActionHistory[]) ?? []
  return rows.reverse()
}

// Server-side cleanup (call from cron or manually)
export async function cleanupExpiredActions(): Promise<number> {
  const { data, error } = await supabase.rpc('cleanup_expired_actions')
  if (error) throw error
  return (data as number) ?? 0
}

// cleanup_completed_tasks RPC removed; task archival is client-only (6h delay after completion)
