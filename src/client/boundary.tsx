/**
 * Error boundary for the plugin's two slot entries.
 *
 * A slot component that throws while rendering takes its whole subtree down —
 * for the 「额度」 view that meant a blank tab, and the only thing that fixed it
 * was a browser profile with no localStorage. A crash should degrade to
 * something the user can act on, and it should never be the tab's silent
 * default state.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react'
import type { Translate } from './i18n.tsx'

const PREFIX = 'dsh-usage-dashboard:'

/** Drop every key this plugin owns — caches and preferences alike. */
function clearPluginStorage(): void {
  if (typeof localStorage === 'undefined') return
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(PREFIX)) localStorage.removeItem(key)
    }
  } catch {
    // Nothing better to do; the reload below is still worth attempting.
  }
}

interface Props {
  /** Shown instead of the fallback UI when the surface has no room for it. */
  silent?: boolean
  t: Translate
  children: ReactNode
}

interface State {
  message: string | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { message: null }

  static getDerivedStateFromError(error: unknown): State {
    return { message: (error as { message?: string } | null)?.message ?? String(error) }
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error('[dsh-usage-dashboard] render failed', error, info.componentStack)
  }

  private readonly reset = (): void => {
    clearPluginStorage()
    location.reload()
  }

  render(): ReactNode {
    const { message } = this.state
    if (message === null) return this.props.children
    if (this.props.silent === true) return null
    const { t } = this.props
    return (
      <div className="dq-balance">
        <div className="dq-card">
          <div className="dq-card-title">{t('boundary.title')}</div>
          <p className="dq-empty">{t('boundary.body')}</p>
          <pre className="dq-crash">{message}</pre>
          <button type="button" className="dq-refresh-btn" onClick={this.reset}>
            {t('boundary.reset')}
          </button>
        </div>
      </div>
    )
  }
}
