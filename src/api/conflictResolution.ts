import { supabase } from '../lib/supabase'
import type { Task, Directory } from '../types'

export type EntityType = 'task' | 'directory'

export interface ConflictInfo<T extends Task | Directory = Task | Directory> {
  localVersion: number
  remoteVersion: number
  localData: T
  remoteData: T
  conflictFields: string[]
  entityType: EntityType
}

const TASK_FIELDS_TO_CHECK = [
  'title',
  'description',
  'priority',
  'start_date',
  'due_date',
  'category',
  'tags',
  'background_color',
  'is_completed',
  'completed_at',
  'position',
  'directory_id',
] as const

const DIRECTORY_FIELDS_TO_CHECK = [
  'name',
  'parent_id',
  'start_date',
  'due_date',
  'position',
  'depth_level',
] as const

const TASK_CRITICAL_FIELDS = ['title', 'directory_id', 'is_completed']
const DIRECTORY_CRITICAL_FIELDS = ['name', 'parent_id']

export function findConflictingFields(
  local: Record<string, unknown>,
  remote: Record<string, unknown>,
  entityType: EntityType
): string[] {
  const fieldsToCheck =
    entityType === 'task' ? TASK_FIELDS_TO_CHECK : DIRECTORY_FIELDS_TO_CHECK
  const conflicts: string[] = []
  for (const field of fieldsToCheck) {
    const localVal = local[field]
    const remoteVal = remote[field]
    if (JSON.stringify(localVal) !== JSON.stringify(remoteVal)) {
      conflicts.push(field)
    }
  }
  return conflicts
}

export async function detectConflict<T extends Task | Directory>(
  entityType: EntityType,
  entityId: string,
  localData: T,
  expectedVersion: number
): Promise<ConflictInfo<T> | null> {
  const table = entityType === 'task' ? 'tasks' : 'directories'
  const { data: current, error } = await supabase
    .from(table)
    .select('*')
    .eq('id', entityId)
    .single()

  if (error || !current) {
    return null
  }

  const remote = current as T
  const remoteVersion = (remote as Task & { version?: number }).version ?? 1

  if (remoteVersion !== expectedVersion) {
    const conflictFields = findConflictingFields(
      localData as unknown as Record<string, unknown>,
      remote as unknown as Record<string, unknown>,
      entityType
    )
    return {
      localVersion: expectedVersion,
      remoteVersion,
      localData,
      remoteData: remote,
      conflictFields,
      entityType,
    }
  }

  return null
}

export type SaveTaskResult =
  | { success: true; data: Task }
  | { success: false; conflict: ConflictInfo<Task> }

export type SaveDirectoryResult =
  | { success: true; data: Directory }
  | { success: false; conflict: ConflictInfo<Directory> }

export async function saveTaskWithConflictCheck(
  taskId: string,
  updates: Partial<
    Pick<
      Task,
      | 'title'
      | 'priority'
      | 'start_date'
      | 'due_date'
      | 'background_color'
      | 'category'
      | 'tags'
      | 'description'
      | 'is_completed'
      | 'completed_at'
      | 'position'
      | 'directory_id'
    >
  >,
  expectedVersion: number,
  currentTask: Task
): Promise<SaveTaskResult> {
  const localData = { ...currentTask, ...updates } as Task

  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .eq('version', expectedVersion)
    .select()
    .single()

  if (error || !data) {
    const conflict = await detectConflict(
      'task',
      taskId,
      localData,
      expectedVersion
    )
    if (conflict) return { success: false, conflict }
    const fallback = await buildConflictFromError(
      'task',
      taskId,
      localData,
      expectedVersion
    )
    return { success: false, conflict: fallback }
  }

  return { success: true, data: data as Task }
}

async function buildConflictFromError<T extends Task | Directory>(
  entityType: EntityType,
  entityId: string,
  localData: T,
  expectedVersion: number
): Promise<ConflictInfo<T>> {
  const table = entityType === 'task' ? 'tasks' : 'directories'
  const { data: current } = await supabase
    .from(table)
    .select('*')
    .eq('id', entityId)
    .single()

  const remote = (current ?? localData) as T
  const remoteVersion = (remote as Task & { version?: number }).version ?? expectedVersion + 1
  const conflictFields = findConflictingFields(
    localData as unknown as Record<string, unknown>,
    remote as unknown as Record<string, unknown>,
    entityType
  )

  return {
    localVersion: expectedVersion,
    remoteVersion,
    localData,
    remoteData: remote,
    conflictFields: conflictFields.length > 0 ? conflictFields : ['version'],
    entityType,
  }
}

export async function saveDirectoryWithConflictCheck(
  dirId: string,
  updates: Partial<
    Pick<Directory, 'name' | 'parent_id' | 'start_date' | 'due_date' | 'position' | 'depth_level'>
  >,
  expectedVersion: number,
  currentDirectory: Directory
): Promise<SaveDirectoryResult> {
  const localData = { ...currentDirectory, ...updates } as Directory

  const { data, error } = await supabase
    .from('directories')
    .update(updates)
    .eq('id', dirId)
    .eq('version', expectedVersion)
    .select()
    .single()

  if (error || !data) {
    const conflict = await detectConflict(
      'directory',
      dirId,
      localData,
      expectedVersion
    )
    if (conflict) return { success: false, conflict }
    const fallback = await buildConflictFromError(
      'directory',
      dirId,
      localData,
      expectedVersion
    )
    return { success: false, conflict: fallback }
  }

  return { success: true, data: data as Directory }
}

export function attemptAutoResolve<T extends Task | Directory>(
  conflict: ConflictInfo<T>
): T | null {
  const criticalFields =
    conflict.entityType === 'task'
      ? TASK_CRITICAL_FIELDS
      : DIRECTORY_CRITICAL_FIELDS
  const conflictingCriticalFields = conflict.conflictFields.filter((f) =>
    criticalFields.includes(f)
  )

  if (conflictingCriticalFields.length > 0) {
    return null
  }

  return {
    ...conflict.remoteData,
    ...conflict.localData,
    updated_at: conflict.remoteData.updated_at,
    updated_by: conflict.remoteData.updated_by,
    version: conflict.remoteData.version,
  } as T
}
