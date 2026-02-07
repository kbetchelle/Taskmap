import { useState, useCallback, useEffect, useRef } from 'react'
import type { Task, TaskPriority } from '../../types'
import { COLUMN_WIDTH_PX } from '../../lib/theme'
import { PRESET_CATEGORIES, DEFAULT_BACKGROUND_PALETTE } from '../../lib/constants'
import {
  validateTaskTitle,
  validatePriority,
  validateCategory,
  parseDateInput,
  parseDateInputWithConfidence,
} from '../../lib/validation'
import { DateInputField } from '../DateInputField'

const TASK_CREATION_FIELDS = [
  'title',
  'priority',
  'start_date',
  'due_date',
  'category',
  'tags',
  'background',
  'description',
] as const

type TaskCreationField = (typeof TASK_CREATION_FIELDS)[number]

export interface TaskCreationMetadata {
  title?: string
  priority?: string
  start_date?: string
  due_date?: string
  category?: string
  tags?: string[]
  background?: string
  description?: string
}

interface TaskCreationPanelProps {
  itemId: string
  directoryId: string
  position: number
  userId: string
  onSave: (task: Omit<Task, 'created_at' | 'updated_at'>) => void
  onCancel: () => void
}

function formatDateForInput(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function TaskCreationPanel({
  itemId,
  directoryId,
  position,
  userId,
  onSave,
  onCancel,
}: TaskCreationPanelProps) {
  const [fieldIndex, setFieldIndex] = useState(0)
  const [metadata, setMetadata] = useState<TaskCreationMetadata>({})
  const [errors, setErrors] = useState<Map<string, string>>(new Map())
  const titleInputRef = useRef<HTMLInputElement | null>(null) as React.MutableRefObject<HTMLInputElement | null>
  const fieldRefs = useRef<(HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null)[]>(
    []
  ) as React.MutableRefObject<(HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null)[]>

  useEffect(() => {
    titleInputRef.current?.focus()
  }, [])

  const updateMetadata = useCallback((key: TaskCreationField, value: string | string[] | undefined) => {
    setMetadata((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => {
      const next = new Map(prev)
      next.delete(key)
      return next
    })
  }, [])

  const trySave = useCallback(() => {
    setErrors(new Map())
    const title = (metadata.title ?? '').trim()
    const titleValidation = validateTaskTitle(title)
    if (!titleValidation.valid) {
      setErrors(new Map([['title', titleValidation.message]]))
      setFieldIndex(0)
      titleInputRef.current?.focus()
      return
    }

    const priorityResult = validatePriority(metadata.priority)
    const priority: TaskPriority | null = priorityResult.valid ? priorityResult.value : null

    const categoryResult = validateCategory(metadata.category)
    const category: string | null = categoryResult.valid && categoryResult.value ? categoryResult.value : null

    const startDateStr = (metadata.start_date ?? '').trim()
    const dueDateStr = (metadata.due_date ?? '').trim()
    const startParsed = parseDateInputWithConfidence(metadata.start_date ?? '')
    const dueParsed = parseDateInputWithConfidence(metadata.due_date ?? '')
    if (startDateStr !== '' && startParsed.confidence === 'low') {
      setErrors(new Map([['start_date', 'Could not understand that date. Try "tomorrow", "next friday", or "02/14/26".']]))
      setFieldIndex(2)
      setTimeout(() => fieldRefs.current[2]?.focus(), 0)
      return
    }
    if (dueDateStr !== '' && dueParsed.confidence === 'low') {
      setErrors(new Map([['due_date', 'Could not understand that date. Try "tomorrow", "next friday", or "02/14/26".']]))
      setFieldIndex(3)
      setTimeout(() => fieldRefs.current[3]?.focus(), 0)
      return
    }
    const startDate = parseDateInput(metadata.start_date ?? '')
    const dueDate = parseDateInput(metadata.due_date ?? '')
    const tags = Array.isArray(metadata.tags)
      ? metadata.tags
      : (metadata.tags ?? '')
          .toString()
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
    const bgIndex = metadata.background ? parseInt(metadata.background, 10) : NaN
    const background_color: string | null =
      !isNaN(bgIndex) && bgIndex >= 1 && bgIndex <= DEFAULT_BACKGROUND_PALETTE.length
        ? DEFAULT_BACKGROUND_PALETTE[bgIndex - 1]
        : null

    const task: Omit<Task, 'created_at' | 'updated_at'> = {
      id: itemId,
      title,
      directory_id: directoryId,
      priority,
      start_date: startDate ? formatDateForInput(startDate) : null,
      due_date: dueDate ? formatDateForInput(dueDate) : null,
      background_color,
      category,
      tags,
      description: (metadata.description ?? '').trim() || null,
      is_completed: false,
      completed_at: null,
      position,
      user_id: userId,
    }
    onSave(task)
  }, [metadata, itemId, directoryId, position, userId, onSave])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, fieldName: TaskCreationField) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
        return
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (fieldName === 'title') {
          trySave()
        } else {
          trySave()
        }
        return
      }
      if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault()
        const next = (fieldIndex + 1) % TASK_CREATION_FIELDS.length
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
        <span className="text-flow-dir font-flow-semibold text-flow-textPrimary">Create Task</span>
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
            value={metadata.title ?? ''}
            onChange={(e) => updateMetadata('title', e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 'title')}
            className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
            placeholder="Task title (min 3 characters)"
            data-keyboard-ignore
          />
          {errors.get('title') && (
            <p className="text-flow-error text-xs mt-1">{errors.get('title')}</p>
          )}
        </div>

        <div>
          <label className="block text-flow-meta text-flow-textSecondary mb-1">Priority (L/M/H)</label>
          <input
            ref={(el) => (fieldRefs.current[1] = el)}
            type="text"
            value={metadata.priority ?? ''}
            onChange={(e) => updateMetadata('priority', e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 'priority')}
            className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
            placeholder="L = Low, M = Medium, H = High"
            data-keyboard-ignore
          />
        </div>

        <DateInputField
          label="Start Date"
          value={metadata.start_date ?? ''}
          onChange={(v) => updateMetadata('start_date', v)}
          onKeyDown={(e) => handleKeyDown(e, 'start_date')}
          inputRefCallback={(el) => (fieldRefs.current[2] = el)}
          placeholder="e.g., tomorrow, next friday, 02/14/26"
        />

        <DateInputField
          label="Due Date"
          value={metadata.due_date ?? ''}
          onChange={(v) => updateMetadata('due_date', v)}
          onKeyDown={(e) => handleKeyDown(e, 'due_date')}
          inputRefCallback={(el) => (fieldRefs.current[3] = el)}
          placeholder="e.g., tomorrow, next friday, 02/14/26"
        />

        <div>
          <label className="block text-flow-meta text-flow-textSecondary mb-1">Category</label>
          <select
            ref={(el) => (fieldRefs.current[4] = el)}
            value={metadata.category ?? ''}
            onChange={(e) => updateMetadata('category', e.target.value)}
            onKeyDown={(e) => handleKeyDown(e as unknown as React.KeyboardEvent, 'category')}
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
            value={Array.isArray(metadata.tags) ? metadata.tags.join(', ') : (metadata.tags ?? '')}
            onChange={(e) => updateMetadata('tags', e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 'tags')}
            className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
            placeholder="Comma-separated"
            data-keyboard-ignore
          />
        </div>

        <div>
          <label className="block text-flow-meta text-flow-textSecondary mb-1">Background (1–6)</label>
          <input
            ref={(el) => (fieldRefs.current[6] = el)}
            type="text"
            value={metadata.background ?? ''}
            onChange={(e) => updateMetadata('background', e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 'background')}
            className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
            placeholder="1–6"
            data-keyboard-ignore
          />
        </div>

        <div>
          <label className="block text-flow-meta text-flow-textSecondary mb-1">Description</label>
          <textarea
            ref={(el) => (fieldRefs.current[7] = el)}
            value={metadata.description ?? ''}
            onChange={(e) => updateMetadata('description', e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 'description')}
            className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm min-h-[60px]"
            placeholder="Optional"
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
