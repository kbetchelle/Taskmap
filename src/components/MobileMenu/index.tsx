import { useCallback } from 'react'
import { useAppStore } from '../../stores/appStore'
import { useUIStore } from '../../stores/uiStore'

export function MobileMenu() {
  const isOpen = useUIStore((s) => s.mobileMenuOpen)
  const setMobileMenuOpen = useUIStore((s) => s.setMobileMenuOpen)
  const setCurrentView = useAppStore((s) => s.setCurrentView)
  const setPreviousView = useAppStore((s) => s.setPreviousView)
  const setSearchBarOpen = useAppStore((s) => s.setSearchBarOpen)
  const setColorMode = useAppStore((s) => s.setColorMode)
  const setActiveFilters = useAppStore((s) => s.setActiveFilters)
  const colorMode = useAppStore((s) => s.colorMode)
  const activeFilters = useAppStore((s) => s.activeFilters)
  const setShortcutSheetOpen = useAppStore((s) => s.setShortcutSheetOpen)

  const handleClose = useCallback(() => {
    setMobileMenuOpen(false)
  }, [setMobileMenuOpen])

  const handleView = useCallback(
    (view: 'main_db' | 'upcoming' | 'archive' | 'settings') => {
      setPreviousView(useAppStore.getState().currentView)
      setCurrentView(view)
      setMobileMenuOpen(false)
    },
    [setCurrentView, setPreviousView, setMobileMenuOpen]
  )

  const handleSearch = useCallback(() => {
    setSearchBarOpen(true)
    setMobileMenuOpen(false)
  }, [setSearchBarOpen, setMobileMenuOpen])

  const handleShortcuts = useCallback(() => {
    setShortcutSheetOpen(true)
    setMobileMenuOpen(false)
  }, [setShortcutSheetOpen, setMobileMenuOpen])

  const handleToggleCompleted = useCallback(() => {
    setActiveFilters({ showCompleted: !activeFilters.showCompleted })
  }, [activeFilters.showCompleted, setActiveFilters])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[1100]"
      role="dialog"
      aria-label="Menu"
    >
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
        aria-hidden
      />
      <div
        className="absolute bottom-0 left-0 right-0 bg-white dark:bg-neutral-900 rounded-t-2xl shadow-lg overflow-hidden max-h-[80vh] overflow-y-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-1 p-4">
          <h2 className="text-lg font-flow-semibold text-flow-textPrimary px-2 py-2">
            Menu
          </h2>

          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-flow-semibold uppercase tracking-wide text-flow-textSecondary px-2 py-1">
              Views
            </span>
            <button
              type="button"
              onClick={() => handleView('main_db')}
              className="flex items-center gap-2 px-4 py-3 text-left text-flow-textPrimary hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => handleView('upcoming')}
              className="flex items-center gap-2 px-4 py-3 text-left text-flow-textPrimary hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            >
              Upcoming
            </button>
            <button
              type="button"
              onClick={() => handleView('archive')}
              className="flex items-center gap-2 px-4 py-3 text-left text-flow-textPrimary hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            >
              Archive
            </button>
          </div>

          <div className="flex flex-col gap-0.5 pt-2">
            <span className="text-xs font-flow-semibold uppercase tracking-wide text-flow-textSecondary px-2 py-1">
              Actions
            </span>
            <button
              type="button"
              onClick={handleSearch}
              className="flex items-center gap-2 px-4 py-3 text-left text-flow-textPrimary hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            >
              🔍 Search
            </button>
            <button
              type="button"
              onClick={() => handleView('settings')}
              className="flex items-center gap-2 px-4 py-3 text-left text-flow-textPrimary hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            >
              Settings
            </button>
          </div>

          <div className="flex flex-col gap-0.5 pt-2">
            <span className="text-xs font-flow-semibold uppercase tracking-wide text-flow-textSecondary px-2 py-1">
              View
            </span>
            <button
              type="button"
              onClick={() => setColorMode('none')}
              className={`flex items-center gap-2 px-4 py-3 text-left rounded-lg transition-colors ${
                colorMode === 'none'
                  ? 'bg-flow-focus/10 text-flow-focus'
                  : 'text-flow-textPrimary hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              No color
            </button>
            <button
              type="button"
              onClick={() => setColorMode('category')}
              className={`flex items-center gap-2 px-4 py-3 text-left rounded-lg transition-colors ${
                colorMode === 'category'
                  ? 'bg-flow-focus/10 text-flow-focus'
                  : 'text-flow-textPrimary hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              Category color
            </button>
            <button
              type="button"
              onClick={() => setColorMode('priority')}
              className={`flex items-center gap-2 px-4 py-3 text-left rounded-lg transition-colors ${
                colorMode === 'priority'
                  ? 'bg-flow-focus/10 text-flow-focus'
                  : 'text-flow-textPrimary hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              Priority color
            </button>
            <button
              type="button"
              onClick={handleToggleCompleted}
              className="flex items-center gap-2 px-4 py-3 text-left text-flow-textPrimary hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            >
              {activeFilters.showCompleted ? '✓ ' : ''}Show completed tasks
            </button>
          </div>

          <div className="flex flex-col gap-0.5 pt-2 pb-4">
            <button
              type="button"
              onClick={handleShortcuts}
              className="flex items-center gap-2 px-4 py-3 text-left text-flow-textPrimary hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            >
              ⌘ Keyboard shortcuts
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
