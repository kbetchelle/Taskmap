import type { Directory, Task } from '../types/database'
import type { TreeNode, SidebarFilterMode } from '../types/sidebar'

const SIDEBAR_EXPANDED_KEY = 'taskmap-sidebar-expanded'

/**
 * Returns directory IDs from root to the given directory (inclusive).
 * Used to set navigationPath when clicking a directory in the sidebar.
 */
export function getPathToDirectory(
  directoryId: string,
  directories: Directory[]
): string[] {
  const dir = directories.find((d) => d.id === directoryId)
  if (!dir) return []
  const path: string[] = []
  let current: Directory | undefined = dir
  while (current) {
    path.unshift(current.id)
    current = current.parent_id
      ? directories.find((d) => d.id === current!.parent_id)
      : undefined
  }
  return path
}

/**
 * Get path from root to the parent of a node (for tasks: path to directory; for dirs: path to parent dirs).
 */
export function getPathToNode(
  nodeId: string,
  type: 'directory' | 'task',
  directories: Directory[],
  tasks: Task[]
): string[] {
  if (type === 'directory') {
    const path = getPathToDirectory(nodeId, directories)
    return path.slice(0, -1) // parent path excludes self
  }
  const task = tasks.find((t) => t.id === nodeId)
  if (!task) return []
  return getPathToDirectory(task.directory_id, directories)
}

function dirsUnder(parentId: string | null, directories: Directory[]): Directory[] {
  return directories
    .filter((d) => d.parent_id === parentId)
    .sort((a, b) => a.position - b.position)
}

function tasksUnder(directoryId: string, tasks: Task[]): Task[] {
  return tasks
    .filter((t) => t.directory_id === directoryId)
    .sort((a, b) => a.position - b.position)
}

function buildTreeNodeFromDir(
  dir: Directory,
  directories: Directory[],
  tasks: Task[],
  filter: SidebarFilterMode,
  depth: number,
  parentPath: string[]
): TreeNode {
  const childDirs = filter !== 'tasks' ? dirsUnder(dir.id, directories) : []
  const childTasks = filter !== 'dirs' ? tasksUnder(dir.id, tasks) : []
  const children: TreeNode[] = [
    ...childDirs.map((d) =>
      buildTreeNodeFromDir(d, directories, tasks, filter, depth + 1, [
        ...parentPath,
        dir.id,
      ])
    ),
    ...childTasks.map((t) => ({
      id: t.id,
      name: t.title,
      type: 'task' as const,
      children: [],
      depth: depth + 1,
      isCompleted: t.is_completed,
      parentPath: [...parentPath, dir.id],
    })),
  ].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
    const aPos =
      a.type === 'directory'
        ? directories.find((d) => d.id === a.id)?.position ?? 0
        : tasks.find((t) => t.id === a.id)?.position ?? 0
    const bPos =
      b.type === 'directory'
        ? directories.find((d) => d.id === b.id)?.position ?? 0
        : tasks.find((t) => t.id === b.id)?.position ?? 0
    return aPos - bPos
  })

  return {
    id: dir.id,
    name: dir.name,
    type: 'directory',
    children,
    depth,
    parentPath: [...parentPath],
  }
}

/**
 * Build tree for "all" or "dirs" filter: root directories with nested children.
 * For "tasks" filter: returns a flat list of task nodes (each with parentPath for breadcrumb).
 */
export function buildTree(
  directories: Directory[],
  tasks: Task[],
  filter: SidebarFilterMode
): TreeNode[] {
  if (filter === 'tasks') {
    const flat: TreeNode[] = []
    function collectTasks(
      dirs: Directory[],
      parentPath: string[],
      depth: number
    ) {
      for (const dir of dirs) {
        const path = [...parentPath, dir.id]
        const childTasks = tasksUnder(dir.id, tasks)
        for (const t of childTasks) {
          flat.push({
            id: t.id,
            name: t.title,
            type: 'task',
            children: [],
            depth,
            isCompleted: t.is_completed,
            parentPath: path,
          })
        }
        collectTasks(dirsUnder(dir.id, directories), path, depth + 1)
      }
    }
    const roots = dirsUnder(null, directories)
    collectTasks(roots, [], 0)
    return flat
  }

  const roots = dirsUnder(null, directories)
  return roots.map((d) =>
    buildTreeNodeFromDir(d, directories, tasks, filter, 0, [])
  )
}

/**
 * Flatten tree to a list of { node, depth } for visible nodes only.
 * A node is visible if all its ancestor directories are in expandedIds.
 * Root nodes are always considered "expanded" for visibility (they're always shown).
 */
export function flattenVisibleTree(
  tree: TreeNode[],
  expandedIds: Set<string>
): Array<{ node: TreeNode; depth: number }> {
  const result: Array<{ node: TreeNode; depth: number }> = []

  function visit(nodes: TreeNode[], depth: number) {
    for (const node of nodes) {
      result.push({ node, depth })
      if (node.type === 'directory' && node.children.length > 0) {
        if (expandedIds.has(node.id)) {
          visit(node.children, depth + 1)
        }
      }
    }
  }

  visit(tree, 0)
  return result
}

/**
 * Persist expanded sidebar node IDs to localStorage.
 */
export function loadExpandedSidebarNodes(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(SIDEBAR_EXPANDED_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as unknown
    if (!Array.isArray(arr)) return new Set()
    return new Set(arr.filter((x): x is string => typeof x === 'string'))
  } catch {
    return new Set()
  }
}

/**
 * Save expanded sidebar node IDs to localStorage.
 */
export function saveExpandedSidebarNodes(ids: Set<string>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(SIDEBAR_EXPANDED_KEY, JSON.stringify([...ids]))
  } catch {
    // ignore
  }
}
