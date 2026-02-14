import { useState, useCallback } from 'react'

interface DirectoryFieldsProps {
  startDate: string
  onStartDateChange: (d: string) => void
  dueDate: string
  onDueDateChange: (d: string) => void
}

export function DirectoryFields({
  startDate,
  onStartDateChange,
  dueDate,
  onDueDateChange,
}: DirectoryFieldsProps) {
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
          <div className="flex flex-col gap-1">
            <label className="text-flow-meta text-flow-textSecondary font-flow-medium">Start Date</label>
            <input
              type="date"
              className="px-3 py-1.5 text-sm border border-flow-columnBorder rounded-md bg-flow-background text-flow-textPrimary focus:outline-none focus:border-flow-focus"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-flow-meta text-flow-textSecondary font-flow-medium">Due Date</label>
            <input
              type="date"
              className="px-3 py-1.5 text-sm border border-flow-columnBorder rounded-md bg-flow-background text-flow-textPrimary focus:outline-none focus:border-flow-focus"
              value={dueDate}
              onChange={(e) => onDueDateChange(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
