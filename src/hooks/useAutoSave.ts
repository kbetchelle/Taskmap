import { useCallback, useRef, useEffect } from 'react'
import { toAppError, type AppError } from '../lib/errors'

interface UseAutoSaveOptions<T> {
  value: T
  onSave: (value: T) => Promise<void>
  debounceMs?: number
  onError?: (err: AppError) => void
  enabled?: boolean
}

/**
 * Debounced auto-save with:
 * - Save on value change (debounced)
 * - Save on Enter (via submit callback)
 * - Save on blur (via saveNow + blur handler)
 * - Optimistic: call onSave; on reject, call onError and optionally rollback
 */
export function useAutoSave<T>({
  value,
  onSave,
  debounceMs = 1000,
  onError,
  enabled = true,
}: UseAutoSaveOptions<T>) {
  const valueRef = useRef(value)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savingRef = useRef(false)
  const previousValueRef = useRef<T>(value)

  const saveNow = useCallback(async () => {
    if (!enabled || savingRef.current) return
    savingRef.current = true
    previousValueRef.current = valueRef.current
    try {
      await onSave(valueRef.current)
    } catch (e) {
      const appErr = toAppError(e)
      onError?.(appErr)
      // Rollback: caller can use previousValueRef if they store value in state
    } finally {
      savingRef.current = false
    }
  }, [enabled, onSave, onError])

  // Debounced save on value change
  useEffect(() => {
    valueRef.current = value
    if (!enabled) return
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null
      saveNow()
    }, debounceMs)
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [value, debounceMs, enabled, saveNow])

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      saveNow()
    },
    [saveNow]
  )

  const handleBlur = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    saveNow()
  }, [saveNow])

  return { saveNow, handleSubmit, handleBlur, previousValue: previousValueRef.current }
}
