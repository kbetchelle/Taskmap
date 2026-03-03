import type { TaskLink } from '../types/links'
import type { Task } from '../types'

/**
 * Detect if creating a dependency link from sourceId to targetId would create
 * a circular dependency. Uses DFS from targetId following dependency edges.
 * Returns true if sourceId is reachable from targetId (i.e., cycle would be created).
 */
export function detectCycle(
  sourceId: string,
  targetId: string,
  links: TaskLink[]
): boolean {
  // Build adjacency list: for each task, which tasks does it depend on?
  // A dependency link means source_id depends on target_id.
  // So outgoing edges from target_id (as source) lead to other target_ids.
  const dependencyEdges = new Map<string, string[]>()
  for (const link of links) {
    if (link.link_type !== 'dependency') continue
    const existing = dependencyEdges.get(link.source_id) ?? []
    existing.push(link.target_id)
    dependencyEdges.set(link.source_id, existing)
  }

  // DFS from targetId: can we reach sourceId?
  // If we add sourceId -> targetId as a dependency,
  // we need to check if targetId can reach sourceId via existing dependencies.
  const visited = new Set<string>()
  const stack = [targetId]

  while (stack.length > 0) {
    const current = stack.pop()!
    if (current === sourceId) return true
    if (visited.has(current)) continue
    visited.add(current)

    const neighbors = dependencyEdges.get(current) ?? []
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        stack.push(neighbor)
      }
    }
  }

  return false
}

/**
 * Get the list of tasks that block a given task (incomplete dependency targets).
 */
export function getBlockingTasks(
  taskId: string,
  links: TaskLink[],
  tasks: Task[]
): Task[] {
  const taskMap = new Map(tasks.map((t) => [t.id, t]))
  const blocking: Task[] = []

  for (const link of links) {
    if (link.link_type !== 'dependency') continue
    if (link.source_id !== taskId) continue

    const target = taskMap.get(link.target_id)
    if (target && target.status !== 'completed') {
      blocking.push(target)
    }
  }

  return blocking
}

/**
 * Check if a task is blocked (has at least one incomplete dependency).
 */
export function isTaskBlocked(
  taskId: string,
  links: TaskLink[],
  tasks: Task[]
): boolean {
  return getBlockingTasks(taskId, links, tasks).length > 0
}

/**
 * Get the count of links for a task (both incoming and outgoing).
 */
export function getLinkCount(taskId: string, links: TaskLink[]): number {
  return links.filter(
    (l) => l.source_id === taskId || l.target_id === taskId
  ).length
}
