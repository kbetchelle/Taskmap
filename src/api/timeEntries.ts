import { supabase } from '../lib/supabase'
import type { TimeEntry } from '../types'

export async function insertTimeEntry(
  entry: Omit<TimeEntry, 'id' | 'created_at'>
): Promise<TimeEntry> {
  const row = {
    ...entry,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  }
  const { data, error } = await supabase
    .from('time_entries')
    .insert(row)
    .select()
    .single()
  if (error) throw error
  return data as TimeEntry
}

export async function updateTimeEntry(
  id: string,
  updates: { ended_at: string; duration_minutes: number }
): Promise<void> {
  const { error } = await supabase
    .from('time_entries')
    .update(updates)
    .eq('id', id)
  if (error) throw error
}

export async function fetchTimeEntriesByTask(taskId: string): Promise<TimeEntry[]> {
  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .eq('task_id', taskId)
    .order('started_at', { ascending: false })
  if (error) throw error
  return (data as TimeEntry[]) ?? []
}

export async function fetchActiveTimeEntry(taskId: string): Promise<TimeEntry | null> {
  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .eq('task_id', taskId)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
  if (error) throw error
  const entries = (data as TimeEntry[]) ?? []
  return entries[0] ?? null
}
