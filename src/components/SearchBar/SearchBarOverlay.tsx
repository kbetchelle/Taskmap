import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAppStore } from '../../stores/appStore'
import { useAppContext } from '../../contexts/AppContext'
import { useTaskStore } from '../../stores/taskStore'
import { searchTasks } from '../../api/search'
import { PRESET_CATEGORIES } from '../../lib/constants'
import type { FilterState } from '../../types/state'
import type { TaskPriority } from '../../types'

interface SearchBarOverlayProps {
  onClose: () => void
}

function toggleArrayItem<T>(arr: T[], item: T, setter: (a: T[]) => void) {
  if (arr.includes(item)) setter(arr.filter((x) => x !== item))
  else setter([...arr, item])
}

export function SearchBarOverlay({ onClose }: SearchBarOverlayProps) {
  const { userId } = useAppContext()
  const tasks = useTaskStore((s) => s.tasks)
  const popKeyboardContext = useAppStore((s) => s.popKeyboardContext)
  const activeFilters = useAppStore((s) => s.activeFilters)
  const setActiveFilters = useAppStore((s) => s.setActiveFilters)
  const setSearchResultTaskIds = useAppStore((s) => s.setSearchResultTaskIds)
  const resetFilters = useAppStore((s) => s.resetFilters)

  const [query, setQuery] = useState(activeFilters.searchQuery)
  const [tags, setTags] = useState<string[]>(activeFilters.tags)
  const [priorities, setPriorities] = useState<TaskPriority[]>(activeFilters.priorities)
  const [categories, setCategories] = useState<string[]>(activeFilters.categories)
  const [dateStart, setDateStart] = useState<string>(
    activeFilters.dateRange?.start ? activeFilters.dateRange.start.toISOString().slice(0, 10) : ''
  )
  const [dateEnd, setDateEnd] = useState<string>(
    activeFilters.dateRange?.end ? activeFilters.dateRange.end.toISOString().slice(0, 10) : ''
  )
  const [showCompleted, setShowCompleted] = useState(activeFilters.showCompleted)

  useEffect(() => {
    setQuery(activeFilters.searchQuery)
    setTags(activeFilters.tags)
    setPriorities(activeFilters.priorities)
    setCategories(activeFilters.categories)
    setDateStart(
      activeFilters.dateRange?.start ? activeFilters.dateRange.start.toISOString().slice(0, 10) : ''
    )
    setDateEnd(
      activeFilters.dateRange?.end ? activeFilters.dateRange.end.toISOString().slice(0, 10) : ''
    )
    setShowCompleted(activeFilters.showCompleted)
  }, [activeFilters])

  const allTags = useMemo(
    () => [...new Set(tasks.flatMap((t) => t.tags ?? []))].sort(),
    [tasks]
  )

  const handleClose = useCallback(() => {
    popKeyboardContext()
    onClose()
  }, [popKeyboardContext, onClose])

  const buildFilters = useCallback((): FilterState => {
    return {
      searchQuery: query.trim(),
      tags,
      priorities,
      categories,
      dateRange:
        dateStart || dateEnd
          ? {
              start: dateStart ? new Date(dateStart) : null,
              end: dateEnd ? new Date(dateEnd) : null,
            }
          : null,
      showCompleted,
    }
  }, [query, tags, priorities, categories, dateStart, dateEnd, showCompleted])

  const performSearch = useCallback(
    async (filters: FilterState) => {
      if (!userId) return
      setActiveFilters(filters)
      try {
        const results = await searchTasks(userId, filters)
        setSearchResultTaskIds(results.map((t) => t.id))
      } catch {
        setSearchResultTaskIds([])
      }
      handleClose()
    },
    [userId, setActiveFilters, setSearchResultTaskIds, handleClose]
  )

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      performSearch(buildFilters())
    },
    [performSearch, buildFilters]
  )

  const handleClear = useCallback(() => {
    resetFilters()
    handleClose()
  }, [resetFilters, handleClose])

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-start justify-center pt-4 bg-black/20"
      role="dialog"
      aria-label="Search and filter"
    >
      <div
        className="w-[600px] max-w-[90vw] max-h-[90vh] overflow-y-auto rounded-lg border border-flow-columnBorder bg-flow-background p-4 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks and directories…"
            className="w-full rounded-md border border-flow-columnBorder px-3 py-2 text-sm text-flow-textPrimary placeholder:text-flow-textSecondary bg-flow-background mb-3"
            autoFocus
            aria-label="Search query"
          />

          <div className="space-y-3 mb-3">
            {allTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                <label className="text-xs font-medium text-flow-textSecondary w-16 shrink-0">
                  Tags:
                </label>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleArrayItem(tags, tag, setTags)}
                    className={`px-2 py-0.5 rounded text-xs ${
                      tags.includes(tag)
                        ? 'bg-flow-accent text-white'
                        : 'border border-flow-columnBorder bg-flow-background text-flow-textPrimary'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-1">
              <label className="text-xs font-medium text-flow-textSecondary w-16 shrink-0">
                Priority:
              </label>
              {(['LOW', 'MED', 'HIGH'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => toggleArrayItem(priorities, p, setPriorities)}
                  className={`px-2 py-0.5 rounded text-xs ${
                    priorities.includes(p)
                      ? 'bg-flow-accent text-white'
                      : 'border border-flow-columnBorder bg-flow-background text-flow-textPrimary'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1">
              <label className="text-xs font-medium text-flow-textSecondary w-16 shrink-0">
                Category:
              </label>
              {PRESET_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleArrayItem(categories, c, setCategories)}
                  className={`px-2 py-0.5 rounded text-xs ${
                    categories.includes(c)
                      ? 'bg-flow-accent text-white'
                      : 'border border-flow-columnBorder bg-flow-background text-flow-textPrimary'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs font-medium text-flow-textSecondary w-16 shrink-0">
                Date range:
              </label>
              <input
                type="date"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
                className="rounded border border-flow-columnBorder px-2 py-1 text-xs bg-flow-background text-flow-textPrimary"
              />
              <span className="text-flow-textSecondary">–</span>
              <input
                type="date"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
                className="rounded border border-flow-columnBorder px-2 py-1 text-xs bg-flow-background text-flow-textPrimary"
              />
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showCompleted}
                onChange={(e) => setShowCompleted(e.target.checked)}
                className="rounded border-flow-columnBorder"
              />
              <span className="text-xs text-flow-textPrimary">Show completed</span>
            </label>
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-flow-columnBorder">
            <p className="text-xs text-flow-textSecondary">Enter to search • Esc to close</p>
            <div className="flex gap-2">
              <button
                type="button"
                className="text-sm px-2 py-1 rounded border border-flow-columnBorder bg-flow-background text-flow-textPrimary hover:bg-flow-columnBorder"
                onClick={handleClear}
              >
                Clear
              </button>
              <button
                type="submit"
                className="text-sm px-2 py-1 rounded bg-flow-accent text-white hover:opacity-90"
              >
                Search
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
