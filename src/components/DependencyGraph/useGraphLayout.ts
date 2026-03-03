import { useMemo } from 'react'
import type { Task } from '../../types'
import type { TaskLink } from '../../types/links'

export interface GraphNode {
  id: string
  x: number
  y: number
  task: Task
  depth: number
}

export interface GraphEdge {
  from: string
  to: string
  type: 'dependency' | 'reference'
}

interface GraphLayout {
  nodes: GraphNode[]
  edges: GraphEdge[]
  width: number
  height: number
}

const NODE_WIDTH = 180
const NODE_HEIGHT = 48
const HORIZONTAL_GAP = 60
const VERTICAL_GAP = 80

/**
 * Compute a simple layered DAG layout for the dependency graph.
 * Nodes with no dependencies go at the top (depth 0).
 * Dependent nodes are placed below their dependencies.
 */
export function useGraphLayout(
  tasks: Task[],
  links: TaskLink[]
): GraphLayout {
  return useMemo(() => {
    if (tasks.length === 0) {
      return { nodes: [], edges: [], width: 0, height: 0 }
    }

    const taskMap = new Map(tasks.map((t) => [t.id, t]))
    const taskIds = new Set(tasks.map((t) => t.id))

    // Filter links to only include those between visible tasks
    const relevantLinks = links.filter(
      (l) => taskIds.has(l.source_id) && taskIds.has(l.target_id)
    )

    // Build edges
    const edges: GraphEdge[] = relevantLinks.map((l) => ({
      from: l.source_id,
      to: l.target_id,
      type: l.link_type as 'dependency' | 'reference',
    }))

    // Build adjacency: for dependency links, source depends on target
    // So target must be above source (target has lower depth)
    // For layout: dependency edges go from target (parent) to source (child)
    const dependsOn = new Map<string, Set<string>>()
    const dependedBy = new Map<string, Set<string>>()

    for (const link of relevantLinks) {
      if (link.link_type !== 'dependency') continue
      // source_id depends on target_id
      if (!dependsOn.has(link.source_id)) dependsOn.set(link.source_id, new Set())
      dependsOn.get(link.source_id)!.add(link.target_id)
      if (!dependedBy.has(link.target_id)) dependedBy.set(link.target_id, new Set())
      dependedBy.get(link.target_id)!.add(link.source_id)
    }

    // Compute depth: longest path from any root node
    // Roots = nodes with no dependencies
    const depth = new Map<string, number>()

    function computeDepth(nodeId: string, visited: Set<string>): number {
      if (depth.has(nodeId)) return depth.get(nodeId)!
      if (visited.has(nodeId)) return 0 // cycle guard
      visited.add(nodeId)

      const deps = dependsOn.get(nodeId)
      if (!deps || deps.size === 0) {
        depth.set(nodeId, 0)
        return 0
      }

      let maxDepth = 0
      for (const depId of deps) {
        if (taskIds.has(depId)) {
          maxDepth = Math.max(maxDepth, computeDepth(depId, visited) + 1)
        }
      }
      depth.set(nodeId, maxDepth)
      return maxDepth
    }

    const visited = new Set<string>()
    for (const id of taskIds) {
      computeDepth(id, visited)
    }

    // Group nodes by depth
    const depthGroups = new Map<number, string[]>()
    let maxDepth = 0
    for (const [id, d] of depth) {
      if (!depthGroups.has(d)) depthGroups.set(d, [])
      depthGroups.get(d)!.push(id)
      maxDepth = Math.max(maxDepth, d)
    }

    // Also add tasks that have no links (depth 0 if not already set)
    for (const id of taskIds) {
      if (!depth.has(id)) {
        depth.set(id, 0)
        if (!depthGroups.has(0)) depthGroups.set(0, [])
        depthGroups.get(0)!.push(id)
      }
    }

    // Compute positions
    const nodes: GraphNode[] = []
    const padding = 40

    for (let d = 0; d <= maxDepth; d++) {
      const group = depthGroups.get(d) ?? []

      group.forEach((id, index) => {
        const task = taskMap.get(id)
        if (!task) return

        const x = padding + index * (NODE_WIDTH + HORIZONTAL_GAP) + NODE_WIDTH / 2
        const y = padding + d * (NODE_HEIGHT + VERTICAL_GAP) + NODE_HEIGHT / 2

        nodes.push({ id, x, y, task, depth: d })
      })
    }

    // Compute total dimensions
    const allDepths = Array.from(depthGroups.entries())
    const maxGroupSize = Math.max(...allDepths.map(([, g]) => g.length), 1)
    const width = Math.max(
      padding * 2 + maxGroupSize * NODE_WIDTH + (maxGroupSize - 1) * HORIZONTAL_GAP,
      400
    )
    const height = padding * 2 + (maxDepth + 1) * (NODE_HEIGHT + VERTICAL_GAP)

    return { nodes, edges, width, height }
  }, [tasks, links])
}
