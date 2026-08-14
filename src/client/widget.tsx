/** The draggable bottom-right floating balance widget. */
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactElement } from 'react'
import { fetchBalance } from './api.ts'
import { fmt } from './charts.tsx'
import type { BalanceData } from '../contract.ts'
import { getWidgetVisible, subscribeWidgetVisible } from './store.ts'

const MARGIN = 16

type Corner = 'tl' | 'tr' | 'bl' | 'br'

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

/** Draggable area = the frame minus the left sidebar and the session header. */
function getBounds(node: HTMLElement | null): Bounds {
  const fallback: Bounds = { left: 0, top: 0, right: 100000, bottom: 100000 }
  if (node === null) return fallback
  const overlay = typeof node.closest === 'function' ? node.closest('[data-shell-overlay]') : null
  const frame = overlay?.parentElement ?? null
  if (frame === null) return fallback
  const frameRect = frame.getBoundingClientRect()
  const sidebar = frame.children[0] as HTMLElement | undefined
  const sidebarRect = sidebar?.getBoundingClientRect() ?? null
  const left = sidebarRect !== null ? sidebarRect.right : frameRect.left
  let top = frameRect.top
  const headerAnchor = frame.querySelector('[data-slot="conversation.session.header"]')
  const headerEl = headerAnchor?.firstElementChild as HTMLElement | null
  if (headerEl !== null && headerEl !== undefined) {
    const headerRect = headerEl.getBoundingClientRect()
    if (headerRect.height > 0 && headerRect.bottom > top) top = headerRect.bottom
  }
  return { left, top, right: frameRect.right, bottom: frameRect.bottom }
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
  const [visible, setVisible] = useState(getWidgetVisible())
  useEffect(() => subscribeWidgetVisible(() => setVisible(getWidgetVisible())), [])

  const [data, setData] = useState<BalanceData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const [corner, setCorner] = useState<Corner>('br')
  const [dragging, setDragging] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<DragSession | null>(null)

  const load = async (showLoading: boolean, force = false): Promise<void> => {
    if (showLoading) setLoading(true)
    try {
      const res = await fetchBalance(force)
      if (res.ok && res.data !== undefined) {
        setData(res.data)
        setError(null)
      } else {
        setData(null)
        setError(res.error ?? '查询失败')
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

  // Re-snap to the current corner when collapse/expand changes the size.
  useEffect(() => {
    if (pos === null) return
    const node = rootRef.current
    if (node === null) return
    setPos(cornerPos(corner, node, getBounds(node)))
  }, [collapsed]) // eslint-disable-line react-hooks/exhaustive-deps

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
  const dotClass = primary !== null
    ? (data?.isAvailable === false ? 'dsh-quota-dot dsh-quota-dot--error' : 'dsh-quota-dot')
    : 'dsh-quota-dot dsh-quota-dot--idle'

  let body: ReactElement | null = null
  if (!collapsed) {
    if (loading && data === null && error === null) {
      body = <div className="dsh-quota-body">查询中…</div>
    } else if (error !== null && data === null) {
      body = <div className="dsh-quota-body dsh-quota-error">{error}</div>
    } else if (primary !== null) {
      body = (
        <div className="dsh-quota-body">
          <div className="dsh-quota-remaining-label">剩余余额</div>
          <div>
            <span className="dsh-quota-total">{fmt(primary.total)}</span>
            <span className="dsh-quota-currency">{primary.currency}</span>
          </div>
          {data?.isAvailable === false && (
            <div className="dsh-quota-row">
              <span className="dsh-quota-label">状态</span>
              <span className="dsh-quota-value dsh-quota-error">不可用</span>
            </div>
          )}
        </div>
      )
    } else {
      body = <div className="dsh-quota-body dsh-quota-error">暂无余额数据</div>
    }
  }

  const style: CSSProperties | undefined = pos !== null
    ? { left: `${pos.x}px`, top: `${pos.y}px`, right: 'auto', bottom: 'auto' }
    : undefined

  return (
    <div className={`dsh-quota-root${dragging ? ' dsh-quota-dragging' : ''}`} style={style}>
      <div
        ref={rootRef}
        className="dsh-quota-card"
        title="拖动到四个角落"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => endDrag(false)}
        onLostPointerCapture={() => endDrag(false)}
      >
        <div className="dsh-quota-header">
          <div className="dsh-quota-title">
            <span className="dsh-quota-grip" title="拖动以移动">⠇</span>
            <span className={dotClass} />
            <span>DeepSeek 额度</span>
            {collapsed && primary !== null && (
              <span className="dsh-quota-collapsed-total">{fmt(primary.total)} {primary.currency}</span>
            )}
          </div>
          <div className="dsh-quota-actions">
            <button className="dsh-quota-btn" type="button" title="刷新" onClick={() => { void load(true, true) }}>↻</button>
            <button className="dsh-quota-btn" type="button" title={collapsed ? '展开' : '收起'} onClick={() => setCollapsed(!collapsed)}>{collapsed ? '+' : '−'}</button>
          </div>
        </div>
        {body}
      </div>
    </div>
  )
}
