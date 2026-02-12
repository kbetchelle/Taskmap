import { useRef, useEffect } from 'react'
import type { LucideIcon } from 'lucide-react'

interface BackslashMenuItemProps {
  icon: LucideIcon
  label: string
  shortcutHint?: string
  isHighlighted: boolean
  onClick: () => void
}

export function BackslashMenuItem({
  icon: Icon,
  label,
  shortcutHint,
  isHighlighted,
  onClick,
}: BackslashMenuItemProps) {
  const ref = useRef<HTMLButtonElement>(null)

  // Scroll highlighted item into view within the menu list
  useEffect(() => {
    if (isHighlighted && ref.current) {
      ref.current.scrollIntoView({ block: 'nearest' })
    }
  }, [isHighlighted])

  return (
    <button
      ref={ref}
      type="button"
      className={`
        flex w-full items-center gap-3 px-3 py-2 text-left
        transition-colors duration-75 rounded-md
        ${isHighlighted ? 'bg-flow-focus/10' : 'hover:bg-flow-focus/5'}
      `}
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()} // prevent focus steal from input
      role="option"
      aria-selected={isHighlighted}
    >
      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center text-flow-textSecondary">
        <Icon size={18} />
      </span>
      <span className="flex-1 truncate text-flow-task text-flow-textPrimary">
        {label}
      </span>
      {shortcutHint && (
        <span className="flex-shrink-0 text-flow-meta text-flow-textSecondary">
          {shortcutHint}
        </span>
      )}
    </button>
  )
}
