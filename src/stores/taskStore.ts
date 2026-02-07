import { create } from 'zustand'
import type { Task, ActiveItemRow } from '../types'
import * as api from '../api/tasks'

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
    const updated = await api.updateTask(id, updates)
    set({
      tasks: get().tasks.map((t) => (t.id === id ? updated : t)),
    })
  },
  removeTask: async (id) => {
    await api.deleteTask(id)
    set({ tasks: get().tasks.filter((t) => t.id !== id) })
  },
}))
