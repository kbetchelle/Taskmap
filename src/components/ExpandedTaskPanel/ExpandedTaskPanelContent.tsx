import { useState, useEffect, useCallback, useRef } from 'react'
import type { Task, TaskAttachment, TaskStatus, RecurringTask } from '../../types'
import type { TaskPriority } from '../../types'
import { getDirectoryPath } from '../../api/directories'
import { listAttachments, addAttachments, removeAttachment, openAttachment } from '../../api/attachments'
import { createNextRecurrence } from '../../api/tasks'
import {
  isOverdue,
  formatDateNatural,
  formatDateTimeNatural,
  formatRelativeTime,
  formatFileSize,
} from '../../lib/utils/dateFormat'
import { formatRecurrence } from '../../lib/recurrence'
import { TimeTrackingSection } from '../TimeTrackingSection'
import { ChecklistSection } from '../ChecklistSection'
import { useTaskStore } from '../../stores/taskStore'
import {
  formatPriority,
  getPriorityIcon,
  getPriorityColor,
  getCategoryName,
  getCategoryColor,
} from '../../lib/utils/priorityCategory'
import { getFileIcon } from '../../lib/utils/fileIcons'
import { useAppContext } from '../../contexts/AppContext'
import { useFeedbackStore } from '../../stores/feedbackStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { MAX_ATTACHMENT_FILE_SIZE } from '../../lib/constants'
import { ContentEditor } from '../ContentEditor'
import { StatusIcon } from '../StatusIcon'
import { LinkedReferences } from '../LinkedReferences'
import { StatusDropdown } from '../StatusDropdown'
import { getNextStatus, getStatusLabel, getAutoArchiveCountdown, deriveCompletionFields } from '../../lib/statusUtils'
import { useReadOnly } from '../../hooks/useReadOnly'

interface MetadataFieldProps {
  label: string
  value: string
  icon?: string
  color?: string
  isOverdue?: boolean
  secondary?: boolean
}

function MetadataField({
  label,
  value,
  icon,
  color,
  isOverdue: isOverdueProp,
  secondary,
}: MetadataFieldProps) {
  return (
    <div
      className={`flex justify-between items-center py-2 ${secondary ? 'opacity-60' : ''} ${
        isOverdueProp ? '' : ''
      }`}
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

/** Status row with interactive StatusIcon and dropdown */
function ExpandedStatusRow({
  task,
  updateTask,
}: {
  task: Task
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 })

  /** After a status change to 'completed', create the next recurrence if applicable. */
  const handleRecurrence = useCallback(async (completedTask: Task) => {
    if (!completedTask.recurrence_pattern) return
    try {
      const nextTask = await createNextRecurrence(completedTask as RecurringTask)
      if (nextTask) {
        const currentTasks = useTaskStore.getState().tasks
        useTaskStore.getState().setTasks([...currentTasks, nextTask])
        useFeedbackStore.getState().showSuccess('Created next occurrence')
      }
    } catch {
      useFeedbackStore.getState().showError('Failed to create next occurrence')
    }
  }, [])

  const handleClick = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()
      const next = getNextStatus(task.status)
      const derived = deriveCompletionFields(next, task.completed_at)
      await updateTask(task.id, { status: next, ...derived })
      if (next === 'completed') {
        await handleRecurrence(task)
      }
    },
    [task, updateTask, handleRecurrence]
  )

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDropdownPos({ top: e.clientY, left: e.clientX })
    setDropdownOpen(true)
  }, [])

  const handleSelect = useCallback(
    async (status: TaskStatus) => {
      const derived = deriveCompletionFields(status, task.completed_at)
      await updateTask(task.id, { status, ...derived })
      if (status === 'completed') {
        await handleRecurrence(task)
      }
      setDropdownOpen(false)
    },
    [task, updateTask, handleRecurrence]
  )

  const archiveCountdown = task.status === 'completed' ? getAutoArchiveCountdown(task.completed_at) : null

  return (
    <>
      <div className="flex items-center gap-2 self-start">
        <StatusIcon
          status={task.status}
          size={18}
          onClick={handleClick}
          onContextMenu={handleContextMenu}
        />
        <span className="text-sm font-flow-medium text-flow-textPrimary">
          {getStatusLabel(task.status)}
        </span>
        {archiveCountdown && (
          <span className="text-flow-meta text-flow-textSecondary ml-1">{archiveCountdown}</span>
        )}
      </div>
      {dropdownOpen && (
        <StatusDropdown
          currentStatus={task.status}
          onSelect={handleSelect}
          onClose={() => setDropdownOpen(false)}
          anchorPosition={dropdownPos}
        />
      )}
    </>
  )
}

/** Priority row with click-to-cycle */
function ExpandedPriorityRow({
  task,
  updateTask,
  settings,
}: {
  task: Task
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>
  settings: ReturnType<typeof useSettingsStore.getState>['settings']
}) {
  const cycle: (TaskPriority | null)[] = ['HIGH', 'MED', 'LOW', null]
  const handleCycle = useCallback(async () => {
    const currentIdx = cycle.indexOf(task.priority)
    const next = cycle[(currentIdx + 1) % cycle.length]
    await updateTask(task.id, { priority: next })
  }, [task, updateTask])

  if (!task.priority) {
    return (
      <button
        onClick={handleCycle}
        className="text-flow-meta text-flow-textSecondary hover:text-flow-textPrimary transition-colors text-left"
      >
        + Set priority
      </button>
    )
  }

  return (
    <button onClick={handleCycle} className="w-full text-left">
      <MetadataField
        label="Priority"
        value={formatPriority(task.priority as TaskPriority)}
        icon={getPriorityIcon(task.priority as TaskPriority)}
        color={getPriorityColor(task.priority as TaskPriority, settings)}
      />
    </button>
  )
}

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
    return (
      <div className="text-flow-meta text-flow-textSecondary text-sm py-2">
        Loading attachments...
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {attachments.length === 0 ? (
        <div className="flex flex-col items-center gap-3 p-5 bg-flow-surface border border-dashed border-flow-columnBorder rounded-lg text-center">
          <p className="m-0 text-flow-textSecondary text-sm">No attachments</p>
          <button
            type="button"
            onClick={onAddAttachment}
            className="text-sm font-flow-medium border border-flow-columnBorder rounded-md px-3 py-2 bg-flow-background hover:bg-flow-hover transition-colors"
          >
            Add Attachment (Cmd+Shift+F)
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-3 p-2.5 bg-flow-surface rounded-md hover:bg-flow-hover transition-colors"
              >
                <div className="text-2xl flex-shrink-0">{getFileIcon(att.file_type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-flow-medium text-flow-textPrimary truncate">
                    {att.file_name}
                  </div>
                  {((att.file_size != null ? formatFileSize(att.file_size) : '') ||
                    formatRelativeTime(att.created_at)) && (
                  <div className="text-[11px] text-flow-textSecondary mt-0.5">
                    {[att.file_size != null ? formatFileSize(att.file_size) : '', formatRelativeTime(att.created_at)]
                      .filter(Boolean)
                      .join(' • ')}
                  </div>
                )}
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpen(att)}
                    title="Open"
                    className="w-7 h-7 flex items-center justify-center rounded border-0 bg-transparent hover:bg-flow-columnBorder text-sm transition-colors"
                  >
                    📂
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(att.id)}
                    title="Remove"
                    className="w-7 h-7 flex items-center justify-center rounded border-0 bg-transparent hover:bg-flow-columnBorder text-sm transition-colors"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onAddAttachment}
              className="text-xs font-flow-medium text-flow-focus border border-flow-columnBorder rounded-md px-3 py-2 bg-transparent hover:bg-flow-hover transition-colors"
            >
              + Add More
            </button>
            {onOpenAll && attachments.length > 1 && (
              <button
                type="button"
                onClick={onOpenAll}
                className="text-xs font-flow-medium text-flow-textSecondary border border-flow-columnBorder rounded-md px-3 py-2 bg-transparent hover:bg-flow-hover"
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

export interface ExpandedTaskPanelContentProps {
  task: Task
  onClose: () => void
  onEdit: () => void
  onAddAttachmentRef?: (trigger: () => void) => void
  onOpenAllAttachmentsRef?: (trigger: () => void) => void
  onTaskUpdated?: (updates: { actual_duration_minutes: number }) => void
  mobile?: boolean
}

export function ExpandedTaskPanelContent({
  task,
  onClose,
  onEdit,
  onAddAttachmentRef,
  onOpenAllAttachmentsRef,
  onTaskUpdated,
  mobile = false,
}: ExpandedTaskPanelContentProps) {
  const { isReadOnly } = useReadOnly()
  const { userId } = useAppContext()
  const [locationPath, setLocationPath] = useState<string[]>([])
  const [locationLoading, setLocationLoading] = useState(true)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [attachments, setAttachments] = useState<TaskAttachment[]>([])
  const [attachmentRefreshKey, setAttachmentRefreshKey] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const showError = useFeedbackStore((s) => s.showError)
  const showInfo = useFeedbackStore((s) => s.showInfo)
  const showSuccess = useFeedbackStore((s) => s.showSuccess)
  const updateTask = useTaskStore((s) => s.updateTask)
  const settings = useSettingsStore((s) => s.settings)

  const handleDescriptionSave = useCallback(
    async (html: string) => {
      await updateTask(task.id, { description: html || null })
    },
    [updateTask, task.id]
  )

  useEffect(() => {
    let cancelled = false
    getDirectoryPath(task.directory_id).then(
      (path) => {
        if (!cancelled) setLocationPath(path)
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

  const handleFiles = useCallback(
    async (files: FileList | null) => {
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
        await addAttachments(task.id, userId, fileList)
        setAttachmentRefreshKey((k) => k + 1)
        showSuccess(`Uploaded ${fileList.length} file${fileList.length !== 1 ? 's' : ''}`)
      } catch (err) {
        showError(err instanceof Error ? err.message : 'Upload failed')
      }
    },
    [task.id, userId, showError, showInfo, showSuccess]
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files)
      e.target.value = ''
    },
    [handleFiles]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      handleFiles(e.dataTransfer?.files ?? null)
    },
    [handleFiles]
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

  const dueOverdue = task.due_date ? isOverdue(task.due_date) : false
  const categoryColor = task.category ? getCategoryColor(task.category, settings) : null

  return (
    <div
      onDragEnter={handleDragOver}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={dragOver ? 'bg-green-50 border-green-400' : ''}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileChange}
        aria-hidden
      />
      <div className={`flex flex-col gap-5 flex-1 ${mobile ? 'p-4' : 'p-6'}`}>
        <div className="flex flex-col gap-2 pb-4 border-b border-flow-columnBorder">
          <h2 className="text-lg font-semibold text-flow-textPrimary m-0 leading-snug">
            {task.title}
          </h2>
          <ExpandedStatusRow task={task} updateTask={updateTask} />
        </div>
        <div className="flex flex-col gap-5 flex-1">
          <ExpandedPriorityRow task={task} updateTask={updateTask} settings={settings} />
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-flow-textSecondary m-0">
              Dates
            </h3>
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
              <h3 className="text-xs font-semibold uppercase tracking-wide text-flow-textSecondary m-0">
                Tags
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {task.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 bg-flow-surface text-flow-textPrimary text-xs font-medium rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-flow-textSecondary m-0">
              Description
            </h3>
            <ContentEditor
              initialContent={task.description}
              taskId={task.id}
              onSave={handleDescriptionSave}
            />
          </div>
          <LinkedReferences taskId={task.id} />
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
          <ChecklistSection
            task={task}
            onUpdate={(items) => updateTask(task.id, { checklist_items: items })}
          />
          <TimeTrackingSection task={task} onTaskUpdated={onTaskUpdated} />
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-flow-textSecondary m-0">
              Location
            </h3>
            <div className="text-[13px] text-flow-textSecondary font-mono">
              {locationLoading ? '…' : locationPath.length === 0 ? 'Home' : locationPath.join(' › ')}
            </div>
          </div>
        </div>
        <div className="flex gap-2 pt-4 border-t border-flow-columnBorder">
          <button
            type="button"
            onClick={isReadOnly ? undefined : onEdit}
            disabled={isReadOnly}
            className={`flex-1 py-2.5 px-4 text-sm font-medium border border-flow-columnBorder rounded-md bg-flow-background text-flow-textPrimary transition-colors focus:outline-none focus:ring-2 focus:ring-flow-focus focus:ring-offset-2 ${isReadOnly ? 'opacity-50 cursor-not-allowed' : 'hover:bg-flow-hover'}`}
            data-write-action=""
          >
            {mobile ? 'Edit' : 'Edit (Cmd+Shift+E)'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 text-sm font-medium border border-flow-columnBorder rounded-md bg-flow-background text-flow-textPrimary hover:bg-flow-hover transition-colors focus:outline-none focus:ring-2 focus:ring-flow-focus focus:ring-offset-2"
          >
            {mobile ? 'Close' : 'Close (Esc)'}
          </button>
        </div>
      </div>
    </div>
  )
}
