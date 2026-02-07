import { useState, useCallback, useEffect, useRef } from 'react'
import type { Task, TaskPriority } from '../../types'
import { COLUMN_WIDTH_PX } from '../../lib/theme'
import { PRESET_CATEGORIES, DEFAULT_BACKGROUND_PALETTE } from '../../lib/constants'
import {
  validateTaskTitle,
  validatePriority,
  validateCategory,
  parseDateInput,
} from '../../lib/validation'

const TASK_EDIT_FIELDS = [
  'title',
  'priority',
  'start_date',
  'due_date',
  'category',
  'tags',
  'background',
  'description',
] as const

interface TaskEditPanelProps {
  task: Task
  onSave: (id: string, updates: Partial<Task>) => void
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

export function TaskEditPanel({ task, onSave, onCancel }: TaskEditPanelProps) {
  const [fieldIndex, setFieldIndex] = useState(0)
  const [title, setTitle] = useState(task.title)
  const [priority, setPriority] = useState(task.priority ?? '')
  const [startDate, setStartDate] = useState(formatDateForInput(task.start_date))
  const [dueDate, setDueDate] = useState(formatDateForInput(task.due_date))
  const [category, setCategory] = useState(task.category ?? '')
  const [tags, setTags] = useState(task.tags?.join(', ') ?? '')
  const [background, setBackground] = useState(
    task.background_color
      ? String(DEFAULT_BACKGROUND_PALETTE.indexOf(task.background_color) + 1)
      : ''
  )
  const [description, setDescription] = useState(task.description ?? '')
  const [error, setError] = useState<string | null>(null)
  const titleInputRef = useRef<HTMLInputElement | null>(null) as React.MutableRefObject<HTMLInputElement | null>
  const fieldRefs = useRef<(HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null)[]>(
    []
  ) as React.MutableRefObject<(HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null)[]>

  useEffect(() => {
    titleInputRef.current?.focus()
  }, [])

  const trySave = useCallback(() => {
    const t = title.trim()
    const titleValidation = validateTaskTitle(t)
    if (!titleValidation.valid) {
      setError(titleValidation.message)
      setFieldIndex(0)
      titleInputRef.current?.focus()
      return
    }
    setError(null)

    const priorityResult = validatePriority(priority)
    const priorityVal: TaskPriority | null = priorityResult.valid ? priorityResult.value : null

    const categoryResult = validateCategory(category)
    const categoryVal: string | null = categoryResult.valid && categoryResult.value ? categoryResult.value : null

    const startDateParsed = parseDateInput(startDate)
    const dueDateParsed = parseDateInput(dueDate)
    const tagsArr = tags
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const bgIndex = background ? parseInt(background, 10) : NaN
    const background_color: string | null =
      !isNaN(bgIndex) && bgIndex >= 1 && bgIndex <= DEFAULT_BACKGROUND_PALETTE.length
        ? DEFAULT_BACKGROUND_PALETTE[bgIndex - 1]
        : null

    onSave(task.id, {
      title: t,
      priority: priorityVal,
      start_date: startDateParsed ? dateToIso(startDateParsed) : null,
      due_date: dueDateParsed ? dateToIso(dueDateParsed) : null,
      category: categoryVal,
      tags: tagsArr,
      background_color,
      description: description.trim() || null,
    })
  }, [
    title,
    priority,
    startDate,
    dueDate,
    category,
    tags,
    background,
    description,
    task.id,
    onSave,
  ])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
        return
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        trySave()
        return
      }
      if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault()
        const next = (fieldIndex + 1) % TASK_EDIT_FIELDS.length
        setFieldIndex(next)
        setTimeout(() => fieldRefs.current[next]?.focus(), 0)
      }
    },
    [fieldIndex, onCancel, trySave]
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
        <span className="text-flow-dir font-flow-semibold text-flow-textPrimary">Edit Task</span>
      </header>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        <div>
          <label className="block text-flow-meta text-flow-textSecondary mb-1">Title *</label>
          <input
            ref={(el) => {
              titleInputRef.current = el
              fieldRefs.current[0] = el
            }}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
            data-keyboard-ignore
          />
          {error && <p className="text-flow-error text-xs mt-1">{error}</p>}
        </div>
        <div>
          <label className="block text-flow-meta text-flow-textSecondary mb-1">Priority (L/M/H)</label>
          <input
            ref={(el) => (fieldRefs.current[1] = el)}
            type="text"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
            data-keyboard-ignore
          />
        </div>
        <div>
          <label className="block text-flow-meta text-flow-textSecondary mb-1">Start Date</label>
          <input
            ref={(el) => (fieldRefs.current[2] = el)}
            type="text"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
            data-keyboard-ignore
          />
        </div>
        <div>
          <label className="block text-flow-meta text-flow-textSecondary mb-1">Due Date</label>
          <input
            ref={(el) => (fieldRefs.current[3] = el)}
            type="text"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
            data-keyboard-ignore
          />
        </div>
        <div>
          <label className="block text-flow-meta text-flow-textSecondary mb-1">Category</label>
          <select
            ref={(el) => (fieldRefs.current[4] = el)}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            onKeyDown={handleKeyDown as unknown as React.KeyboardEventHandler<HTMLSelectElement>}
            className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
            data-keyboard-ignore
          >
            <option value="">—</option>
            {PRESET_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-flow-meta text-flow-textSecondary mb-1">Tags</label>
          <input
            ref={(el) => (fieldRefs.current[5] = el)}
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
            data-keyboard-ignore
          />
        </div>
        <div>
          <label className="block text-flow-meta text-flow-textSecondary mb-1">Background (1–6)</label>
          <input
            ref={(el) => (fieldRefs.current[6] = el)}
            type="text"
            value={background}
            onChange={(e) => setBackground(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
            data-keyboard-ignore
          />
        </div>
        <div>
          <label className="block text-flow-meta text-flow-textSecondary mb-1">Description</label>
          <textarea
            ref={(el) => (fieldRefs.current[7] = el)}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm min-h-[60px]"
            data-keyboard-ignore
          />
        </div>
      </div>
      <footer className="flex-shrink-0 px-4 py-2 border-t border-flow-columnBorder text-flow-meta text-flow-textSecondary text-xs">
        Enter to save • Shift+Enter next field • Esc to cancel
      </footer>
    </section>
  )
}
