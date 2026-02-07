import { supabase } from '../lib/supabase'
import type { Task, ActiveItemRow } from '../types'
import {
  saveTaskWithConflictCheck,
  type SaveTaskResult,
} from './conflictResolution'

export async function fetchTasksByDirectory(directoryId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('directory_id', directoryId)
    .order('position', { ascending: true })
  if (error) throw error
  return (data as Task[]) ?? []
}

export async function fetchTasksByUser(userId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('position', { ascending: true })
  if (error) throw error
  return (data as Task[]) ?? []
}

export async function getActiveItems(userId: string, currentDate: string): Promise<ActiveItemRow[]> {
  const { data, error } = await supabase.rpc('get_active_items', {
    p_user_id: userId,
    p_current_date: currentDate,
  })
  if (error) throw error
  return (data as ActiveItemRow[]) ?? []
}

export async function getUpcomingItems(userId: string, currentDate: string): Promise<ActiveItemRow[]> {
  const { data, error } = await supabase.rpc('get_upcoming_items', {
    p_user_id: userId,
    p_current_date: currentDate,
  })
  if (error) throw error
  return (data as ActiveItemRow[]) ?? []
}

/** Pass id to use client-generated id (e.g. for creation placeholder); omit for DB-generated. */
export async function insertTask(
  task: Omit<Task, 'id' | 'created_at' | 'updated_at'> & { id?: string }
): Promise<Task> {
  const now = new Date().toISOString()
  const row = { ...task, id: task.id ?? crypto.randomUUID(), created_at: now, updated_at: now }
  const { data, error } = await supabase
    .from('tasks')
    .insert(row)
    .select()
    .single()
  if (error) throw error
  return data as Task
}

export async function updateTask(
  id: string,
  updates: Partial<Pick<Task, 'title' | 'priority' | 'start_date' | 'due_date' | 'background_color' | 'category' | 'tags' | 'description' | 'is_completed' | 'completed_at' | 'position' | 'directory_id'>>
): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Task
}

/** Update task with conflict check. Use for normal saves. */
export async function updateTaskWithConflictCheck(
  taskId: string,
  updates: Partial<Pick<Task, 'title' | 'priority' | 'start_date' | 'due_date' | 'background_color' | 'category' | 'tags' | 'description' | 'is_completed' | 'completed_at' | 'position' | 'directory_id'>>,
  currentTask: Task
): Promise<SaveTaskResult> {
  const version = currentTask.version ?? 1
  return saveTaskWithConflictCheck(taskId, updates, version, currentTask)
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) throw error
}
