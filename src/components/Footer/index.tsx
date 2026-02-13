import { useMemo, useState, useEffect } from 'react'
import { useAppStore } from '../../stores/appStore'
import { useDirectoryStore } from '../../stores/directoryStore'
import { useTaskStore } from '../../stores/taskStore'
import { useUIStore } from '../../stores/uiStore'
import { useNetworkStore } from '../../stores/networkStore'

function mainDbActiveCount(
  directories: { start_date: string | null }[],
  tasks: { start_date: string | null; status?: string }[],
  showCompleted: boolean
): number {
  const today = new Date().toISOString().slice(0, 10)
  const dateOk = (i: { start_date: string | null }) =>
    i.start_date == null || i.start_date.slice(0, 10) <= today
  const dirCount = directories.filter(dateOk).length
  const taskCount = tasks.filter(
    (t) => dateOk(t) && (showCompleted || t.status !== 'completed')
  ).length
  return dirCount + taskCount
}

function formatRelativeTime(ts: number): string {
  if (!ts) return 'never'
  const diff = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  if (diff < 10) return 'just now'
  if (diff < 60) return `${diff}s ago`
  const mins = Math.floor(diff / 60)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function Footer() {
  const isMobile = useUIStore((s) => s.mobileMode)
  const navigationPath = useAppStore((s) => s.navigationPath)
  const isOnline = useNetworkStore((s) => s.isOnline)
  const lastSyncedAt = useNetworkStore((s) => s.lastSyncedAt)
  const currentView = useAppStore((s) => s.currentView)
  const colorMode = useAppStore((s) => s.colorMode)
  const activeFilters = useAppStore((s) => s.activeFilters)
  const selectedItemCount = useAppStore((s) => s.selectedItems.length)
  const searchResultTaskIds = useAppStore((s) => s.searchResultTaskIds)
  const directories = useDirectoryStore((s) => s.directories)
  const tasks = useTaskStore((s) => s.tasks)

  const breadcrumbNames = useMemo(() => {
    const names: string[] = ['Home']
    navigationPath.forEach((id) => {
      const dir = directories.find((d) => d.id === id)
      if (dir) names.push(dir.name)
    })
    return names
  }, [navigationPath, directories])

  const activeFilterCount = useMemo(() => {
    let n = 0
    if (activeFilters.searchQuery.trim()) n++
    if (activeFilters.tags.length) n++
    if (activeFilters.priorities.length) n++
    if (activeFilters.categories.length) n++
    if (activeFilters.dateRange) n++
    if (activeFilters.showCompleted) n++
    return n
  }, [activeFilters])

  const viewLabel =
    currentView === 'main_db'
      ? 'Today'
      : currentView === 'upcoming'
        ? 'Upcoming'
        : currentView === 'archive'
          ? 'Archive'
          : currentView === 'settings'
            ? 'Settings'
            : 'Settings'
  const colorLabel =
    colorMode === 'priority' ? 'Priority' : colorMode === 'category' ? 'Category' : 'No color'

  const itemCount = useMemo(
    () =>
      currentView === 'main_db' && searchResultTaskIds == null
        ? mainDbActiveCount(directories, tasks, activeFilters.showCompleted)
        : null,
    [currentView, searchResultTaskIds, directories, tasks, activeFilters.showCompleted]
  )

  const hiddenCompletedCount = useMemo(() => {
    if (activeFilters.showCompleted) return 0
    return tasks.filter((t) => t.status === 'completed' && t.archived_at == null).length
  }, [tasks, activeFilters.showCompleted])

  // Re-render periodically to update "Last synced: X ago" when offline
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!isOnline && lastSyncedAt) {
      const interval = setInterval(() => setTick((t) => t + 1), 30_000)
      return () => clearInterval(interval)
    }
  }, [isOnline, lastSyncedAt])

  return (
    <footer
      className={`flex-shrink-0 h-8 border-t border-flow-columnBorder px-4 flex items-center justify-between gap-4 text-flow-footer text-flow-textSecondary ${
        isMobile ? 'hidden md:flex' : ''
      }`}
      style={{ minHeight: 32 }}
    >
      <nav className="flex items-center gap-1 min-w-0 flex-1" aria-label="Breadcrumb">
        {breadcrumbNames.map((name, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span className="text-flow-textDisabled">›</span>}
            <span className={i === breadcrumbNames.length - 1 ? 'font-flow-semibold text-flow-textPrimary' : ''}>
              {name}
            </span>
          </span>
        ))}
      </nav>
      <div className="flex items-center gap-4 flex-shrink-0 ml-auto">
        <span>{viewLabel}</span>
        <span className="text-flow-textDisabled">|</span>
        <span>{colorLabel}</span>
        {activeFilterCount > 0 && (
          <>
            <span className="text-flow-textDisabled">|</span>
            <span>{activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''}</span>
          </>
        )}
        {selectedItemCount > 0 && (
          <>
            <span className="text-flow-textDisabled">|</span>
            <span>{selectedItemCount} selected</span>
          </>
        )}
        {searchResultTaskIds != null && (
          <>
            <span className="text-flow-textDisabled">|</span>
            <span>{searchResultTaskIds.length} result{searchResultTaskIds.length !== 1 ? 's' : ''}</span>
          </>
        )}
        {itemCount != null && (
          <>
            <span className="text-flow-textDisabled">|</span>
            <span>{itemCount} active</span>
          </>
        )}
        {hiddenCompletedCount > 0 && (
          <>
            <span className="text-flow-textDisabled">|</span>
            <span>({hiddenCompletedCount} completed hidden)</span>
          </>
        )}
        {!isOnline && lastSyncedAt > 0 && (
          <>
            <span className="text-flow-textDisabled">|</span>
            <span className="text-amber-600">Last synced: {formatRelativeTime(lastSyncedAt)}</span>
          </>
        )}
        <span className="text-flow-textDisabled">|</span>
        <span className="text-flow-textDisabled">
          <kbd className="rounded border border-flow-columnBorder bg-flow-background px-1 py-px text-[10px] font-flow-medium">\</kbd>
          {' '}actions
        </span>
      </div>
    </footer>
  )
}
