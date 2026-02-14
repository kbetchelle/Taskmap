import type { CreationContext } from '../../types/database'

type ItemType = NonNullable<CreationContext['type']>

interface TypeSelectorProps {
  value: ItemType
  onChange: (type: ItemType) => void
  /** When true, only directories are allowed (column 0 / root level) */
  directoryOnly: boolean
}

const TABS: { type: ItemType; label: string; icon: string; shortcut: string }[] = [
  { type: 'task', label: 'Task', icon: '\uD83D\uDCCB', shortcut: 'T' },
  { type: 'directory', label: 'Directory', icon: '\uD83D\uDCC1', shortcut: 'D' },
  { type: 'link', label: 'Link', icon: '\uD83D\uDD17', shortcut: 'L' },
]

export function TypeSelector({ value, onChange, directoryOnly }: TypeSelectorProps) {
  return (
    <div className="flex gap-1">
      {TABS.map((tab) => {
        const disabled = directoryOnly && tab.type !== 'directory'
        const active = value === tab.type
        return (
          <button
            key={tab.type}
            type="button"
            disabled={disabled}
            className={`
              flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-flow-medium rounded-lg transition-colors
              ${active
                ? 'bg-flow-focus text-white'
                : disabled
                  ? 'text-flow-textDisabled cursor-not-allowed'
                  : 'text-flow-textSecondary hover:bg-flow-hover'
              }
            `}
            onClick={() => !disabled && onChange(tab.type)}
            aria-pressed={active}
            title={disabled ? 'Only directories can be created at the root level' : `${tab.label} (${tab.shortcut})`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        )
      })}
      {directoryOnly && (
        <p className="text-flow-meta text-flow-textDisabled mt-1 px-1">
          Only directories can be created at the root level
        </p>
      )}
    </div>
  )
}
