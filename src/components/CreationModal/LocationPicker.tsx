import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useDirectoryStore } from '../../stores/directoryStore'
import { getPathToDirectory } from '../../lib/treeUtils'
import type { Directory } from '../../types/database'

interface LocationPickerProps {
  value: string | null  // directory ID or null for root
  onChange: (directoryId: string | null) => void
}

interface DirNode {
  dir: Directory
  depth: number
}

/** Build a flat list of directories with depth, in tree order. */
function flattenDirs(directories: Directory[]): DirNode[] {
  const result: DirNode[] = []
  const childrenOf = new Map<string | null, Directory[]>()

  for (const d of directories) {
    const key = d.parent_id
    if (!childrenOf.has(key)) childrenOf.set(key, [])
    childrenOf.get(key)!.push(d)
  }

  function walk(parentId: string | null, depth: number) {
    const children = childrenOf.get(parentId) ?? []
    children.sort((a, b) => a.position - b.position)
    for (const dir of children) {
      result.push({ dir, depth })
      walk(dir.id, depth + 1)
    }
  }

  walk(null, 0)
  return result
}

export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const directories = useDirectoryStore((s) => s.directories)
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const flatDirs = useMemo(() => flattenDirs(directories), [directories])

  // Build breadcrumb for the selected directory
  const breadcrumb = useMemo(() => {
    if (!value) return 'Home (root)'
    const path = getPathToDirectory(value, directories)
    const names = path.map((id) => directories.find((d) => d.id === id)?.name ?? '?')
    return ['Home', ...names].join(' > ')
  }, [value, directories])

  const handleSelect = useCallback(
    (dirId: string | null) => {
      onChange(dirId)
      setOpen(false)
    },
    [onChange],
  )

  // Close on click outside
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="flex flex-col gap-1 relative" ref={dropdownRef}>
      <label className="text-flow-meta text-flow-textSecondary font-flow-medium">Location</label>
      <button
        type="button"
        className="w-full text-left px-3 py-2 text-sm border border-flow-columnBorder rounded-md bg-flow-background text-flow-textPrimary hover:bg-flow-hover transition-colors truncate"
        onClick={() => setOpen(!open)}
      >
        {breadcrumb}
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 max-h-[240px] overflow-y-auto rounded-md border border-flow-columnBorder bg-flow-background shadow-lg">
          {/* Root option */}
          <button
            type="button"
            className={`w-full text-left px-3 py-2 text-sm transition-colors ${
              value === null ? 'bg-flow-selected text-flow-textPrimary font-flow-medium' : 'text-flow-textPrimary hover:bg-flow-hover'
            }`}
            onClick={() => handleSelect(null)}
          >
            Home (root)
          </button>

          {flatDirs.map(({ dir, depth }) => (
            <button
              key={dir.id}
              type="button"
              className={`w-full text-left px-3 py-2 text-sm transition-colors truncate ${
                value === dir.id ? 'bg-flow-selected text-flow-textPrimary font-flow-medium' : 'text-flow-textPrimary hover:bg-flow-hover'
              }`}
              style={{ paddingLeft: `${12 + depth * 16}px` }}
              onClick={() => handleSelect(dir.id)}
            >
              <span className="mr-1.5 text-flow-textSecondary">{'\uD83D\uDCC1'}</span>
              {dir.name}
            </button>
          ))}

          {flatDirs.length === 0 && (
            <div className="px-3 py-4 text-center text-flow-meta text-flow-textDisabled">
              No directories yet
            </div>
          )}
        </div>
      )}
    </div>
  )
}
