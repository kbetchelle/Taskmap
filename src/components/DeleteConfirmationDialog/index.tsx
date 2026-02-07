import { useEffect } from 'react'
import type { Task, Directory } from '../../types'
import { Button } from '../ui/Button'

function isTask(item: Task | Directory): item is Task {
  return 'directory_id' in item
}

interface DeleteConfirmationDialogProps {
  items: (Task | Directory)[]
  childCountByDirectoryId?: Record<string, number>
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteConfirmationDialog({
  items,
  childCountByDirectoryId = {},
  onConfirm,
  onCancel,
}: DeleteConfirmationDialogProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        onConfirm()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onConfirm, onCancel])

  let message = ''
  if (items.length === 1) {
    const item = items[0]
    const name = isTask(item) ? item.title : item.name
    message = `Delete "${name}"?`
    if (!isTask(item)) {
      const childCount = childCountByDirectoryId[item.id] ?? 0
      if (childCount > 0) {
        message += `\n\nThis will also delete ${childCount} item${childCount !== 1 ? 's' : ''} inside.`
      }
    }
  } else {
    message = `Delete ${items.length} items?`
    const dirs = items.filter((i) => !isTask(i)) as Directory[]
    if (dirs.length > 0) {
      const totalChildren = dirs.reduce(
        (sum, d) => sum + (childCountByDirectoryId[d.id] ?? 0),
        0
      )
      if (totalChildren > 0) {
        message += `\n\nThis will also delete ${totalChildren} nested item${totalChildren !== 1 ? 's' : ''}.`
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-4 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm text-neutral-900 whitespace-pre-wrap mb-4">{message}</p>
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  )
}
