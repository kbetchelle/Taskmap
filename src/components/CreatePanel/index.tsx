import { useState, useEffect } from 'react'
import { useAppStore } from '../../stores/appStore'
import { Button } from '../ui/Button'
import { ValidationErrors } from '../ValidationErrors'
import { validateDirectoryName, validateTaskTitle } from '../../lib/validation'

type CreateKind = 'task' | 'directory'

interface CreatePanelProps {
  kind: CreateKind
  directoryId?: string
  userId: string
  onCreated?: () => void
  onClose: () => void
}

export function CreatePanel({
  kind,
  directoryId,
  userId,
  onCreated,
  onClose,
}: CreatePanelProps) {
  const pushKeyboardContext = useAppStore((s) => s.pushKeyboardContext)
  const popKeyboardContext = useAppStore((s) => s.popKeyboardContext)

  useEffect(() => {
    pushKeyboardContext('creation')
    return () => popKeyboardContext()
  }, [pushKeyboardContext, popKeyboardContext])

  const [name, setName] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors([])
    const validation = kind === 'directory' ? validateDirectoryName(name) : validateTaskTitle(name)
    if (!validation.valid) {
      setErrors([validation.message])
      return
    }
    if (kind === 'task' && directoryId == null) {
      setErrors(['Select a directory first. Tasks cannot be created at Home (Column 1).'])
      return
    }
    setLoading(true)
    try {
      if (kind === 'directory') {
        const { insertDirectory } = await import('../../api/directories')
        await insertDirectory({
          name: name.trim(),
          parent_id: directoryId ?? null,
          start_date: null,
          position: 0,
          user_id: userId,
          depth_level: 0,
        })
      } else {
        // directoryId required (validated above)
        const { insertTask } = await import('../../api/tasks')
        await insertTask({
          title: name.trim(),
          directory_id: directoryId!,
          priority: null,
          start_date: null,
          due_date: null,
          background_color: null,
          category: null,
          tags: [],
          description: null,
          is_completed: false,
          completed_at: null,
          position: 0,
          user_id: userId,
        })
      }
      onCreated?.()
      onClose()
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'Failed to create'])
    } finally {
      setLoading(false)
    }
  }

  const label = kind === 'directory' ? 'Directory name' : 'Task title'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-4 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-medium text-neutral-900 mb-3">
          New {kind === 'directory' ? 'Directory' : 'Task'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="create-name" className="block text-sm text-neutral-700 mb-1">
              {label}
            </label>
            <input
              id="create-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              placeholder={kind === 'directory' ? 'e.g. Projects' : 'e.g. Review docs'}
              minLength={3}
              autoFocus
            />
          </div>
          <ValidationErrors errors={errors} />
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              Create
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
