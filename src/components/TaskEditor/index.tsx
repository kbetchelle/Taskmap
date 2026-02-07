import type { Task } from '../../types'
import { formatDate } from '../../lib/utils'

interface TaskEditorProps {
  task: Task
  onClose?: () => void
}

export function TaskEditor({ task, onClose }: TaskEditorProps) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="text-base font-medium text-neutral-900">{task.title}</h3>
        {onClose != null && (
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-700 text-sm"
            aria-label="Close"
          >
            Close
          </button>
        )}
      </div>
      <dl className="space-y-2 text-sm">
        {task.priority != null && (
          <div>
            <dt className="text-neutral-500">Priority</dt>
            <dd className="text-neutral-900">{task.priority}</dd>
          </div>
        )}
        {task.start_date != null && (
          <div>
            <dt className="text-neutral-500">Start</dt>
            <dd className="text-neutral-900">{formatDate(task.start_date)}</dd>
          </div>
        )}
        {task.due_date != null && (
          <div>
            <dt className="text-neutral-500">Due</dt>
            <dd className="text-neutral-900">{formatDate(task.due_date)}</dd>
          </div>
        )}
        {task.category != null && (
          <div>
            <dt className="text-neutral-500">Category</dt>
            <dd className="text-neutral-900">{task.category}</dd>
          </div>
        )}
        {task.description != null && task.description !== '' && (
          <div>
            <dt className="text-neutral-500">Description</dt>
            <dd className="text-neutral-900 whitespace-pre-wrap">{task.description}</dd>
          </div>
        )}
      </dl>
    </div>
  )
}
