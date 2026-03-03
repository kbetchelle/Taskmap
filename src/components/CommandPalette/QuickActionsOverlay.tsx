import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAppStore } from '../../stores/appStore'
import { useQuickSearch, type SearchResult } from './useQuickSearch'
import { ResultGroup } from './ResultGroup'

export function QuickActionsOverlay() {
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen)
  const popKeyboardContext = useAppStore((s) => s.popKeyboardContext)
  const pushRecentAction = useAppStore((s) => s.pushRecentAction)

  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const { groups, flatList } = useQuickSearch(query)

  // Focus input on mount
  useEffect(() => {
    setQuery('')
    setSelectedIndex(0)
    // Small delay so the portal is rendered before focusing
    requestAnimationFrame(() => {
      inputRef.current?.focus()
    })
  }, [])

  // Clamp selectedIndex when flatList changes
  useEffect(() => {
    setSelectedIndex((prev) =>
      flatList.length > 0 ? Math.min(prev, flatList.length - 1) : 0
    )
  }, [flatList.length])

  const close = useCallback(() => {
    setCommandPaletteOpen(false)
    popKeyboardContext()
    setQuery('')
    setSelectedIndex(0)
  }, [setCommandPaletteOpen, popKeyboardContext])

  const executeResult = useCallback(
    (result: SearchResult) => {
      // Track action in recents if it's an action type
      if (result.type === 'action') {
        // Extract command id from the result id (strip 'action-' or 'recent-' prefix)
        const cmdId = result.id.replace(/^(action-|recent-)/, '')
        pushRecentAction(cmdId)
      }
      close()
      result.execute()
    },
    [close, pushRecentAction]
  )

  // Compute group start indices for Tab/Shift+Tab navigation
  const groupStartIndices = useMemo(() => {
    const indices: number[] = []
    let offset = 0
    for (const group of groups) {
      indices.push(offset)
      offset += group.results.length
    }
    return indices
  }, [groups])

  // Keyboard navigation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        close()
        return
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        e.stopPropagation()
        setSelectedIndex((prev) =>
          flatList.length > 0 ? (prev + 1) % flatList.length : 0
        )
        return
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault()
        e.stopPropagation()
        setSelectedIndex((prev) =>
          flatList.length > 0
            ? (prev - 1 + flatList.length) % flatList.length
            : 0
        )
        return
      }

      if (e.key === 'Enter') {
        e.preventDefault()
        e.stopPropagation()
        if (flatList[selectedIndex]) {
          executeResult(flatList[selectedIndex])
        }
        return
      }

      if (e.key === 'Tab') {
        e.preventDefault()
        e.stopPropagation()

        if (groupStartIndices.length === 0) return

        if (e.shiftKey) {
          // Jump to previous group's first item
          const currentGroupIdx = groupStartIndices.findIndex(
            (start, i) =>
              selectedIndex >= start &&
              (i === groupStartIndices.length - 1 ||
                selectedIndex < groupStartIndices[i + 1])
          )
          const prevGroupIdx =
            currentGroupIdx > 0
              ? currentGroupIdx - 1
              : groupStartIndices.length - 1
          setSelectedIndex(groupStartIndices[prevGroupIdx])
        } else {
          // Jump to next group's first item
          const currentGroupIdx = groupStartIndices.findIndex(
            (start, i) =>
              selectedIndex >= start &&
              (i === groupStartIndices.length - 1 ||
                selectedIndex < groupStartIndices[i + 1])
          )
          const nextGroupIdx =
            currentGroupIdx < groupStartIndices.length - 1
              ? currentGroupIdx + 1
              : 0
          setSelectedIndex(groupStartIndices[nextGroupIdx])
        }
        return
      }
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [
    close,
    flatList,
    selectedIndex,
    executeResult,
    groupStartIndices,
  ])

  // Compute aria-activedescendant
  const activeDescendant = flatList[selectedIndex]
    ? flatList[selectedIndex].id
    : undefined

  // Build group offset map for rendering
  let runningOffset = 0

  const overlay = (
    <div
      className="fixed inset-0 z-[1500] flex items-start justify-center animate-fadeIn"
      role="dialog"
      aria-label="Quick actions"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) close()
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" aria-hidden="true" />

      {/* Modal */}
      <div
        className="relative mt-[20vh] w-full max-w-xl max-h-[70vh] flex flex-col rounded-xl border border-flow-columnBorder bg-flow-background shadow-xl overflow-hidden animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center border-b border-flow-columnBorder">
          <input
            ref={inputRef}
            type="text"
            className="w-full h-12 px-4 text-lg bg-transparent border-none outline-none text-flow-textPrimary placeholder:text-flow-textSecondary"
            placeholder="Search actions, tasks, and directories..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            aria-label="Search quick actions"
            aria-activedescendant={activeDescendant}
            aria-autocomplete="list"
            aria-controls="quick-actions-results"
            role="combobox"
            aria-expanded="true"
          />
        </div>

        {/* Results */}
        <div
          id="quick-actions-results"
          className="flex-1 overflow-y-auto py-2 px-1"
          role="listbox"
          style={{ maxHeight: '60vh' }}
        >
          {flatList.length === 0 && query.trim() ? (
            <div className="px-4 py-8 text-center text-flow-meta text-flow-textDisabled">
              No results found
            </div>
          ) : (
            groups.map((group) => {
              const startIndex = runningOffset
              runningOffset += group.results.length
              return (
                <ResultGroup
                  key={group.key}
                  group={group}
                  startIndex={startIndex}
                  selectedIndex={selectedIndex}
                  onSelect={setSelectedIndex}
                  onExecute={executeResult}
                />
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-4 px-4 py-2 border-t border-flow-columnBorder text-flow-footer text-flow-textSecondary">
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>⇥ Jump group</span>
          <span>Esc Close</span>
        </div>
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 150ms ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 150ms ease-out;
        }
      `}</style>
    </div>
  )

  return createPortal(overlay, document.body)
}
