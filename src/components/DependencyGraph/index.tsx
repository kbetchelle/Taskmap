import { useCallback, useEffect, useState, useMemo } from 'react'
import { useAppStore } from '../../stores/appStore'
import { useTaskStore } from '../../stores/taskStore'
import { useLinkStore } from '../../stores/linkStore'
import { useGraphLayout } from './useGraphLayout'
import { GraphCanvas } from './GraphCanvas'

type Scope = 'current' | 'all'

export function DependencyGraph() {
  const setDependencyGraphOpen = useAppStore((s) => s.setDependencyGraphOpen)
  const navigationPath = useAppStore((s) => s.navigationPath)
  const setNavigationPath = useAppStore((s) => s.setNavigationPath)
  const setExpandedTaskId = useAppStore((s) => s.setExpandedTaskId)
  const setFocusedItem = useAppStore((s) => s.setFocusedItem)

  const tasks = useTaskStore((s) => s.tasks)
  const links = useLinkStore((s) => s.links)

  const [scope, setScope] = useState<Scope>('current')

  // Filter tasks based on scope
  const scopedTasks = useMemo(() => {
    if (scope === 'all') {
      // Show all tasks that have any links
      const linkedIds = new Set<string>()
      for (const link of links) {
        linkedIds.add(link.source_id)
        linkedIds.add(link.target_id)
      }
      return tasks.filter((t) => linkedIds.has(t.id) && !t.archived_at)
    }

    // Current directory scope
    const currentDirId = navigationPath.length > 0
      ? navigationPath[navigationPath.length - 1]
      : null

    if (!currentDirId) {
      // Home — show tasks that have links
      const linkedIds = new Set<string>()
      for (const link of links) {
        linkedIds.add(link.source_id)
        linkedIds.add(link.target_id)
      }
      return tasks.filter((t) => linkedIds.has(t.id) && !t.archived_at)
    }

    return tasks.filter((t) => t.directory_id === currentDirId && !t.archived_at)
  }, [tasks, links, scope, navigationPath])

  const layout = useGraphLayout(scopedTasks, links)

  const handleClose = useCallback(() => {
    setDependencyGraphOpen(false)
  }, [setDependencyGraphOpen])

  const handleNodeClick = useCallback(
    (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId)
      if (!task) return
      setDependencyGraphOpen(false)
      setNavigationPath([task.directory_id])
      setExpandedTaskId(taskId)
      setFocusedItem(taskId)
    },
    [tasks, setDependencyGraphOpen, setNavigationPath, setExpandedTaskId, setFocusedItem]
  )

  // Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        handleClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [handleClose])

  return (
    <div className="fixed inset-0 z-[1300] bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-flow-columnBorder">
        <div className="flex items-center gap-4">
          <h2 className="text-base font-flow-semibold text-flow-textPrimary m-0">
            Dependency Graph
          </h2>
          <div className="flex gap-1">
            <button
              className={`px-2.5 py-1 text-flow-meta rounded transition-colors ${
                scope === 'current'
                  ? 'bg-flow-focus text-white'
                  : 'bg-neutral-100 text-flow-textSecondary hover:bg-neutral-200'
              }`}
              onClick={() => setScope('current')}
            >
              Current Directory
            </button>
            <button
              className={`px-2.5 py-1 text-flow-meta rounded transition-colors ${
                scope === 'all'
                  ? 'bg-flow-focus text-white'
                  : 'bg-neutral-100 text-flow-textSecondary hover:bg-neutral-200'
              }`}
              onClick={() => setScope('all')}
            >
              All Linked Tasks
            </button>
          </div>
        </div>
        <button
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-neutral-100 transition-colors text-flow-textSecondary hover:text-flow-textPrimary text-lg"
          onClick={handleClose}
          aria-label="Close dependency graph"
        >
          &times;
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-hidden bg-neutral-50">
        {scopedTasks.length === 0 ? (
          <div className="flex items-center justify-center h-full text-flow-textDisabled text-base">
            No linked tasks to display
          </div>
        ) : (
          <GraphCanvas
            nodes={layout.nodes}
            edges={layout.edges}
            width={layout.width}
            height={layout.height}
            onNodeClick={handleNodeClick}
          />
        )}
      </div>

      {/* Footer legend */}
      <div className="flex items-center gap-6 px-6 py-2 border-t border-flow-columnBorder text-flow-meta text-flow-textSecondary">
        <span className="flex items-center gap-1.5">
          <svg width="24" height="2"><line x1="0" y1="1" x2="24" y2="1" stroke="#666" strokeWidth="2" /></svg>
          Dependency
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="24" height="2"><line x1="0" y1="1" x2="24" y2="1" stroke="#ccc" strokeWidth="1.5" strokeDasharray="6 3" /></svg>
          Reference
        </span>
        <span className="ml-auto">Scroll to zoom, drag to pan, click node to navigate</span>
      </div>
    </div>
  )
}
