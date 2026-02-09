import { useMemo, useState, useEffect, useRef } from 'react'
import { useAppStore } from '../../stores/appStore'
import { useShortcutStore } from '../../lib/shortcutManager'
import { formatShortcutForDisplay } from '../../lib/platform'
import { KEYBOARD_SHORTCUTS } from '../../lib/keyboardShortcuts'
import type { KeyboardShortcut, ShortcutCategory } from '../../types/keyboard'
import { Button } from '../ui/Button'

const CATEGORY_ORDER: ShortcutCategory[] = [
  'Navigation',
  'Selection',
  'Actions',
  'View',
  'Other',
]

function formatShortcutDisplay(s: KeyboardShortcut): string {
  if (s.action) {
    const shortcut = useShortcutStore.getState().getShortcut(s.action)
    return formatShortcutForDisplay(shortcut || '')
  }
  return s.modifiers ? `${s.modifiers}+${s.key}` : s.key
}

function ShortcutsPage() {
  useShortcutStore((s) => s.mappings) // subscribe so custom shortcuts re-render
  const byCategory = useMemo(() => {
    const map = new Map<string, KeyboardShortcut[]>()
    for (const s of KEYBOARD_SHORTCUTS) {
      const list = map.get(s.category) ?? []
      list.push(s)
      map.set(s.category, list)
    }
    return map
  }, [])

  return (
    <div className="overflow-y-auto p-4 space-y-4 flex-1 min-h-0">
      {CATEGORY_ORDER.filter((cat) => byCategory.has(cat)).map((category) => {
        const shortcuts = byCategory.get(category)!
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
      })}
    </div>
  )
}

function GettingStartedPage() {
  const setHelpOpen = useAppStore((s) => s.setHelpOpen)
  const setOnboardingOpen = useAppStore((s) => s.setOnboardingOpen)

  const openOnboarding = () => {
    setHelpOpen(false)
    setOnboardingOpen(true)
  }

  return (
    <div className="overflow-y-auto p-4 flex-1 min-h-0 flex flex-col gap-6">
      <section>
        <h3 className="text-flow-dir font-flow-semibold text-flow-textPrimary mb-2">
          Welcome to Flow
        </h3>
        <p className="text-flow-task text-flow-textSecondary leading-relaxed m-0">
          Flow is a peaceful task manager built around calm confidence and spatial clarity.
          Organize work in columns: navigate into projects (directories) and see tasks in context.
        </p>
      </section>
      <section>
        <h3 className="text-flow-dir font-flow-semibold text-flow-textPrimary mb-2">
          Quick tips
        </h3>
        <ul className="list-disc pl-5 text-flow-task text-flow-textSecondary space-y-1.5 m-0">
          <li>
            <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-700 border border-flow-columnBorder rounded text-sm font-mono">⌘N</kbd>
            {' '}— Create a task or directory
          </li>
          <li>
            <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-700 border border-flow-columnBorder rounded text-sm font-mono">⌘/</kbd>
            {' '}— Show keyboard shortcuts
          </li>
          <li>
            <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-700 border border-flow-columnBorder rounded text-sm font-mono">⌘K</kbd>
            {' '}— Command palette
          </li>
          <li>
            <kbd className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-700 border border-flow-columnBorder rounded text-sm font-mono">⌘,</kbd>
            {' '}— Open settings
          </li>
          <li>Use arrow keys to move focus; Enter to open a task or expand a directory.</li>
        </ul>
      </section>
      <section>
        <h3 className="text-flow-dir font-flow-semibold text-flow-textPrimary mb-2">
          Run setup again
        </h3>
        <p className="text-flow-task text-flow-textSecondary leading-relaxed m-0 mb-3">
          You can rerun the initial setup anytime to change week start, default view, priority colors, or create starter projects.
        </p>
        <Button type="button" variant="secondary" className="border border-flow-columnBorder" onClick={openOnboarding}>
          Open setup wizard
        </Button>
      </section>
    </div>
  )
}

type HelpPage = 'shortcuts' | 'getting-started'

export function HelpSheet() {
  const open = useAppStore((s) => s.helpOpen)
  const setHelpOpen = useAppStore((s) => s.setHelpOpen)
  const [page, setPage] = useState<HelpPage>('shortcuts')
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    setPage('shortcuts')
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setHelpOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, setHelpOpen])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-label="Help"
      onClick={() => setHelpOpen(false)}
    >
      <div
        ref={sheetRef}
        className="bg-flow-background border border-flow-columnBorder rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 px-4 py-3 border-b border-flow-columnBorder flex items-center justify-between">
          <div className="flex gap-1 rounded-md p-0.5 bg-neutral-100 dark:bg-neutral-800" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={page === 'shortcuts'}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                page === 'shortcuts'
                  ? 'bg-white dark:bg-neutral-700 text-flow-textPrimary shadow-sm'
                  : 'text-flow-textSecondary hover:text-flow-textPrimary'
              }`}
              onClick={() => setPage('shortcuts')}
            >
              Keyboard shortcuts
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={page === 'getting-started'}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                page === 'getting-started'
                  ? 'bg-white dark:bg-neutral-700 text-flow-textPrimary shadow-sm'
                  : 'text-flow-textSecondary hover:text-flow-textPrimary'
              }`}
              onClick={() => setPage('getting-started')}
            >
              Getting started
            </button>
          </div>
          <button
            type="button"
            className="p-1.5 rounded text-flow-textSecondary hover:text-flow-textPrimary hover:bg-flow-columnBorder/30 transition-colors"
            aria-label="Close help"
            onClick={() => setHelpOpen(false)}
          >
            <span className="text-lg leading-none">×</span>
          </button>
        </div>
        <div className="flex-1 min-h-0 flex flex-col" role="tabpanel">
          {page === 'shortcuts' && <ShortcutsPage />}
          {page === 'getting-started' && <GettingStartedPage />}
        </div>
      </div>
    </div>
  )
}
