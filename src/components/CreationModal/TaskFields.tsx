import { useState, useCallback } from 'react'
import { STATUS_ORDER, getStatusLabel, getStatusColor } from '../../lib/statusUtils'
import type { TaskPriority, TaskStatus } from '../../types/database'

interface TaskFieldsProps {
  status: TaskStatus
  onStatusChange: (s: TaskStatus) => void
  priority: TaskPriority | null
  onPriorityChange: (p: TaskPriority | null) => void
  dueDate: string
  onDueDateChange: (d: string) => void
  description: string
  onDescriptionChange: (d: string) => void
  tags: string
  onTagsChange: (t: string) => void
  category: string
  onCategoryChange: (c: string) => void
}

const PRIORITIES: { value: TaskPriority | null; label: string }[] = [
  { value: 'HIGH', label: 'High' },
  { value: 'MED', label: 'Med' },
  { value: 'LOW', label: 'Low' },
  { value: null, label: 'None' },
]

export function TaskFields({
  status,
  onStatusChange,
  priority,
  onPriorityChange,
  dueDate,
  onDueDateChange,
  description,
  onDescriptionChange,
  tags,
  onTagsChange,
  category,
  onCategoryChange,
}: TaskFieldsProps) {
  const [expanded, setExpanded] = useState(false)

  const toggle = useCallback(() => setExpanded((p) => !p), [])

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        className="flex items-center gap-1 text-flow-meta text-flow-focus font-flow-medium hover:underline self-start"
        onClick={toggle}
      >
        <span className={`transition-transform ${expanded ? 'rotate-90' : ''}`}>&#x25B6;</span>
        {expanded ? 'Less options' : 'More options'}
      </button>

      {expanded && (
        <div className="flex flex-col gap-3 pl-1">
          {/* Status */}
          <div className="flex flex-col gap-1">
            <label className="text-flow-meta text-flow-textSecondary font-flow-medium">Status</label>
            <div className="flex gap-1">
              {STATUS_ORDER.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-colors ${
                    status === s
                      ? 'bg-flow-focus/10 text-flow-textPrimary font-flow-medium ring-1 ring-flow-focus/30'
                      : 'text-flow-textSecondary hover:bg-flow-hover'
                  }`}
                  onClick={() => onStatusChange(s)}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: getStatusColor(s) }}
                  />
                  <span className="hidden sm:inline">{getStatusLabel(s)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div className="flex flex-col gap-1">
            <label className="text-flow-meta text-flow-textSecondary font-flow-medium">Priority</label>
            <div className="flex gap-1">
              {PRIORITIES.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                    priority === p.value
                      ? 'bg-flow-focus/10 text-flow-textPrimary font-flow-medium ring-1 ring-flow-focus/30'
                      : 'text-flow-textSecondary hover:bg-flow-hover'
                  }`}
                  onClick={() => onPriorityChange(p.value)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Due date */}
          <div className="flex flex-col gap-1">
            <label className="text-flow-meta text-flow-textSecondary font-flow-medium">Due Date</label>
            <input
              type="date"
              className="px-3 py-1.5 text-sm border border-flow-columnBorder rounded-md bg-flow-background text-flow-textPrimary focus:outline-none focus:border-flow-focus"
              value={dueDate}
              onChange={(e) => onDueDateChange(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1">
            <label className="text-flow-meta text-flow-textSecondary font-flow-medium">Description</label>
            <textarea
              className="px-3 py-2 text-sm border border-flow-columnBorder rounded-md bg-flow-background text-flow-textPrimary placeholder:text-flow-textDisabled focus:outline-none focus:border-flow-focus resize-none"
              rows={3}
              placeholder="Add a description..."
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
            />
          </div>

          {/* Tags */}
          <div className="flex flex-col gap-1">
            <label className="text-flow-meta text-flow-textSecondary font-flow-medium">Tags</label>
            <input
              type="text"
              className="px-3 py-1.5 text-sm border border-flow-columnBorder rounded-md bg-flow-background text-flow-textPrimary placeholder:text-flow-textDisabled focus:outline-none focus:border-flow-focus"
              placeholder="Comma-separated tags"
              value={tags}
              onChange={(e) => onTagsChange(e.target.value)}
            />
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1">
            <label className="text-flow-meta text-flow-textSecondary font-flow-medium">Category</label>
            <input
              type="text"
              className="px-3 py-1.5 text-sm border border-flow-columnBorder rounded-md bg-flow-background text-flow-textPrimary placeholder:text-flow-textDisabled focus:outline-none focus:border-flow-focus"
              placeholder="Category name"
              value={category}
              onChange={(e) => onCategoryChange(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
