/** The 「额度」 conversation view tab: full balance & usage dashboard.
 *
 * Caching: the first render comes straight from the package-local cache
 * (see ./api.ts), so reopening the tab shows data instantly. A background
 * refresh then updates it without blocking; a full-screen 加载中 only
 * appears when nothing has ever been cached.
 */
import { Fragment, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactElement, type ReactNode } from 'react'
import { USAGE_WINDOW_DAYS } from '../contract.ts'
import { fetchBalance, fetchUsage, getCachedBalance, getCachedUsage, getCachedUsageAt } from './api.ts'
import { budgetSnapshot } from './budget.ts'
import { Bars, GroupedBars, Heatmap, MODEL_COLORS, fmt, fmtCompact, fmtInt } from './charts.tsx'
import { getComposerElement, getShellFrame } from './dom.ts'
import { dailyUsageCsv, downloadText, exportDateStamp, fullUsageJson, modelUsageCsv } from './export.ts'
import { syncStatusText, type SyncState } from './freshness.ts'
import { fallbackT, localizeApiError, useI18n, type Translate } from './i18n.tsx'
import { CHART_METRICS, chartMetricName, chartMetricValue, type ChartMetric } from './metric.ts'
import type { BalanceData, ModelUsage, PeakSplit, PeriodUsage, PricingInfo, SessionCost, UsageCoverage, UsageData, UsageWindowDays } from '../contract.ts'
import { chartMetricStore, lowBalanceStore, monthlyBudgetStore, quotaViewActiveStore, usageWindowStore, widgetVisibleStore } from './store.ts'

/** Fallback composer height for the narrow-screen bottom safe area, used only
 *  until the real measurement below lands (or if the host markup ever stops
 *  exposing the `conversation.composer.dock` slot). DSH has no `--dsw-*`
 *  variable for composer height — this number is not a guess: it is the
 *  measured `[data-slot="conversation.composer.dock"]` seat height on a live
 *  DSH instance at 620 / 480 / 390px viewports (126px, stable across all
 *  three; see LEARNINGS.md). Kept in sync with the small margin added in
 *  styles.ts's `.dq-balance` narrow media query. */
const COMPOSER_FALLBACK_PX = 126

/** One shimmering placeholder block, sized by the caller. */
function Skel(props: { w: number; h: number }): ReactElement {
  return <div className="dq-skel" style={{ width: `${props.w}px`, height: `${props.h}px` }} />
}

/** Placeholder for the balance card while the first fetch is in flight. */
function BalanceSkeleton(): ReactElement {
  return (
    <div className="dq-balance-grid">
      <div className="dq-stat"><Skel w={56} h={11} /><Skel w={150} h={22} /></div>
      <div className="dq-stat"><Skel w={28} h={11} /><Skel w={48} h={22} /></div>
    </div>
  )
}

/** Placeholder for the usage trend card: replaying every session log takes
 *  seconds, and an empty-state string there would read as "you have no usage". */
function UsageSkeleton(): ReactElement {
  return (
    <>
      <div className="dq-usage-totals">
        {[44, 44, 62, 62].map((w, i) => (
          <div key={i} className="dq-stat"><Skel w={w} h={11} /><Skel w={w > 70 ? 84 : 56} h={20} /></div>
        ))}
      </div>
      <Skel w={140} h={12} />
      <div className="dq-skel-bars">
        {Array.from({ length: 30 }, (_, i) => (
          <div key={i} className="dq-skel dq-skel-bar" style={{ height: `${18 + ((i * 37) % 82)}px` }} />
        ))}
      </div>
    </>
  )
}

/** Placeholder for the heatmap card, same loading grammar as the trend card's
 *  bar skeleton above — the heatmap has no separate fetch, it just renders
 *  once `usage` lands, so the two cards share one loading vocabulary. */
function HeatmapSkeleton(): ReactElement {
  return (
    <>
      <Skel w={140} h={12} />
      <div className="dq-skel-bars" style={{ height: '88px' }}>
        {Array.from({ length: 52 }, (_, i) => (
          <div key={i} className="dq-skel dq-skel-bar" style={{ height: `${14 + ((i * 29) % 60)}px` }} />
        ))}
      </div>
    </>
  )
}

/** Percentage chip comparing a window against the one before it. */
function Delta(props: { current: number; previous: number; label: string }): ReactElement | null {
  const { t } = useI18n()
  const { current, previous, label } = props
  if (previous <= 0) {
    if (current <= 0) return null
    return <span className="dq-delta dq-delta--new" title={t('delta.noBaselineTitle', { label })}>{t('delta.noBaseline')}</span>
  }
  const percent = Math.round(((current - previous) / previous) * 100)
  const title = `${label} ¥${fmt(previous)}`
  if (percent === 0) return <span className="dq-delta dq-delta--flat" title={title}>{t('delta.flat')}</span>
  const up = percent > 0
  return (
    <span className={`dq-delta ${up ? 'dq-delta--up' : 'dq-delta--down'}`} title={title}>
      {up ? '↑' : '↓'}{Math.abs(percent)}% <span className="dq-delta-label">{label}</span>
    </span>
  )
}

/** One window of the 消耗概览 card: cost headline, volume underneath. */
function Period(props: {
  label: string
  period: PeriodUsage
  previous?: PeriodUsage
  compare?: string
}): ReactElement {
  const { t, locale } = useI18n()
  const { period, previous, compare } = props
  return (
    <div className="dq-period">
      <div className="dq-period-head">
        <span className="dq-period-label">{props.label}</span>
        {previous !== undefined && compare !== undefined && (
          <Delta current={period.cost} previous={previous.cost} label={compare} />
        )}
      </div>
      <div className="dq-period-cost">¥ {fmt(period.cost)}</div>
      <div className="dq-period-sub">{t('period.volume', {
        tokens: fmtCompact(period.total, locale),
        calls: t('common.calls', { count: fmtInt(period.calls) }),
      })}</div>
    </div>
  )
}

/** Monthly guardrail, kept inside the overview rather than adding another card. */
function BudgetMeter(props: { spent: number; budget: number; onConfigure: () => void }): ReactElement {
  const { t } = useI18n()
  if (props.budget <= 0) {
    return (
      <div className="dq-budget dq-budget--unset">
        <span>{t('budget.unset')}</span>
        <button type="button" className="dq-budget-action" onClick={props.onConfigure}>{t('budget.configure')}</button>
      </div>
    )
  }

  const snapshot = budgetSnapshot(props.spent, props.budget)
  const usedPercent = snapshot.ratio * 100
  const barPercent = Math.min(100, usedPercent)
  const forecastText = snapshot.status === 'over'
    ? t('budget.over', { amount: fmt(Math.abs(snapshot.remaining)) })
    : snapshot.forecastOver > 0
      ? t('budget.forecastOver', { amount: fmt(snapshot.forecastOver) })
      : t('budget.forecast', { amount: fmt(snapshot.forecast) })

  return (
    <div className={`dq-budget dq-budget--${snapshot.status}`}>
      <div className="dq-budget-head">
        <span className="dq-budget-title">{t('budget.title')}</span>
        <span className="dq-budget-amount">¥ {fmt(snapshot.spent)} / ¥ {fmt(snapshot.budget)}</span>
      </div>
      <div
        className="dq-budget-track"
        role="progressbar"
        aria-label={t('budget.progressLabel')}
        aria-valuemin={0}
        aria-valuemax={snapshot.budget}
        aria-valuenow={Math.min(snapshot.spent, snapshot.budget)}
        aria-valuetext={t('budget.used', { percent: usedPercent.toFixed(1), forecast: forecastText })}
      >
        <div className="dq-budget-fill" style={{ transform: `scaleX(${barPercent / 100})` }} />
      </div>
      <div className="dq-budget-meta">
        <span>{snapshot.remaining >= 0
          ? t('budget.remaining', { amount: fmt(snapshot.remaining) })
          : t('budget.exceeded', { amount: fmt(Math.abs(snapshot.remaining)) })}</span>
        <span>{forecastText}</span>
      </div>
    </div>
  )
}

const rate = (value: number): string => `¥${value.toLocaleString(undefined, { maximumFractionDigits: 3 })}`

/** Auditable breakdown of the rates the cost estimate was computed with —
 *  a `<details>` so it is keyboard-reachable without any extra state. */
function PricingNote(props: { pricing: PricingInfo }): ReactElement {
  const { t } = useI18n()
  const { pricing } = props
  const split = pricing.splitActive
  return (
    <details className="dq-pricing">
      <summary className="dq-pricing-summary">
        {t('pricing.title')}
        {split && (
          <span className={`dq-pricing-now${pricing.inPeakNow ? ' dq-pricing-now--peak' : ''}`}>
            {pricing.inPeakNow ? t('pricing.currentPeak') : t('pricing.currentOffPeak')}
          </span>
        )}
      </summary>
      <div className="dq-pricing-body">
        <table className="dq-pricing-table">
          <thead>
            <tr>
              <th>{t('pricing.model')}</th>
              <th>{split ? t('pricing.period') : t('pricing.unitPrice')}</th>
              <th>{t('pricing.inputCacheHit')}</th>
              <th>{t('pricing.inputCacheMiss')}</th>
              <th>{t('pricing.output')}</th>
            </tr>
          </thead>
          <tbody>
            {pricing.tiers.map(tier => (
              <Fragment key={tier.model}>
                <tr>
                  <td rowSpan={tier.offPeak !== null ? 2 : 1}>{tier.model}</td>
                  <td>{split ? t('pricing.peak') : t('pricing.fixed')}</td>
                  <td>{rate(tier.peak.cacheHit)}</td>
                  <td>{rate(tier.peak.input)}</td>
                  <td>{rate(tier.peak.output)}</td>
                </tr>
                {tier.offPeak !== null && (
                  <tr>
                    <td>{t('pricing.offPeak')}</td>
                    <td>{rate(tier.offPeak.cacheHit)}</td>
                    <td>{rate(tier.offPeak.input)}</td>
                    <td>{rate(tier.offPeak.output)}</td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        <p className="dq-pricing-foot">
          {t('pricing.unit', { currency: pricing.currency })}
          {split
            ? t('pricing.splitNote', { windows: pricing.peakWindows.join(t('common.listSeparator')), date: pricing.switchDate })
            : t('pricing.switchNote', { windows: pricing.peakWindows.join(t('common.listSeparator')), date: pricing.switchDate })}
          {t('pricing.unknown')}
        </p>
      </div>
    </details>
  )
}

/** Make a locally-computed bill honest about which logs it could inspect. */
function CoverageDiagnostics(props: { coverage: UsageCoverage }): ReactElement {
  const { t, locale } = useI18n()
  const { coverage } = props
  const hasGaps = coverage.failedSessions > 0
    || coverage.skippedRecords > 0
    || coverage.scannedSessions < coverage.listedSessions
  const coverageTime = new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'zh-CN', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
  const range = coverage.earliestAt === null || coverage.latestAt === null
    ? t('coverage.noRange')
    : `${coverageTime.format(coverage.earliestAt)} – ${coverageTime.format(coverage.latestAt)}`

  return (
    <details className={`dq-coverage${hasGaps ? ' dq-coverage--warn' : ''}`}>
      <summary className="dq-coverage-summary">
        <span className="dq-coverage-title">{t('coverage.title')}</span>
        <span className="dq-coverage-status">{hasGaps ? t('coverage.gaps') : t('coverage.complete')}</span>
        <span className="dq-coverage-brief">{t('coverage.brief', {
          scanned: fmtInt(coverage.scannedSessions), listed: fmtInt(coverage.listedSessions), records: fmtInt(coverage.usageRecords),
        })}</span>
      </summary>
      <div className="dq-coverage-body">
        <dl className="dq-coverage-metrics">
          <div><dt>{t('coverage.scanned')}</dt><dd>{t('common.sessions', { count: fmtInt(coverage.scannedSessions) })}</dd></div>
          <div><dt>{t('coverage.failed')}</dt><dd>{t('common.sessions', { count: fmtInt(coverage.failedSessions) })}</dd></div>
          <div><dt>{t('coverage.skipped')}</dt><dd>{t('common.records', { count: fmtInt(coverage.skippedRecords) })}</dd></div>
        </dl>
        <p className="dq-coverage-range">{t('coverage.time', { range })}</p>
        <p className="dq-coverage-note">{t('coverage.scope')}</p>
        {hasGaps && (
          <p className="dq-coverage-warning">{t('coverage.warning')}</p>
        )}
      </div>
    </details>
  )
}

function Stat(props: { label: string; children: ReactNode }): ReactElement {
  return (
    <div className="dq-stat">
      <div className="dq-stat-label">{props.label}</div>
      {props.children}
    </div>
  )
}

function Link(props: { href: string; children: ReactNode }): ReactElement {
  return (
    <a className="dq-link" href={props.href} target="_blank" rel="noreferrer">{props.children}</a>
  )
}

/** Download menu kept compact in the usage card header. */
function ExportMenu(props: { usage: UsageData }): ReactElement {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const doneTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (event: MouseEvent): void => {
      if (rootRef.current !== null && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      setOpen(false)
      triggerRef.current?.focus()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    window.requestAnimationFrame(() => menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus())
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => () => {
    if (doneTimerRef.current !== null) window.clearTimeout(doneTimerRef.current)
  }, [])

  const finish = (): void => {
    setOpen(false)
    setDone(true)
    if (doneTimerRef.current !== null) window.clearTimeout(doneTimerRef.current)
    doneTimerRef.current = window.setTimeout(() => setDone(false), 1400)
  }

  const exportDaily = (): void => {
    const stamp = exportDateStamp()
    downloadText(`dsh-usage-${stamp}.csv`, dailyUsageCsv(props.usage), 'text/csv;charset=utf-8')
    finish()
  }
  const exportModels = (): void => {
    const stamp = exportDateStamp()
    downloadText(`dsh-usage-models-${stamp}.csv`, modelUsageCsv(props.usage), 'text/csv;charset=utf-8')
    finish()
  }
  const exportJson = (): void => {
    const stamp = exportDateStamp()
    downloadText(`dsh-usage-${stamp}.json`, fullUsageJson(props.usage), 'application/json;charset=utf-8')
    finish()
  }

  return (
    <div className="dq-export" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`dq-export-btn${done ? ' dq-export-btn--done' : ''}`}
        aria-haspopup="true"
        aria-expanded={open}
        title={t('export.title')}
        onClick={() => setOpen(value => !value)}
      >
        {done ? t('export.done') : t('export.action')}
      </button>
      {open && (
        <div ref={menuRef} className="dq-export-menu" aria-label={t('export.menuLabel')}>
          <button type="button" onClick={exportDaily}>
            <span>{t('export.dailyCsv')}</span><small>{t('common.rows', { count: props.usage.daily.length })}</small>
          </button>
          <button type="button" onClick={exportModels}>
            <span>{t('export.modelCsv')}</span><small>{t('common.rows', { count: props.usage.models.length })}</small>
          </button>
          <button type="button" onClick={exportJson}>
            <span>{t('export.fullJson')}</span><small>{t('export.jsonHint')}</small>
          </button>
        </div>
      )}
    </div>
  )
}

export const modelKeyOf = (m: ModelUsage): string => (m.provider !== '' ? `${m.provider}/${m.model}` : m.model)

export const modelNameOf = (m: ModelUsage, t: Translate = fallbackT): string => (m.model !== '' ? m.model : t('common.unknownModel'))

/**
 * What prefix caching is doing for the bill. Cache-hit tokens are priced at a
 * small fraction of cache-miss tokens, so on a DSH workload this is usually the
 * single biggest lever on cost — and it was invisible before.
 */
function CacheCard(props: { totals: UsageData['totals'] }): ReactElement {
  const { t, locale } = useI18n()
  const { totals } = props
  const prompt = totals.input + totals.cache
  if (prompt === 0) return <div className="dq-empty">{t('cache.empty')}</div>
  const rate = totals.cache / prompt
  const wouldHaveCost = totals.cost + totals.cacheSavings
  const low = rate < 0.6
  return (
    <div className="dq-cache">
      <div className="dq-cache-figures">
        <div className="dq-stat">
          <div className="dq-stat-label">{t('cache.rate')}</div>
          <div className={`dq-stat-value${low ? ' dq-stat-value--warn' : ' dq-stat-value--ok'}`}>
            {(rate * 100).toFixed(1)}%
          </div>
        </div>
        <div className="dq-stat">
          <div className="dq-stat-label">{t('cache.saved')}</div>
          <div className="dq-stat-value">¥ {fmt(totals.cacheSavings)}</div>
        </div>
        <div className="dq-stat">
          <div className="dq-stat-label">{t('cache.allMiss')}</div>
          <div className="dq-stat-value dq-muted-value">¥ {fmt(wouldHaveCost)}</div>
        </div>
      </div>
      <div className="dq-cache-track" role="img" aria-label={t('cache.aria', { hit: (rate * 100).toFixed(1), miss: ((1 - rate) * 100).toFixed(1) })}>
        <div className="dq-cache-fill" style={{ width: `${rate * 100}%` }} />
      </div>
      <div className="dq-cache-legend">
        <span><span className="dq-legend-swatch dq-legend-swatch--hit" />{t('cache.hitLegend', { tokens: fmtCompact(totals.cache, locale) })}</span>
        <span><span className="dq-legend-swatch dq-legend-swatch--miss" />{t('cache.missLegend', { tokens: fmtCompact(totals.input, locale) })}</span>
      </div>
      <p className="dq-cache-foot">
        {low
          ? t('cache.lowHint')
          : t('cache.goodHint')}
      </p>
    </div>
  )
}

/**
 * Peak vs off-peak: which side of DeepSeek's price windows the usage falls on.
 * Before the 2026-08-17 switch this answers "what will the new prices cost me";
 * after it, "what would shifting work off-peak save me".
 */
function PeakCard(props: { split: PeakSplit; pricing: PricingInfo; currentCost: number }): ReactElement {
  const { t, locale } = useI18n()
  const { split, pricing, currentCost } = props
  const total = split.peak.total + split.offPeak.total
  if (total === 0) return <div className="dq-empty">{t('peak.empty')}</div>
  const peakShare = split.peak.total / total
  const shiftSaving = split.peakEraCost - split.offPeakEraCost
  const increase = split.peakEraCost - currentCost
  const increasePercent = currentCost > 0 ? (increase / currentCost) * 100 : 0
  return (
    <div className="dq-peak">
      <div
        className="dq-peak-track"
        role="img"
        aria-label={t('peak.aria', { peak: (peakShare * 100).toFixed(1), offPeak: ((1 - peakShare) * 100).toFixed(1) })}
      >
        <div className="dq-peak-fill" style={{ width: `${peakShare * 100}%` }} />
      </div>
      <div className="dq-peak-legend">
        <span><span className="dq-legend-swatch dq-legend-swatch--peak" />{t('peak.peakLegend', {
          share: (peakShare * 100).toFixed(1), tokens: fmtCompact(split.peak.total, locale), calls: t('common.callsShort', { count: fmtInt(split.peak.calls) }),
        })}</span>
        <span><span className="dq-legend-swatch dq-legend-swatch--offpeak" />{t('peak.offPeakLegend', {
          share: ((1 - peakShare) * 100).toFixed(1), tokens: fmtCompact(split.offPeak.total, locale), calls: t('common.callsShort', { count: fmtInt(split.offPeak.calls) }),
        })}</span>
      </div>
      <div className="dq-peak-figures">
        {!pricing.splitActive && (
          <div className="dq-stat">
            <div className="dq-stat-label">{t('peak.newPrice')}</div>
            <div className="dq-stat-value">
              ¥ {fmt(split.peakEraCost)}
              <span className="dq-peak-delta">{t('peak.increase', { percent: increasePercent.toFixed(0) })}</span>
            </div>
          </div>
        )}
        <div className="dq-stat">
          <div className="dq-stat-label">{t('peak.shift')}</div>
          <div className="dq-stat-value">
            ¥ {fmt(split.offPeakEraCost)}
            <span className="dq-peak-delta dq-peak-delta--save">{t('peak.saving', { amount: fmt(shiftSaving) })}</span>
          </div>
        </div>
      </div>
      <p className="dq-peak-foot">
        {t('peak.schedule', { windows: pricing.peakWindows.join(t('common.listSeparator')) })}
        {pricing.splitActive
          ? t('peak.activeHint')
          : t('peak.futureHint', { date: pricing.switchDate })}
      </p>
    </div>
  )
}

/** Coarse "how long ago", enough to tell a live session from last week's. */
function agoText(ms: number, t: Translate): string {
  const minutes = Math.floor((Date.now() - ms) / 60_000)
  if (minutes < 1) return t('common.justNow')
  if (minutes < 60) return t('common.minutesAgo', { count: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('common.hoursAgo', { count: hours })
  return t('common.daysAgo', { count: Math.floor(hours / 24) })
}

/**
 * Which sessions burned the money. Per-model and per-day views say what and
 * when; this says *which run*, which is the one an agent user can act on —
 * a single expensive session is a prompt or a loop worth looking at.
 */
function SessionRanking(props: { sessions: SessionCost[]; count: number; totalCost: number }): ReactElement {
  const { t, locale } = useI18n()
  const { sessions, count, totalCost } = props
  if (sessions.length === 0) return <div className="dq-empty">{t('sessions.empty')}</div>
  const top = sessions[0].cost
  return (
    <>
      <ol className="dq-sessions">
        {sessions.map(s => (
          <li key={s.id} className="dq-session">
            <div className="dq-session-head">
              <span className="dq-session-title" title={`${s.title}\n${s.id}`}>{s.title || t('sessions.fallbackTitle', { id: s.id })}</span>
              <span className="dq-session-cost">¥ {fmt(s.cost)}</span>
            </div>
            <div className="dq-session-track">
              <div className="dq-session-fill" style={{ width: `${Math.max((s.cost / (top || 1)) * 100, 1.5)}%` }} />
            </div>
            <div className="dq-session-sub">
              {t('sessions.detail', {
                tokens: fmtCompact(s.total, locale),
                calls: t('common.calls', { count: fmtInt(s.calls) }),
                ago: agoText(s.lastActive, t),
              })}
              {totalCost > 0 && <> · {t('sessions.share', { percent: ((s.cost / totalCost) * 100).toFixed(1) })}</>}
            </div>
          </li>
        ))}
      </ol>
      {count > sessions.length && (
        <p className="dq-session-foot">{t('sessions.more', { count: fmtInt(count), shown: sessions.length })}</p>
      )}
    </>
  )
}

/** Which model the money actually goes to, most expensive first. */
function ModelRanking(props: {
  models: ModelUsage[]
  totalCost: number
  colorOf: (key: string) => string
}): ReactElement {
  const { t, locale } = useI18n()
  const { models, totalCost } = props
  if (models.length === 0) return <div className="dq-empty">{t('models.empty')}</div>
  return (
    <div className="dq-rank">
      {models.map(m => {
        const key = modelKeyOf(m)
        const share = totalCost > 0 ? m.cost / totalCost : 0
        return (
          <div key={key} className="dq-rank-row">
            <div className="dq-rank-head">
              <span className="dq-rank-name" title={key}>
                <span className="dq-legend-swatch" style={{ background: props.colorOf(key) }} />
                {modelNameOf(m, t)}
              </span>
              <span className="dq-rank-cost">
                ¥ {fmt(m.cost)}
                <span className="dq-rank-share">{(share * 100).toFixed(1)}%</span>
              </span>
            </div>
            <div
              className="dq-rank-track"
              role="img"
              aria-label={t('models.shareAria', { name: modelNameOf(m, t), percent: (share * 100).toFixed(1) })}
            >
              <div className="dq-rank-fill" style={{ width: `${Math.max(share * 100, 1.5)}%`, background: props.colorOf(key) }} />
            </div>
            <div className="dq-rank-sub">
              {t('models.detail', {
                tokens: fmtCompact(m.total, locale),
                calls: t('common.calls', { count: fmtInt(m.calls) }),
                input: fmtCompact(m.input, locale), output: fmtCompact(m.output, locale), cache: fmtCompact(m.cache, locale),
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** Multi-select model dropdown feeding the grouped bar chart. */
function ModelPicker(props: {
  models: ModelUsage[]
  selected: string[]
  colorOf: (key: string) => string
  onChange: (keys: string[]) => void
}): ReactElement | null {
  const { t, locale } = useI18n()
  const { models } = props
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent): void => {
      if (rootRef.current !== null && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      setOpen(false)
      triggerRef.current?.focus()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    window.requestAnimationFrame(() => menuRef.current?.querySelector<HTMLInputElement>('input')?.focus())
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (models.length === 0) return null

  const toggle = (key: string): void => {
    props.onChange(
      props.selected.includes(key)
        ? props.selected.filter(k => k !== key)
        : [...props.selected, key],
    )
  }

  const label = props.selected.length === 0 ? t('models.all') : t('models.selected', { count: props.selected.length })

  return (
    <div className="dq-model-picker" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="dq-model-btn"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls="dq-model-menu"
        title={t('models.filterTitle')}
        onClick={() => setOpen(value => !value)}
      >
        {label}
      </button>
      {open && (
        <div id="dq-model-menu" ref={menuRef} className="dq-model-menu" role="group" aria-label={t('models.filterLabel')}>
          <label className="dq-model-item dq-model-item--all">
            <input
              type="checkbox"
              checked={props.selected.length === 0}
              onChange={() => props.onChange([])}
            />
            <span>{t('models.all')}</span>
          </label>
          {models.map(m => {
            const key = modelKeyOf(m)
            return (
              <label key={key} className="dq-model-item">
                <input type="checkbox" checked={props.selected.includes(key)} onChange={() => toggle(key)} />
                <span className="dq-legend-swatch" style={{ background: props.colorOf(key) }} />
                <span>{modelNameOf(m, t)}</span>
                <span className="dq-model-tag">{fmtCompact(m.total, locale)}</span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

const windowName = (days: UsageWindowDays, t: Translate = fallbackT): string => days === 365
  ? t('window.year')
  : t('window.days', { days })

/** One range choice controls every metric whose title carries that range. */
function UsageWindowPicker(props: { value: UsageWindowDays; onChange: (days: UsageWindowDays) => void }): ReactElement {
  const { t } = useI18n()
  return (
    <div className="dq-window-switch" role="group" aria-label={t('window.groupLabel')}>
      {USAGE_WINDOW_DAYS.map(days => (
        <button
          key={days}
          type="button"
          className={`dq-window-btn${props.value === days ? ' dq-window-btn--on' : ''}`}
          aria-pressed={props.value === days}
          title={t('window.viewTitle', { window: windowName(days, t) })}
          onClick={() => props.onChange(days)}
        >
          {days === 365 ? t('window.yearButton') : t('window.daysButton', { days })}
        </button>
      ))}
    </div>
  )
}

const chartMetricLabel = (metric: ChartMetric, t: Translate = fallbackT): string => metric === 'tokens'
  ? t('metric.tokens')
  : chartMetricName(metric, t)

function ChartMetricPicker(props: { value: ChartMetric; onChange: (metric: ChartMetric) => void }): ReactElement {
  const { t } = useI18n()
  return (
    <div className="dq-chart-switch" role="group" aria-label={t('metric.groupLabel')}>
      {CHART_METRICS.map(metric => (
        <button
          key={metric}
          type="button"
          className={`dq-chart-switch-btn${props.value === metric ? ' dq-chart-switch-btn--on' : ''}`}
          aria-pressed={props.value === metric}
          title={t('metric.compareTitle', { metric: chartMetricLabel(metric, t) })}
          onClick={() => props.onChange(metric)}
        >
          {chartMetricLabel(metric, t)}
        </button>
      ))}
    </div>
  )
}

export function BalanceDashboard(): ReactElement {
  const { t, locale } = useI18n()
  // Seed state from the cache so the tab never waits on the network when
  // data has been fetched before (stale-while-revalidate).
  const cachedBalance = getCachedBalance()
  const cachedUsage = getCachedUsage()
  const cachedUsageAt = getCachedUsageAt()
  const [balance, setBalance] = useState<BalanceData | null>(cachedBalance?.data ?? null)
  const [usage, setUsage] = useState<UsageData | null>(cachedUsage?.data ?? null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ kind: 'all' | 'balance' | 'usage'; error: string } | null>(null)
  // Balance answers in well under a second, usage replays every session log and
  // takes seconds — so they get their own loading flags and paint independently
  // instead of the fast one waiting on the slow one.
  const [loadingBalance, setLoadingBalance] = useState(cachedBalance === null)
  const [loadingUsage, setLoadingUsage] = useState(cachedUsage === null)
  const [refreshing, setRefreshing] = useState(false)
  const [usageUpdatedAt, setUsageUpdatedAt] = useState<number | null>(cachedUsageAt)
  const [syncState, setSyncState] = useState<SyncState>(cachedUsageAt === null ? 'syncing' : 'cached')
  const [freshnessNow, setFreshnessNow] = useState(Date.now())
  const hadDataRef = useRef(cachedBalance !== null || cachedUsage !== null)
  const [widgetOn, setWidgetOn] = useState(widgetVisibleStore.get())
  const [lowBalance, setLowBalance] = useState(lowBalanceStore.get())
  const [monthlyBudget, setMonthlyBudget] = useState(monthlyBudgetStore.get())
  const [barMode, setBarMode] = useState<'daily' | 'hourly'>('daily')
  const [selectedModels, setSelectedModels] = useState<string[]>([])
  const [windowDays, setWindowDays] = useState<UsageWindowDays>(usageWindowStore.get())
  const [chartMetric, setChartMetric] = useState<ChartMetric>(chartMetricStore.get())
  const budgetInputRef = useRef<HTMLInputElement | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [composerHeight, setComposerHeight] = useState<number | null>(null)

  // Narrow viewports only: keep the last card scrollable clear of the host's
  // fixed composer, which otherwise overlaps the bottom of a long dashboard
  // (see LEARNINGS.md). Reuses the same `conversation.composer.dock` slot
  // widget.tsx already excludes from its own drag bounds, so both readings of
  // "where is the composer" stay in sync. Desktop layout never reads this —
  // the CSS variable is only consumed inside the 620px media query.
  useLayoutEffect(() => {
    const node = rootRef.current
    if (node === null) return
    const measure = (): void => {
      const frame = getShellFrame(node)
      const composer = getComposerElement(frame)
      const rect = composer?.getBoundingClientRect() ?? null
      const next = rect !== null && rect.height > 0 ? Math.round(rect.height) : null
      setComposerHeight(prev => (prev === next ? prev : next))
    }
    measure()
    const frame = getShellFrame(node)
    const composer = getComposerElement(frame)
    let observer: ResizeObserver | null = null
    if (typeof ResizeObserver === 'function') {
      observer = new ResizeObserver(measure)
      if (composer !== null) observer.observe(composer)
      if (frame !== null) observer.observe(frame)
    }
    window.addEventListener('resize', measure)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  // The full dashboard and the floating summary should never compete for the
  // same pixels. This does not touch the persisted widget preference: leaving
  // the tab restores it exactly as the user left it.
  useLayoutEffect(() => {
    quotaViewActiveStore.set(true)
    return () => quotaViewActiveStore.set(false)
  }, [])

  const errText = (err: unknown): string => (err as { message?: string } | null)?.message ?? String(err)

  /** Load both resources; each resolves to null on success or to its error
   *  string on failure, so a partial failure can name the half that broke. */
  const load = async (force: boolean): Promise<void> => {
    const usageAtBefore = getCachedUsageAt()
    setError(null)
    setNotice(null)
    setRefreshing(true)
    setSyncState('syncing')
    const balanceTask = fetchBalance(force).then(res => {
      if (res.ok && res.data !== undefined) {
        setBalance(res.data)
        hadDataRef.current = true
        return null
      }
      return res.error ?? '余额加载失败'
    }, err => errText(err)).then(result => {
      setLoadingBalance(false)
      return result
    })
    const usageTask = fetchUsage(force).then(res => {
      if (res.ok && res.data !== undefined) {
        setUsage(res.data)
        const updatedAt = getCachedUsageAt()
        setUsageUpdatedAt(updatedAt)
        setFreshnessNow(Date.now())
        setSyncState(updatedAt !== null && updatedAt !== usageAtBefore ? 'fresh' : 'cached')
        hadDataRef.current = true
        return null
      }
      return res.error ?? '用量加载失败'
    }, err => errText(err)).then(result => {
      setLoadingUsage(false)
      return result
    })
    const [balanceError, usageError] = await Promise.all([balanceTask, usageTask])
    setRefreshing(false)
    if (usageError !== null) {
      const fallbackAt = getCachedUsageAt()
      setUsageUpdatedAt(fallbackAt)
      setFreshnessNow(Date.now())
      setSyncState(fallbackAt === null ? 'error' : 'fallback')
    }
    if (balanceError !== null && usageError !== null) {
      // Nothing came back at all: an error only when there is nothing to show.
      if (hadDataRef.current) setNotice({ kind: 'all', error: balanceError })
      else setError(balanceError)
    } else if (balanceError !== null) {
      setNotice({ kind: 'balance', error: balanceError })
    } else if (usageError !== null) {
      setNotice({ kind: 'usage', error: usageError })
    }
  }

  useEffect(() => {
    void load(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => setFreshnessNow(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const toggle = (): void => {
    const next = !widgetOn
    setWidgetOn(next)
    widgetVisibleStore.set(next)
  }

  const changeLowBalance = (value: number): void => {
    setLowBalance(value)
    lowBalanceStore.set(value)
  }

  const changeMonthlyBudget = (value: number): void => {
    setMonthlyBudget(value)
    monthlyBudgetStore.set(value)
  }

  const changeWindowDays = (value: UsageWindowDays): void => {
    setWindowDays(value)
    usageWindowStore.set(value)
  }

  const changeChartMetric = (value: ChartMetric): void => {
    setChartMetric(value)
    chartMetricStore.set(value)
  }

  const primary = balance !== null && balance.balances.length > 0 ? balance.balances[0] : null

  // Runway: balance divided by the last 7 calendar days' average spend. Idle
  // days are included on purpose — that is the burn rate, not the busy-day rate.
  const recentDays = (usage?.daily ?? []).slice(-7)
  const avgDailyCost = recentDays.length > 0
    ? recentDays.reduce((sum, d) => sum + d.cost, 0) / recentDays.length
    : 0
  const balanceValue = primary !== null ? Number(primary.total) : Number.NaN
  // 0 disables the warning; an unreadable balance never triggers it.
  const balanceLow = lowBalance > 0 && Number.isFinite(balanceValue) && balanceValue < lowBalance
  const daysLeft = avgDailyCost > 0 && Number.isFinite(balanceValue) ? balanceValue / avgDailyCost : null
  const daysLeftText = daysLeft === null
    ? '—'
    : daysLeft >= 365 ? t('balance.overYear') : t('balance.days', { count: daysLeft < 10 ? daysLeft.toFixed(1) : Math.round(daysLeft) })
  const runwayTitle = daysLeft === null
    ? t('balance.noRunway', { days: recentDays.length || 7 })
    : t('balance.runwayTitle', { days: recentDays.length, cost: fmt(avgDailyCost) })

  const activeWindow = usage?.windows.find(window => window.days === windowDays) ?? null
  const activeWindowName = windowName(windowDays, t)

  const dailyBars = (activeWindow?.daily ?? []).map(d => ({
    label: windowDays === 365 ? d.date.slice(5).replace('-', '/') : d.date.slice(8, 10),
    value: chartMetricValue(chartMetric, d),
    title: t('chart.tooltip', {
      head: d.date, tokens: fmtInt(d.total), cost: fmt(d.cost), calls: t('common.calls', { count: d.calls }),
    }),
  }))
  const hourlyBars = (activeWindow?.hourly ?? []).map(h => ({
    label: String(h.hour),
    value: chartMetricValue(chartMetric, h),
    title: t('chart.tooltip', {
      head: t('chart.hourPoint', { hour: h.hour }), tokens: fmtInt(h.total), cost: fmt(h.cost), calls: t('common.calls', { count: h.calls }),
    }),
  }))

  // One canonical model order — most expensive first — shared by the ranking
  // card, the picker and the chart, so a model keeps its colour everywhere
  // instead of being coloured by the order it happened to be ticked in.
  // Tallest bar currently on screen — the chart has no y axis, so this is the
  // only thing giving the bars a magnitude.
  const chartPeak = (barMode === 'daily' ? dailyBars : hourlyBars)
    .reduce((peak, bar) => (bar.value > peak ? bar.value : peak), 0)
  const chartPeakText = chartMetric === 'cost'
    ? `¥${fmt(chartPeak)}`
    : chartMetric === 'calls'
      ? t('common.callsShort', { count: fmtInt(chartPeak) })
      : `${fmtCompact(chartPeak, locale)} tokens`

  const modelList = [...(activeWindow?.models ?? [])].sort((a, b) => b.cost - a.cost)
  const canonicalModels = [...(usage?.models ?? [])].sort((a, b) => b.cost - a.cost)
  const availableModelKeys = new Set(modelList.map(modelKeyOf))
  const effectiveSelection = selectedModels.filter(k => availableModelKeys.has(k))
  const colorOf = (key: string): string => {
    const index = canonicalModels.findIndex(m => modelKeyOf(m) === key)
    return MODEL_COLORS[(index < 0 ? 0 : index) % MODEL_COLORS.length]
  }
  const modelCostTotal = modelList.reduce((sum, m) => sum + m.cost, 0)

  // Per-model series for the grouped bar chart (only when models are selected).
  const grouped = effectiveSelection.map(key => {
    const m = modelList.find(x => modelKeyOf(x) === key)
    const name = m === undefined ? key : modelNameOf(m, t)
    const color = colorOf(key)
    if (barMode === 'daily') {
      return {
        key,
        name,
        color,
        bars: (m?.daily ?? []).map((p, i) => ({
          label: windowDays === 365
            ? ((activeWindow?.daily ?? [])[i]?.date.slice(5).replace('-', '/') ?? '')
            : ((activeWindow?.daily ?? [])[i]?.date.slice(8, 10) ?? ''),
          value: chartMetricValue(chartMetric, p),
          title: t('chart.tooltip', {
            head: `${name} · ${(activeWindow?.daily ?? [])[i]?.date ?? ''}`,
            tokens: fmtInt(p.total), cost: fmt(p.cost), calls: t('common.calls', { count: p.calls }),
          }),
        })),
      }
    }
    return {
      key,
      name,
      color,
      bars: (m?.hourly ?? []).map((p, i) => ({
        label: String(i),
        value: chartMetricValue(chartMetric, p),
        title: t('chart.tooltip', {
          head: `${name} · ${t('chart.hourPoint', { hour: i })}`,
          tokens: fmtInt(p.total), cost: fmt(p.cost), calls: t('common.calls', { count: p.calls }),
        }),
      })),
    }
  })
  const dailyLabelEvery = windowDays === 7 ? 1 : windowDays === 30 ? 5 : windowDays === 90 ? 15 : 30
  const dailyMinWidth = windowDays === 365 ? 1825 : undefined
  const noticeText = notice === null ? null : t(
    notice.kind === 'all'
      ? 'error.refreshCached'
      : notice.kind === 'balance' ? 'error.balanceRefreshCached' : 'error.usageRefreshCached',
    { error: localizeApiError(notice.error, t, 'error.query') },
  )
  const errorText = error === null ? null : localizeApiError(error, t, 'error.query')

  const composerSafeAreaStyle = {
    '--dq-composer-h': `${composerHeight ?? COMPOSER_FALLBACK_PX}px`,
  } as CSSProperties

  return (
    <div className="dq-balance" ref={rootRef} style={composerSafeAreaStyle}>
      <div className="dq-status-row">
        <div className="dq-status-messages">
          <span
            className={`dq-sync dq-sync--${syncState}`}
            role="status"
            aria-live="polite"
            title={usageUpdatedAt === null
              ? t('status.neverSynced')
              : t('status.usageTime', { time: new Date(usageUpdatedAt).toLocaleString(locale === 'en' ? 'en-US' : 'zh-CN', { timeZone: 'Asia/Shanghai' }) })}
          >
            <span className="dq-sync-dot" aria-hidden="true" />
            {syncStatusText(syncState, usageUpdatedAt, freshnessNow, t)}
          </span>
          {noticeText !== null && <span className="dq-warn">{noticeText}</span>}
          {errorText !== null && <span className="dq-error">{errorText}</span>}
        </div>
        <button
          type="button"
          className="dq-refresh-btn"
          title={t('status.forceRefresh')}
          disabled={refreshing}
          aria-busy={refreshing}
          onClick={() => { void load(true) }}
        >
          <span className={`dq-refresh-icon${refreshing ? ' dq-refresh-icon--spin' : ''}`}>↻</span>
          {refreshing ? t('status.refreshing') : t('status.refresh')}
        </button>
      </div>

      {balanceLow && (
        <div className="dq-alert" role="status">
          <span className="dq-alert-icon" aria-hidden="true">!</span>
          <div>
            <strong>{t('alert.lowTitle', { balance: fmt(balanceValue), currency: primary?.currency, threshold: fmt(lowBalance) })}</strong>
            {daysLeft !== null && t('alert.runway', { days: daysLeftText })}{t('common.period')}
            <a className="dq-alert-link" href="https://platform.deepseek.com/top_up" target="_blank" rel="noreferrer">{t('alert.topUp')}</a>
          </div>
        </div>
      )}

      <div className="dq-card dq-card--primary">
        <div className="dq-card-title">{t('balance.title')}</div>
        {primary !== null ? (
          <div className="dq-balance-grid">
            <div className="dq-stat">
              <div className="dq-stat-label">{t('balance.remaining')}</div>
              <details className="dq-stat-value dq-remaining">
                <summary title={t('balance.breakdownTitle')}>{fmt(primary.total)} {primary.currency}</summary>
                <div className="dq-remaining-breakdown">
                  <span>{t('balance.toppedUp', { amount: fmt(primary.toppedUp) })}</span>
                  <span className="dq-remaining-granted">{t('balance.granted', { amount: fmt(primary.granted) })}</span>
                </div>
              </details>
            </div>
            <div className="dq-stat">
              <div className="dq-stat-label">{t('balance.runway')}</div>
              <div
                className={`dq-stat-value dq-runway${daysLeft !== null && daysLeft < 3 ? ' dq-stat-value--bad' : ''}`}
                title={runwayTitle}
              >
                {daysLeftText}
              </div>
            </div>
            <Stat label={t('common.status')}>
              <div className={`dq-stat-value${balance?.isAvailable === false ? ' dq-stat-value--bad' : ' dq-stat-value--ok'}`}>
                {balance?.isAvailable === false ? t('common.unavailable') : t('common.available')}
              </div>
            </Stat>
          </div>
        ) : loadingBalance ? (
          <BalanceSkeleton />
        ) : (
          <div className="dq-empty">{t('balance.empty')}</div>
        )}
      </div>

      <div className="dq-card dq-card--primary">
        <div className="dq-card-title">{t('overview.title')}</div>
        {usage !== null ? (
          <div className="dq-period-grid">
            <Period label={t('overview.today')} period={usage.summary.today} previous={usage.summary.yesterday} compare={t('overview.vsYesterday')} />
            <Period label={t('overview.month')} period={usage.summary.month} previous={usage.summary.lastMonthToDate} compare={t('overview.vsLastMonth')} />
            <Period
              label={t('overview.total')}
              period={{ total: usage.totals.total, cost: usage.totals.cost, calls: usage.totals.calls }}
            />
          </div>
        ) : loadingUsage ? (

          <div className="dq-period-grid">
            {[0, 1, 2].map(i => (
              <div key={i} className="dq-period">
                <Skel w={40} h={11} /><Skel w={104} h={24} /><Skel w={132} h={11} />
              </div>
            ))}
          </div>
        ) : (
          <div className="dq-empty">{t('overview.empty')}</div>
        )}
        {usage !== null && (
          <BudgetMeter
            spent={usage.summary.month.cost}
            budget={monthlyBudget}
            onConfigure={() => budgetInputRef.current?.focus()}
          />
        )}
        {usage !== null && <PricingNote pricing={usage.pricing} />}
      </div>

      <div className="dq-card dq-card--primary">
        <div className="dq-card-head">
          <div className="dq-card-title">{t('usage.trendTitle')}</div>
          {usage !== null && (
            <div className="dq-card-actions">
              <UsageWindowPicker value={windowDays} onChange={changeWindowDays} />
              <ExportMenu usage={usage} />
            </div>
          )}
        </div>
        {usage !== null && activeWindow !== null ? (
          <>
            <div className="dq-usage-totals">
              <Stat label={t('usage.windowInput', { window: activeWindowName })}><div className="dq-stat-value">{fmtCompact(activeWindow.totals.input, locale)}</div></Stat>
              <Stat label={t('common.output')}><div className="dq-stat-value">{fmtCompact(activeWindow.totals.output, locale)}</div></Stat>
              <Stat label={t('common.cacheHit')}><div className="dq-stat-value">{fmtCompact(activeWindow.totals.cache, locale)}</div></Stat>
              <Stat label={t('usage.modelCalls')}><div className="dq-stat-value">{fmtInt(activeWindow.totals.calls)}</div></Stat>
            </div>
            <div className="dq-chart-block-head">
              <div className="dq-chart-title">
                {barMode === 'daily'
                  ? t('chart.dailyTitle', { window: activeWindowName, metric: chartMetricName(chartMetric, t) })
                  : t('chart.hourlyTitle', { window: activeWindowName, metric: chartMetricName(chartMetric, t) })}
                {chartPeak > 0 && <span className="dq-chart-peak">{t('chart.peak', { value: chartPeakText })}</span>}
              </div>
              <div className="dq-chart-controls">
                <ModelPicker models={modelList} selected={effectiveSelection} colorOf={colorOf} onChange={setSelectedModels} />
                <ChartMetricPicker value={chartMetric} onChange={changeChartMetric} />
                <div className="dq-chart-switch" role="tablist" aria-label={t('chart.dimensionLabel')}>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={barMode === 'daily'}
                    className={`dq-chart-switch-btn${barMode === 'daily' ? ' dq-chart-switch-btn--on' : ''}`}
                    onClick={() => setBarMode('daily')}
                  >
                    {t('chart.daily')}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={barMode === 'hourly'}
                    className={`dq-chart-switch-btn${barMode === 'hourly' ? ' dq-chart-switch-btn--on' : ''}`}
                    onClick={() => setBarMode('hourly')}
                  >
                    {t('chart.hourly')}
                  </button>
                </div>
              </div>
            </div>
            {activeWindow.totals.calls === 0 ? (
              <div className="dq-empty">{t('chart.noWindowData', { window: activeWindowName })}</div>
            ) : grouped.length > 0 ? (
              <>
                <GroupedBars
                  series={grouped}
                  height={barMode === 'daily' ? 120 : 100}
                  labelEvery={barMode === 'daily' ? dailyLabelEvery : 3}
                  minWidth={barMode === 'daily' ? dailyMinWidth : undefined}
                />
                <div className="dq-legend">
                  {grouped.map(s => (
                    <span key={s.key} className="dq-legend-item">
                      <span className="dq-legend-swatch" style={{ background: s.color }} />
                      {s.name}
                    </span>
                  ))}
                </div>
              </>
            ) : barMode === 'daily' ? (
              <Bars data={dailyBars} height={120} labelEvery={dailyLabelEvery} minWidth={dailyMinWidth} />
            ) : (
              <Bars data={hourlyBars} height={100} labelEvery={3} />
            )}
            <CoverageDiagnostics coverage={usage.coverage} />
          </>
        ) : loadingUsage ? (
          <UsageSkeleton />
        ) : (
          <div className="dq-empty">{t('chart.empty')}</div>
        )}
      </div>

      <div className="dq-card">
        <div className="dq-card-title">{t('heatmap.title')}</div>
        {usage !== null ? (
          <>
            <div className="dq-chart-title">{t('chart.heatmapTitle')}</div>
            <Heatmap data={usage.heatmap} />
          </>
        ) : loadingUsage ? (
          <HeatmapSkeleton />
        ) : (
          <div className="dq-empty">{t('chart.empty')}</div>
        )}
      </div>

      <div className="dq-card">
        <div className="dq-card-title">{t('peak.title')}</div>
        {usage !== null ? (
          <PeakCard split={usage.peakSplit} pricing={usage.pricing} currentCost={usage.totals.cost} />
        ) : loadingUsage ? (
          <>
            <div className="dq-peak-track" />
            <div className="dq-peak-figures"><Skel w={120} h={11} /><Skel w={96} h={20} /></div>
          </>
        ) : (
          <div className="dq-empty">{t('peak.empty')}</div>
        )}
      </div>

      <div className="dq-card">
        <div className="dq-card-title">{t('cache.title')}</div>
        {usage !== null ? (
          <CacheCard totals={usage.totals} />
        ) : loadingUsage ? (
          <div className="dq-cache-figures">
            {[60, 96, 72].map((w, i) => (
              <div key={i} className="dq-stat"><Skel w={w} h={11} /><Skel w={72} h={20} /></div>
            ))}
          </div>
        ) : (
          <div className="dq-empty">{t('cache.empty')}</div>
        )}
      </div>

      <div className="dq-card">
        <div className="dq-card-title">{t('models.title', { window: activeWindowName })}</div>
        {activeWindow !== null ? (
          <ModelRanking models={modelList} totalCost={modelCostTotal} colorOf={colorOf} />
        ) : loadingUsage ? (
          <div className="dq-rank">
            {[0, 1].map(i => (
              <div key={i} className="dq-rank-row">
                <Skel w={148} h={13} />
                <div className="dq-rank-track" />
                <Skel w={230} h={11} />
              </div>
            ))}
          </div>
        ) : (
          <div className="dq-empty">{t('models.empty')}</div>
        )}
      </div>

      <div className="dq-card">
        <div className="dq-card-title">{t('sessions.title', { window: activeWindowName })}</div>
        {activeWindow !== null ? (
          <SessionRanking sessions={activeWindow.sessions} count={activeWindow.sessionCount} totalCost={activeWindow.totals.cost} />
        ) : loadingUsage ? (
          <div className="dq-sessions">
            {[0, 1, 2].map(i => (
              <div key={i} className="dq-session">
                <Skel w={200} h={13} />
                <div className="dq-session-track" />
                <Skel w={250} h={11} />
              </div>
            ))}
          </div>
        ) : (
          <div className="dq-empty">{t('sessions.empty')}</div>
        )}
      </div>

      <div className="dq-card">
        <div className="dq-card-title">{t('settings.title')}</div>
        <div className="dq-links-title">{t('links.title')}</div>
        <div className="dq-links">
          <Link href="https://platform.deepseek.com/usage">{t('links.usage')}</Link>
          <Link href="https://platform.deepseek.com/api_keys">{t('links.apiKey')}</Link>
          <Link href="https://status.deepseek.com">{t('links.status')}</Link>
        </div>
        <label className="dq-toggle">
          <input type="checkbox" checked={widgetOn} onChange={toggle} />
          <span>{t('settings.widget')}</span>
        </label>
        <div className="dq-toggle-hint">{t('settings.widgetHint')}</div>
        <div className="dq-setting">
          <label className="dq-setting-label" htmlFor="dq-low-balance">{t('settings.lowBalance')}</label>
          <div className="dq-setting-control">
            <input
              id="dq-low-balance"
              className="dq-number"
              type="number"
              min={0}
              step={1}
              value={lowBalance}
              onChange={e => changeLowBalance(Math.max(0, Number(e.target.value) || 0))}
            />
            <span className="dq-setting-hint">
              {lowBalance > 0
                ? t('settings.lowBalanceOn', { amount: fmt(lowBalance), currency: primary?.currency ?? 'CNY' })
                : t('settings.lowBalanceOff')}
            </span>
          </div>
        </div>
        <div className="dq-setting">
          <label className="dq-setting-label" htmlFor="dq-monthly-budget">{t('settings.monthlyBudget')}</label>
          <div className="dq-setting-control">
            <input
              ref={budgetInputRef}
              id="dq-monthly-budget"
              className="dq-number"
              type="number"
              min={0}
              step={10}
              value={monthlyBudget}
              aria-describedby="dq-monthly-budget-hint"
              onChange={e => changeMonthlyBudget(Math.max(0, Number(e.target.value) || 0))}
            />
            <span id="dq-monthly-budget-hint" className="dq-setting-hint">
              {monthlyBudget > 0
                ? t('settings.monthlyBudgetOn', { amount: fmt(monthlyBudget) })
                : t('settings.monthlyBudgetOff')}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
