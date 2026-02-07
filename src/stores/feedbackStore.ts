import { create } from 'zustand'

export type FeedbackType = 'success' | 'error' | 'info'

interface FeedbackState {
  message: string | null
  type: FeedbackType
  visible: boolean
  _timeoutId: ReturnType<typeof setTimeout> | null
}

interface FeedbackStoreState extends FeedbackState {
  showSuccess: (message: string) => void
  showError: (message: string) => void
  showInfo: (message: string) => void
  showTooltip: (message: string, duration?: number) => void
  clear: () => void
}

const DURATIONS: Record<FeedbackType, number> = {
  success: 2000,
  error: 3000,
  info: 2000,
}

export const useFeedbackStore = create<FeedbackStoreState>((set, get) => ({
  message: null,
  type: 'success',
  visible: false,
  _timeoutId: null,

  showSuccess: (message: string) => {
    const { _timeoutId } = get()
    if (_timeoutId) clearTimeout(_timeoutId)
    set({ message, type: 'success', visible: true })
    const id = setTimeout(() => {
      set(() => ({ visible: false, _timeoutId: null }))
      setTimeout(() => set({ message: null }), 300)
    }, DURATIONS.success)
    set({ _timeoutId: id })
  },

  showError: (message: string) => {
    const { _timeoutId } = get()
    if (_timeoutId) clearTimeout(_timeoutId)
    set({ message, type: 'error', visible: true })
    const id = setTimeout(() => {
      set(() => ({ visible: false, _timeoutId: null }))
      setTimeout(() => set({ message: null }), 300)
    }, DURATIONS.error)
    set({ _timeoutId: id })
  },

  showInfo: (message: string) => {
    const { _timeoutId } = get()
    if (_timeoutId) clearTimeout(_timeoutId)
    set({ message, type: 'info', visible: true })
    const id = setTimeout(() => {
      set(() => ({ visible: false, _timeoutId: null }))
      setTimeout(() => set({ message: null }), 300)
    }, DURATIONS.info)
    set({ _timeoutId: id })
  },

  showTooltip: (message: string, duration = 5000) => {
    const { _timeoutId } = get()
    if (_timeoutId) clearTimeout(_timeoutId)
    set({ message, type: 'info', visible: true })
    const id = setTimeout(() => {
      set(() => ({ visible: false, _timeoutId: null }))
      setTimeout(() => set({ message: null }), 300)
    }, duration)
    set({ _timeoutId: id })
  },

  clear: () => {
    const { _timeoutId } = get()
    if (_timeoutId) clearTimeout(_timeoutId)
    set({ message: null, visible: false, _timeoutId: null })
  },
}))
