/** The draggable bottom-right floating balance widget.
 *
 * Where it sits (corner) and whether it is collapsed are user choices, so both
 * are persisted (see ./prefs.ts) and restored before the first paint; the
 * widget also re-snaps to its corner when the frame resizes (window resize,
 * sidebar collapse) instead of stranding itself at stale pixel coordinates.
 */
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactElement } from 'react'
import { fetchBalance, fetchUsage, getCachedBalance, getCachedUsage, getCachedUsageAt, subscribeUsage } from './api.ts'
import { fmt } from './charts.tsx'
import type { BalanceData, UsageData } from '../contract.ts'
import { getMainColumn, getShellFrame, slotBox } from './dom.ts'
import { localizeApiError, useI18n } from './i18n.tsx'
import { isBoolean, loadPref, savePref } from './prefs.ts'
import { lowBalanceStore, quotaViewActiveStore, widgetVisibleStore } from './store.ts'

const MARGIN = 16

type Corner = 'tl' | 'tr' | 'bl' | 'br'

const CORNER_KEY = 'widget.corner'
const COLLAPSED_KEY = 'widget.collapsed'

const isCorner = (value: unknown): boolean =>
  value === 'tl' || value === 'tr' || value === 'bl' || value === 'br'

interface Bounds {
  left: number
  top: number
  right: number
  bottom: number
}

interface DragSession {
  pointerId: number
  startX: number
  startY: number
  originX: number
  originY: number
  width: number
  height: number
  bounds: Bounds
}

/** Below this the region is too short to park a widget in, so an exclusion is
 *  skipped rather than squeezing the widget out of the frame. */
const MIN_REGION_HEIGHT = 140

/**
 * Draggable area = the main column minus the session header and the composer.
 *
 * Using the main column (rather than the whole frame minus the sidebar) also
 * keeps the widget clear of the right-hand details panel when it is open.
 * The header is excluded so the widget can never park on the Chat / Trajectory
 * / 额度 tab row and swallow its clicks, and the composer is excluded because a
 * bottom-right widget otherwise covers the model picker and the send button —
 * the two controls the user reaches for most.
 */
function getBounds(node: HTMLElement | null): Bounds {
  const fallback: Bounds = { left: 0, top: 0, right: 100000, bottom: 100000 }
  if (node === null) return fallback
  const frame = getShellFrame(node)
  if (frame === null) return fallback
  const frameRect = frame.getBoundingClientRect()
  let left = frameRect.left
  let right = frameRect.right
  let top = frameRect.top
  const mainRect = getMainColumn(frame)?.getBoundingClientRect() ?? null
  if (mainRect !== null && mainRect.width > 0) {
    left = mainRect.left
    right = mainRect.right
    top = mainRect.top
  } else {
    const sidebarRect = (frame.children[0] as HTMLElement | undefined)?.getBoundingClientRect() ?? null
    if (sidebarRect !== null) left = sidebarRect.right
  }
  let bottom = frameRect.bottom
  const headerRect = slotBox(frame, 'conversation.session.header', 'child')
  if (headerRect !== null && headerRect.bottom > top && headerRect.bottom < bottom - MIN_REGION_HEIGHT) {
    top = headerRect.bottom
  }
  const composerRect = slotBox(frame, 'conversation.composer.dock', 'ancestor')
  if (composerRect !== null && composerRect.top < bottom && composerRect.top > top + MIN_REGION_HEIGHT) {
    bottom = composerRect.top
  }
  return { left, top, right, bottom }
}

function cornerPos(corner: Corner, node: HTMLElement | null, bounds: Bounds): { x: number; y: number } {
  const rect = node?.getBoundingClientRect()
  const w = rect?.width ?? 0
  const h = rect?.height ?? 0
  const xLeft = bounds.left + MARGIN
  const yTop = bounds.top + MARGIN
  const xRight = bounds.right - w - MARGIN
  const yBottom = bounds.bottom - h - MARGIN
  if (corner === 'tl') return { x: xLeft, y: yTop }
  if (corner === 'tr') return { x: xRight, y: yTop }
  if (corner === 'bl') return { x: xLeft, y: yBottom }
  return { x: xRight, y: yBottom }
}

export function QuotaWidget(): ReactElement | null {
  const { t } = useI18n()
  const [visible, setVisible] = useState(widgetVisibleStore.get())
  useEffect(() => widgetVisibleStore.subscribe(() => setVisible(widgetVisibleStore.get())), [])
  const [quotaViewActive, setQuotaViewActive] = useState(quotaViewActiveStore.get())
  useEffect(() => quotaViewActiveStore.subscribe(() => setQuotaViewActive(quotaViewActiveStore.get())), [])
  const [lowBalance, setLowBalance] = useState(lowBalanceStore.get())
  useEffect(() => lowBalanceStore.subscribe(() => setLowBalance(lowBalanceStore.get())), [])

  const cachedBalance = getCachedBalance()
  const [data, setData] = useState<BalanceData | null>(cachedBalance?.data ?? null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(cachedBalance === null)
  const [collapsed, setCollapsed] = useState(() => loadPref<boolean>(COLLAPSED_KEY, isBoolean, false))
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const [corner, setCorner] = useState<Corner>(() => loadPref<Corner>(CORNER_KEY, isCorner, 'br'))
  const [dragging, setDragging] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<DragSession | null>(null)

  // Today's spend comes from the shared usage cache — never fetched on the
  // widget's own poll, since aggregating the session logs takes seconds. A
  // manual refresh (below) is the one place the widget pays for it.
  const readUsage = (): { data: UsageData | null; at: number | null } => {
    const cached = getCachedUsage()
    return { data: cached?.ok === true ? cached.data ?? null : null, at: getCachedUsageAt() }
  }
  const [usage, setUsage] = useState(readUsage)
  useEffect(() => subscribeUsage(() => setUsage(readUsage())), [])

  const load = async (showLoading: boolean, force = false): Promise<void> => {
    if (showLoading) setLoading(true)
    try {
      const res = await fetchBalance(force)
      if (res.ok && res.data !== undefined) {
        setData(res.data)
        setError(null)
      } else {
        setData(null)
        setError(res.error ?? '')
      }
    } catch (err) {
      setData(null)
      setError((err as { message?: string } | null)?.message ?? String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load(true)
    const id = setInterval(() => { void load(false) }, 60_000)
    return () => clearInterval(id)
  }, [])

  /**
   * Keep the widget parked in its corner: on mount (restoring the persisted
   * corner before the first paint), when collapse/expand changes its size, and
   * whenever the layout moves under it — window resize, sidebar collapse or
   * the details panel opening (observed), plus a slow poll that catches the
   * one change no observer reports: the session header mounting *after* the
   * overlay, which would otherwise leave the widget parked over the tab row.
   *
   * `place` keeps the previous object when the corner has not actually moved,
   * so repeated triggers cost one rect read and no re-render.
   */
  useLayoutEffect(() => {
    if (!visible || quotaViewActive) return
    const node = rootRef.current
    if (node === null) return
    const place = (): void => {
      if (dragRef.current !== null) return
      const next = cornerPos(corner, node, getBounds(node))
      setPos(prev => (prev !== null && prev.x === next.x && prev.y === next.y ? prev : next))
    }
    place()
    const frame = getShellFrame(node)
    let observer: ResizeObserver | null = null
    if (frame !== null && typeof ResizeObserver === 'function') {
      observer = new ResizeObserver(place)
      observer.observe(frame)
      const main = getMainColumn(frame)
      if (main !== null) observer.observe(main)
    }
    window.addEventListener('resize', place)
    const poll = setInterval(place, 1000)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', place)
      clearInterval(poll)
    }
  }, [visible, quotaViewActive, corner, collapsed])

  const snapToNearest = (session: DragSession): void => {
    const node = rootRef.current
    if (node === null) return
    const { width: w, height: h, bounds: b } = session
    const corners: Array<{ c: Corner; x: number; y: number }> = [
      { c: 'tl', x: b.left + MARGIN, y: b.top + MARGIN },
      { c: 'tr', x: b.right - w - MARGIN, y: b.top + MARGIN },
      { c: 'bl', x: b.left + MARGIN, y: b.bottom - h - MARGIN },
      { c: 'br', x: b.right - w - MARGIN, y: b.bottom - h - MARGIN },
    ]
    const rect = node.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    let best = corners[0]
    let bestDistance = Number.POSITIVE_INFINITY
    for (const candidate of corners) {
      const ccx = candidate.x + w / 2
      const ccy = candidate.y + h / 2
      const distance = (ccx - cx) ** 2 + (ccy - cy) ** 2
      if (distance < bestDistance) {
        bestDistance = distance
        best = candidate
      }
    }
    setCorner(best.c)
    savePref(CORNER_KEY, best.c)
    setPos({ x: best.x, y: best.y })
  }

  /** Idempotent end-of-drag; also the missed-pointerup backstop. */
  const endDrag = (snap: boolean): void => {
    const session = dragRef.current
    if (session === null) return
    dragRef.current = null
    setDragging(false)
    const node = rootRef.current
    if (node !== null && typeof node.releasePointerCapture === 'function') {
      try {
        node.releasePointerCapture(session.pointerId)
      } catch {
        // capture already released
      }
    }
    if (snap) {
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => snapToNearest(session))
      } else {
        snapToNearest(session)
      }
    }
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>): void => {
    if (e.button !== 0) return
    const target = e.target as Element | null
    if (target !== null && typeof target.closest === 'function' && target.closest('button') !== null) return
    const node = rootRef.current
    if (node === null) return
    const bounds = getBounds(node)
    const rect = node.getBoundingClientRect()
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: rect.left,
      originY: rect.top,
      width: rect.width,
      height: rect.height,
      bounds,
    }
    node.setPointerCapture(e.pointerId)
    setDragging(true)
    e.preventDefault()
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>): void => {
    const session = dragRef.current
    if (session === null || session.pointerId !== e.pointerId) return
    if ((e.buttons & 1) === 0) {
      endDrag(true)
      return
    }
    const dx = e.clientX - session.startX
    const dy = e.clientY - session.startY
    const maxX = session.bounds.right - session.width - MARGIN
    const maxY = session.bounds.bottom - session.height - MARGIN
    const minX = session.bounds.left + MARGIN
    const minY = session.bounds.top + MARGIN
    setPos({
      x: Math.max(minX, Math.min(session.originX + dx, maxX)),
      y: Math.max(minY, Math.min(session.originY + dy, maxY)),
    })
  }

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>): void => {
    const session = dragRef.current
    if (session === null || session.pointerId !== e.pointerId) return
    endDrag(true)
  }

  if (!visible) return null

  const primary = data !== null && data.balances.length > 0 ? data.balances[0] : null
  const balanceValue = primary !== null ? Number(primary.total) : Number.NaN
  const low = lowBalance > 0 && Number.isFinite(balanceValue) && balanceValue < lowBalance
  const dotClass = primary === null
    ? 'dsh-quota-dot dsh-quota-dot--idle'
    : data?.isAvailable === false
      ? 'dsh-quota-dot dsh-quota-dot--error'
      : low ? 'dsh-quota-dot dsh-quota-dot--warn' : 'dsh-quota-dot'

  // The usage figure can be minutes old (it is only refreshed on demand), so
  // say how old rather than presenting it as live.
  const ageMinutes = usage.at === null ? null : Math.floor((Date.now() - usage.at) / 60_000)
  const usageAgeText = ageMinutes === null || ageMinutes < 1
    ? t('widget.updatedNow')
    : t('widget.stale', { minutes: ageMinutes })

  let body: ReactElement | null = null
  if (!collapsed) {
    if (loading && data === null && error === null) {
      body = <div className="dsh-quota-body">{t('widget.loading')}</div>
    } else if (error !== null && data === null) {
      body = <div className="dsh-quota-body dsh-quota-error">{localizeApiError(error, t, 'error.query')}</div>
    } else if (primary !== null) {
      body = (
        <div className="dsh-quota-body">
          <div className="dsh-quota-remaining-label">{t('balance.remaining')}</div>
          <div title={low ? t('widget.lowTitle', { amount: fmt(lowBalance) }) : undefined}>
            <span className={`dsh-quota-total${low ? ' dsh-quota-total--low' : ''}`}>{fmt(primary.total)}</span>
            <span className="dsh-quota-currency">{primary.currency}</span>
          </div>
          {usage.data !== null && (
            <div className="dsh-quota-row" title={t('widget.todayCostTitle', { age: usageAgeText })}>
              <span className="dsh-quota-label">{t('widget.todayCost')}</span>
              <span className="dsh-quota-value">¥ {fmt(usage.data.summary.today.cost)}</span>
            </div>
          )}
          {data?.isAvailable === false && (
            <div className="dsh-quota-row">
              <span className="dsh-quota-label">{t('common.status')}</span>
              <span className="dsh-quota-value dsh-quota-error">{t('common.unavailable')}</span>
            </div>
          )}
        </div>
      )
    } else {
      body = <div className="dsh-quota-body dsh-quota-error">{t('widget.noBalance')}</div>
    }
  }

  const style: CSSProperties | undefined = pos !== null
    ? { left: `${pos.x}px`, top: `${pos.y}px`, right: 'auto', bottom: 'auto' }
    : undefined

  return (
    <div
      className={`dsh-quota-root${dragging ? ' dsh-quota-dragging' : ''}${quotaViewActive ? ' dsh-quota-root--dashboard' : ''}`}
      style={style}
      aria-hidden={quotaViewActive}
    >
      <div
        ref={rootRef}
        className="dsh-quota-card"
        title={t('widget.dragCard')}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => endDrag(false)}
        onLostPointerCapture={() => endDrag(false)}
      >
        <div className="dsh-quota-header">
          <div className="dsh-quota-title">
            <span className="dsh-quota-grip" title={t('widget.dragGrip')}>⠇</span>
            <span className={dotClass} />
            <span className="dsh-quota-name">{t('widget.title')}</span>
            {collapsed && primary !== null && (
              <span className={`dsh-quota-collapsed-total${low ? ' dsh-quota-total--low' : ''}`}>{fmt(primary.total)} {primary.currency}</span>
            )}
          </div>
          <div className="dsh-quota-actions">
            <button
              className="dsh-quota-btn"
              type="button"
              title={t('widget.refresh')}
              aria-label={t('widget.refresh')}
              disabled={loading}
              onClick={() => {
                void load(true, true)
                void fetchUsage(true)
              }}
            >
              ↻
            </button>
            <button
              className="dsh-quota-btn"
              type="button"
              title={collapsed ? t('widget.expand') : t('widget.collapse')}
              aria-label={collapsed ? t('widget.expandAria') : t('widget.collapseAria')}
              aria-expanded={!collapsed}
              onClick={() => {
                const next = !collapsed
                setCollapsed(next)
                savePref(COLLAPSED_KEY, next)
              }}
            >
              {collapsed ? '+' : '−'}
            </button>
          </div>
        </div>
        {body}
      </div>
    </div>
  )
}
