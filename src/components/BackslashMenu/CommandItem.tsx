import { useRef, useEffect } from 'react'
import type { Command } from '../../lib/commandRegistry'

interface CommandItemProps {
  command: Command
  isSelected: boolean
  onSelect: () => void
  onHover: () => void
}

export function CommandItem({
  command,
  isSelected,
  onSelect,
  onHover,
}: CommandItemProps) {
  const ref = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isSelected && ref.current) {
      ref.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [isSelected])

  const Icon = command.icon

  return (
    <button
      ref={ref}
      type="button"
      className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors outline-none ${
        isSelected
          ? 'bg-flow-columnBorder/30 text-flow-textPrimary'
          : 'text-flow-textPrimary hover:bg-flow-columnBorder/20'
      }`}
      onMouseEnter={onHover}
      onMouseDown={(e) => {
        // Prevent stealing focus from the editor
        e.preventDefault()
      }}
      onClick={onSelect}
    >
      <span className="flex-shrink-0 w-[18px] h-[18px] flex items-center justify-center text-flow-textSecondary">
        <Icon size={18} />
      </span>
      <span className="flex-1 min-w-0 truncate text-sm font-flow-medium">
        {command.label}
      </span>
      {command.shortcut && (
        <kbd className="flex-shrink-0 px-1.5 py-0.5 text-[11px] font-mono rounded border border-flow-columnBorder bg-flow-background text-flow-textSecondary">
          {command.shortcut}
        </kbd>
      )}
    </button>
  )
}
