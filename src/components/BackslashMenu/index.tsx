import { useCallback, useEffect, useRef, useState } from 'react'
import { BackslashMenuItem } from './BackslashMenuItem'
import type { CommandDescriptor } from '../../lib/commandRegistry'

// ── Props ────────────────────────────────────────────────────────────────

interface BackslashMenuProps {
  /** Filtered command descriptors to display */
  commands: CommandDescriptor[]
  /** Current filter query */
  query: string
  /** Called when the user types in the filter input */
  onQueryChange: (query: string) => void
  /** Called when a command is selected */
  onExecute: (commandId: string) => void
  /** Called when the menu should close (Escape, click outside) */
  onClose: () => void
  /** Fixed position coordinates (null = mobile bottom sheet) */
  position: { top: number; left: number } | null
  /** Render as mobile bottom sheet */
  isMobile: boolean
}

// ── Component ────────────────────────────────────────────────────────────

export function BackslashMenu({
  commands,
  query,
  onQueryChange,
  onExecute,
  onClose,
  position,
  isMobile,
}: BackslashMenuProps) {
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [visible, setVisible] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Reset highlight when commands change
  useEffect(() => {
    setHighlightedIndex(0)
  }, [commands.length, query])

  // Animate in on mount
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  // Auto-focus the filter input on mount
  useEffect(() => {
    // Small delay to ensure the DOM has rendered
    const timer = setTimeout(() => inputRef.current?.focus(), 10)
    return () => clearTimeout(timer)
  }, [])

  // Click-outside detection
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [onClose])

  // Keyboard handling on the input
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setHighlightedIndex((prev) =>
            commands.length === 0 ? 0 : (prev + 1) % commands.length,
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setHighlightedIndex((prev) =>
            commands.length === 0 ? 0 : (prev - 1 + commands.length) % commands.length,
          )
          break
        case 'Enter':
        case 'Tab':
          e.preventDefault()
          if (commands.length > 0 && highlightedIndex < commands.length) {
            onExecute(commands[highlightedIndex].id)
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
        default:
          // Let the input handle all other keys naturally (typing)
          break
      }
    },
    [commands, highlightedIndex, onExecute, onClose],
  )

  // ── Render ───────────────────────────────────────────────────────────

  const menuContent = (
    <>
      {/* Filter input */}
      <div className="px-3 pt-3 pb-2">
        <input
          ref={inputRef}
          type="text"
          className="w-full rounded-md border border-flow-columnBorder bg-flow-background
                     px-3 py-1.5 text-flow-task text-flow-textPrimary
                     placeholder:text-flow-textDisabled
                     outline-none focus:border-flow-focus focus:ring-1 focus:ring-flow-focus/30"
          placeholder="Type to filter..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-expanded
          aria-autocomplete="list"
          aria-controls="backslash-menu-list"
          data-keyboard-ignore
        />
      </div>

      {/* Command list */}
      <div
        id="backslash-menu-list"
        className="overflow-y-auto px-1.5 pb-1.5"
        style={{ maxHeight: 320 }}
        role="listbox"
      >
        {commands.length > 0 ? (
          commands.map((cmd, idx) => (
            <BackslashMenuItem
              key={cmd.id}
              icon={cmd.icon}
              label={cmd.label}
              shortcutHint={cmd.shortcutHint}
              isHighlighted={idx === highlightedIndex}
              onClick={() => onExecute(cmd.id)}
            />
          ))
        ) : (
          <div className="px-3 py-4 text-center text-flow-meta text-flow-textDisabled">
            No matching commands
          </div>
        )}
      </div>
    </>
  )

  // ── Mobile bottom sheet ──────────────────────────────────────────────

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-[1400]" role="dialog" aria-modal aria-label="Command menu">
        {/* Backdrop */}
        <div
          className={`
            absolute inset-0 bg-black/30
            transition-opacity duration-150
            ${visible ? 'opacity-100' : 'opacity-0'}
          `}
          onClick={onClose}
        />

        {/* Bottom sheet */}
        <div
          ref={menuRef}
          className={`
            absolute bottom-0 left-0 right-0
            rounded-t-xl border-t border-flow-columnBorder
            bg-flow-background shadow-lg
            transition-all duration-150
            ${visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
          `}
          style={{ maxHeight: '60vh' }}
        >
          {/* Drag handle indicator */}
          <div className="flex justify-center pt-2 pb-1">
            <div className="h-1 w-8 rounded-full bg-flow-textDisabled/40" />
          </div>
          {menuContent}
        </div>
      </div>
    )
  }

  // ── Desktop floating panel ───────────────────────────────────────────

  return (
    <div
      ref={menuRef}
      className={`
        fixed z-[1400] w-[280px]
        rounded-lg border border-flow-columnBorder
        bg-flow-background shadow-lg
        transition-all duration-150
        ${visible ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0'}
      `}
      style={{
        top: position?.top ?? 0,
        left: position?.left ?? 0,
      }}
      role="dialog"
      aria-modal
      aria-label="Command menu"
    >
      {menuContent}
    </div>
  )
}
