import { supabase } from '../lib/supabase'
import type { Directory, Task } from '../types'

export async function getDirectoryPath(directoryId: string): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_directory_path', {
    p_directory_id: directoryId,
  })
  if (error) throw error
  return (data as string[]) ?? []
}

/** Returns child directories and tasks in the given directory, ordered by position (dirs first, then tasks). */
export async function fetchDirectoryContents(directoryId: string): Promise<(Task | Directory)[]> {
  const [dirsResult, tasksResult] = await Promise.all([
    supabase
      .from('directories')
      .select('*')
      .eq('parent_id', directoryId)
      .order('position', { ascending: true }),
    supabase
      .from('tasks')
      .select('*')
      .eq('directory_id', directoryId)
      .order('position', { ascending: true }),
  ])
  if (dirsResult.error) throw dirsResult.error
  if (tasksResult.error) throw tasksResult.error
  const directories = (dirsResult.data as Directory[]) ?? []
  const tasks = (tasksResult.data as Task[]) ?? []
  return [...directories, ...tasks]
}

export async function fetchDirectoriesByUser(userId: string): Promise<Directory[]> {
  const { data, error } = await supabase
    .from('directories')
    .select('*')
    .eq('user_id', userId)
    .order('position', { ascending: true })
  if (error) throw error
  return (data as Directory[]) ?? []
}

/** Pass id to use client-generated id (e.g. for creation placeholder); omit for DB-generated. */
export async function insertDirectory(
  dir: Omit<Directory, 'id' | 'created_at' | 'updated_at' | 'due_date'> & { id?: string; due_date?: string | null }
): Promise<Directory> {
  const now = new Date().toISOString()
  const row = { ...dir, due_date: dir.due_date ?? null, id: dir.id ?? crypto.randomUUID(), created_at: now, updated_at: now }
  const { data, error } = await supabase
    .from('directories')
    .insert(row)
    .select()
    .single()
  if (error) throw error
  return data as Directory
}

export async function updateDirectory(
  id: string,
  updates: Partial<Pick<Directory, 'name' | 'parent_id' | 'start_date' | 'due_date' | 'position' | 'depth_level'>>
): Promise<Directory> {
  const { data, error } = await supabase
    .from('directories')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Directory
}

export async function deleteDirectory(id: string): Promise<void> {
  const { error } = await supabase.from('directories').delete().eq('id', id)
  if (error) throw error
}
