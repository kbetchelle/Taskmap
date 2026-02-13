import { create } from 'zustand'
import type { TaskLink, LinkType } from '../types/links'
import * as api from '../api/links'
import { detectCycle } from '../lib/dependencyUtils'

interface LinkState {
  links: TaskLink[]
  setLinks: (links: TaskLink[]) => void
  fetchLinksForUser: (userId: string) => Promise<void>
  addLink: (
    sourceId: string,
    targetId: string,
    linkType: LinkType,
    userId: string
  ) => Promise<TaskLink>
  removeLink: (id: string) => Promise<void>
  getLinksForTask: (taskId: string) => TaskLink[]
  getOutgoingLinks: (taskId: string) => TaskLink[]
  getIncomingLinks: (taskId: string) => TaskLink[]
  getDependenciesForTask: (taskId: string) => TaskLink[]
  hasCycle: (sourceId: string, targetId: string) => boolean
}

export const useLinkStore = create<LinkState>((set, get) => ({
  links: [],

  setLinks: (links) => set({ links }),

  fetchLinksForUser: async (userId) => {
    const links = await api.fetchLinksForUser(userId)
    set({ links })
  },

  addLink: async (sourceId, targetId, linkType, userId) => {
    const created = await api.createLink(sourceId, targetId, linkType, userId)
    set({ links: [...get().links, created] })
    return created
  },

  removeLink: async (id) => {
    await api.deleteLink(id)
    set({ links: get().links.filter((l) => l.id !== id) })
  },

  getLinksForTask: (taskId) => {
    return get().links.filter(
      (l) => l.source_id === taskId || l.target_id === taskId
    )
  },

  getOutgoingLinks: (taskId) => {
    return get().links.filter((l) => l.source_id === taskId)
  },

  getIncomingLinks: (taskId) => {
    return get().links.filter((l) => l.target_id === taskId)
  },

  getDependenciesForTask: (taskId) => {
    return get().links.filter(
      (l) => l.link_type === 'dependency' && l.source_id === taskId
    )
  },

  hasCycle: (sourceId, targetId) => {
    return detectCycle(sourceId, targetId, get().links)
  },
}))
