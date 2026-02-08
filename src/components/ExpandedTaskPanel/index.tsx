import { useState, useEffect, useCallback, useRef } from 'react'
import type { Task, TaskAttachment } from '../../types'
import type { TaskPriority } from '../../types'
import { getDirectoryPath } from '../../api/directories'
import { listAttachments, addAttachments, removeAttachment, openAttachment } from '../../api/attachments'
import {
  isOverdue,
  formatDateNatural,
  formatDateTimeNatural,
  formatRelativeTime,
  formatFileSize,
} from '../../lib/utils/dateFormat'
import { formatRecurrence } from '../../lib/recurrence'
import {
  formatPriority,
  getPriorityIcon,
  getPriorityColor,
  getCategoryName,
  getCategoryColor,
} from '../../lib/utils/priorityCategory'
import { getFileIcon } from '../../lib/utils/fileIcons'
import { EXPANDED_PANEL_WIDTH_PX } from '../../lib/theme'
import { useAppContext } from '../../contexts/AppContext'
import { useSettingsStore } from '../../stores/settingsStore'
import { useFeedbackStore } from '../../stores/feedbackStore'
import { MAX_ATTACHMENT_FILE_SIZE } from '../../lib/constants'

// --- MetadataField ---
interface MetadataFieldProps {
  label: string
  value: string
  icon?: string
  color?: string
  isOverdue?: boolean
  secondary?: boolean
}

function MetadataField({ label, value, icon, color, isOverdue: isOverdueProp, secondary }: MetadataFieldProps) {
  return (
    <div
      className={`flex justify-between items-center py-2 ${
        secondary ? 'opacity-60' : ''
      } ${isOverdueProp ? '' : ''}`}
    >
      <div className="flex items-center gap-1.5 text-flow-meta text-flow-textSecondary text-sm">
        {icon != null && <span className="text-base">{icon}</span>}
        <span>{label}</span>
      </div>
      <div
        className={`text-sm font-flow-medium flex items-center gap-1.5 ${
          isOverdueProp ? 'text-flow-error font-semibold' : ''
        }`}
        style={color && !isOverdueProp ? { color } : undefined}
      >
        {isOverdueProp && (
          <span
            className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-flow-error text-white text-xs font-bold"
            aria-hidden
          >
            !
          </span>
        )}
        {value}
      </div>
    </div>
  )
}

// --- AttachmentList & AttachmentItem ---
interface AttachmentListProps {
  taskId: string
  onAddAttachment: () => void
  onOpenAll?: () => void
  refreshKey?: number
  onAttachmentsLoaded?: (attachments: TaskAttachment[]) => void
}

function AttachmentList({
  taskId,
  onAddAttachment,
  onOpenAll,
  refreshKey = 0,
  onAttachmentsLoaded,
}: AttachmentListProps) {
  const [attachments, setAttachments] = useState<TaskAttachment[]>([])
  const [loading, setLoading] = useState(true)
  const showError = useFeedbackStore((s) => s.showError)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listAttachments(taskId)
      setAttachments(data)
      onAttachmentsLoaded?.(data)
    } finally {
      setLoading(false)
    }
  }, [taskId, onAttachmentsLoaded])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  const handleRemove = useCallback(
    async (attachmentId: string) => {
      if (!window.confirm('Remove this attachment?')) return
      try {
        await removeAttachment(attachmentId)
        load()
      } catch {
        showError('Failed to remove attachment')
      }
    },
    [load, showError]
  )

  const handleOpen = useCallback(
    async (attachment: TaskAttachment) => {
      try {
        await openAttachment(attachment)
      } catch {
        showError('Could not open attachment')
      }
    },
    [showError]
  )

  if (loading) {
    return <div className="text-flow-meta text-flow-textSecondary text-sm py-2">Loading attachments...</div>
  }

  return (
    <div className="flex flex-col gap-3">
      {attachments.length === 0 ? (
        <div className="flex flex-col items-center gap-3 p-5 bg-neutral-50 border border-dashed border-flow-columnBorder rounded-lg text-center">
          <p className="m-0 text-flow-textSecondary text-sm">No attachments</p>
          <button
            type="button"
            onClick={onAddAttachment}
            className="text-sm font-flow-medium border border-flow-columnBorder rounded-md px-3 py-2 bg-white hover:bg-neutral-50 transition-colors"
          >
            Add Attachment (Cmd+Shift+F)
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {attachments.map((att) => (
              <AttachmentItem
                key={att.id}
                attachment={att}
                onOpen={() => handleOpen(att)}
                onRemove={() => handleRemove(att.id)}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onAddAttachment}
              className="text-xs font-flow-medium text-[#007AFF] border border-flow-columnBorder rounded-md px-3 py-2 bg-transparent hover:bg-neutral-50 transition-colors"
            >
              + Add More
            </button>
            {onOpenAll && attachments.length > 1 && (
              <button
                type="button"
                onClick={onOpenAll}
                className="text-xs font-flow-medium text-flow-textSecondary border border-flow-columnBorder rounded-md px-3 py-2 bg-transparent hover:bg-neutral-50"
              >
                Open all (Cmd+Shift+O)
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

interface AttachmentItemProps {
  attachment: TaskAttachment
  onOpen: () => void
  onRemove: () => void
}

function AttachmentItem({ attachment, onOpen, onRemove }: AttachmentItemProps) {
  const sizeStr = attachment.file_size != null ? formatFileSize(attachment.file_size) : ''
  const meta = [sizeStr, formatRelativeTime(attachment.created_at)].filter(Boolean).join(' • ')
  return (
    <div className="flex items-center gap-3 p-2.5 bg-neutral-50 rounded-md hover:bg-neutral-100 transition-colors">
      <div className="text-2xl flex-shrink-0">{getFileIcon(attachment.file_type)}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-flow-medium text-flow-textPrimary truncate">{attachment.file_name}</div>
        {meta && <div className="text-[11px] text-flow-textSecondary mt-0.5">{meta}</div>}
      </div>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={onOpen}
          title="Open"
          className="w-7 h-7 flex items-center justify-center rounded border-0 bg-transparent hover:bg-flow-columnBorder text-sm transition-colors"
        >
          📂
        </button>
        <button
          type="button"
          onClick={onRemove}
          title="Remove"
          className="w-7 h-7 flex items-center justify-center rounded border-0 bg-transparent hover:bg-flow-columnBorder text-sm transition-colors"
        >
          🗑️
        </button>
      </div>
    </div>
  )
}

// --- ExpandedTaskPanel ---
export interface ExpandedTaskPanelProps {
  task: Task
  onClose: () => void
  onEdit: () => void
  onAddAttachmentRef?: (trigger: () => void) => void
  onOpenAllAttachmentsRef?: (trigger: () => void) => void
}

export function ExpandedTaskPanel({
  task,
  onClose,
  onEdit,
  onAddAttachmentRef,
  onOpenAllAttachmentsRef,
}: ExpandedTaskPanelProps) {
  const { userId } = useAppContext()
  const [locationPath, setLocationPath] = useState<string[]>([])
  const [locationLoading, setLocationLoading] = useState(true)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [attachments, setAttachments] = useState<TaskAttachment[]>([])
  const [attachmentRefreshKey, setAttachmentRefreshKey] = useState(0)
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    let cancelled = false
    getDirectoryPath(task.directory_id).then(
      (path) => {
        if (!cancelled) {
          setLocationPath(path)
        }
      },
      () => {
        if (!cancelled) setLocationPath([])
      }
    ).finally(() => {
      if (!cancelled) setLocationLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [task.directory_id])

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const showError = useFeedbackStore((s) => s.showError)
  const showInfo = useFeedbackStore((s) => s.showInfo)
  const showSuccess = useFeedbackStore((s) => s.showSuccess)
  const openAllAttachments = useCallback(() => {
    attachments.forEach((att) => {
      openAttachment(att).catch(() => showError('Could not open attachment'))
    })
  }, [attachments, showError])

  useEffect(() => {
    onAddAttachmentRef?.(triggerFileInput)
  }, [onAddAttachmentRef, triggerFileInput])
  useEffect(() => {
    onOpenAllAttachmentsRef?.(openAllAttachments)
  }, [onOpenAllAttachmentsRef, openAllAttachments])

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files || files.length === 0 || !userId) return
      e.target.value = ''
      const fileList = Array.from(files)
      const oversized = fileList.filter((f) => f.size > MAX_ATTACHMENT_FILE_SIZE)
      if (oversized.length > 0) {
        showError(
          `These files are too large (max 50MB): ${oversized.map((f) => f.name).join(', ')}`
        )
        return
      }
      showInfo('Uploading files...')
      try {
        const uploaded = await addAttachments(task.id, userId, fileList)
        setAttachmentRefreshKey((k) => k + 1)
        showSuccess(
          `Uploaded ${uploaded.length} file${uploaded.length !== 1 ? 's' : ''}`
        )
      } catch (err) {
        showError(err instanceof Error ? err.message : 'Upload failed')
      }
    },
    [task.id, userId, showError, showInfo, showSuccess]
  )

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const files = e.dataTransfer?.files
      if (!files || files.length === 0 || !userId) return
      const fileList = Array.from(files)
      const oversized = fileList.filter((f) => f.size > MAX_ATTACHMENT_FILE_SIZE)
      if (oversized.length > 0) {
        showError(
          `These files are too large (max 50MB): ${oversized.map((f) => f.name).join(', ')}`
        )
        return
      }
      showInfo('Uploading files...')
      try {
        const uploaded = await addAttachments(task.id, userId, fileList)
        setAttachmentRefreshKey((k) => k + 1)
        showSuccess(
          `Uploaded ${uploaded.length} file${uploaded.length !== 1 ? 's' : ''}`
        )
      } catch (err) {
        showError(err instanceof Error ? err.message : 'Upload failed')
      }
    },
    [task.id, userId, showError, showInfo, showSuccess]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    },
    [onClose]
  )

  const dueOverdue = task.due_date ? isOverdue(task.due_date) : false
  const settings = useSettingsStore((s) => s.settings)
  const categoryColor = task.category ? getCategoryColor(task.category, settings) : null

  return (
    <section
      className={`flex flex-col flex-shrink-0 border-r border-flow-columnBorder bg-flow-background overflow-y-auto transition-colors ${
        dragOver ? 'bg-green-50 border-green-400' : ''
      }`}
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
      onDragEnter={handleDragOver}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileChange}
        aria-hidden
      />

      <div className="flex flex-col gap-5 p-6 flex-1">
        {/* Header */}
        <div className="flex flex-col gap-2 pb-4 border-b border-flow-columnBorder">
          <h2 className="text-lg font-semibold text-flow-textPrimary m-0 leading-snug">{task.title}</h2>
          {task.is_completed && (
            <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded self-start">
              ✓ Completed
            </span>
          )}
        </div>

        {/* Metadata */}
        <div className="flex flex-col gap-5 flex-1">
          {task.priority && (
            <MetadataField
              label="Priority"
              value={formatPriority(task.priority as TaskPriority)}
              icon={getPriorityIcon(task.priority as TaskPriority)}
              color={getPriorityColor(task.priority as TaskPriority, settings)}
            />
          )}

          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-flow-textSecondary m-0">Dates</h3>
            {task.start_date && (
              <MetadataField label="Start" value={formatDateNatural(task.start_date)} icon="📅" />
            )}
            {task.due_date && (
              <MetadataField
                label="Due"
                value={formatDateNatural(task.due_date)}
                icon="🎯"
                isOverdue={dueOverdue}
              />
            )}
            {task.recurrence_pattern && (
              <MetadataField
                label="Repeats"
                value={formatRecurrence(task.recurrence_pattern)}
                icon="🔄"
              />
            )}
            <MetadataField
              label="Created"
              value={formatDateTimeNatural(task.created_at)}
              icon="🕐"
              secondary
            />
            <MetadataField
              label="Updated"
              value={formatDateTimeNatural(task.updated_at)}
              icon="✏️"
              secondary
            />
          </div>

          {task.category && (
            <MetadataField
              label="Category"
              value={getCategoryName(task.category, settings)}
              icon="📁"
              color={categoryColor ?? undefined}
            />
          )}

          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-flow-textSecondary m-0">Tags</h3>
              <div className="flex flex-wrap gap-1.5">
                {task.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 bg-neutral-100 text-flow-textPrimary text-xs font-medium rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {task.description && (
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-flow-textSecondary m-0">
                Description
              </h3>
              <p className="text-sm leading-relaxed text-flow-textPrimary m-0 whitespace-pre-wrap">
                {task.description}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-flow-textSecondary m-0">
              Attachments
            </h3>
            <AttachmentList
              taskId={task.id}
              onAddAttachment={triggerFileInput}
              onOpenAll={attachments.length > 1 ? openAllAttachments : undefined}
              refreshKey={attachmentRefreshKey}
              onAttachmentsLoaded={setAttachments}
            />
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-flow-textSecondary m-0">Location</h3>
            <div className="text-[13px] text-flow-textSecondary font-mono">
              {locationLoading ? '…' : locationPath.length === 0 ? 'Root' : locationPath.join(' › ')}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 pt-4 border-t border-flow-columnBorder">
          <button
            type="button"
            onClick={onEdit}
            className="flex-1 py-2.5 px-4 text-sm font-medium border border-flow-columnBorder rounded-md bg-white text-flow-textPrimary hover:bg-neutral-50 transition-colors focus:outline-none focus:ring-2 focus:ring-flow-focus focus:ring-offset-2"
          >
            Edit (Cmd+Shift+E)
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 text-sm font-medium border border-flow-columnBorder rounded-md bg-white text-flow-textPrimary hover:bg-neutral-50 transition-colors focus:outline-none focus:ring-2 focus:ring-flow-focus focus:ring-offset-2"
          >
            Close (Esc)
          </button>
        </div>
      </div>
    </section>
  )
}
