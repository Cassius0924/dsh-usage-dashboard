/** Dependency-free bar chart and heatmap primitives. */
import { useEffect, useRef, useState, type FocusEvent as ReactFocusEvent, type KeyboardEvent as ReactKeyboardEvent, type MutableRefObject, type PointerEvent as ReactPointerEvent, type ReactElement } from 'react'
import { lastPopulatedIndex, nextChartFocus, type ChartFocusKey } from './chart-focus.ts'
import { useI18n, type LocaleId } from './i18n.tsx'
import type { LocaleKey } from './locales.ts'

export interface BarDatum {
  label: string
  value: number
  /** Tooltip text, composed as `heading · row · row`; each ` · ` segment is
   *  rendered on its own line, the first as the heading. */
  title?: string
}

interface TipState {
  x: number
  y: number
  lines: string[]
  above: boolean
}

/**
 * Cursor-following tooltip shared by every chart. The native `title` attribute
 * this replaces waited about a second, could not be styled to match the shell,
 * and never appeared on touch.
 */
function useChartTip(): {
  wrapRef: MutableRefObject<HTMLDivElement | null>
  tip: TipState | null
  show: (e: ReactPointerEvent<HTMLElement>, text: string | undefined) => void
  showFocused: (e: ReactFocusEvent<HTMLElement>, text: string | undefined) => void
  hide: () => void
} {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [tip, setTip] = useState<TipState | null>(null)
  const showAt = (target: HTMLElement, text: string | undefined, clientX?: number, clientY?: number): void => {
    const wrap = wrapRef.current
    if (text === undefined || text === '' || wrap === null) return
    const rect = wrap.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    // Keep the (centred) bubble inside the chart's own box.
    const x = Math.min(Math.max((clientX ?? targetRect.left + targetRect.width / 2) - rect.left, 70), Math.max(rect.width - 70, 70))
    const viewportY = clientY ?? targetRect.top
    const y = viewportY - rect.top
    setTip({ x, y, lines: text.split(' · '), above: viewportY > window.innerHeight - 160 })
  }
  const show = (e: ReactPointerEvent<HTMLElement>, text: string | undefined): void => {
    showAt(e.currentTarget, text, e.clientX, e.clientY)
  }
  const showFocused = (e: ReactFocusEvent<HTMLElement>, text: string | undefined): void => {
    showAt(e.currentTarget, text)
  }
  return { wrapRef, tip, show, showFocused, hide: () => setTip(null) }
}

function useRovingChartPoints(count: number, initial: number, horizontalStep = 1): {
  active: number
  refs: MutableRefObject<Array<HTMLElement | null>>
  onKeyDown: (event: ReactKeyboardEvent<HTMLElement>, index: number) => void
} {
  const refs = useRef<Array<HTMLElement | null>>([])
  const [active, setActive] = useState(initial)
  useEffect(() => setActive(Math.min(Math.max(0, initial), Math.max(0, count - 1))), [count, initial])
  const onKeyDown = (event: ReactKeyboardEvent<HTMLElement>, index: number): void => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const next = nextChartFocus(index, count, event.key as ChartFocusKey, horizontalStep)
    setActive(next)
    const target = refs.current[next]
    target?.focus({ preventScroll: true })
    target?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }
  return { active, refs, onKeyDown }
}

function ChartTip(props: { tip: TipState | null }): ReactElement | null {
  const { tip } = props
  if (tip === null) return null
  const [head, ...rows] = tip.lines
  return (
    <div className={`dq-tip${tip.above ? ' dq-tip--above' : ''}`} style={{ left: `${tip.x}px`, top: `${tip.y}px` }} role="tooltip">
      <div className="dq-tip-head">{head}</div>
      {rows.map((row, i) => <div key={i} className="dq-tip-row">{row}</div>)}
    </div>
  )
}

/** Color palette for per-model grouped bars, cycled by model order. */
export const MODEL_COLORS = ['#4176e6', '#2da44e', '#e16f24', '#8250df', '#bf8700', '#cf222e', '#1f883d', '#0969da']

export function Bars(props: { data: BarDatum[]; height?: number; labelEvery?: number; minWidth?: number }): ReactElement {
  const { data, height = 120, labelEvery = 1, minWidth } = props
  const { wrapRef, tip, show, showFocused, hide } = useChartTip()
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const initialFocus = lastPopulatedIndex(data.map(datum => datum.value))
  const roving = useRovingChartPoints(data.length, initialFocus)
  useEffect(() => {
    const scroll = scrollRef.current
    if (scroll !== null && minWidth !== undefined) scroll.scrollLeft = scroll.scrollWidth
  }, [data.length, minWidth])
  let max = 0
  for (const datum of data) if (datum.value > max) max = datum.value
  const scale = max > 0 ? max : 1
  return (
    <div className="dq-chart-wrap" ref={wrapRef} onPointerLeave={hide}>
      <div className="dq-bars-scroll" ref={scrollRef}>
        <div className="dq-bars" style={{ height: `${height + 18}px`, minWidth: minWidth === undefined ? undefined : `${minWidth}px` }}>
          {data.map((datum, i) => {
            const h = Math.max(1, Math.round((datum.value / scale) * height))
            const text = datum.title ?? `${datum.label}: ${datum.value.toLocaleString()}`
            return (
              <div
                key={i}
                className="dq-bar-col"
                role="img"
                aria-label={text}
                aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home End"
                tabIndex={i === roving.active ? 0 : -1}
                ref={element => { roving.refs.current[i] = element }}
                onPointerMove={e => show(e, text)}
                onFocus={e => showFocused(e, text)}
                onBlur={hide}
                onKeyDown={e => roving.onKeyDown(e, i)}
              >
                <div className="dq-bar" style={{ height: `${h}px` }} />
                <div className="dq-bar-label" style={{ visibility: i % labelEvery === 0 ? 'visible' : 'hidden' }}>{datum.label}</div>
              </div>
            )
          })}
        </div>
      </div>
      <ChartTip tip={tip} />
    </div>
  )
}

export interface HeatDatum {
  date: string
  total: number
  cost: number
  calls: number
}

/** Multi-series bar chart: one bar per series, side by side, per slot. */
export function GroupedBars(props: {
  series: Array<{ key: string; color: string; bars: BarDatum[] }>
  height?: number
  labelEvery?: number
  minWidth?: number
}): ReactElement {
  const { series, height = 120, labelEvery = 1, minWidth } = props
  const { wrapRef, tip, show, showFocused, hide } = useChartTip()
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const count = series.length > 0 ? series[0].bars.length : 0
  const pointValues = Array.from({ length: count }, (_, i) => series.map(s => s.bars[i]?.value ?? 0)).flat()
  const roving = useRovingChartPoints(pointValues.length, lastPopulatedIndex(pointValues))
  useEffect(() => {
    const scroll = scrollRef.current
    if (scroll !== null && minWidth !== undefined) scroll.scrollLeft = scroll.scrollWidth
  }, [count, minWidth])
  let max = 0
  for (const s of series) for (const datum of s.bars) if (datum.value > max) max = datum.value
  const scale = max > 0 ? max : 1
  return (
    <div className="dq-chart-wrap" ref={wrapRef} onPointerLeave={hide}>
      <div className="dq-bars-scroll" ref={scrollRef}>
        <div className="dq-bars" style={{ height: `${height + 18}px`, minWidth: minWidth === undefined ? undefined : `${minWidth}px` }}>
          {Array.from({ length: count }, (_, i) => (
            <div
              key={i}
              className="dq-bar-col"
            >
              <div className="dq-bar-group">
                {series.map((s, seriesIndex) => {
                  const datum = s.bars[i]
                  const h = Math.max(1, Math.round((datum.value / scale) * height))
                  const text = datum.title ?? `${s.key}: ${datum.value.toLocaleString()}`
                  const pointIndex = i * series.length + seriesIndex
                  return (
                    <div
                      key={s.key}
                      className="dq-bar"
                      style={{ height: `${h}px`, background: s.color }}
                      role="img"
                      aria-label={text}
                      aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home End"
                      tabIndex={pointIndex === roving.active ? 0 : -1}
                      ref={element => { roving.refs.current[pointIndex] = element }}
                      onPointerMove={e => show(e, text)}
                      onFocus={e => showFocused(e, text)}
                      onBlur={hide}
                      onKeyDown={e => roving.onKeyDown(e, pointIndex)}
                    />
                  )
                })}
              </div>
              <div className="dq-bar-label" style={{ visibility: i % labelEvery === 0 ? 'visible' : 'hidden' }}>
                {series[0].bars[i].label}
              </div>
            </div>
          ))}
        </div>
      </div>
      <ChartTip tip={tip} />
    </div>
  )
}

function heatColor(level: number): string {
  if (level <= 0) return 'rgba(120,130,150,0.12)'
  if (level === 1) return 'rgba(65,118,230,0.25)'
  if (level === 2) return 'rgba(65,118,230,0.5)'
  if (level === 3) return 'rgba(65,118,230,0.75)'
  return 'rgba(65,118,230,1)'
}

/**
 * Calendar heatmap: one flex column per week, cells filling the card's full
 * width (rather than a fixed pixel size hugging the left edge), month labels
 * below the grid and a 少→多 scale legend — modelled on Codex's activity
 * graph. No weekday row: at this cell count a day is identified by hovering
 * it, not by which row it sits in.
 */
export function Heatmap(props: { data: HeatDatum[] }): ReactElement {
  const { data } = props
  const { t, locale } = useI18n()
  const { wrapRef, tip, show, showFocused, hide } = useChartTip()
  const roving = useRovingChartPoints(data.length, lastPopulatedIndex(data.map(datum => datum.total)), 7)
  let max = 0
  for (const datum of data) if (datum.total > max) max = datum.total
  let firstDow = 0
  if (data.length > 0) {
    const dt = new Date(`${data[0].date}T00:00:00`)
    firstDow = Number.isNaN(dt.getTime()) ? 0 : dt.getDay()
  }
  const cells: Array<HeatDatum | null> = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (const datum of data) cells.push(datum)
  while (cells.length % 7 !== 0) cells.push(null)

  const weeks: Array<Array<HeatDatum | null>> = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  // Label a column with its month when it is the first column of that month.
  let lastMonth = ''
  const monthLabels = weeks.map(week => {
    const first = week.find(cell => cell !== null)
    if (first === undefined || first === null) return ''
    const month = first.date.slice(0, 7)
    if (month === lastMonth) return ''
    lastMonth = month
    return t(`chart.month${Number(first.date.slice(5, 7))}` as LocaleKey)
  })

  const levelOf = (total: number): number => {
    if (total <= 0) return 0
    const r = max > 0 ? total / max : 0
    return r < 0.25 ? 1 : r < 0.5 ? 2 : r < 0.75 ? 3 : 4
  }

  return (
    <div className="dq-heat dq-chart-wrap" ref={wrapRef} onPointerLeave={hide}>
      <div className="dq-heat-scroll">
        <div className="dq-heatmap">
          {weeks.map((week, w) => (
            <div key={w} className="dq-heat-week">
              {week.map((datum, d) => {
                if (datum === null) return <div key={d} className="dq-heat-cell dq-heat-cell--pad" />
                const text = t('chart.tooltip', {
                  head: datum.date,
                  tokens: datum.total.toLocaleString(locale === 'en' ? 'en-US' : 'zh-CN'),
                  cost: datum.cost.toFixed(2),
                  calls: t('common.calls', { count: datum.calls }),
                })
                return (
                  <div
                    key={d}
                    className="dq-heat-cell"
                    style={{ background: heatColor(levelOf(datum.total)) }}
                    role="img"
                    aria-label={text}
                    aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home End"
                    tabIndex={w * 7 + d - firstDow === roving.active ? 0 : -1}
                    ref={element => { roving.refs.current[w * 7 + d - firstDow] = element }}
                    onPointerMove={e => show(e, text)}
                    onFocus={e => showFocused(e, text)}
                    onBlur={hide}
                    onKeyDown={e => roving.onKeyDown(e, w * 7 + d - firstDow)}
                  />
                )
              })}
            </div>
          ))}
        </div>
        <div className="dq-heat-months" aria-hidden="true">
          {monthLabels.map((label, i) => <div key={i} className="dq-heat-month">{label}</div>)}
        </div>
      </div>
      <ChartTip tip={tip} />
      <div className="dq-heat-scale">
        <span>{t('chart.less')}</span>
        {[0, 1, 2, 3, 4].map(level => (
          <span key={level} className="dq-heat-key" style={{ background: heatColor(level) }} />
        ))}
        <span>{t('chart.more')}</span>
      </div>
    </div>
  )
}

export const fmt = (v: string | number): string => {
  const n = Number(v)
  if (!Number.isFinite(n)) return String(v)
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export const fmtInt = (v: number | undefined): string => Math.round(Number(v) || 0).toLocaleString()

export const fmtCompact = (v: number | undefined, locale: LocaleId = 'zh'): string => {
  const n = Number(v) || 0
  if (locale === 'en') {
    return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
  }
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}亿`
  if (n >= 10_000) return `${(n / 10_000).toFixed(1)}万`
  return Math.round(n).toLocaleString()
}
