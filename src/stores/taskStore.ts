import { create } from 'zustand'
import type { Task, ActiveItemRow } from '../types'
import * as api from '../api/tasks'
import { attemptAutoResolve } from '../api/conflictResolution'
import { useConflictStore } from './conflictStore'
import { useFeedbackStore } from './feedbackStore'

interface TaskState {
  tasks: Task[]
  activeItems: ActiveItemRow[]
  setTasks: (tasks: Task[]) => void
  setActiveItems: (items: ActiveItemRow[]) => void
  fetchTasksByUser: (userId: string) => Promise<void>
  fetchActiveItems: (userId: string) => Promise<void>
  fetchUpcomingItems: (userId: string) => Promise<ActiveItemRow[]>
  addTask: (task: Omit<Task, 'id' | 'created_at' | 'updated_at'> & { id?: string }) => Promise<Task>
  restoreTask: (task: Task) => Promise<Task>
  updateTask: (
    id: string,
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
    >
  ) => Promise<void>
  removeTask: (id: string) => Promise<void>
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  activeItems: [],
  setTasks: (tasks) => set({ tasks }),
  setActiveItems: (items) => set({ activeItems: items }),
  fetchTasksByUser: async (userId) => {
    const tasks = await api.fetchTasksByUser(userId)
    set({ tasks })
  },
  fetchActiveItems: async (userId) => {
    const now = new Date().toISOString()
    const items = await api.getActiveItems(userId, now)
    set({ activeItems: items })
  },
  fetchUpcomingItems: async (userId) => {
    const now = new Date().toISOString()
    return api.getUpcomingItems(userId, now)
  },
  addTask: async (task) => {
    const created = await api.insertTask(task)
    set({ tasks: [...get().tasks, created] })
    return created
  },
  restoreTask: async (task) => {
    const created = await api.insertTask({ ...task, id: task.id })
    set({ tasks: [...get().tasks, created] })
    return created
  },
  updateTask: async (id, updates) => {
    const currentTask = get().tasks.find((t) => t.id === id)
    if (!currentTask) throw new Error('Task not found')

    const result = await api.updateTaskWithConflictCheck(id, updates, currentTask)

    if (result.success) {
      set({
        tasks: get().tasks.map((t) => (t.id === id ? result.data : t)),
      })
      return
    }

    const { conflict } = result
    const autoResolved = attemptAutoResolve(conflict)
    if (autoResolved) {
      const merged = autoResolved as Task
      const mergedUpdates = {
        title: merged.title,
        priority: merged.priority,
        start_date: merged.start_date,
        due_date: merged.due_date,
        background_color: merged.background_color,
        category: merged.category,
        tags: merged.tags,
        description: merged.description,
        is_completed: merged.is_completed,
        completed_at: merged.completed_at,
        position: merged.position,
        directory_id: merged.directory_id,
      }
      const updated = await api.updateTask(id, mergedUpdates)
      set({
        tasks: get().tasks.map((t) => (t.id === id ? updated : t)),
      })
      useFeedbackStore.getState().showSuccess('Changes merged automatically')
      return
    }

    try {
      const resolution = await useConflictStore.getState().showConflictDialog(conflict)
      if (!resolution) return
      const resolved = resolution.data as Task
      const resolvedUpdates = {
        title: resolved.title,
        priority: resolved.priority,
        start_date: resolved.start_date,
        due_date: resolved.due_date,
        background_color: resolved.background_color,
        category: resolved.category,
        tags: resolved.tags,
        description: resolved.description,
        is_completed: resolved.is_completed,
        completed_at: resolved.completed_at,
        position: resolved.position,
        directory_id: resolved.directory_id,
      }
      const updated = await api.updateTask(id, resolvedUpdates)
      set({
        tasks: get().tasks.map((t) => (t.id === id ? updated : t)),
      })
      useFeedbackStore.getState().showSuccess('Conflict resolved')
    } catch {
      throw new Error('Save cancelled due to conflict')
    }
  },
  removeTask: async (id) => {
    await api.deleteTask(id)
    set({ tasks: get().tasks.filter((t) => t.id !== id) })
  },
}))
