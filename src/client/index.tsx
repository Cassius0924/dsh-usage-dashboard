/**
 * dsh-usage-dashboard client half: mounts the floating balance widget
 * (`shell.overlay`) and the 「额度」 view tab (`conversation.view`).
 * Data arrives through the package's own host API via same-origin fetch.
 */
import { ErrorBoundary } from './boundary.tsx'
import type { ClientContext } from './context.ts'
import { BalanceDashboard } from './dashboard.tsx'
import { css } from './styles.ts'
import { QuotaWidget } from './widget.tsx'

/** Plugin identity for the client bundle. */
export const name = 'dsh-usage-dashboard'

/** Services required before load. */
export const inject = ['slots']

/**
 * Mount the two surfaces.
 * @param ctx - client Cordis context.
 */
export function apply(ctx: ClientContext): void {
  // One stylesheet for the whole plugin; the module loader claims and removes
  // plugin-owned style tags on unload.
  if (typeof document !== 'undefined') {
    const tag = document.createElement('style')
    tag.dataset.plugin = 'dsh-usage-dashboard'
    tag.textContent = css
    document.head.appendChild(tag)
  }

  ctx.slots.inject('shell.overlay', () => ctx.slots.register(
    { name: 'shell.overlay', id: 'deepseek-quota', order: 1000, label: 'DeepSeek 额度' },
    () => <ErrorBoundary silent><QuotaWidget /></ErrorBoundary>,
  ))

  ctx.slots.inject('conversation.view', () => ctx.slots.register(
    { name: 'conversation.view', id: 'balance', order: 20, label: '额度' },
    () => <ErrorBoundary><BalanceDashboard /></ErrorBoundary>,
  ))
}
