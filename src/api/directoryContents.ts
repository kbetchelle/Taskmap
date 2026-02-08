import { supabase } from '../lib/supabase'
import type { Task, Directory } from '../types'

export const ITEMS_PER_PAGE = 100

export interface DirectoryContentsResult {
  items: (Task | Directory)[]
  hasMore: boolean
  nextCursor: string | null
}

/**
 * Fetch directory contents with cursor-based pagination.
 * For root (parentId=null), only directories are returned. Otherwise directories + paginated tasks.
 */
export async function fetchDirectoryContentsPaginated(
  parentId: string | null,
  options?: { cursor?: string; limit?: number }
): Promise<DirectoryContentsResult> {
  const limit = options?.limit ?? ITEMS_PER_PAGE

  const dirsQuery = supabase
    .from('directories')
    .select('*')
    .order('position', { ascending: true })

  const dirsWithFilter = parentId == null
    ? dirsQuery.is('parent_id', null)
    : dirsQuery.eq('parent_id', parentId)

  const dirsResult = await dirsWithFilter

  if (dirsResult.error) throw dirsResult.error

  const directories = (dirsResult.data as Directory[]) ?? []

  if (parentId == null) {
    return { items: directories, hasMore: false, nextCursor: null }
  }

  let tasksQuery = supabase
    .from('tasks')
    .select('*')
    .eq('directory_id', parentId)
    .is('archived_at', null)
    .order('position', { ascending: true })
    .limit(limit)

  if (options?.cursor) {
    tasksQuery = tasksQuery.gt('position', parseInt(options.cursor, 10))
  }

  const tasksResult = await tasksQuery

  if (tasksResult.error) throw tasksResult.error

  const tasks = (tasksResult.data as Task[]) ?? []

  const hasMore = tasks.length === limit
  const nextCursor = hasMore && tasks.length > 0
    ? String(tasks[tasks.length - 1]!.position)
    : null

  const items: (Task | Directory)[] = [...directories, ...tasks]

  return { items, hasMore, nextCursor }
}
