import { useMemo, useEffect, useCallback, useRef } from 'react'
import { useDirectoryStore } from '../../stores/directoryStore'
import { useTaskStore } from '../../stores/taskStore'
import { useAppStore } from '../../stores/appStore'
import { useUIStore } from '../../stores/uiStore'
import { useSidebarStore } from '../../stores/sidebarStore'
import { useViewport } from '../../hooks/useViewport'
import { useKeyboard } from '../../hooks/useKeyboard'
import {
  buildTree,
  flattenVisibleTree,
  getPathToDirectory,
} from '../../lib/treeUtils'
import { SidebarFilter } from './SidebarFilter'
import { TreeNode } from './TreeNode'

export function SidebarTree() {
  const directories = useDirectoryStore((s) => s.directories)
  const tasks = useTaskStore((s) => s.tasks)
  const navigationPath = useAppStore((s) => s.navigationPath)
  const focusedItemId = useAppStore((s) => s.focusedItemId)
  const setNavigationPath = useAppStore((s) => s.setNavigationPath)
  const setFocusedItem = useAppStore((s) => s.setFocusedItem)
  const setFocusedColumnIndex = useAppStore((s) => s.setFocusedColumnIndex)
  const pushKeyboardContext = useAppStore((s) => s.pushKeyboardContext)
  const popKeyboardContext = useAppStore((s) => s.popKeyboardContext)
  const breakpoint = useViewport().breakpoint
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen)
  const sidebarFilter = useSidebarStore((s) => s.sidebarFilter)
  const expandedSidebarNodes = useSidebarStore((s) => s.expandedSidebarNodes)
  const focusedSidebarNodeId = useSidebarStore((s) => s.focusedSidebarNodeId)
  const setFocusedSidebarNodeId = useSidebarStore((s) => s.setFocusedSidebarNodeId)
  const toggleExpanded = useSidebarStore((s) => s.toggleExpanded)
  const setExpanded = useSidebarStore((s) => s.setExpanded)
  const ensureRootExpanded = useSidebarStore((s) => s.ensureRootExpanded)
  const containerRef = useRef<HTMLDivElement>(null)

  const rootDirectoryIds = useMemo(
    () => directories.filter((d) => d.parent_id === null).map((d) => d.id),
    [directories]
  )
  useEffect(() => {
    if (rootDirectoryIds.length > 0) ensureRootExpanded(rootDirectoryIds)
  }, [rootDirectoryIds, ensureRootExpanded])

  const tree = useMemo(
    () => buildTree(directories, tasks, sidebarFilter),
    [directories, tasks, sidebarFilter]
  )
  const flatList = useMemo(() => {
    if (sidebarFilter === 'tasks') {
      return tree.map((node) => ({ node, depth: node.depth }))
    }
    return flattenVisibleTree(tree, expandedSidebarNodes)
  }, [tree, sidebarFilter, expandedSidebarNodes])

  const directoryIdToName = useMemo(() => {
    const map: Record<string, string> = {}
    directories.forEach((d) => {
      map[d.id] = d.name
    })
    return map
  }, [directories])

  const currentDirId = navigationPath[navigationPath.length - 1] ?? null

  const scrollActiveIntoView = useCallback(() => {
    const idToScroll = focusedItemId ?? currentDirId
    if (!idToScroll) return
    const el = containerRef.current?.querySelector(
      `[data-node-id="${idToScroll}"]`
    ) as HTMLElement | null
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [currentDirId, focusedItemId])
  useEffect(() => {
    scrollActiveIntoView()
  }, [navigationPath, focusedItemId, scrollActiveIntoView])

  const navigateToDirectory = useCallback(
    (directoryId: string) => {
      const path = getPathToDirectory(directoryId, directories)
      setNavigationPath(path)
      if (breakpoint === 'mobile') setSidebarOpen(false)
    },
    [directories, setNavigationPath, breakpoint, setSidebarOpen]
  )
  const navigateToTask = useCallback(
    (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId)
      if (!task) return
      const path = getPathToDirectory(task.directory_id, directories)
      setNavigationPath(path)
      setFocusedItem(taskId)
      setFocusedColumnIndex(path.length)
      if (breakpoint === 'mobile') setSidebarOpen(false)
    },
    [
      tasks,
      directories,
      setNavigationPath,
      setFocusedItem,
      setFocusedColumnIndex,
      breakpoint,
      setSidebarOpen,
    ]
  )
  const handleNodeClick = useCallback(
    (node: { id: string; type: 'directory' | 'task' }) => {
      if (node.type === 'directory') {
        navigateToDirectory(node.id)
      } else {
        navigateToTask(node.id)
      }
    },
    [navigateToDirectory, navigateToTask]
  )

  const focusedIndex = useMemo(
    () => flatList.findIndex(({ node }) => node.id === focusedSidebarNodeId),
    [flatList, focusedSidebarNodeId]
  )
  const safeFocusedIndex =
    focusedIndex >= 0 ? focusedIndex : currentDirId
      ? flatList.findIndex(({ node }) => node.id === currentDirId)
      : 0
  const effectiveIndex = safeFocusedIndex >= 0 ? safeFocusedIndex : 0

  const handleSidebarFocus = useCallback(() => {
    pushKeyboardContext('sidebar')
    if (flatList.length > 0 && focusedSidebarNodeId == null && currentDirId) {
      const idx = flatList.findIndex(({ node }) => node.id === currentDirId)
      setFocusedSidebarNodeId(
        idx >= 0 ? flatList[idx].node.id : flatList[0].node.id
      )
    } else if (flatList.length > 0 && focusedSidebarNodeId == null) {
      setFocusedSidebarNodeId(flatList[0].node.id)
    }
  }, [
    pushKeyboardContext,
    flatList,
    focusedSidebarNodeId,
    currentDirId,
    setFocusedSidebarNodeId,
  ])
  const handleSidebarBlur = useCallback(() => {
    popKeyboardContext()
  }, [popKeyboardContext])

  const handleSidebarArrowUp = useCallback(() => {
    if (flatList.length === 0) return
    const next = Math.max(0, effectiveIndex - 1)
    setFocusedSidebarNodeId(flatList[next].node.id)
  }, [flatList, effectiveIndex, setFocusedSidebarNodeId])
  const handleSidebarArrowDown = useCallback(() => {
    if (flatList.length === 0) return
    const next = Math.min(flatList.length - 1, effectiveIndex + 1)
    setFocusedSidebarNodeId(flatList[next].node.id)
  }, [flatList, effectiveIndex, setFocusedSidebarNodeId])
  const handleSidebarArrowLeft = useCallback(() => {
    if (flatList.length === 0) return
    const { node, depth } = flatList[effectiveIndex]
    if (node.type === 'directory' && expandedSidebarNodes.has(node.id)) {
      setExpanded(node.id, false)
      return
    }
    for (let i = effectiveIndex - 1; i >= 0; i--) {
      if (flatList[i].depth === depth - 1) {
        setFocusedSidebarNodeId(flatList[i].node.id)
        return
      }
    }
  }, [
    flatList,
    effectiveIndex,
    expandedSidebarNodes,
    setExpanded,
    setFocusedSidebarNodeId,
  ])
  const handleSidebarArrowRight = useCallback(() => {
    if (flatList.length === 0) return
    const { node, depth } = flatList[effectiveIndex]
    if (node.type === 'directory') {
      if (!expandedSidebarNodes.has(node.id) && node.children.length > 0) {
        setExpanded(node.id, true)
        return
      }
      const firstChildIdx = effectiveIndex + 1
      if (
        firstChildIdx < flatList.length &&
        flatList[firstChildIdx].depth > depth
      ) {
        setFocusedSidebarNodeId(flatList[firstChildIdx].node.id)
      }
    }
  }, [
    flatList,
    effectiveIndex,
    expandedSidebarNodes,
    setExpanded,
    setFocusedSidebarNodeId,
  ])
  const handleSidebarEnter = useCallback(() => {
    if (flatList.length === 0) return
    handleNodeClick(flatList[effectiveIndex].node)
  }, [flatList, effectiveIndex, handleNodeClick])
  const handleSidebarEscape = useCallback(() => {
    popKeyboardContext()
    setFocusedSidebarNodeId(null)
    const main = document.querySelector('main')
    if (main && typeof main.focus === 'function') {
      ;(main as HTMLDivElement).focus()
    }
  }, [popKeyboardContext, setFocusedSidebarNodeId])

  useKeyboard({
    onSidebarArrowUp: handleSidebarArrowUp,
    onSidebarArrowDown: handleSidebarArrowDown,
    onSidebarArrowLeft: handleSidebarArrowLeft,
    onSidebarArrowRight: handleSidebarArrowRight,
    onSidebarEnter: handleSidebarEnter,
    onSidebarEscape: handleSidebarEscape,
    enabled: sidebarOpen,
  })

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <SidebarFilter />
      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-y-auto py-1"
        tabIndex={0}
        onFocus={handleSidebarFocus}
        onBlur={handleSidebarBlur}
        role="tree"
        aria-label="Directory and task tree"
      >
        {flatList.map(({ node, depth }) => {
          const isActive =
            node.type === 'directory' && node.id === currentDirId
          const isFocusedTask =
            node.type === 'task' && node.id === focusedItemId
          const breadcrumb =
            sidebarFilter === 'tasks' && node.parentPath.length > 0
              ? node.parentPath.map((id) => directoryIdToName[id] ?? id).join(' › ')
              : undefined
          return (
            <TreeNode
              key={node.id}
              node={node}
              depth={depth}
              isActive={isActive}
              isFocusedItem={isFocusedTask}
              isFocused={node.id === focusedSidebarNodeId}
              isExpanded={node.type === 'directory' && expandedSidebarNodes.has(node.id)}
              childCount={node.type === 'directory' ? node.children.length : undefined}
              breadcrumb={breadcrumb}
              onChevronClick={() => node.type === 'directory' && toggleExpanded(node.id)}
              onNodeClick={() => handleNodeClick(node)}
              onFocus={() => setFocusedSidebarNodeId(node.id)}
            />
          )
        })}
      </div>
    </div>
  )
}
