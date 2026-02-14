import { useCallback } from 'react'
import type { TaskLink } from '../../types/links'
import type { Task } from '../../types'
import { StatusIcon } from '../StatusIcon'

interface LinkedItemProps {
  link: TaskLink
  linkedTask: Task | undefined
  direction: 'outgoing' | 'incoming'
  onNavigate: (taskId: string) => void
  onRemove: (linkId: string) => void
}

export function LinkedItem({
  link,
  linkedTask,
  direction,
  onNavigate,
  onRemove,
}: LinkedItemProps) {
  const handleNavigate = useCallback(() => {
    const targetId = direction === 'outgoing' ? link.target_id : link.source_id
    onNavigate(targetId)
  }, [link, direction, onNavigate])

  const handleRemove = useCallback(() => {
    onRemove(link.id)
  }, [link.id, onRemove])

  if (!linkedTask) return null

  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-flow-hover transition-colors group">
      <StatusIcon status={linkedTask.status} size={14} />
      <button
        className="flex-1 text-left text-flow-task text-flow-textPrimary truncate hover:underline"
        onClick={handleNavigate}
        title={linkedTask.title}
      >
        {linkedTask.title}
      </button>
      <span
        className={`flex-shrink-0 rounded px-1.5 py-0.5 text-flow-meta ${
          link.link_type === 'dependency'
            ? 'text-orange-600 bg-orange-50'
            : 'text-flow-textSecondary bg-flow-surface'
        }`}
      >
        {link.link_type === 'dependency' ? 'Dependency' : 'Reference'}
      </span>
      <button
        className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-flow-textSecondary hover:text-flow-error transition-opacity text-sm px-1"
        onClick={handleRemove}
        title="Remove link"
        aria-label="Remove link"
      >
        &times;
      </button>
    </div>
  )
}
