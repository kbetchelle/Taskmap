import { useCallback } from 'react'
import type { Task } from '../../types'
import { EXPANDED_PANEL_WIDTH_PX } from '../../lib/theme'
import { ExpandedTaskPanelContent } from './ExpandedTaskPanelContent'

export interface ExpandedTaskPanelProps {
  task: Task
  onClose: () => void
  onEdit: () => void
  onAddAttachmentRef?: (trigger: () => void) => void
  onOpenAllAttachmentsRef?: (trigger: () => void) => void
  onTaskUpdated?: (updates: { actual_duration_minutes: number }) => void
}

export function ExpandedTaskPanel({
  task,
  onClose,
  onEdit,
  onAddAttachmentRef,
  onOpenAllAttachmentsRef,
  onTaskUpdated,
}: ExpandedTaskPanelProps) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    },
    [onClose]
  )

  return (
    <section
      className="flex flex-col flex-shrink-0 border-r border-flow-columnBorder bg-flow-background overflow-y-auto"
      style={{
        width: EXPANDED_PANEL_WIDTH_PX,
        minWidth: EXPANDED_PANEL_WIDTH_PX,
        maxWidth: EXPANDED_PANEL_WIDTH_PX,
        height: '100%',
        scrollSnapAlign: 'start',
      }}
      role="region"
      aria-label="Task details"
      onKeyDown={handleKeyDown}
    >
      <ExpandedTaskPanelContent
        task={task}
        onClose={onClose}
        onEdit={onEdit}
        onAddAttachmentRef={onAddAttachmentRef}
        onOpenAllAttachmentsRef={onOpenAllAttachmentsRef}
        onTaskUpdated={onTaskUpdated}
      />
    </section>
  )
}
