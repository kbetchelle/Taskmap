import { useCallback } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useDirectoryStore } from '../stores/directoryStore'
import { useTaskStore } from '../stores/taskStore'
import { useSettingsStore } from '../stores/settingsStore'
import * as dirApi from '../api/directories'
import * as taskApi from '../api/tasks'
import type { Directory, Task } from '../types'

export function useDatabase() {
  const userId = useAuthStore((s) => s.user?.id)
  const fetchDirectories = useDirectoryStore((s) => s.fetchDirectories)
  const fetchActiveItems = useTaskStore((s) => s.fetchActiveItems)
  const fetchSettings = useSettingsStore((s) => s.fetchSettings)

  const loadDirectories = useCallback(async () => {
    if (userId) await fetchDirectories(userId)
  }, [userId, fetchDirectories])

  const loadActiveItems = useCallback(async () => {
    if (userId) await fetchActiveItems(userId)
  }, [userId, fetchActiveItems])

  const loadUpcomingItems = useCallback(async () => {
    if (!userId) return []
    const now = new Date().toISOString()
    return taskApi.getUpcomingItems(userId, now)
  }, [userId])

  const getDirectoryPath = useCallback((directoryId: string) => {
    return dirApi.getDirectoryPath(directoryId)
  }, [])

  const createDirectory = useCallback(
    async (dir: Omit<Directory, 'id' | 'created_at' | 'updated_at'>) => {
      const created = await dirApi.insertDirectory(dir)
      if (userId) await fetchDirectories(userId)
      return created
    },
    [userId, fetchDirectories]
  )

  const updateDirectory = useCallback(
    async (
      id: string,
      updates: Partial<Pick<Directory, 'name' | 'parent_id' | 'start_date' | 'due_date' | 'position' | 'depth_level'>>
    ) => {
      await dirApi.updateDirectory(id, updates)
      if (userId) await fetchDirectories(userId)
    },
    [userId, fetchDirectories]
  )

  const deleteDirectory = useCallback(
    async (id: string) => {
      await dirApi.deleteDirectory(id)
      if (userId) await fetchDirectories(userId)
    },
    [userId, fetchDirectories]
  )

  const createTask = useCallback(
    async (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
      const created = await taskApi.insertTask(task)
      if (userId) await fetchActiveItems(userId)
      return created
    },
    [userId, fetchActiveItems]
  )

  const updateTask = useCallback(
    async (
      id: string,
      updates: Partial<Pick<Task, 'title' | 'priority' | 'is_completed' | 'completed_at' | 'position'>>
    ) => {
      await taskApi.updateTask(id, updates)
      if (userId) await fetchActiveItems(userId)
    },
    [userId, fetchActiveItems]
  )

  const deleteTask = useCallback(
    async (id: string) => {
      await taskApi.deleteTask(id)
      if (userId) await fetchActiveItems(userId)
    },
    [userId, fetchActiveItems]
  )

  const loadSettings = useCallback(async () => {
    if (userId) await fetchSettings(userId)
  }, [userId, fetchSettings])

  return {
    userId,
    loadDirectories,
    loadActiveItems,
    loadUpcomingItems,
    getDirectoryPath,
    createDirectory,
    updateDirectory,
    deleteDirectory,
    createTask,
    updateTask,
    deleteTask,
    loadSettings,
  }
}
