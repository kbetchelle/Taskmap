/**
 * Optional request batching: queue updates and flush after 100ms.
 * Use for non-critical rapid updates (e.g. bulk position). Not used for create/delete.
 */

import { supabase } from './supabase'

interface QueuedUpdate {
  table: string
  id: string
  data: Record<string, unknown>
}

let queue: QueuedUpdate[] = []
let timeout: ReturnType<typeof setTimeout> | null = null
const FLUSH_MS = 100

function flush(): void {
  if (queue.length === 0) return
  const toFlush = queue.splice(0)
  timeout = null
  const byTable = new Map<string, QueuedUpdate[]>()
  for (const u of toFlush) {
    const list = byTable.get(u.table) ?? []
    list.push(u)
    byTable.set(u.table, list)
  }
  for (const [table, items] of byTable) {
    const rows = items.map((u) => ({ id: u.id, ...u.data }))
    void supabase.from(table).upsert(rows).then(() => {}, () => {})
  }
}

export function batchUpdate(table: string, id: string, data: Record<string, unknown>): void {
  queue.push({ table, id, data })
  if (!timeout) {
    timeout = setTimeout(flush, FLUSH_MS)
  }
}
