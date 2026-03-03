import { useSidebarStore } from '../../stores/sidebarStore'
import type { SidebarFilterMode } from '../../types/sidebar'

const OPTIONS: { value: SidebarFilterMode; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'dirs', label: 'Dirs' },
  { value: 'tasks', label: 'Tasks' },
]

export function SidebarFilter() {
  const sidebarFilter = useSidebarStore((s) => s.sidebarFilter)
  const setSidebarFilter = useSidebarStore((s) => s.setSidebarFilter)

  return (
    <div className="flex items-center gap-0.5 p-2 border-b border-flow-columnBorder/50">
      {OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          className={`px-2 py-1 rounded text-flow-meta transition-colors ${
            sidebarFilter === value
              ? 'bg-flow-focus/10 text-flow-focus font-flow-medium'
              : 'text-flow-textSecondary hover:text-flow-textPrimary hover:bg-flow-columnBorder/30'
          }`}
          onClick={() => setSidebarFilter(value)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
