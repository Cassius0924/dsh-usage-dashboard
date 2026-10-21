/**
 * Session cost pill in the composer dock (next to the host's「会话统计」and
 * 「Token 用量」pills). It shows the estimated spend of the whole conversation
 * and opens a small detail dialog above the dock — the same pill/dialog skin
 * the host uses for its own composer statistics, so the three read as one row.
 *
 * The figure comes from the plugin's own session-usage API (the same endpoint
 * the 「额度」tab's current-session card and the per-turn chip use), not from
 * host projections: cost has to follow this plugin's pricing table.
 */
import { useEffect, useLayoutEffect, useRef, useState, type ReactElement } from 'react'
import { createPortal } from 'react-dom'
import type { SessionUsageData } from '../contract.ts'
import { fetchSessionUsage, getCachedSessionUsage, subscribeSessionUsage } from './api.ts'
import { fmtInt } from './charts.tsx'
import { useI18n } from './i18n.tsx'
import { fmtTurnCost } from './message-cost.tsx'
import { ratesAt } from '../pricing.ts'

/** Viewport margin kept by the dialog clamp. */
const PANEL_MARGIN = 12
/** Distance between the pill's top edge and the dialog's bottom edge. */
const PANEL_GAP = 8

const cachedData = (sessionId: string): SessionUsageData | null => {
  const response = getCachedSessionUsage(sessionId)
  return response?.ok === true ? response.data ?? null : null
}

/** ¥ roundel, drawn at the host's 16-unit stroke-icon grid (rendered at 14px
 *  by the pill, matching the neighbouring pills' glyph size). */
function CostIcon(): ReactElement {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="8" cy="8" r="6" />
      <path d="M5.5 5.3 8 8.4l2.5-3.1" />
      <path d="M8 8.4v2.9" />
      <path d="M5.8 9.5h4.4" />
      <path d="M5.8 10.9h4.4" />
    </svg>
  )
}

/** One session cost reading plus its click-open breakdown. */
export function SessionCostPill({ sessionId }: { sessionId?: string }): ReactElement | null {
  const { t, locale } = useI18n()
  const [data, setData] = useState<SessionUsageData | null>(
    () => (sessionId === undefined || sessionId === '' ? null : cachedData(sessionId)),
  )
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLSpanElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = useState<{ left: number; bottom: number } | null>(null)

  useEffect(() => {
    if (sessionId === undefined || sessionId === '') return
    setData(cachedData(sessionId))
    const unsubscribe = subscribeSessionUsage(sessionId, () => setData(cachedData(sessionId)))
    // The per-turn chips fetch this same resource; skip a duplicate request
    // when one of them already warmed the cache for this session.
    if (getCachedSessionUsage(sessionId) === null) void fetchSessionUsage(sessionId)
    return unsubscribe
  }, [sessionId])

  // Portal placement: fixed above the pill and clamped to the viewport, the
  // same geometry the host's stat dialogs use. Measuring happens after the
  // hidden first paint so the clamp uses the panel's real width.
  useLayoutEffect(() => {
    if (!open) {
      setPos(null)
      return
    }
    const anchor = anchorRef.current
    const panel = panelRef.current
    if (anchor === null || panel === null) return
    const pill = anchor.getBoundingClientRect()
    const width = panel.getBoundingClientRect().width
    setPos({
      left: Math.min(Math.max(pill.left, PANEL_MARGIN), Math.max(PANEL_MARGIN, window.innerWidth - width - PANEL_MARGIN)),
      bottom: window.innerHeight - pill.top + PANEL_GAP,
    })
  }, [open, data])

  // Outside pointerdown, Escape, resize and any scroll dismiss the dialog;
  // it is anchored to a dock that scrolls away with the conversation.
  useEffect(() => {
    if (!open) return
    const close = (): void => setOpen(false)
    const onPointerDown = (event: PointerEvent): void => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (anchorRef.current?.contains(target) === true || panelRef.current?.contains(target) === true) return
      close()
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', close)
    document.addEventListener('scroll', close, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', close)
      document.removeEventListener('scroll', close, true)
    }
  }, [open])

  if (sessionId === undefined || sessionId === '' || data === null || data.calls === 0) return null

  const amount = `¥${fmtTurnCost(data.cost)}`
  // Money per billing bucket, not token counts: every model's recorded cost is
  // split across its three buckets in proportion to that bucket's share of the
  // bill at the session's own price era. Peak/off-peak multiply all three
  // buckets equally, so the share is not affected by when within the era the
  // session ran; the split still sums to the same total the pill shows.
  const priceAt = data.lastActive ?? Date.now()
  const split = data.models.reduce(
    (sum, model) => {
      const rates = ratesAt(priceAt, model.model)
      const weighted = {
        input: model.input * rates.input,
        cache: model.cache * rates.cacheHit,
        output: model.output * rates.output,
      }
      const weight = weighted.input + weighted.cache + weighted.output
      if (weight <= 0) return sum
      sum.input += model.cost * (weighted.input / weight)
      sum.cache += model.cost * (weighted.cache / weight)
      sum.output += model.cost * (weighted.output / weight)
      return sum
    },
    { input: 0, cache: 0, output: 0 },
  )
  const rangeTime = new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'zh-CN', {
    timeZone: 'Asia/Shanghai', month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
  const range = data.firstActive !== null && data.lastActive !== null
    ? `${rangeTime.format(data.firstActive)} – ${rangeTime.format(data.lastActive)}`
    : null

  return (
    <>
      <span ref={anchorRef} className="dq-cost-anchor">
        <button
          type="button"
          className="dq-cost-pill"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={t('sessionCost.aria', { amount })}
          onClick={() => setOpen(value => !value)}
        >
          <CostIcon />
          <span className="dq-cost-pill-label">{amount}</span>
        </button>
      </span>
      {open && createPortal(
        <div
          ref={panelRef}
          className="dq-cost-panel"
          role="dialog"
          aria-label={t('sessionCost.title')}
          style={pos === null
            ? { visibility: 'hidden', left: 0, top: 0 }
            : { visibility: 'visible', left: pos.left, bottom: pos.bottom, top: 'auto' }}
        >
          <div className="dq-cost-panel-title">
            <span className="dq-cost-panel-title-label">
              <CostIcon />
              {t('sessionCost.title')}
            </span>
            <span className="dq-cost-panel-value">{amount}</span>
          </div>
          <div className="dq-cost-panel-rule" aria-hidden />
          <dl className="dq-cost-details">
            <dt>{t('common.input')}</dt>
            <dd>¥{fmtTurnCost(split.input)}</dd>
            <dt>{t('common.cacheHit')}</dt>
            <dd>¥{fmtTurnCost(split.cache)}</dd>
            <dt>{t('common.output')}</dt>
            <dd>¥{fmtTurnCost(split.output)}</dd>
            <dt>{t('sessionUsage.calls')}</dt>
            <dd>{fmtInt(data.calls)}</dd>
            {range !== null && (
              <>
                <dt>{t('sessionCost.active')}</dt>
                <dd>{range}</dd>
              </>
            )}
          </dl>
        </div>,
        document.body,
      )}
    </>
  )
}
