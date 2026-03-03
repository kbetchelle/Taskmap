import { supabase } from '../lib/supabase'
import type { TaskLink, LinkType } from '../types/links'

export async function fetchLinksForUser(userId: string): Promise<TaskLink[]> {
  const { data, error } = await supabase
    .from('task_links')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as TaskLink[]) ?? []
}

export async function fetchLinksForTask(taskId: string): Promise<TaskLink[]> {
  const { data, error } = await supabase
    .from('task_links')
    .select('*')
    .or(`source_id.eq.${taskId},target_id.eq.${taskId}`)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as TaskLink[]) ?? []
}

export async function createLink(
  sourceId: string,
  targetId: string,
  linkType: LinkType,
  userId: string
): Promise<TaskLink> {
  const { data, error } = await supabase
    .from('task_links')
    .insert({
      source_id: sourceId,
      target_id: targetId,
      link_type: linkType,
      user_id: userId,
    })
    .select()
    .single()
  if (error) throw error
  return data as TaskLink
}

export async function deleteLink(id: string): Promise<void> {
  const { error } = await supabase
    .from('task_links')
    .delete()
    .eq('id', id)
  if (error) throw error
}
