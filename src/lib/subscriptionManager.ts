import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './supabase'

type ViewType = 'main_db' | 'upcoming'

export interface SubscriptionCallbacks {
  onDirectoriesChange: () => void
  onTasksChange: () => void
}

/**
 * Manages targeted real-time subscriptions for visible directories only.
 * Reduces events by subscribing only to tasks/directories in the current view.
 */
export class SubscriptionManager {
  private channels: Map<string, RealtimeChannel> = new Map()
  private callbacks: SubscriptionCallbacks | null = null

  setCallbacks(callbacks: SubscriptionCallbacks) {
    this.callbacks = callbacks
  }

  /**
   * Subscribe to changes in visible directories.
   * @param viewType - 'main_db' | 'upcoming'
   * @param directoryIds - navigationPath (parent IDs of visible columns). Include null for root.
   */
  subscribeToView(_viewType: ViewType, directoryIds: (string | null)[]): void {
    this.unsubscribeAll()

    if (!this.callbacks) return

    const { onDirectoriesChange, onTasksChange } = this.callbacks

    // Root: directories with parent_id = null
    const rootChannel = supabase
      .channel('realtime-root-dirs')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'directories', filter: 'parent_id=is.null' },
        () => onDirectoriesChange()
      )
      .subscribe()
    this.channels.set('root', rootChannel)

    // Per visible directory: tasks and child directories
    for (const dirId of directoryIds) {
      if (dirId == null) continue
      const taskChannel = supabase
        .channel(`realtime-tasks-${dirId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tasks', filter: `directory_id=eq.${dirId}` },
          () => onTasksChange()
        )
        .subscribe()
      this.channels.set(`tasks-${dirId}`, taskChannel)

      const dirChannel = supabase
        .channel(`realtime-dirs-${dirId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'directories', filter: `parent_id=eq.${dirId}` },
          () => onDirectoriesChange()
        )
        .subscribe()
      this.channels.set(`dirs-${dirId}`, dirChannel)
    }
  }

  unsubscribeAll(): void {
    for (const channel of this.channels.values()) {
      supabase.removeChannel(channel)
    }
    this.channels.clear()
  }
}

let subscriptionManagerInstance: SubscriptionManager | null = null

export function getSubscriptionManager(): SubscriptionManager {
  if (!subscriptionManagerInstance) {
    subscriptionManagerInstance = new SubscriptionManager()
  }
  return subscriptionManagerInstance
}
