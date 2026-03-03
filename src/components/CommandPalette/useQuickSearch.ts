import { useMemo, useState, useEffect } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Zap,
  CheckSquare,
  Folder,
  Clock,
  LayoutGrid,
  Calendar,
  Archive,
  Settings,
  Bookmark,
} from 'lucide-react'
import { useTaskStore } from '../../stores/taskStore'
import { useDirectoryStore } from '../../stores/directoryStore'
import { useAppStore } from '../../stores/appStore'
import { useNetworkStore } from '../../stores/networkStore'
import { fuzzyMatch } from '../../lib/fuzzyMatch'
import { allCommands } from '../../lib/commandRegistry'
import { getPathToDirectory } from '../../lib/treeUtils'

// ── Types ─────────────────────────────────────────────────────────────────

export type SearchResultType = 'action' | 'task' | 'directory' | 'navigation'

export interface SearchResult {
  id: string
  type: SearchResultType
  label: string
  icon: LucideIcon
  breadcrumb?: string
  shortcutHint?: string
  score: number
  execute: () => void
}

export interface ResultGroup {
  key: string
  label: string
  results: SearchResult[]
}

export interface SearchResults {
  groups: ResultGroup[]
  flatList: SearchResult[]
}

// ── Result limits ─────────────────────────────────────────────────────────

const MAX_ACTIONS = 5
const MAX_TASKS = 8
const MAX_DIRECTORIES = 5
const MAX_NAVIGATION = 3
const MAX_RECENT = 5
const DEBOUNCE_MS = 50

// ── Index types ───────────────────────────────────────────────────────────

interface TaskIndexEntry {
  id: string
  title: string
  titleLower: string
  directoryId: string
  breadcrumb: string
}

interface DirectoryIndexEntry {
  id: string
  name: string
  nameLower: string
  breadcrumb: string
}

// ── Navigation targets ────────────────────────────────────────────────────

interface NavigationTarget {
  id: string
  label: string
  icon: LucideIcon
  viewKey: string
}

const BUILT_IN_NAV: NavigationTarget[] = [
  { id: 'nav-main', label: 'Main View', icon: LayoutGrid, viewKey: 'main_db' },
  { id: 'nav-upcoming', label: 'Upcoming', icon: Calendar, viewKey: 'upcoming' },
  { id: 'nav-archive', label: 'Archive', icon: Archive, viewKey: 'archive' },
  { id: 'nav-settings', label: 'Settings', icon: Settings, viewKey: 'settings' },
]

// ── Helper: build breadcrumb map ──────────────────────────────────────────

function buildBreadcrumbMap(
  directories: { id: string; name: string; parent_id: string | null }[]
): Map<string, string> {
  const dirMap = new Map<string, { name: string; parent_id: string | null }>()
  for (const d of directories) {
    dirMap.set(d.id, { name: d.name, parent_id: d.parent_id })
  }

  const cache = new Map<string, string>()

  function getBreadcrumb(dirId: string): string {
    if (cache.has(dirId)) return cache.get(dirId)!
    const dir = dirMap.get(dirId)
    if (!dir) {
      cache.set(dirId, '')
      return ''
    }
    if (!dir.parent_id) {
      cache.set(dirId, dir.name)
      return dir.name
    }
    const parentCrumb = getBreadcrumb(dir.parent_id)
    const crumb = parentCrumb ? `${parentCrumb} > ${dir.name}` : dir.name
    cache.set(dirId, crumb)
    return crumb
  }

  for (const d of directories) {
    getBreadcrumb(d.id)
  }

  return cache
}

// ── Hook ──────────────────────────────────────────────────────────────────

export function useQuickSearch(query: string): SearchResults {
  // Debounced query
  const [debouncedQuery, setDebouncedQuery] = useState(query)

  useEffect(() => {
    if (!query) {
      setDebouncedQuery('')
      return
    }
    const timer = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query])

  const tasks = useTaskStore((s) => s.tasks)
  const directories = useDirectoryStore((s) => s.directories)
  const commandPaletteCommands = useAppStore((s) => s.commandPaletteCommands)
  const savedViews = useAppStore((s) => s.savedViews)
  const recentActions = useAppStore((s) => s.recentActions)
  const isOnline = useNetworkStore((s) => s.isOnline)

  // Build search indices — only recomputed when underlying data changes
  const breadcrumbMap = useMemo(
    () => buildBreadcrumbMap(directories),
    [directories]
  )

  const taskIndex = useMemo<TaskIndexEntry[]>(
    () =>
      tasks
        .filter((t) => !t.archived_at)
        .map((t) => ({
          id: t.id,
          title: t.title,
          titleLower: t.title.toLowerCase(),
          directoryId: t.directory_id,
          breadcrumb: breadcrumbMap.get(t.directory_id) ?? '',
        })),
    [tasks, breadcrumbMap]
  )

  const directoryIndex = useMemo<DirectoryIndexEntry[]>(
    () =>
      directories.map((d) => {
        // Breadcrumb is the parent path (excluding self)
        const parentCrumb = d.parent_id ? breadcrumbMap.get(d.parent_id) ?? '' : ''
        return {
          id: d.id,
          name: d.name,
          nameLower: d.name.toLowerCase(),
          breadcrumb: parentCrumb,
        }
      }),
    [directories, breadcrumbMap]
  )

  // Merge command sources: commandPaletteCommands (real wired-up actions) + registry descriptors
  const mergedActions = useMemo(() => {
    const paletteMap = new Map(
      commandPaletteCommands.map((cmd) => [cmd.id, cmd])
    )

    // Start with palette commands (they have real wired actions)
    const result: {
      id: string
      label: string
      icon: LucideIcon
      shortcutHint?: string
      category: string
      action: () => void
    }[] = commandPaletteCommands.map((cmd) => ({
      id: cmd.id,
      label: cmd.label,
      icon: Zap,
      shortcutHint: cmd.shortcut,
      category: cmd.category,
      action: cmd.action,
    }))

    // Add registry commands not already covered
    for (const desc of allCommands) {
      if (!paletteMap.has(desc.id)) {
        result.push({
          id: desc.id,
          label: desc.label,
          icon: desc.icon,
          shortcutHint: desc.shortcutHint,
          category: desc.category,
          action: () => {
            /* no-op — registry commands without wired actions */
          },
        })
      }
    }

    // Filter out write actions when offline
    if (!isOnline) {
      const readOnlyCategories = new Set(['View'])
      const readOnlySafeIds = new Set(['view-list', 'view-calendar', 'view-kanban', 'view-dependencies'])
      return result.filter(
        (cmd) => readOnlyCategories.has(cmd.category) || readOnlySafeIds.has(cmd.id)
      )
    }

    return result
  }, [commandPaletteCommands, isOnline])

  // Saved views as navigation targets
  const savedViewTargets = useMemo(
    () =>
      Object.values(savedViews).map((v) => ({
        id: `saved-view-${v.id}`,
        label: v.name,
        icon: Bookmark,
        viewData: v,
      })),
    [savedViews]
  )

  // Recent action lookup set for scoring bonus
  const recentActionMap = useMemo(() => {
    const map = new Map<string, number>()
    for (let i = 0; i < recentActions.length; i++) {
      map.set(recentActions[i].commandId, i)
    }
    return map
  }, [recentActions])

  // ── Search results ────────────────────────────────────────────────────

  return useMemo<SearchResults>(() => {
    const q = debouncedQuery.trim()

    // Default state (no query): show recent + navigation
    if (!q) {
      return buildDefaultState(
        recentActions,
        mergedActions,
        savedViewTargets,
      )
    }

    // Search all sources
    const groups: ResultGroup[] = []
    const flatList: SearchResult[] = []

    // 1. Actions
    const actionResults: SearchResult[] = []
    for (const cmd of mergedActions) {
      const { match, score } = fuzzyMatch(q, cmd.label)
      if (match) {
        const recentIdx = recentActionMap.get(cmd.id)
        const recentBonus = recentIdx !== undefined ? 20 - recentIdx * 2 : 0
        actionResults.push({
          id: `action-${cmd.id}`,
          type: 'action',
          label: cmd.label,
          icon: cmd.icon,
          shortcutHint: cmd.shortcutHint,
          score: score + recentBonus,
          execute: cmd.action,
        })
      }
    }
    actionResults.sort((a, b) => b.score - a.score)
    const actionSlice = actionResults.slice(0, MAX_ACTIONS)
    if (actionSlice.length > 0) {
      groups.push({ key: 'actions', label: 'Actions', results: actionSlice })
      flatList.push(...actionSlice)
    }

    // 2. Tasks
    const taskResults: SearchResult[] = []
    for (const entry of taskIndex) {
      const { match, score } = fuzzyMatch(q, entry.title)
      if (match) {
        taskResults.push({
          id: `task-${entry.id}`,
          type: 'task',
          label: entry.title,
          icon: CheckSquare,
          breadcrumb: entry.breadcrumb,
          score,
          execute: createTaskExecutor(entry.id, entry.directoryId, directories),
        })
      }
    }
    taskResults.sort((a, b) => b.score - a.score)
    const taskSlice = taskResults.slice(0, MAX_TASKS)
    if (taskSlice.length > 0) {
      groups.push({ key: 'tasks', label: 'Tasks', results: taskSlice })
      flatList.push(...taskSlice)
    }

    // 3. Directories
    const dirResults: SearchResult[] = []
    for (const entry of directoryIndex) {
      const { match, score } = fuzzyMatch(q, entry.name)
      if (match) {
        dirResults.push({
          id: `dir-${entry.id}`,
          type: 'directory',
          label: entry.name,
          icon: Folder,
          breadcrumb: entry.breadcrumb,
          score,
          execute: createDirectoryExecutor(entry.id, directories),
        })
      }
    }
    dirResults.sort((a, b) => b.score - a.score)
    const dirSlice = dirResults.slice(0, MAX_DIRECTORIES)
    if (dirSlice.length > 0) {
      groups.push({ key: 'directories', label: 'Directories', results: dirSlice })
      flatList.push(...dirSlice)
    }

    // 4. Navigation
    const navResults: SearchResult[] = []
    for (const nav of BUILT_IN_NAV) {
      const { match, score } = fuzzyMatch(q, nav.label)
      if (match) {
        navResults.push({
          id: nav.id,
          type: 'navigation',
          label: nav.label,
          icon: nav.icon,
          score,
          execute: createNavExecutor(nav.viewKey),
        })
      }
    }
    for (const sv of savedViewTargets) {
      const { match, score } = fuzzyMatch(q, sv.label)
      if (match) {
        navResults.push({
          id: sv.id,
          type: 'navigation',
          label: sv.label,
          icon: sv.icon,
          score,
          execute: createSavedViewExecutor(sv.viewData),
        })
      }
    }
    navResults.sort((a, b) => b.score - a.score)
    const navSlice = navResults.slice(0, MAX_NAVIGATION)
    if (navSlice.length > 0) {
      groups.push({ key: 'navigation', label: 'Navigation', results: navSlice })
      flatList.push(...navSlice)
    }

    return { groups, flatList }
  }, [
    debouncedQuery,
    recentActions,
    mergedActions,
    savedViewTargets,
    taskIndex,
    directoryIndex,
    recentActionMap,
    directories,
  ])
}

// ── Executors ─────────────────────────────────────────────────────────────

function createTaskExecutor(
  taskId: string,
  directoryId: string,
  directories: { id: string; name: string; parent_id: string | null }[]
) {
  return () => {
    const path = getPathToDirectory(directoryId, directories as Parameters<typeof getPathToDirectory>[1])
    useAppStore.getState().setNavigationPath(path)
    useAppStore.getState().setFocusedItem(taskId)
    // Also switch to main_db view if not already there
    const view = useAppStore.getState().currentView
    if (view !== 'main_db') {
      useAppStore.getState().setCurrentView('main_db')
    }
  }
}

function createDirectoryExecutor(
  directoryId: string,
  directories: { id: string; name: string; parent_id: string | null }[]
) {
  return () => {
    const path = getPathToDirectory(directoryId, directories as Parameters<typeof getPathToDirectory>[1])
    useAppStore.getState().setNavigationPath(path)
    // Switch to main_db view if not already there
    const view = useAppStore.getState().currentView
    if (view !== 'main_db') {
      useAppStore.getState().setCurrentView('main_db')
    }
  }
}

function createNavExecutor(viewKey: string) {
  return () => {
    useAppStore.getState().setCurrentView(viewKey as Parameters<ReturnType<typeof useAppStore.getState>['setCurrentView']>[0])
  }
}

function createSavedViewExecutor(viewData: { filters: unknown; colorMode: unknown }) {
  return () => {
    const store = useAppStore.getState()
    if (viewData.filters && typeof viewData.filters === 'object') {
      store.setActiveFilters(viewData.filters as Parameters<typeof store.setActiveFilters>[0])
    }
    if (typeof viewData.colorMode === 'string') {
      store.setColorMode(viewData.colorMode as Parameters<typeof store.setColorMode>[0])
    }
  }
}

// ── Default state builder ─────────────────────────────────────────────────

function buildDefaultState(
  recentActions: { commandId: string; timestamp: number }[],
  mergedActions: {
    id: string
    label: string
    icon: LucideIcon
    shortcutHint?: string
    category: string
    action: () => void
  }[],
  savedViewTargets: { id: string; label: string; icon: LucideIcon; viewData: { filters: unknown; colorMode: unknown } }[],
): SearchResults {
  const groups: ResultGroup[] = []
  const flatList: SearchResult[] = []

  // Recent actions group
  if (recentActions.length > 0) {
    const actionMap = new Map(mergedActions.map((a) => [a.id, a]))
    const recentResults: SearchResult[] = []

    for (const ra of recentActions.slice(0, MAX_RECENT)) {
      const cmd = actionMap.get(ra.commandId)
      if (cmd) {
        recentResults.push({
          id: `recent-${cmd.id}`,
          type: 'action',
          label: cmd.label,
          icon: Clock,
          shortcutHint: cmd.shortcutHint,
          score: 0,
          execute: cmd.action,
        })
      }
    }

    if (recentResults.length > 0) {
      groups.push({ key: 'recent', label: 'Recent', results: recentResults })
      flatList.push(...recentResults)
    }
  }

  // Navigation group (always show)
  const navResults: SearchResult[] = BUILT_IN_NAV.map((nav) => ({
    id: nav.id,
    type: 'navigation' as const,
    label: nav.label,
    icon: nav.icon,
    score: 0,
    execute: createNavExecutor(nav.viewKey),
  }))

  // Add saved views
  for (const sv of savedViewTargets) {
    navResults.push({
      id: sv.id,
      type: 'navigation',
      label: sv.label,
      icon: sv.icon,
      score: 0,
      execute: createSavedViewExecutor(sv.viewData),
    })
  }

  if (navResults.length > 0) {
    groups.push({ key: 'navigation', label: 'Navigation', results: navResults })
    flatList.push(...navResults)
  }

  return { groups, flatList }
}
