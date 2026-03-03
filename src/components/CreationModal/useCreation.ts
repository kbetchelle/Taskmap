import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useUIStore } from '../../stores/uiStore'
import { useTaskStore } from '../../stores/taskStore'
import { useDirectoryStore } from '../../stores/directoryStore'
import { useAppStore } from '../../stores/appStore'
import { useAppContext } from '../../contexts/AppContext'
import type { CreationContext, TaskPriority, TaskStatus } from '../../types/database'
import type { ActionHistoryItem } from '../../types/state'

type ItemType = NonNullable<CreationContext['type']>

export interface CreationFormState {
  type: ItemType
  name: string
  parentDirectoryId: string | null
  // Task fields
  status: TaskStatus
  priority: TaskPriority | null
  dueDate: string
  description: string
  tags: string
  category: string
  // Directory fields
  dirStartDate: string
  dirDueDate: string
  // Link fields
  url: string
}

export interface CreationValidation {
  nameError: string | null
  urlError: string | null
  duplicateWarning: string | null
  isValid: boolean
}

export interface UseCreationReturn {
  form: CreationFormState
  validation: CreationValidation
  updateField: <K extends keyof CreationFormState>(key: K, value: CreationFormState[K]) => void
  submit: () => Promise<boolean>
  submitAndAddAnother: () => Promise<boolean>
  directoryOnly: boolean
  nameInputRef: React.RefObject<HTMLInputElement>
}

function getDefaultForm(ctx: CreationContext | null): CreationFormState {
  return {
    type: ctx?.type ?? 'task',
    name: '',
    parentDirectoryId: ctx?.parentDirectoryId ?? null,
    status: ctx?.status ?? 'not_started',
    priority: null,
    dueDate: ctx?.dueDate ?? '',
    description: '',
    tags: '',
    category: '',
    dirStartDate: '',
    dirDueDate: '',
    url: '',
  }
}

export function useCreation(): UseCreationReturn {
  const context = useUIStore((s) => s.creationContext)
  const closeModal = useUIStore((s) => s.closeCreationModal)
  const setLastCreatedItemId = useUIStore((s) => s.setLastCreatedItemId)
  const addTask = useTaskStore((s) => s.addTask)
  const addDirectory = useDirectoryStore((s) => s.addDirectory)
  const tasks = useTaskStore((s) => s.tasks)
  const directories = useDirectoryStore((s) => s.directories)
  const pushUndo = useAppStore((s) => s.pushUndo)
  const { userId } = useAppContext()

  const nameInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<CreationFormState>(() => getDefaultForm(context))

  // Reset form when context changes (e.g., modal reopened with different context
  // while already mounted, or context updated externally)
  const contextKey = context
    ? `${context.parentDirectoryId}|${context.type}|${context.status}|${context.dueDate}|${context.position}`
    : null
  useEffect(() => {
    setForm(getDefaultForm(context))
  }, [contextKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Column 0 = root level, only directories allowed
  const directoryOnly = form.parentDirectoryId === null

  const updateField = useCallback(<K extends keyof CreationFormState>(key: K, value: CreationFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  // Validation
  const validation = useMemo<CreationValidation>(() => {
    const nameError = form.name.trim().length === 0 ? 'Name is required' : null

    let urlError: string | null = null
    if (form.type === 'link' && form.url.trim()) {
      try {
        new URL(form.url.trim())
      } catch {
        urlError = 'Please enter a valid URL'
      }
    } else if (form.type === 'link' && !form.url.trim()) {
      urlError = 'URL is required for links'
    }

    // Duplicate warning
    let duplicateWarning: string | null = null
    if (form.name.trim()) {
      const nameLower = form.name.trim().toLowerCase()
      const parentId = form.parentDirectoryId
      if (form.type === 'directory') {
        const exists = directories.some(
          (d) => d.parent_id === parentId && d.name.toLowerCase() === nameLower,
        )
        if (exists) duplicateWarning = 'A directory with this name already exists in this location'
      } else {
        const exists = tasks.some(
          (t) =>
            t.directory_id === parentId &&
            !t.archived_at &&
            t.title.toLowerCase() === nameLower,
        )
        if (exists) duplicateWarning = 'A task with this name already exists in this location'
      }
    }

    const isValid =
      !nameError &&
      !urlError &&
      (form.type !== 'link' || !urlError)

    return { nameError, urlError, duplicateWarning, isValid }
  }, [form.name, form.type, form.url, form.parentDirectoryId, tasks, directories])

  const doCreate = useCallback(async (): Promise<string | null> => {
    if (!userId) return null
    const title = form.name.trim()
    if (!title) return null

    if (form.type === 'directory') {
      // Calculate depth_level from parent
      const parentDir = form.parentDirectoryId
        ? directories.find((d) => d.id === form.parentDirectoryId)
        : null
      const depthLevel = parentDir ? (parentDir.depth_level + 1) : 0

      // Position: append at end
      const siblings = directories.filter((d) => d.parent_id === form.parentDirectoryId)
      const position = context?.position ?? siblings.length

      const id = crypto.randomUUID()
      const created = await addDirectory({
        id,
        name: title,
        parent_id: form.parentDirectoryId,
        start_date: form.dirStartDate || null,
        due_date: form.dirDueDate || null,
        position,
        user_id: userId,
        depth_level: depthLevel,
      })

      const now = Date.now()
      const undoItem: ActionHistoryItem = {
        id: crypto.randomUUID(),
        actionType: 'create',
        entityType: 'directory',
        entityData: created as unknown as Record<string, unknown>,
        createdAt: now,
        expiresAt: now + 2 * 60 * 60 * 1000,
      }
      pushUndo(undoItem)

      return created.id
    }

    // Task or Link
    if (!form.parentDirectoryId) return null // tasks/links need a directory

    const siblings = tasks.filter(
      (t) => t.directory_id === form.parentDirectoryId && !t.archived_at,
    )
    const position = context?.position ?? siblings.length

    const id = crypto.randomUUID()
    const taskPayload: Parameters<typeof addTask>[0] = {
      id,
      title,
      directory_id: form.parentDirectoryId,
      priority: form.priority,
      start_date: null,
      due_date: form.dueDate || null,
      background_color: null,
      category: form.category || null,
      tags: form.tags
        ? form.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [],
      description: form.description || null,
      is_completed: false,
      completed_at: null,
      status: form.status,
      archived_at: null,
      archive_reason: null,
      position,
      user_id: userId,
      url: form.type === 'link' ? form.url.trim() : null,
    }

    const created = await addTask(taskPayload)

    const now = Date.now()
    const undoItem: ActionHistoryItem = {
      id: crypto.randomUUID(),
      actionType: 'create',
      entityType: 'task',
      entityData: created as unknown as Record<string, unknown>,
      createdAt: now,
      expiresAt: now + 2 * 60 * 60 * 1000,
    }
    pushUndo(undoItem)

    return created.id
  }, [form, userId, context, addTask, addDirectory, tasks, directories, pushUndo])

  const submit = useCallback(async (): Promise<boolean> => {
    if (!validation.isValid) return false
    try {
      const newId = await doCreate()
      if (newId) {
        setLastCreatedItemId(newId)
        setTimeout(() => setLastCreatedItemId(null), 1500)
      }
      closeModal()
      return true
    } catch {
      return false
    }
  }, [validation.isValid, doCreate, closeModal, setLastCreatedItemId])

  const submitAndAddAnother = useCallback(async (): Promise<boolean> => {
    if (!validation.isValid) return false
    try {
      const newId = await doCreate()
      if (newId) {
        setLastCreatedItemId(newId)
        setTimeout(() => setLastCreatedItemId(null), 1500)
      }
      // Reset form but preserve type and location
      setForm((prev) => ({
        ...getDefaultForm(context),
        type: prev.type,
        parentDirectoryId: prev.parentDirectoryId,
      }))
      // Re-focus name input
      setTimeout(() => nameInputRef.current?.focus(), 50)
      return true
    } catch {
      return false
    }
  }, [validation.isValid, doCreate, context, setLastCreatedItemId, nameInputRef])

  return {
    form,
    validation,
    updateField,
    submit,
    submitAndAddAnother,
    directoryOnly,
    nameInputRef,
  }
}
