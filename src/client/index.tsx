/**
 * dsh-usage-dashboard client half: mounts the floating balance widget
 * (`shell.overlay`) and the 「额度」 view tab (`conversation.view`).
 * Data arrives through the package's own host API via same-origin fetch.
 */
import { ErrorBoundary } from './boundary.tsx'
import type { ClientContext } from './context.ts'
import { fetchBalance, fetchUsage } from './api.ts'
import { BalanceDashboard } from './dashboard.tsx'
import { LocaleProvider, type Translate } from './i18n.tsx'
import { en, NS, zh } from './locales.ts'
import { MessageCost } from './message-cost.tsx'
import { css } from './styles.ts'
import { QuotaWidget, type UseSessionsHook } from './widget.tsx'
import { conversationViewsSource } from './views.ts'

/** Plugin identity for the client bundle. */
export const name = 'dsh-usage-dashboard'

/** Services required before load. */
export const inject = ['slots', 'locale']

/**
 * Mount the two surfaces.
 * @param ctx - client Cordis context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-usage-dashboard: browser dictionaries')
  const t = ctx.locale.bind(NS)
  const views = conversationViewsSource(ctx.slots)
  // One stylesheet for the whole plugin; the module loader claims and removes
  // plugin-owned style tags on unload.
  if (typeof document !== 'undefined') {
    const tag = document.createElement('style')
    tag.dataset.plugin = 'dsh-usage-dashboard'
    tag.textContent = css
    document.head.appendChild(tag)
  }

  // Warm both caches the moment the client bundle loads, rather than waiting
  // for the 「额度」 tab to mount. Usage aggregation alone takes seconds (it
  // replays every session log), so without this the tab's first open always
  // paid that latency; with it, by the time someone actually clicks the tab
  // the fetch has usually already landed and the tab renders from cache. Not
  // awaited and not surfaced: a failure here just leaves the widget/tab to
  // fetch (and report) it themselves on mount, same as before this existed.
  void fetchBalance().catch(() => {})
  void fetchUsage().catch(() => {})

  ctx.slots.inject('shell.overlay', () => ctx.slots.register(
    { name: 'shell.overlay', id: 'deepseek-quota', order: 1000, locale: NS, label: () => t('widget.title') },
    ({ t: slotT, useSessions }: { t: Translate; useSessions: UseSessionsHook }) => (
      <LocaleProvider t={slotT}>
        <ErrorBoundary t={slotT} silent><QuotaWidget useSessions={useSessions} views={views} /></ErrorBoundary>
      </LocaleProvider>
    ),
  ))

  ctx.slots.inject('conversation.chat.assistant-actions', () => ctx.slots.register(
    {
      name: 'conversation.chat.assistant-actions',
      id: 'dsh-usage-turn-cost',
      order: 5,
      locale: NS,
      label: () => t('messageCost.label'),
    },
    ({ t: slotT, sessionId, messageId }: { t: Translate; sessionId: string; messageId: string }) => (
      <LocaleProvider t={slotT}>
        <ErrorBoundary t={slotT} silent>
          <MessageCost sessionId={sessionId} messageId={messageId} />
        </ErrorBoundary>
      </LocaleProvider>
    ),
  ))

  ctx.slots.inject('conversation.view', () => ctx.slots.register(
    { name: 'conversation.view', id: 'balance', order: 20, locale: NS, label: () => t('nav.quota') },
    // `conversation.view` is a session-scoped slot, so the host injects its
    // standard session props (including `sessionId`) alongside `t` — this
    // plugin only destructures the two fields it needs, per the existing
    // "hand-write the minimal structural type" convention (see context.ts).
    // `sessionId` is typed optional defensively even though the host is
    // expected to always supply it: BalanceDashboard renders the current-
    // session card only when it actually has one, never throws either way.
    ({ t: slotT, sessionId }: { t: Translate; sessionId?: string }) => (
      <LocaleProvider t={slotT}>
        <ErrorBoundary t={slotT}><BalanceDashboard sessionId={sessionId} views={views} /></ErrorBoundary>
      </LocaleProvider>
    ),
  ))
}
