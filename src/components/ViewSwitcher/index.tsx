/**
 * ViewSwitcher — Segmented toggle for switching between List, Calendar, and Kanban views.
 *
 * Styling: flow-* tokens, segmented button group.
 * Only shown when a directory is selected (not at root/Home level).
 */

import type { ViewType } from '../../types/views'

interface ViewSwitcherProps {
  activeView: ViewType
  onViewChange: (view: ViewType) => void
}

const views: { id: ViewType; label: string; icon: string }[] = [
  { id: 'list', label: 'List', icon: '☰' },
  { id: 'calendar', label: 'Calendar', icon: '📅' },
  { id: 'kanban', label: 'Kanban', icon: '▥' },
]

export function ViewSwitcher({ activeView, onViewChange }: ViewSwitcherProps) {
  return (
    <div className="border border-flow-columnBorder rounded-lg overflow-hidden inline-flex">
      {views.map((view) => {
        const isActive = activeView === view.id
        return (
          <button
            key={view.id}
            type="button"
            className={`
              px-3 py-1.5 text-flow-meta font-flow-medium transition-colors
              ${
                isActive
                  ? 'bg-flow-focus text-white'
                  : 'bg-flow-background text-flow-textSecondary hover:bg-gray-50'
              }
            `}
            onClick={() => onViewChange(view.id)}
            aria-pressed={isActive}
            aria-label={`Switch to ${view.label} view`}
          >
            <span className="mr-1" aria-hidden>{view.icon}</span>
            {view.label}
          </button>
        )
      })}
    </div>
  )
}
