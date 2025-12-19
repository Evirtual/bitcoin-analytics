import type { ReactNode } from 'react'
import { Component } from 'react'

export class ErrorBoundary extends Component<
  {
    fallback?: ReactNode
    children: ReactNode
  },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="page">
            <div className="banner error">Something went wrong. Please refresh.</div>
          </div>
        )
      )
    }

    return this.props.children
  }
}
