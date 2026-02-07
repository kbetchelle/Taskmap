import { supabase } from '../lib/supabase'
import type { Task } from '../types'
import type { FilterState } from '../types/state'

export async function searchTasks(userId: string, filters: FilterState): Promise<Task[]> {
  let query = supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('is_completed', filters.showCompleted)
    .order('position', { ascending: true })

  const q = filters.searchQuery.trim()
  if (q) {
    const escaped = q.replace(/'/g, "''")
    const pattern = `%${escaped}%`
    query = query.or(`title.ilike.${pattern},description.ilike.${pattern}`)
  }
  if (filters.tags.length > 0) {
    query = query.overlaps('tags', filters.tags)
  }
  if (filters.priorities.length > 0) {
    query = query.in('priority', filters.priorities)
  }
  if (filters.categories.length > 0) {
    query = query.in('category', filters.categories)
  }
  if (filters.dateRange) {
    if (filters.dateRange.start != null) {
      query = query.gte('start_date', filters.dateRange.start.toISOString())
    }
    if (filters.dateRange.end != null) {
      query = query.lte('start_date', filters.dateRange.end.toISOString())
    }
  }

  const { data, error } = await query
  if (error) throw error
  return (data as Task[]) ?? []
}
