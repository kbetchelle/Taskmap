import { supabase } from '../lib/supabase'
import type { Task, ActiveItemRow, RecurringTask } from '../types'
import { calculateNextOccurrence } from '../lib/recurrence'
import {
  saveTaskWithConflictCheck,
  type SaveTaskResult,
} from './conflictResolution'

export async function fetchTasksByDirectory(directoryId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('directory_id', directoryId)
    .is('archived_at', null)
    .order('position', { ascending: true })
  if (error) throw error
  return (data as Task[]) ?? []
}

export async function fetchTasksByUser(userId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .is('archived_at', null)
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
  task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'archived_at' | 'archive_reason'> & { id?: string }
): Promise<Task> {
  const now = new Date().toISOString()
  const row = {
    ...task,
    id: task.id ?? crypto.randomUUID(),
    created_at: now,
    updated_at: now,
    archived_at: null,
    archive_reason: null,
  }
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
  updates: Partial<Pick<Task, 'title' | 'priority' | 'start_date' | 'due_date' | 'background_color' | 'category' | 'tags' | 'description' | 'is_completed' | 'completed_at' | 'archived_at' | 'archive_reason' | 'position' | 'directory_id' | 'recurrence_pattern' | 'recurrence_parent_id' | 'recurrence_series_id' | 'is_recurrence_template'>>
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
  updates: Partial<Pick<Task, 'title' | 'priority' | 'start_date' | 'due_date' | 'background_color' | 'category' | 'tags' | 'description' | 'is_completed' | 'completed_at' | 'position' | 'directory_id' | 'recurrence_pattern' | 'recurrence_parent_id' | 'recurrence_series_id' | 'is_recurrence_template'>>,
  currentTask: Task
): Promise<SaveTaskResult> {
  const version = currentTask.version ?? 1
  return saveTaskWithConflictCheck(taskId, updates, version, currentTask)
}

/** Create the next instance of a recurring task after completion. Returns the new task or null if no next occurrence. */
export async function createNextRecurrence(completedTask: RecurringTask): Promise<Task | null> {
  const pattern = completedTask.recurrence_pattern
  if (!pattern) return null

  if (pattern.end_after_count != null && pattern.end_after_count > 0) {
    const seriesId = completedTask.recurrence_series_id ?? completedTask.id
    const { count, error } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('recurrence_series_id', seriesId)
    if (error) throw error
    if (count != null && count >= pattern.end_after_count) return null
  }

  const fromDate = completedTask.due_date
    ? new Date(completedTask.due_date)
    : new Date()
  const nextDue = calculateNextOccurrence(pattern, fromDate)
  if (!nextDue) return null

  let nextStart: string | null = null
  if (completedTask.start_date) {
    const startFrom = new Date(completedTask.start_date)
    const nextStartDate = calculateNextOccurrence(pattern, startFrom)
    if (nextStartDate) {
      nextStart = nextStartDate.toISOString().slice(0, 10)
    }
  }

  const seriesId = completedTask.recurrence_series_id ?? completedTask.id
  const newTask: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'archived_at' | 'archive_reason'> & {
    id?: string
  } = {
    id: crypto.randomUUID(),
    title: completedTask.title,
    description: completedTask.description,
    directory_id: completedTask.directory_id,
    priority: completedTask.priority,
    category: completedTask.category,
    tags: completedTask.tags ?? [],
    background_color: completedTask.background_color,
    start_date: nextStart,
    due_date: nextDue.toISOString().slice(0, 10),
    recurrence_pattern: pattern,
    recurrence_parent_id: completedTask.id,
    recurrence_series_id: seriesId,
    is_recurrence_template: false,
    is_completed: false,
    completed_at: null,
    position: 0,
    user_id: completedTask.user_id,
  }
  const created = await insertTask(newTask)
  return created
}

/** Archive task (soft delete). Use for user delete and delayed completion archival. */
export async function archiveTask(
  id: string,
  reason: 'completed' | 'user_deleted' | 'auto_archived'
): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .update({
      archived_at: new Date().toISOString(),
      archive_reason: reason,
    })
    .eq('id', id)
  if (error) throw error
}

/** Unarchive task and clear completion. Returns updated task. */
export async function unarchiveTask(id: string): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update({
      archived_at: null,
      archive_reason: null,
      is_completed: false,
      completed_at: null,
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Task
}

export interface FetchArchivedTasksOptions {
  limit?: number
  reason?: 'completed' | 'user_deleted' | 'auto_archived'
  search?: string
}

export async function fetchArchivedTasks(
  userId: string,
  options: FetchArchivedTasksOptions = {}
): Promise<Task[]> {
  const { limit = 100, reason, search } = options
  let query = supabase
    .from('tasks')
    .select('*')
    .not('archived_at', 'is', null)
    .eq('user_id', userId)
    .order('archived_at', { ascending: false })
    .limit(limit)
  if (reason) {
    query = query.eq('archive_reason', reason)
  }
  if (search?.trim()) {
    const pattern = `%${search.trim().replace(/'/g, "''")}%`
    query = query.or(`title.ilike.${pattern},description.ilike.${pattern}`)
  }
  const { data, error } = await query
  if (error) throw error
  return (data as Task[]) ?? []
}

/** Permanently delete tasks (e.g. from Archive view). RLS restricts to own tasks. */
export async function permanentlyDeleteTasks(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const { error } = await supabase.from('tasks').delete().in('id', ids)
  if (error) throw error
}

/** Archive task with reason 'user_deleted'. Kept for call-site compatibility. */
export async function deleteTask(id: string): Promise<void> {
  await archiveTask(id, 'user_deleted')
}
