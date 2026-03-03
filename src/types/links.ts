export type LinkType = 'reference' | 'dependency'

export interface TaskLink {
  id: string
  source_id: string
  target_id: string
  link_type: LinkType
  created_at: string
  user_id: string
}
