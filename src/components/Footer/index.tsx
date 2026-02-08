import { useMemo } from 'react'
import { useAppStore } from '../../stores/appStore'
import { useDirectoryStore } from '../../stores/directoryStore'
import { useTaskStore } from '../../stores/taskStore'
import { useUIStore } from '../../stores/uiStore'

function mainDbActiveCount(
  directories: { start_date: string | null }[],
  tasks: { start_date: string | null; is_completed: boolean }[],
  showCompleted: boolean
): number {
  const today = new Date().toISOString().slice(0, 10)
  const dateOk = (i: { start_date: string | null }) =>
    i.start_date == null || i.start_date.slice(0, 10) <= today
  const dirCount = directories.filter(dateOk).length
  const taskCount = tasks.filter(
    (t) => dateOk(t) && (showCompleted || !t.is_completed)
  ).length
  return dirCount + taskCount
}

export function Footer() {
  const isMobile = useUIStore((s) => s.mobileMode)
  const navigationPath = useAppStore((s) => s.navigationPath)
  const currentView = useAppStore((s) => s.currentView)
  const colorMode = useAppStore((s) => s.colorMode)
  const activeFilters = useAppStore((s) => s.activeFilters)
  const selectedItemCount = useAppStore((s) => s.selectedItems.length)
  const searchResultTaskIds = useAppStore((s) => s.searchResultTaskIds)
  const directories = useDirectoryStore((s) => s.directories)
  const tasks = useTaskStore((s) => s.tasks)

  const breadcrumbNames = useMemo(() => {
    const names: string[] = ['Root']
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

  return (
    <footer
      className={`flex-shrink-0 h-8 border-t border-flow-columnBorder px-4 flex items-center gap-4 text-flow-footer text-flow-textSecondary ${
        isMobile ? 'hidden md:flex' : ''
      }`}
      style={{ minHeight: 32 }}
    >
      <nav className="flex items-center gap-1" aria-label="Breadcrumb">
        {breadcrumbNames.map((name, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span className="text-flow-textDisabled">›</span>}
            <span className={i === breadcrumbNames.length - 1 ? 'font-flow-semibold text-flow-textPrimary' : ''}>
              {name}
            </span>
          </span>
        ))}
      </nav>
      <span className="text-flow-textDisabled">|</span>
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
    </footer>
  )
}
