/**
 * dsh-usage-dashboard client half: mounts the floating balance widget
 * (`shell.overlay`), the 「额度」 view tab (`conversation.view`), an optional
 * sidebar entry / account-wide panel, and the per-turn cost chip.
 * Data arrives through the package's own host API via same-origin fetch.
 */
import { useEffect, useState, type ReactElement } from 'react'
import { ErrorBoundary } from './boundary.tsx'
import type { ClientContext } from './context.ts'
import { fetchBalance, fetchUsage } from './api.ts'
import { BalanceDashboard } from './dashboard.tsx'
import { BreakerPill } from './breaker-pill.tsx'
import { LocaleProvider, type Translate } from './i18n.tsx'
import { QUOTA_PANEL_ID, quotaTabIndexStore, sidebarEntryStore, viewOrderForIndex } from './layout-prefs.ts'
import { en, NS, zh } from './locales.ts'
import { MessageCost } from './message-cost.tsx'
import { SessionCostPill } from './session-cost-pill.tsx'
import { css } from './styles.ts'
import { quotaViewActiveStore } from './store.ts'
import { QuotaWidget, type UseSessionsHook } from './widget.tsx'
import { conversationViewsSource } from './views.ts'

/** Plugin identity for the client bundle. */
export const name = 'dsh-usage-dashboard'

/** Services required before load. */
export const inject = ['slots', 'locale', 'layout']

/** The host's `conversation.view` props include a session-addressable view
 *  switcher; the tab-position setting uses it to come back to 额度 after the
 *  registration is replaced with a new `order`. */
type OpenView = (view: string, focus: string) => void

/** Kept outside React so the registration half can restore the tab after a
 *  dispose/re-register cycle, even when that cycle unmounts the dashboard. */
let openQuotaTab: OpenView | null = null

/**
 * Mount the plugin surfaces.
 * @param ctx - client Cordis context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-usage-dashboard: browser dictionaries')
  const t = ctx.locale.bind(NS)
  const views = conversationViewsSource(ctx.slots)
  // One stylesheet for the whole plugin; the module loader claims and removes
  // plugin-owned style tags on unload.
  if (typeof document !== 'undefined') {
    // A hot reload can leave the previous version's tag behind; two sheets would
    // then mix old and new rules, so drop any stale copy before adding ours.
    document.querySelectorAll('style[data-plugin="dsh-usage-dashboard"]').forEach(node => node.remove())
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

  // Composer-dock session reading: one more pill beside the host's own
  // 「会话统计」/「Token 用量」entries (same slot, same skin), showing the
  // whole conversation's estimated spend and opening a detail dialog.
  ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register(
    { name: 'conversation.composer.dock', id: 'quota-cost', order: 2, locale: NS },
    ({ t: slotT, sessionId }: { t: Translate; sessionId?: string }) => (
      <LocaleProvider t={slotT}>
        <ErrorBoundary t={slotT} silent><SessionCostPill sessionId={sessionId} /></ErrorBoundary>
      </LocaleProvider>
    ),
  ))

  // Session-level breaker switch: same dock and skin as the cost pill, but it
  // governs only this conversation's peak-time behaviour. The 额度 page lists
  // what was switched on here.
  ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register(
    { name: 'conversation.composer.dock', id: 'peak-breaker', order: 3, locale: NS },
    ({ t: slotT, sessionId }: { t: Translate; sessionId?: string }) => (
      <LocaleProvider t={slotT}>
        <ErrorBoundary t={slotT} silent><BreakerPill sessionId={sessionId} /></ErrorBoundary>
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

  // --- 「额度」conversation tab, with a user-configurable position -----------
  //
  // The host orders view tabs by the slot entry's `order` (then registration
  // sequence), and the registration options are immutable once registered. A
  // position change therefore replaces the registration: the persisted index
  // is turned into an order between the neighbouring live entries, so it still
  // means the same thing when another plugin adds/removes a tab. Disposing the
  // entry makes the host fall back to Chat for a moment; the captured
  // `openView` switches back to 额度 right after the new entry exists.
  const QuotaView = ({ t: slotT, sessionId, openView }: {
    t: Translate
    sessionId?: string
    openView?: OpenView
  }): ReactElement => {
    useEffect(() => { if (openView !== undefined) openQuotaTab = openView }, [openView])
    return (
      <LocaleProvider t={slotT}>
        <ErrorBoundary t={slotT}><BalanceDashboard sessionId={sessionId} views={views} /></ErrorBoundary>
      </LocaleProvider>
    )
  }

  ctx.effect(() => {
    let disposeView: (() => void) | null = null
    const mount = (): void => {
      disposeView?.()
      disposeView = ctx.slots.inject('conversation.view', () => ctx.slots.register(
        {
          name: 'conversation.view',
          id: 'balance',
          order: viewOrderForIndex(ctx.slots.entries('conversation.view'), quotaTabIndexStore.get()),
          locale: NS,
          label: () => t('nav.quota'),
        },
        // `conversation.view` is a session-scoped slot, so the host injects its
        // standard session props (including `sessionId`) alongside `t`; only the
        // fields this plugin needs are destructured, per the existing
        // "hand-write the minimal structural type" convention (see context.ts).
        // `sessionId` stays optional: BalanceDashboard renders the current-
        // session card only when it actually has one, never throws either way.
        QuotaView,
      ))
    }
    mount()
    const unsubscribe = quotaTabIndexStore.subscribe(() => {
      // Only a conversation-mounted dashboard needs the view restored; in the
      // global panel the attribute is absent and the panel stays selected.
      const restore = document !== undefined
        && document.documentElement.hasAttribute('data-dq-quota-view')
      disposeView?.()
      disposeView = null
      mount()
      if (restore) queueMicrotask(() => openQuotaTab?.('balance', 'dsh-usage-dashboard:tab-order'))
    })
    return () => {
      unsubscribe()
      disposeView?.()
    }
  }, 'dsh-usage-dashboard: quota tab registration')

  // --- account-wide 额度 panel + optional sidebar entry ---------------------
  const QuotaPanel = ({ t: slotT }: { t: Translate }): ReactElement => (
    <div className="dq-panel">
      <div className="dq-panel-head" data-window-drag>
        <h1 className="dq-panel-title">{slotT('nav.quota')}</h1>
        <span className="dq-panel-caption">{slotT('panel.caption')}</span>
      </div>
      <LocaleProvider t={slotT}>
        <ErrorBoundary t={slotT}><BalanceDashboard views={views} /></ErrorBoundary>
      </LocaleProvider>
    </div>
  )

  /** The ¥ glyph drawn as a 16-unit stroke icon so it occupies the same box as
   *  the host's own sidebar icons (a text glyph is only ~8px wide, which pushed
   *  this row's label ~8px left of every other row). */
  const QuotaGlyph = ({ size, active }: { size: number; active?: boolean }): ReactElement => (
    <svg
      className="dq-side-icon"
      data-active={active === true ? 'true' : 'false'}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.1}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3.5 3.3 8 8.7l4.5-5.4" />
      <path d="M8 8.7V13.2" />
      <path d="M3.5 10.2h9" />
      <path d="M3.5 12.1h9" />
    </svg>
  )

  const QuotaFooterButton = ({ wide, t: slotT }: { wide: boolean; t: Translate }): ReactElement => {
    const [active, setActive] = useState(() => ctx.layout.panelInfo.getSnapshot().activePanelId === QUOTA_PANEL_ID)
    useEffect(() => {
      const sync = (): void => {
        setActive(ctx.layout.panelInfo.getSnapshot().activePanelId === QUOTA_PANEL_ID)
      }
      sync()
      return ctx.layout.panelInfo.subscribe(sync)
    }, [])
    return (
      <button
        type="button"
        className={`dq-side-entry${wide ? '' : ' dq-side-entry--rail'}`}
        title={slotT('panel.openAria')}
        aria-label={slotT('nav.quota')}
        aria-pressed={active}
        onClick={() => { ctx.layout.selectPanel(active ? null : QUOTA_PANEL_ID) }}
      >
        <span className="dq-side-entry-icon"><QuotaGlyph size={16} /></span>
        {wide && <span className="dq-side-entry-label">{slotT('nav.quota')}</span>}
      </button>
    )
  }

  // The panel itself always exists (its sidebar entry may be off); the entry
  // that reaches it is what the setting turns on and off.
  ctx.effect(() => ctx.slots.inject('main', () => ctx.slots.register(
    { name: 'main', key: QUOTA_PANEL_ID, locale: NS },
    QuotaPanel,
  )), 'dsh-usage-dashboard: quota panel')

  ctx.effect(() => {
    let disposeEntry: (() => void) | null = null
    const sync = (): void => {
      disposeEntry?.()
      disposeEntry = null
      const placement = sidebarEntryStore.get()
      if (placement === 'top') {
        // Append after the host's global panels (Plugins / Scheduled tasks /
        // Context insights) instead of taking the first row: the entry is an
        // addition to the existing navigation, not a replacement for its
        // order. A high order keeps that true even for plugins that register
        // after this one (the host sorts the list by order).
        disposeEntry = ctx.slots.inject('sidebar.panellist', () => ctx.slots.register(
          { name: 'sidebar.panellist', id: QUOTA_PANEL_ID, order: 1000, label: () => t('nav.quota'), locale: NS },
          QuotaGlyph,
        ))
        return
      }
      if (placement === 'bottom') {
        disposeEntry = ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register(
          { name: 'sidebar.footer.action', id: 'quota', order: 10, locale: NS },
          QuotaFooterButton,
        ))
        return
      }
      // Turning the entry off while its panel is open must not strand the
      // user on a panel with no visible entry: return to the conversation.
      if (ctx.layout.panelInfo.getSnapshot().activePanelId === QUOTA_PANEL_ID) ctx.layout.selectPanel(null)
    }
    sync()
    const unsubscribe = sidebarEntryStore.subscribe(sync)
    return () => {
      unsubscribe()
      disposeEntry?.()
    }
  }, 'dsh-usage-dashboard: sidebar entry')

  // --- hide the composer while the 「额度」conversation view is active -------
  //
  // The dashboard does not need the chat input, and hiding it gives the long
  // page the full column height. The attribute is only set when the mount is
  // inside the conversation scrollport, so the account-wide panel (which has
  // no composer) never touches host chrome. `quotaViewActiveStore` is the
  // already-existing "the dashboard is mounted" signal the widget reacts to.
  ctx.effect(() => {
    let applied = false
    const sync = (): void => {
      const root = document.querySelector('.dq-balance')
      const should = quotaViewActiveStore.get()
        && root !== null
        && root.closest('[data-conversation-scroll]') !== null
      if (should === applied) return
      applied = should
      if (should) document.documentElement.setAttribute('data-dq-quota-view', '')
      else document.documentElement.removeAttribute('data-dq-quota-view')
    }
    sync()
    const unsubscribe = quotaViewActiveStore.subscribe(sync)
    return () => {
      unsubscribe()
      if (applied) document.documentElement.removeAttribute('data-dq-quota-view')
    }
  }, 'dsh-usage-dashboard: composer visibility')
}
