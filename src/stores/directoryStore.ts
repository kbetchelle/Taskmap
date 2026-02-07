import { create } from 'zustand'
import type { Directory } from '../types'
import * as api from '../api/directories'

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
    const updated = await api.updateDirectory(id, updates)
    set({
      directories: get().directories.map((d) => (d.id === id ? updated : d)),
    })
  },
  removeDirectory: async (id) => {
    await api.deleteDirectory(id)
    set({ directories: get().directories.filter((d) => d.id !== id) })
  },
}))
