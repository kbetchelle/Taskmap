// Standardized error message format and helpers

export type ErrorCode =
  | 'VALIDATION'
  | 'NETWORK'
  | 'AUTH'
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'UNKNOWN'

export interface AppError {
  code: ErrorCode
  message: string
  details?: Record<string, unknown>
  cause?: unknown
}

export function toAppError(err: unknown): AppError {
  if (isAppError(err)) return err
  if (err instanceof Error) {
    const message = err.message || 'Something went wrong'
    let code: ErrorCode = 'UNKNOWN'
    if (message.includes('fetch') || message.includes('network') || message.includes('Failed to fetch'))
      code = 'NETWORK'
    if (message.includes('auth') || message.includes('session') || message.includes('JWT')) code = 'AUTH'
    if (message.includes('PGRST116') || message.includes('not found')) code = 'NOT_FOUND'
    if (message.includes('row-level security') || message.includes('policy')) code = 'FORBIDDEN'
    return { code, message, cause: err }
  }
  return {
    code: 'UNKNOWN',
    message: typeof err === 'string' ? err : 'Something went wrong',
    cause: err,
  }
}

export function isAppError(err: unknown): err is AppError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    'message' in err
  )
}

export function validationError(message: string, details?: Record<string, unknown>): AppError {
  return { code: 'VALIDATION', message, details }
}

export function networkError(message: string = 'Network error. Please check your connection.'): AppError {
  return { code: 'NETWORK', message }
}

export function userFacingMessage(err: AppError): string {
  switch (err.code) {
    case 'VALIDATION':
      return err.message
    case 'NETWORK':
      return err.message || 'Network error. Please try again.'
    case 'AUTH':
      return 'Session expired or invalid. Please sign in again.'
    case 'NOT_FOUND':
      return 'The item was not found.'
    case 'FORBIDDEN':
      return "You don't have permission to do that."
    case 'CONFLICT':
      return err.message || 'Conflict. Please refresh and try again.'
    default:
      return err.message || 'Something went wrong.'
  }
}
