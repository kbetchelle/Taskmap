import { create } from 'zustand'
import type { TimeEntry } from '../types'
import * as timeEntriesApi from '../api/timeEntries'
import { updateTaskActualDuration } from '../api/tasks'

interface TimeTrackerState {
  activeTaskIds: Set<string>
  startTimes: Record<string, number>
  tick: number
  startTimer: (taskId: string, userId: string) => Promise<TimeEntry>
  stopTimer: (taskId: string, onTaskUpdated?: (minutes: number) => void) => Promise<void>
  incrementTick: () => void
  isTimerActive: (taskId: string) => boolean
  getElapsedMs: (taskId: string) => number | null
}

let tickIntervalId: ReturnType<typeof setInterval> | null = null

function ensureTickInterval() {
  if (tickIntervalId) return
  tickIntervalId = setInterval(() => {
    useTimeTrackerStore.getState().incrementTick()
  }, 1000)
}

function clearTickIntervalIfIdle() {
  const { activeTaskIds } = useTimeTrackerStore.getState()
  if (activeTaskIds.size === 0 && tickIntervalId) {
    clearInterval(tickIntervalId)
    tickIntervalId = null
  }
}

export const useTimeTrackerStore = create<TimeTrackerState>((set, get) => ({
  activeTaskIds: new Set(),
  startTimes: {},
  tick: 0,
  startTimer: async (taskId: string, userId: string) => {
    const state = get()
    if (state.activeTaskIds.has(taskId)) {
      throw new Error('Timer already running for this task')
    }

    const entry = await timeEntriesApi.insertTimeEntry({
      task_id: taskId,
      started_at: new Date().toISOString(),
      ended_at: null,
      duration_minutes: null,
      user_id: userId,
    })

    const now = Date.now()
    set((s) => ({
      activeTaskIds: new Set([...s.activeTaskIds, taskId]),
      startTimes: { ...s.startTimes, [taskId]: now },
    }))

    ensureTickInterval()
    return entry
  },

  stopTimer: async (taskId: string, onTaskUpdated?: (minutes: number) => void) => {
    const state = get()
    const startTime = state.startTimes[taskId]
    if (!state.activeTaskIds.has(taskId) || startTime == null) {
      throw new Error('No active timer for this task')
    }

    const endTime = new Date()
    const durationMs = endTime.getTime() - startTime
    const durationMinutes = Math.round(durationMs / 60000)

    const activeEntry = await timeEntriesApi.fetchActiveTimeEntry(taskId)
    if (activeEntry) {
      await timeEntriesApi.updateTimeEntry(activeEntry.id, {
        ended_at: endTime.toISOString(),
        duration_minutes: durationMinutes,
      })
    }

    const entries = await timeEntriesApi.fetchTimeEntriesByTask(taskId)
    const totalMinutes = entries.reduce((sum, e) => sum + (e.duration_minutes ?? 0), 0)
    await updateTaskActualDuration(taskId, totalMinutes)

    set((s) => {
      const nextIds = new Set(s.activeTaskIds)
      nextIds.delete(taskId)
      const nextStartTimes = { ...s.startTimes }
      delete nextStartTimes[taskId]
      return {
        activeTaskIds: nextIds,
        startTimes: nextStartTimes,
      }
    })

    clearTickIntervalIfIdle()
    onTaskUpdated?.(totalMinutes)
  },

  incrementTick: () => {
    set((s) => ({ tick: s.tick + 1 }))
  },

  isTimerActive: (taskId: string) => {
    return get().activeTaskIds.has(taskId)
  },

  getElapsedMs: (taskId: string) => {
    const startTime = get().startTimes[taskId]
    if (startTime == null) return null
    return Date.now() - startTime
  },
}))
