import { useMemo, useState, useEffect, useRef } from 'react'
import { useAppStore } from '../../stores/appStore'
import { useShortcutStore } from '../../lib/shortcutManager'
import { formatShortcutForDisplay } from '../../lib/platform'
import { KEYBOARD_SHORTCUTS } from '../../lib/keyboardShortcuts'
import type { KeyboardShortcut, ShortcutCategory } from '../../types/keyboard'

function formatShortcutDisplay(s: KeyboardShortcut): string {
  if (s.action) {
    const shortcut = useShortcutStore.getState().getShortcut(s.action)
    return formatShortcutForDisplay(shortcut || '')
  }
  return s.modifiers ? `${s.modifiers}+${s.key}` : s.key
}

function filterShortcuts(
  shortcuts: KeyboardShortcut[],
  query: string,
  category: ShortcutCategory | null
): KeyboardShortcut[] {
  let list = category
    ? shortcuts.filter((s) => s.category === category)
    : shortcuts
  if (query.trim()) {
    const lower = query.toLowerCase()
    list = list.filter(
      (s) =>
        s.description.toLowerCase().includes(lower) ||
        formatShortcutDisplay(s).toLowerCase().includes(lower)
    )
  }
  return list
}

const CATEGORY_ORDER: ShortcutCategory[] = [
  'Navigation',
  'Selection',
  'Actions',
  'View',
  'Other',
]

export function ShortcutSheet() {
  const open = useAppStore((s) => s.shortcutSheetOpen)
  const setShortcutSheetOpen = useAppStore((s) => s.setShortcutSheetOpen)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<ShortcutCategory | null>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const categories = useMemo(
    () => Array.from(new Set(KEYBOARD_SHORTCUTS.map((s) => s.category))),
    []
  )
  const mappingsMap = useShortcutStore((s) => s.mappings)
  const mappings = useMemo(
    () => Array.from(mappingsMap.values()),
    [mappingsMap]
  )
  const filtered = useMemo(
    () => filterShortcuts(KEYBOARD_SHORTCUTS, searchQuery, selectedCategory),
    [searchQuery, selectedCategory, mappings]
  )
  const filteredByCategory = useMemo(() => {
    const map = new Map<string, KeyboardShortcut[]>()
    for (const s of filtered) {
      const list = map.get(s.category) ?? []
      list.push(s)
      map.set(s.category, list)
    }
    return map
  }, [filtered])

  useEffect(() => {
    if (!open) return
    setSearchQuery('')
    setSelectedCategory(null)
    searchInputRef.current?.focus()
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setShortcutSheetOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, setShortcutSheetOpen])

  const handlePrint = () => {
    window.print()
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 print:bg-white print:block"
      role="dialog"
      aria-label="Keyboard shortcuts"
      onClick={() => setShortcutSheetOpen(false)}
    >
      <div
        ref={sheetRef}
        className="bg-flow-background border border-flow-columnBorder rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col print:max-h-none print:shadow-none print:border print:rounded"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 px-4 py-3 border-b border-flow-columnBorder">
          <h2 className="text-flow-dir font-flow-semibold text-flow-textPrimary mb-3">
            Keyboard shortcuts
          </h2>
          <input
            ref={searchInputRef}
            type="text"
            className="w-full rounded-md border border-flow-columnBorder px-3 py-2 text-sm text-flow-textPrimary placeholder:text-flow-textSecondary bg-flow-background"
            placeholder="Search shortcuts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search shortcuts"
          />
          <div className="flex flex-wrap gap-2 mt-2">
            <button
              type="button"
              className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors ${
                selectedCategory === null
                  ? 'bg-flow-focus text-white border-flow-focus'
                  : 'bg-transparent text-flow-textSecondary border-flow-columnBorder hover:bg-flow-columnBorder/30'
              }`}
              onClick={() => setSelectedCategory(null)}
            >
              All
            </button>
            {CATEGORY_ORDER.filter((c) => categories.includes(c)).map((cat) => (
              <button
                key={cat}
                type="button"
                className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors ${
                  selectedCategory === cat
                    ? 'bg-flow-focus text-white border-flow-focus'
                    : 'bg-transparent text-flow-textSecondary border-flow-columnBorder hover:bg-flow-columnBorder/30'
                }`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-y-auto p-4 space-y-4 flex-1 min-h-0">
          {filtered.length === 0 ? (
            <p className="text-flow-meta text-flow-textSecondary">
              No shortcuts match &quot;{searchQuery}&quot;
            </p>
          ) : (
            CATEGORY_ORDER.filter((cat) => filteredByCategory.has(cat)).map((category) => {
              const shortcuts = filteredByCategory.get(category)!
              return (
                <section key={category}>
                  <h3 className="text-flow-meta font-flow-semibold text-flow-textSecondary mb-2">
                    {category}
                  </h3>
                  <table className="w-full text-left text-flow-task text-flow-textPrimary">
                    <tbody>
                      {shortcuts.map((s, i) => (
                        <tr key={`${s.key}-${s.modifiers ?? ''}-${i}`}>
                          <td className="py-1 pr-4 font-mono text-flow-meta text-flow-textSecondary whitespace-nowrap">
                            {formatShortcutDisplay(s)}
                          </td>
                          <td className="py-1">{s.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              )
            })
          )}
        </div>
        <div className="flex-shrink-0 flex gap-2 p-4 border-t border-flow-columnBorder print:hidden">
          <button
            type="button"
            className="flex-1 px-4 py-2 text-sm font-medium text-flow-focus border border-flow-focus rounded-md hover:bg-flow-focus/10 transition-colors"
            onClick={handlePrint}
          >
            Print / Export PDF
          </button>
        </div>
      </div>
    </div>
  )
}
