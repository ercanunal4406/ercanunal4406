import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  label: string
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[${this.props.label}]`, error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="border border-neutral-800 bg-neutral-950 p-4 text-xs text-rose-400">
          {this.props.label} render edilirken bir hata oluştu: {this.state.error.message}
        </div>
      )
    }
    return this.props.children
  }
}
