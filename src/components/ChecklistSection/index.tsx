import { useState, useEffect, useCallback, useRef } from 'react'
import type { Task, ChecklistItem } from '../../types'
import { calculateChecklistProgress } from '../../lib/utils/checklist'
import { useFeedbackStore } from '../../stores/feedbackStore'

export interface ChecklistSectionProps {
  task: Task
  onUpdate: (items: ChecklistItem[]) => void | Promise<void>
}

function itemsEqual(a: ChecklistItem[], b: ChecklistItem[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

export function ChecklistSection({ task, onUpdate }: ChecklistSectionProps) {
  const [items, setItems] = useState<ChecklistItem[]>(task.checklist_items ?? [])
  const [newItemText, setNewItemText] = useState('')
  const lastSentRef = useRef<ChecklistItem[] | null>(null)
  const showError = useFeedbackStore((s) => s.showError)

  // Sync from server when task changes (e.g. switch task) or when our own update is confirmed
  useEffect(() => {
    const fromServer = task.checklist_items ?? []
    setItems(fromServer)
    lastSentRef.current = null
  }, [task.id])

  useEffect(() => {
    const fromServer = task.checklist_items ?? []
    if (lastSentRef.current !== null && !itemsEqual(fromServer, lastSentRef.current)) {
      return // avoid overwriting local state with an older out-of-order server response
    }
    if (lastSentRef.current !== null && itemsEqual(fromServer, lastSentRef.current)) {
      lastSentRef.current = null
    }
    setItems(fromServer)
  }, [task.checklist_items])

  const persist = useCallback(
    (prevItems: ChecklistItem[], updatedItems: ChecklistItem[]) => {
      setItems(updatedItems)
      lastSentRef.current = updatedItems
      const result = onUpdate(updatedItems)
      if (result && typeof (result as Promise<void>).catch === 'function') {
        ;(result as Promise<void>).catch(() => {
          setItems(prevItems)
          lastSentRef.current = null
          showError('Failed to save checklist')
        })
      }
    },
    [onUpdate, showError]
  )

  const addItem = useCallback(() => {
    const text = newItemText.trim()
    if (!text) return
    const newItem: ChecklistItem = {
      id: crypto.randomUUID(),
      text,
      is_completed: false,
      position: items.length,
      created_at: new Date().toISOString(),
    }
    const updatedItems = [...items, newItem]
    setNewItemText('')
    persist(items, updatedItems)
  }, [items, newItemText, persist])

  const toggleItem = useCallback(
    (itemId: string) => {
      const updatedItems = items.map((item) =>
        item.id === itemId ? { ...item, is_completed: !item.is_completed } : item
      )
      persist(items, updatedItems)
    },
    [items, persist]
  )

  const deleteItem = useCallback(
    (itemId: string) => {
      const updatedItems = items.filter((item) => item.id !== itemId)
      persist(items, updatedItems)
    },
    [items, persist]
  )

  const progress = calculateChecklistProgress(items)

  return (
    <div className="flex flex-col gap-3 pt-4 border-t border-flow-columnBorder">
      <div className="flex justify-between items-center">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-flow-textSecondary m-0">
          Checklist
        </h3>
        {items.length > 0 && (
          <span className="text-xs font-flow-medium text-[#007AFF]">{progress}% complete</span>
        )}
      </div>

      {items.length > 0 && (
        <div className="h-1 bg-neutral-200 dark:bg-neutral-600 rounded overflow-hidden">
          <div
            className="h-full bg-[#34C759] transition-[width] duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700/50 transition-colors group"
          >
            <input
              type="checkbox"
              checked={item.is_completed}
              onChange={() => toggleItem(item.id)}
              className="w-4 h-4 rounded cursor-pointer flex-shrink-0"
              aria-label={item.text}
            />
            <span
              className={`flex-1 text-sm text-flow-textPrimary min-w-0 ${
                item.is_completed ? 'line-through text-flow-textSecondary' : ''
              }`}
            >
              {item.text}
            </span>
            <button
              type="button"
              onClick={() => deleteItem(item.id)}
              title="Delete item"
              className="w-5 h-5 flex items-center justify-center rounded text-flow-textSecondary opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all text-lg leading-none"
              aria-label={`Delete ${item.text}`}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Add checklist item..."
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addItem()
            }
          }}
          className="flex-1 min-w-0 rounded border border-flow-columnBorder bg-flow-background px-3 py-2 text-sm text-flow-textPrimary placeholder:text-flow-textDisabled focus:outline-none focus:ring-2 focus:ring-flow-focus"
        />
        <button
          type="button"
          onClick={addItem}
          className="px-4 py-2 text-sm font-flow-medium bg-[#007AFF] text-white rounded border-0 cursor-pointer hover:opacity-90 transition-opacity"
        >
          Add
        </button>
      </div>
    </div>
  )
}
