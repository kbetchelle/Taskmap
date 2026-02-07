import { create } from 'zustand'
import type { Directory } from '../types'
import * as api from '../api/directories'
import { attemptAutoResolve } from '../api/conflictResolution'
import { useConflictStore } from './conflictStore'
import { useFeedbackStore } from './feedbackStore'

interface DirectoryState {
  directories: Directory[]
  setDirectories: (dirs: Directory[]) => void
  fetchDirectories: (userId: string) => Promise<void>
  addDirectory: (dir: Omit<Directory, 'id' | 'created_at' | 'updated_at' | 'due_date'> & { id?: string; due_date?: string | null }) => Promise<Directory>
  restoreDirectory: (dir: Directory) => Promise<Directory>
  updateDirectory: (
    id: string,
    updates: Partial<Pick<Directory, 'name' | 'parent_id' | 'start_date' | 'due_date' | 'position' | 'depth_level'>>
  ) => Promise<void>
  removeDirectory: (id: string) => Promise<void>
}

export const useDirectoryStore = create<DirectoryState>((set, get) => ({
  directories: [],
  setDirectories: (dirs) => set({ directories: dirs }),
  fetchDirectories: async (userId) => {
    const dirs = await api.fetchDirectoriesByUser(userId)
    set({ directories: dirs })
  },
  addDirectory: async (dir) => {
    const created = await api.insertDirectory(dir)
    set({ directories: [...get().directories, created] })
    return created
  },
  restoreDirectory: async (dir) => {
    const created = await api.insertDirectory({ ...dir, id: dir.id })
    set({ directories: [...get().directories, created] })
    return created
  },
  updateDirectory: async (id, updates) => {
    const currentDirectory = get().directories.find((d) => d.id === id)
    if (!currentDirectory) throw new Error('Directory not found')

    const result = await api.updateDirectoryWithConflictCheck(
      id,
      updates,
      currentDirectory
    )

    if (result.success) {
      set({
        directories: get().directories.map((d) =>
          d.id === id ? result.data : d
        ),
      })
      return
    }

    const { conflict } = result
    const autoResolved = attemptAutoResolve(conflict)
    if (autoResolved) {
      const merged = autoResolved as Directory
      const mergedUpdates = {
        name: merged.name,
        parent_id: merged.parent_id,
        start_date: merged.start_date,
        due_date: merged.due_date,
        position: merged.position,
        depth_level: merged.depth_level,
      }
      const updated = await api.updateDirectory(id, mergedUpdates)
      set({
        directories: get().directories.map((d) =>
          d.id === id ? updated : d
        ),
      })
      useFeedbackStore.getState().showSuccess('Changes merged automatically')
      return
    }

    try {
      const resolution =
        await useConflictStore.getState().showConflictDialog(conflict)
      if (!resolution) return
      const resolved = resolution.data as Directory
      const resolvedUpdates = {
        name: resolved.name,
        parent_id: resolved.parent_id,
        start_date: resolved.start_date,
        due_date: resolved.due_date,
        position: resolved.position,
        depth_level: resolved.depth_level,
      }
      const updated = await api.updateDirectory(id, resolvedUpdates)
      set({
        directories: get().directories.map((d) =>
          d.id === id ? updated : d
        ),
      })
      useFeedbackStore.getState().showSuccess('Conflict resolved')
    } catch {
      throw new Error('Save cancelled due to conflict')
    }
  },
  removeDirectory: async (id) => {
    await api.deleteDirectory(id)
    set({ directories: get().directories.filter((d) => d.id !== id) })
  },
}))
