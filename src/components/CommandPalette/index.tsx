import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAppStore } from '../../stores/appStore'

function fuzzyFilter<T extends { label: string; category: string }>(
  items: T[],
  query: string
): T[] {
  if (!query.trim()) return items
  const lower = query.toLowerCase()
  return items.filter(
    (item) =>
      item.label.toLowerCase().includes(lower) ||
      item.category.toLowerCase().includes(lower)
  )
}

function groupByCategory<T extends { category: string }>(
  items: T[]
): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const item of items) {
    const list = map.get(item.category) ?? []
    list.push(item)
    map.set(item.category, list)
  }
  return map
}

function formatShortcut(shortcut: string): React.ReactNode {
  const parts = shortcut.replace(/\s/g, '').split('+')
  return (
    <>
      {parts.map((p, i) => (
        <span key={i}>
          <kbd className="px-1.5 py-0.5 text-[11px] font-mono rounded border border-flow-columnBorder bg-flow-background">
            {p}
          </kbd>
          {i < parts.length - 1 && <span className="text-flow-textSecondary mx-0.5">+</span>}
        </span>
      ))}
    </>
  )
}

const CATEGORY_ORDER = [
  'Navigation',
  'Creation',
  'View',
  'Search',
  'Settings',
  'Help',
  'Saved Views',
]

export function CommandPalette() {
  const open = useAppStore((s) => s.commandPaletteOpen)
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen)
  const popKeyboardContext = useAppStore((s) => s.popKeyboardContext)
  const commands = useAppStore((s) => s.commandPaletteCommands)

  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(
    () => fuzzyFilter(commands, query),
    [commands, query]
  )
  const grouped = useMemo(() => groupByCategory(filtered), [filtered])
  const flatList = useMemo(() => filtered, [filtered])

  const close = useCallback(() => {
    setCommandPaletteOpen(false)
    popKeyboardContext()
    setQuery('')
    setSelectedIndex(0)
  }, [setCommandPaletteOpen, popKeyboardContext])

  useEffect(() => {
    if (!open) return
    setQuery('')
    setSelectedIndex(0)
    inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    setSelectedIndex((i) => (flatList.length ? Math.min(i, flatList.length - 1) : 0))
  }, [flatList.length])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => (flatList.length ? (i + 1) % flatList.length : 0))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) =>
          flatList.length ? (i - 1 + flatList.length) % flatList.length : 0
        )
        return
      }
      if (e.key === 'Enter' && flatList[selectedIndex]) {
        e.preventDefault()
        flatList[selectedIndex].action()
        close()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, flatList, selectedIndex, close])

  if (!open) return null

  let idx = 0
  return (
    <div
      className="fixed inset-0 z-[1500] flex items-start justify-center pt-[20vh] bg-black/20"
      role="dialog"
      aria-label="Command palette"
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <div
        className="w-[600px] max-w-[90vw] max-h-[60vh] flex flex-col rounded-xl border border-flow-columnBorder bg-flow-background shadow-xl overflow-hidden"
        style={{ animation: 'paletteSlideIn 200ms ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-flow-columnBorder">
          <span className="text-flow-textSecondary" aria-hidden>
            ⌘
          </span>
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-flow-task text-flow-textPrimary placeholder:text-flow-textSecondary"
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search commands"
          />
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {flatList.length === 0 ? (
            <div className="px-5 py-8 text-center text-flow-meta text-flow-textSecondary">
              No commands found for &quot;{query}&quot;
            </div>
          ) : (
            CATEGORY_ORDER.filter((cat) => grouped.has(cat)).map((category) => {
              const items = grouped.get(category)!
              return (
                <div key={category} className="mb-2">
                  <div className="px-5 py-1.5 text-[11px] font-flow-semibold uppercase tracking-wide text-flow-textSecondary">
                    {category}
                  </div>
                  {items.map((cmd) => {
                    const currentIdx = idx++
                    const selected = currentIdx === selectedIndex
                    return (
                      <button
                        key={cmd.id}
                        type="button"
                        className={`w-full flex items-center justify-between gap-3 px-5 py-2.5 text-left text-flow-task transition-colors ${
                          selected ? 'bg-flow-columnBorder/50' : 'hover:bg-flow-columnBorder/30'
                        }`}
                        onMouseEnter={() => setSelectedIndex(currentIdx)}
                        onClick={() => {
                          cmd.action()
                          close()
                        }}
                      >
                        <span className="font-flow-medium text-flow-textPrimary truncate">
                          {cmd.label}
                        </span>
                        {cmd.shortcut && (
                          <span className="flex items-center gap-0.5 shrink-0 text-flow-meta text-flow-textSecondary">
                            {formatShortcut(cmd.shortcut)}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>
        <div className="flex items-center justify-center gap-4 px-5 py-2.5 border-t border-flow-columnBorder text-flow-footer text-flow-textSecondary">
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>
  )
}
