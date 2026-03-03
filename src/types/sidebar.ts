// Sidebar tree types

export type SidebarFilterMode = 'all' | 'dirs' | 'tasks'

export interface TreeNode {
  id: string
  name: string
  type: 'directory' | 'task'
  children: TreeNode[]
  depth: number
  isCompleted?: boolean
  /** Directory IDs from root to this node's parent (for breadcrumb in Tasks filter) */
  parentPath: string[]
}
