import { useState, useCallback, useEffect, useRef } from 'react'
import type { Directory } from '../../types'
import { COLUMN_WIDTH_PX } from '../../lib/theme'
import { validateDirectoryName } from '../../lib/validation'
import { parseDateInput } from '../../lib/validation'

interface DirectoryEditPanelProps {
  directory: Directory
  onSave: (id: string, updates: Partial<Pick<Directory, 'name' | 'start_date' | 'due_date'>>) => void
  onCancel: () => void
}

function formatDateForInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function dateToIso(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function DirectoryEditPanel({ directory, onSave, onCancel }: DirectoryEditPanelProps) {
  const [name, setName] = useState(directory.name)
  const [startDate, setStartDate] = useState(formatDateForInput(directory.start_date))
  const [dueDate, setDueDate] = useState(formatDateForInput(directory.due_date))
  const [error, setError] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  const trySave = useCallback(() => {
    const validation = validateDirectoryName(name)
    if (!validation.valid) {
      setError(validation.message)
      nameRef.current?.focus()
      return
    }
    setError(null)
    const startDateParsed = parseDateInput(startDate)
    const dueDateParsed = parseDateInput(dueDate)
    onSave(directory.id, {
      name: name.trim(),
      start_date: startDateParsed ? dateToIso(startDateParsed) : null,
      due_date: dueDateParsed ? dateToIso(dueDateParsed) : null,
    })
  }, [name, startDate, dueDate, directory.id, onSave])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        trySave()
      }
    },
    [onCancel, trySave]
  )

  return (
    <section
      className="flex flex-col flex-shrink-0 border-r border-flow-columnBorder bg-flow-background"
      style={{
        minWidth: COLUMN_WIDTH_PX,
        maxWidth: COLUMN_WIDTH_PX,
        height: '100%',
        scrollSnapAlign: 'start',
      }}
    >
      <header className="flex-shrink-0 h-11 px-4 border-b border-flow-columnBorder flex items-center" style={{ minHeight: 44 }}>
        <span className="text-flow-dir font-flow-semibold text-flow-textPrimary">Edit Directory</span>
      </header>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        <div>
          <label className="block text-flow-meta text-flow-textSecondary mb-1">Name *</label>
          <input
            ref={nameRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
            placeholder="Directory name"
            data-keyboard-ignore
          />
          {error && <p className="text-flow-error text-xs mt-1">{error}</p>}
        </div>
        <div>
          <label className="block text-flow-meta text-flow-textSecondary mb-1">Start Date</label>
          <input
            type="text"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
            placeholder="e.g. tomorrow or mm/dd/yy"
            data-keyboard-ignore
          />
        </div>
        <div>
          <label className="block text-flow-meta text-flow-textSecondary mb-1">Due Date</label>
          <input
            type="text"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
            placeholder="e.g. next week or mm/dd/yy"
            data-keyboard-ignore
          />
        </div>
      </div>
      <footer className="flex-shrink-0 px-4 py-2 border-t border-flow-columnBorder text-flow-meta text-flow-textSecondary text-xs">
        Enter to save • Esc to cancel
      </footer>
    </section>
  )
}
