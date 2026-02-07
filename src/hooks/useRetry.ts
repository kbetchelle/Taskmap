import { useCallback, useState } from 'react'
import { toAppError, networkError, type AppError } from '../lib/errors'

interface UseRetryOptions {
  maxAttempts?: number
  delayMs?: number
}

export function useRetry<T>(options: UseRetryOptions = {}) {
  const { maxAttempts = 3, delayMs = 1000 } = options
  const [error, setError] = useState<AppError | null>(null)
  const [loading, setLoading] = useState(false)

  const execute = useCallback(
    async (fn: () => Promise<T>): Promise<T | null> => {
      setError(null)
      setLoading(true)
      let lastErr: AppError | null = null
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const result = await fn()
          setLoading(false)
          return result
        } catch (e) {
          lastErr = toAppError(e)
          if (lastErr.code !== 'NETWORK' || attempt === maxAttempts) {
            setError(lastErr)
            setLoading(false)
            return null
          }
          await new Promise((r) => setTimeout(r, delayMs))
        }
      }
      setError(lastErr ?? networkError())
      setLoading(false)
      return null
    },
    [maxAttempts, delayMs]
  )

  const clearError = useCallback(() => setError(null), [])

  return { execute, error, loading, clearError }
}
