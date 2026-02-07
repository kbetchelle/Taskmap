import { type ReactNode, Component, type ErrorInfo } from 'react'
import { toAppError, userFacingMessage } from '../../lib/errors'
import { Button } from '../ui/Button'

interface Props {
  children: ReactNode
  fallback?: (error: Error, reset: () => void) => ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  reset = () => this.setState({ error: null })

  render() {
    const { error } = this.state
    const { children, fallback } = this.props

    if (error != null && fallback != null) {
      return fallback(error, this.reset)
    }

    if (error != null) {
      const appError = toAppError(error)
      const message = userFacingMessage(appError)
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-900">
          <h3 className="text-sm font-medium mb-1">Something went wrong</h3>
          <p className="text-sm mb-3">{message}</p>
          <Button variant="secondary" onClick={this.reset}>
            Try again
          </Button>
        </div>
      )
    }

    return children
  }
}
