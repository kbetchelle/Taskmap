/**
 * Offline cache utilities.
 *
 * Primary storage: localStorage (key: taskmap-offline-cache).
 * Fallback: IndexedDB (database: taskmap-offline, store: cache) when payload > 4 MB.
 */

import type { Directory, Task, UserSettings } from '../types/database'
import type { TaskLink } from '../types/links'

// ── Types ────────────────────────────────────────────────────────────────

export interface OfflineCache {
  cachedAt: number
  directories: Directory[]
  tasks: Task[]
  settings: UserSettings | null
  links: TaskLink[]
  navigationState: {
    navigationPath: string[]
    currentView: string
  }
}

// ── Constants ────────────────────────────────────────────────────────────

const LS_KEY = 'taskmap-offline-cache'
const IDB_NAME = 'taskmap-offline'
const IDB_STORE = 'cache'
const IDB_CACHE_KEY = 'app-data'
const MAX_LS_BYTES = 4 * 1024 * 1024 // 4 MB

// ── IndexedDB wrapper ────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function idbPut(value: unknown): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite')
    const store = tx.objectStore(IDB_STORE)
    const req = store.put(value, IDB_CACHE_KEY)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
    tx.oncomplete = () => db.close()
  })
}

async function idbGet(): Promise<OfflineCache | null> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly')
      const store = tx.objectStore(IDB_STORE)
      const req = store.get(IDB_CACHE_KEY)
      req.onsuccess = () => resolve((req.result as OfflineCache) ?? null)
      req.onerror = () => reject(req.error)
      tx.oncomplete = () => db.close()
    })
  } catch {
    return null
  }
}

async function idbClear(): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite')
      const store = tx.objectStore(IDB_STORE)
      const req = store.delete(IDB_CACHE_KEY)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
      tx.oncomplete = () => db.close()
    })
  } catch {
    // ignore
  }
}

// ── Public API ───────────────────────────────────────────────────────────

export async function saveToCache(data: OfflineCache): Promise<void> {
  try {
    const json = JSON.stringify(data)
    if (json.length <= MAX_LS_BYTES) {
      localStorage.setItem(LS_KEY, json)
      return
    }
    // Payload too large for localStorage — fall back to IndexedDB
    console.warn(
      `[offlineCache] Payload exceeds ${MAX_LS_BYTES / 1024 / 1024}MB (${(json.length / 1024 / 1024).toFixed(1)}MB). Using IndexedDB fallback.`
    )
    await idbPut(data)
  } catch (err) {
    console.warn('[offlineCache] Failed to save cache:', err)
  }
}

export async function loadFromCache(): Promise<OfflineCache | null> {
  // Try localStorage first (most common)
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as OfflineCache
      if (parsed && typeof parsed.cachedAt === 'number') {
        return parsed
      }
    }
  } catch {
    // corrupted – fall through to IDB
  }

  // Try IndexedDB fallback
  try {
    return await idbGet()
  } catch {
    return null
  }
}

export async function clearCache(): Promise<void> {
  try {
    localStorage.removeItem(LS_KEY)
  } catch {
    // ignore
  }
  await idbClear()
}
