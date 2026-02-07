import { useState, useEffect, useRef, useCallback } from 'react'
import { showInlineError } from '../../lib/inlineError'

interface DirectoryInlineInputProps {
  itemId: string
  initialValue?: string
  onSave: (name: string) => void
  onCancel: () => void
  minLength?: number
}

export function DirectoryInlineInput({
  itemId,
  initialValue = '',
  onSave,
  onCancel,
  minLength = 3,
}: DirectoryInlineInputProps) {
  const [value, setValue] = useState(initialValue)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [])

  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        const trimmed = value.trim()
        if (trimmed.length < minLength) {
          showInlineError(itemId, `${minLength} or more characters needed`)
          return
        }
        onSave(trimmed)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
    },
    [value, minLength, itemId, onSave, onCancel]
  )

  return (
    <div
      id={`item-${itemId}`}
      className="flex items-center py-2 px-3 min-h-[32px] border-b border-transparent"
      data-creation-directory-input
    >
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Directory name..."
        className="flex-1 min-w-0 px-0 py-0 border-0 bg-transparent text-flow-task text-flow-textPrimary placeholder:text-flow-textSecondary focus:outline-none focus:ring-0"
        data-keyboard-ignore
      />
    </div>
  )
}
