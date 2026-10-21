/**
 * 高峰暂停 pill in the composer dock, beside the host's own
 * 「会话统计」/「Token 用量」pills and this plugin's 「会话费用」pill. It is the
 * switch for the current conversation only: on means this session's
 * user-started turns pause during Beijing-time peak pricing and resume at
 * 18:00. The 额度 page lists every session that opted in and carries the
 * master switch; this pill is where a single conversation opts in.
 *
 * The three states are told apart by three channels at once, never colour
 * alone: copy (「高峰暂停 · 关」/「高峰暂停 · 开」/「已暂停 · 18:00」), glyph
 * (outline / solid) and colour (neutral / primary / warn).
 *
 * Skin and geometry mirror `./session-cost-pill.tsx` (same slot, same
 * `.dq-cost-pill`), so the dock reads as one row. The switch writes
 * optimistically, then takes the host's returned projection as truth; a
 * failure rolls back and is surfaced through `title`/`aria-label` only.
 */
import { useEffect, useRef, useState, type ReactElement } from 'react'
import { fetchBreaker, updateBreaker } from './api.ts'
import {
  beijingClock,
  breakerIsUsable,
  isSessionOptedIn,
  sessionBreakerState,
  withSessionToggled,
  type SessionBreakerState,
} from './breaker.ts'
import { useBreakerData, publishBreakerData } from './breaker-state.ts'
import { localizeApiError, useI18n } from './i18n.tsx'

/** The composer pill is the only place a parked turn becomes visible while it
 *  waits, and parking happens mid-turn, so it refreshes often; the projection
 *  is a few hundred bytes. */
const POLL_MS = 10_000

/**
 * Two glyph variants on the neighbours' 16-unit grid: an outlined pause disc
 * while off, a solid disc with the pause bars knocked out while on/holding.
 * The outline/solid difference survives greyscale and colour blindness, so the
 * state never depends on the tone alone.
 */
function BreakerIcon({ state }: { state: SessionBreakerState }): ReactElement {
  if (state === 'off') {
    return (
      <svg
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="8" cy="8" r="5.9" />
        <path d="M6.5 5.9v4.2" />
        <path d="M9.5 5.9v4.2" />
      </svg>
    )
  }
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" focusable="false">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8 1.6a6.4 6.4 0 1 0 0 12.8A6.4 6.4 0 0 0 8 1.6Zm-1.85 3.5h1.3v5.8h-1.3V5.1Zm2.4 0h1.3v5.8h-1.3V5.1Z"
      />
    </svg>
  )
}

export function BreakerPill({ sessionId }: { sessionId?: string }): ReactElement | null {
  const { t } = useI18n()
  const data = useBreakerData()
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  // A switch write and the poll can overlap; the poll must not overwrite the
  // state the write just produced.
  const savingRef = useRef(false)
  const mutationSeq = useRef(0)
  // A write started in one conversation must not land after the dock moved to
  // another one (the host usually remounts the slot, but not always).
  const sessionIdRef = useRef(sessionId)
  useEffect(() => {
    sessionIdRef.current = sessionId
  }, [sessionId])

  useEffect(() => {
    if (sessionId === undefined || sessionId === '') return
    let cancelled = false
    setLoadError(null)
    setActionError(null)

    const pull = async (): Promise<void> => {
      const seqAtStart = mutationSeq.current
      const res = await fetchBreaker()
      if (cancelled) return
      if (!breakerIsUsable(res)) {
        setLoadError(res.error ?? '')
        return
      }
      setLoadError(null)
      if (seqAtStart !== mutationSeq.current || savingRef.current) return
      publishBreakerData(res.data)
    }
    void pull()
    const timer = window.setInterval(() => { void pull() }, POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [sessionId])

  if (sessionId === undefined || sessionId === '') return null

  const state = sessionBreakerState(data, sessionId)
  const on = state !== 'off'
  // The master switch lives on the 额度 page. While it is off nothing pauses,
  // so the pill reads off; its own copy explains why and still flips this
  // conversation's stored switch.
  const masterOff = data !== null && !data.enabled
  const optedIn = isSessionOptedIn(data, sessionId)
  const resumeClock = beijingClock(data?.resumeAt ?? null) ?? '18:00'
  const errorSource = actionError ?? loadError
  const errorText = errorSource === null
    ? null
    : t('breaker.actionError', { error: localizeApiError(errorSource, t, 'error.query') })
  const label = state === 'holding'
    ? t('breaker.pillHolding', { clock: resumeClock })
    : state === 'on' ? t('breaker.pillOn') : t('breaker.pillOff')
  const baseTitle = masterOff
    ? t('breaker.pillTitleMasterOff')
    : state === 'holding'
      ? t('breaker.pillTitleHolding', { clock: resumeClock })
      : state === 'on' ? t('breaker.pillTitleOn', { clock: resumeClock }) : t('breaker.pillTitleOff')
  const title = errorText === null ? baseTitle : `${baseTitle} · ${errorText}`
  const baseAria = masterOff
    ? t('breaker.pillAriaMasterOff')
    : state === 'holding'
      ? t('breaker.pillAriaHolding', { clock: resumeClock })
      : state === 'on' ? t('breaker.pillAriaOn', { clock: resumeClock }) : t('breaker.pillAriaOff')
  const ariaLabel = errorText === null ? baseAria : `${baseAria} · ${errorText}`

  const toggle = async (): Promise<void> => {
    if (savingRef.current) return
    // Direction follows the conversation's own switch, not the projected pill:
    // with the master switch off the pill reads off while the stored switch can
    // still be on, and clicking it must turn that stored switch off.
    const next = !optedIn
    const previous = data
    publishBreakerData(withSessionToggled(previous, sessionId, next))
    setActionError(null)
    savingRef.current = true
    setSaving(true)
    const seq = ++mutationSeq.current
    try {
      const res = await updateBreaker({ sessionId, enabled: next })
      if (seq !== mutationSeq.current || sessionIdRef.current !== sessionId) return
      if (breakerIsUsable(res)) {
        publishBreakerData(res.data)
        setLoadError(null)
        return
      }
      publishBreakerData(previous)
      setActionError(res.error ?? '')
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  return (
    <span className="dq-cost-anchor">
      <button
        type="button"
        className={`dq-cost-pill dq-breaker-pill dq-breaker-pill--${state}`}
        aria-pressed={on}
        aria-busy={saving}
        aria-label={ariaLabel}
        title={title}
        disabled={saving}
        onClick={() => { void toggle() }}
      >
        <BreakerIcon state={state} />
        <span className="dq-cost-pill-label">{label}</span>
      </button>
    </span>
  )
}
