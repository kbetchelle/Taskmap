import { useState, useEffect } from 'react'
import type { Task, Directory } from '../../types'
import type { ConflictInfo } from '../../api/conflictResolution'
import type { ConflictResolution } from '../../stores/conflictStore'
import { Button } from '../ui/Button'

const FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  name: 'Name',
  description: 'Description',
  priority: 'Priority',
  start_date: 'Start Date',
  due_date: 'Due Date',
  category: 'Category',
  tags: 'Tags',
  background_color: 'Background',
  is_completed: 'Completed',
  completed_at: 'Completed At',
  position: 'Position',
  directory_id: 'Location',
  parent_id: 'Parent',
  depth_level: 'Depth',
}

function formatFieldValue(value: unknown): string {
  if (value == null) return '—'
  if (Array.isArray(value)) return value.join(', ') || '—'
  return String(value)
}

interface ConflictDialogProps {
  conflict: ConflictInfo
  onResolve: (resolution: ConflictResolution, data?: Task | Directory) => void
  onCancel: () => void
}

export function ConflictDialog({
  conflict,
  onResolve,
  onCancel,
}: ConflictDialogProps) {
  const [resolution, setResolution] = useState<ConflictResolution>('local')
  const [mergedData, setMergedData] = useState<Record<string, unknown>>(
    () => conflict.localData as unknown as Record<string, unknown>
  )

  const entityLabel = conflict.entityType === 'task' ? 'task' : 'directory'

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onCancel])

  const handleResolve = () => {
    if (resolution === 'local') {
      onResolve('local', conflict.localData)
    } else if (resolution === 'remote') {
      onResolve('remote', conflict.remoteData)
    } else {
      onResolve('merge', mergedData as unknown as Task | Directory)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border border-neutral-200 bg-white p-4 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="conflict-dialog">
          <div className="conflict-header mb-4">
            <h2 className="text-lg font-semibold text-flow-textPrimary m-0">
              Conflict Detected
            </h2>
            <p className="text-sm text-flow-textSecondary m-0 mt-1">
              This {entityLabel} was modified on another device.
            </p>
          </div>

          <div className="conflict-content mb-4">
            <div className="conflict-comparison grid grid-cols-2 gap-4 mb-4">
              <div className="local-version">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-flow-textSecondary mb-2">
                  Your Changes
                </h3>
                <div className="flex flex-col gap-2">
                  {conflict.conflictFields.map((field) => (
                    <div key={field} className="conflict-field">
                      <label className="block text-xs text-flow-textSecondary">
                        {FIELD_LABELS[field] ?? field}:
                      </label>
                      <div className="field-value text-sm text-flow-textPrimary p-2 bg-neutral-50 rounded">
                        {formatFieldValue(conflict.localData[field as keyof (Task | Directory)])}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="remote-version">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-flow-textSecondary mb-2">
                  Other Device&apos;s Changes
                </h3>
                <div className="flex flex-col gap-2">
                  {conflict.conflictFields.map((field) => (
                    <div key={field} className="conflict-field">
                      <label className="block text-xs text-flow-textSecondary">
                        {FIELD_LABELS[field] ?? field}:
                      </label>
                      <div className="field-value text-sm text-flow-textPrimary p-2 bg-neutral-50 rounded">
                        {formatFieldValue(conflict.remoteData[field as keyof (Task | Directory)])}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="resolution-options mb-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-flow-textSecondary mb-2">
                Resolution
              </h3>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="local"
                    checked={resolution === 'local'}
                    onChange={(e) =>
                      setResolution(e.target.value as ConflictResolution)
                    }
                  />
                  <span className="text-sm">Keep My Changes</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="remote"
                    checked={resolution === 'remote'}
                    onChange={(e) =>
                      setResolution(e.target.value as ConflictResolution)
                    }
                  />
                  <span className="text-sm">Use Other Device&apos;s Changes</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="merge"
                    checked={resolution === 'merge'}
                    onChange={(e) =>
                      setResolution(e.target.value as ConflictResolution)
                    }
                  />
                  <span className="text-sm">Merge Manually</span>
                </label>
              </div>
            </div>

            {resolution === 'merge' && (
              <div className="merge-interface border-t border-flow-columnBorder pt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-flow-textSecondary mb-2">
                  Merge Changes
                </h3>
                <div className="flex flex-col gap-2">
                  {conflict.conflictFields.map((field) => {
                    const localVal = conflict.localData[field as keyof (Task | Directory)]
                    const remoteVal = conflict.remoteData[field as keyof (Task | Directory)]
                    const currentVal = mergedData[field]
                    return (
                      <div key={field} className="merge-field">
                        <label className="block text-xs text-flow-textSecondary mb-1">
                          {FIELD_LABELS[field] ?? field}
                        </label>
                        <select
                          value={
                            currentVal != null
                              ? JSON.stringify(currentVal)
                              : ''
                          }
                          onChange={(e) => {
                            const choice = e.target.value
                            let parsed: unknown
                            try {
                              parsed = JSON.parse(choice)
                            } catch {
                              parsed = choice
                            }
                            setMergedData((prev) => ({ ...prev, [field]: parsed }))
                          }}
                          className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
                        >
                          <option value={JSON.stringify(localVal)}>
                            My version: {formatFieldValue(localVal)}
                          </option>
                          <option value={JSON.stringify(remoteVal)}>
                            Other version: {formatFieldValue(remoteVal)}
                          </option>
                        </select>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="conflict-actions flex gap-2 justify-end">
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={handleResolve}>
              Resolve Conflict
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
