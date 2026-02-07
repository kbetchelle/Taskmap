import type { AppError } from '../../lib/errors'

interface ValidationErrorsProps {
  errors: AppError[] | string[]
  className?: string
}

export function ValidationErrors({ errors, className = '' }: ValidationErrorsProps) {
  if (errors.length === 0) return null

  const messages = errors.map((e) =>
    typeof e === 'string' ? e : e.message
  )

  return (
    <ul
      className={`text-sm text-red-600 list-disc list-inside space-y-0.5 ${className}`}
      role="alert"
    >
      {messages.map((msg, i) => (
        <li key={i}>{msg}</li>
      ))}
    </ul>
  )
}
