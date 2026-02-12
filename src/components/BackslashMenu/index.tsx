import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { Command } from '../../lib/commandRegistry'
import { CommandItem } from './CommandItem'

interface BackslashMenuProps {
  isOpen: boolean
  position: { top: number; left: number }
  commands: Command[]
  selectedIndex: number
  filterText: string
  onSelect: (command: Command) => void
  onHover: (index: number) => void
  onDismiss: () => void
}

export function BackslashMenu({
  isOpen,
  position,
  commands,
  selectedIndex,
  filterText,
  onSelect,
  onHover,
  onDismiss,
}: BackslashMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  // Dismiss on click outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onDismiss()
      }
    }

    // Use a small delay so the click that might have opened the menu doesn't immediately close it
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 0)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onDismiss])

  if (!isOpen) return null

  const menu = (
    <div
      ref={menuRef}
      className="fixed z-[2000] w-[280px] max-h-[288px] overflow-y-auto rounded-lg border border-flow-columnBorder bg-flow-background shadow-lg"
      style={{
        top: position.top,
        left: position.left,
        animation: 'backslashMenuIn 120ms ease-out',
      }}
      role="listbox"
      aria-label="Command menu"
    >
      {commands.length === 0 ? (
        <div className="px-3 py-6 text-center text-flow-meta text-flow-textSecondary">
          No commands found
          {filterText && (
            <>
              {' '}
              for &quot;\{filterText}&quot;
            </>
          )}
        </div>
      ) : (
        <div className="py-1">
          {commands.map((cmd, idx) => (
            <CommandItem
              key={cmd.id}
              command={cmd}
              isSelected={idx === selectedIndex}
              onSelect={() => onSelect(cmd)}
              onHover={() => onHover(idx)}
            />
          ))}
        </div>
      )}
    </div>
  )

  return createPortal(menu, document.body)
}
