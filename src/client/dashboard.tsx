/** The 「额度」 conversation view tab: full balance & usage dashboard.
 *
 * Caching: the first render comes straight from the package-local cache
 * (see ./api.ts), so reopening the tab shows data instantly. A background
 * refresh then updates it without blocking; a full-screen 加载中 only
 * appears when nothing has ever been cached.
 */
import { Fragment, useEffect, useLayoutEffect, useRef, useState, type ReactElement, type ReactNode } from 'react'
import { USAGE_WINDOW_DAYS } from '../contract.ts'
import { fetchBalance, fetchUsage, getCachedBalance, getCachedUsage, getCachedUsageAt } from './api.ts'
import { budgetSnapshot } from './budget.ts'
import { Bars, GroupedBars, Heatmap, MODEL_COLORS, fmt, fmtCompact, fmtInt } from './charts.tsx'
import { dailyUsageCsv, downloadText, exportDateStamp, fullUsageJson, modelUsageCsv } from './export.ts'
import { syncStatusText, type SyncState } from './freshness.ts'
import type { BalanceData, ModelUsage, PeakSplit, PeriodUsage, PricingInfo, SessionCost, UsageCoverage, UsageData, UsageWindowDays } from '../contract.ts'
import { lowBalanceStore, monthlyBudgetStore, quotaViewActiveStore, usageWindowStore, widgetVisibleStore } from './store.ts'

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

/** Placeholder for the usage card: replaying every session log takes seconds,
 *  and an empty-state string there would read as "you have no usage". */
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

/** Percentage chip comparing a window against the one before it. */
function Delta(props: { current: number; previous: number; label: string }): ReactElement | null {
  const { current, previous, label } = props
  if (previous <= 0) {
    if (current <= 0) return null
    return <span className="dq-delta dq-delta--new" title={`${label}没有用量，无从对比`}>无对比</span>
  }
  const percent = Math.round(((current - previous) / previous) * 100)
  const title = `${label} ¥${fmt(previous)}`
  if (percent === 0) return <span className="dq-delta dq-delta--flat" title={title}>持平</span>
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
      <div className="dq-period-sub">{fmtCompact(period.total)} tokens · {fmtInt(period.calls)} 次调用</div>
    </div>
  )
}

/** Monthly guardrail, kept inside the overview rather than adding another card. */
function BudgetMeter(props: { spent: number; budget: number; onConfigure: () => void }): ReactElement {
  if (props.budget <= 0) {
    return (
      <div className="dq-budget dq-budget--unset">
        <span>还没设置月度预算，无法提前判断是否会超支。</span>
        <button type="button" className="dq-budget-action" onClick={props.onConfigure}>设置预算</button>
      </div>
    )
  }

  const snapshot = budgetSnapshot(props.spent, props.budget)
  const usedPercent = snapshot.ratio * 100
  const barPercent = Math.min(100, usedPercent)
  const forecastText = snapshot.status === 'over'
    ? `已超预算 ¥${fmt(Math.abs(snapshot.remaining))}`
    : snapshot.forecastOver > 0
      ? `照当前速度，预计超出 ¥${fmt(snapshot.forecastOver)}`
      : `照当前速度，预计月底 ¥${fmt(snapshot.forecast)}`

  return (
    <div className={`dq-budget dq-budget--${snapshot.status}`}>
      <div className="dq-budget-head">
        <span className="dq-budget-title">本月预算</span>
        <span className="dq-budget-amount">¥ {fmt(snapshot.spent)} / ¥ {fmt(snapshot.budget)}</span>
      </div>
      <div
        className="dq-budget-track"
        role="progressbar"
        aria-label="本月预算使用进度"
        aria-valuemin={0}
        aria-valuemax={snapshot.budget}
        aria-valuenow={Math.min(snapshot.spent, snapshot.budget)}
        aria-valuetext={`已使用 ${usedPercent.toFixed(1)}%，${forecastText}`}
      >
        <div className="dq-budget-fill" style={{ transform: `scaleX(${barPercent / 100})` }} />
      </div>
      <div className="dq-budget-meta">
        <span>{snapshot.remaining >= 0 ? `剩余 ¥${fmt(snapshot.remaining)}` : `超出 ¥${fmt(Math.abs(snapshot.remaining))}`}</span>
        <span>{forecastText}</span>
      </div>
    </div>
  )
}

const rate = (value: number): string => `¥${value.toLocaleString(undefined, { maximumFractionDigits: 3 })}`

/** Auditable breakdown of the rates the cost estimate was computed with —
 *  a `<details>` so it is keyboard-reachable without any extra state. */
function PricingNote(props: { pricing: PricingInfo }): ReactElement {
  const { pricing } = props
  const split = pricing.splitActive
  return (
    <details className="dq-pricing">
      <summary className="dq-pricing-summary">
        计价说明
        {split && (
          <span className={`dq-pricing-now${pricing.inPeakNow ? ' dq-pricing-now--peak' : ''}`}>
            当前 {pricing.inPeakNow ? '高峰时段' : '闲时'}
          </span>
        )}
      </summary>
      <div className="dq-pricing-body">
        <table className="dq-pricing-table">
          <thead>
            <tr>
              <th>模型</th>
              <th>{split ? '时段' : '单价'}</th>
              <th>输入·缓存命中</th>
              <th>输入·未命中</th>
              <th>输出</th>
            </tr>
          </thead>
          <tbody>
            {pricing.tiers.map(tier => (
              <Fragment key={tier.model}>
                <tr>
                  <td rowSpan={tier.offPeak !== null ? 2 : 1}>{tier.model}</td>
                  <td>{split ? '高峰' : '固定'}</td>
                  <td>{rate(tier.peak.cacheHit)}</td>
                  <td>{rate(tier.peak.input)}</td>
                  <td>{rate(tier.peak.output)}</td>
                </tr>
                {tier.offPeak !== null && (
                  <tr>
                    <td>闲时</td>
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
          单位：{pricing.currency} / 百万 tokens。
          {split
            ? `高峰时段为北京时间 ${pricing.peakWindows.join('、')}，其余为闲时（价格减半）；${pricing.switchDate} 之前的用量仍按旧价估算。`
            : `${pricing.switchDate} 00:00 起改为峰谷定价（高峰 ${pricing.peakWindows.join('、')}，闲时价格减半），届时本页会按每条记录的时间自动分段计价。`}
          未知模型按 deepseek-v4-pro 计价。
        </p>
      </div>
    </details>
  )
}

const coverageTime = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

/** Make a locally-computed bill honest about which logs it could inspect. */
function CoverageDiagnostics(props: { coverage: UsageCoverage }): ReactElement {
  const { coverage } = props
  const hasGaps = coverage.failedSessions > 0
    || coverage.skippedRecords > 0
    || coverage.scannedSessions < coverage.listedSessions
  const range = coverage.earliestAt === null || coverage.latestAt === null
    ? '暂无有效用量时间'
    : `${coverageTime.format(coverage.earliestAt)} – ${coverageTime.format(coverage.latestAt)}`

  return (
    <details className={`dq-coverage${hasGaps ? ' dq-coverage--warn' : ''}`}>
      <summary className="dq-coverage-summary">
        <span className="dq-coverage-title">统计范围</span>
        <span className="dq-coverage-status">{hasGaps ? '存在缺口' : '本机读取完整'}</span>
        <span className="dq-coverage-brief">
          扫描 {fmtInt(coverage.scannedSessions)} / {fmtInt(coverage.listedSessions)} 个会话 · {fmtInt(coverage.usageRecords)} 条用量记录
        </span>
      </summary>
      <div className="dq-coverage-body">
        <dl className="dq-coverage-metrics">
          <div><dt>成功扫描</dt><dd>{fmtInt(coverage.scannedSessions)} 个会话</dd></div>
          <div><dt>读取失败</dt><dd>{fmtInt(coverage.failedSessions)} 个会话</dd></div>
          <div><dt>跳过记录</dt><dd>{fmtInt(coverage.skippedRecords)} 条</dd></div>
        </dl>
        <p className="dq-coverage-range">记录时间：{range}</p>
        <p className="dq-coverage-note">
          这里只统计当前设备上的 DSH 会话日志，不包含其他设备、DeepSeek 平台直接调用或已删除的本地日志。
        </p>
        {hasGaps && (
          <p className="dq-coverage-warning">
            本次回放有日志无法读取或用量记录格式异常，页面汇总可能低于实际消耗；可刷新重试，并以 DeepSeek 官方平台账单为准。
          </p>
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
        title="导出全部本机 DSH 会话日志数据（不受统计周期影响）"
        onClick={() => setOpen(value => !value)}
      >
        {done ? '已导出' : '导出'}
      </button>
      {open && (
        <div ref={menuRef} className="dq-export-menu" aria-label="选择导出格式">
          <button type="button" onClick={exportDaily}>
            <span>逐天 CSV</span><small>{props.usage.daily.length} 行</small>
          </button>
          <button type="button" onClick={exportModels}>
            <span>逐模型 CSV</span><small>{props.usage.models.length} 行</small>
          </button>
          <button type="button" onClick={exportJson}>
            <span>完整 JSON</span><small>含图表与排行</small>
          </button>
        </div>
      )}
    </div>
  )
}

export const modelKeyOf = (m: ModelUsage): string => (m.provider !== '' ? `${m.provider}/${m.model}` : m.model)

export const modelNameOf = (m: ModelUsage): string => (m.model !== '' ? m.model : '未知模型')

/**
 * What prefix caching is doing for the bill. Cache-hit tokens are priced at a
 * small fraction of cache-miss tokens, so on a DSH workload this is usually the
 * single biggest lever on cost — and it was invisible before.
 */
function CacheCard(props: { totals: UsageData['totals'] }): ReactElement {
  const { totals } = props
  const prompt = totals.input + totals.cache
  if (prompt === 0) return <div className="dq-empty">还没有 prompt token 可统计缓存命中。</div>
  const rate = totals.cache / prompt
  const wouldHaveCost = totals.cost + totals.cacheSavings
  const low = rate < 0.6
  return (
    <div className="dq-cache">
      <div className="dq-cache-figures">
        <div className="dq-stat">
          <div className="dq-stat-label">缓存命中率</div>
          <div className={`dq-stat-value${low ? ' dq-stat-value--warn' : ' dq-stat-value--ok'}`}>
            {(rate * 100).toFixed(1)}%
          </div>
        </div>
        <div className="dq-stat">
          <div className="dq-stat-label">已节省费用（估算）</div>
          <div className="dq-stat-value">¥ {fmt(totals.cacheSavings)}</div>
        </div>
        <div className="dq-stat">
          <div className="dq-stat-label">若全部未命中</div>
          <div className="dq-stat-value dq-muted-value">¥ {fmt(wouldHaveCost)}</div>
        </div>
      </div>
      <div className="dq-cache-track" role="img" aria-label={`缓存命中 ${(rate * 100).toFixed(1)}%，未命中 ${((1 - rate) * 100).toFixed(1)}%`}>
        <div className="dq-cache-fill" style={{ width: `${rate * 100}%` }} />
      </div>
      <div className="dq-cache-legend">
        <span><span className="dq-legend-swatch dq-legend-swatch--hit" />缓存命中 {fmtCompact(totals.cache)}</span>
        <span><span className="dq-legend-swatch dq-legend-swatch--miss" />未命中 {fmtCompact(totals.input)}（按未命中价计费）</span>
      </div>
      <p className="dq-cache-foot">
        {low
          ? '命中率偏低：频繁改动 system prompt / 工具定义会让前缀缓存失效，把稳定内容放在对话最前面能提高命中率。'
          : '前缀缓存把重复的 prompt 前缀按命中价计费，是这份账单上最大的省钱杠杆。'}
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
  const { split, pricing, currentCost } = props
  const total = split.peak.total + split.offPeak.total
  if (total === 0) return <div className="dq-empty">还没有可按时段归类的用量。</div>
  const peakShare = split.peak.total / total
  const shiftSaving = split.peakEraCost - split.offPeakEraCost
  const increase = split.peakEraCost - currentCost
  const increasePercent = currentCost > 0 ? (increase / currentCost) * 100 : 0
  return (
    <div className="dq-peak">
      <div
        className="dq-peak-track"
        role="img"
        aria-label={`高峰时段 ${(peakShare * 100).toFixed(1)}%，闲时 ${((1 - peakShare) * 100).toFixed(1)}%`}
      >
        <div className="dq-peak-fill" style={{ width: `${peakShare * 100}%` }} />
      </div>
      <div className="dq-peak-legend">
        <span><span className="dq-legend-swatch dq-legend-swatch--peak" />高峰 {(peakShare * 100).toFixed(1)}% · {fmtCompact(split.peak.total)} tokens · {fmtInt(split.peak.calls)} 次</span>
        <span><span className="dq-legend-swatch dq-legend-swatch--offpeak" />闲时 {((1 - peakShare) * 100).toFixed(1)}% · {fmtCompact(split.offPeak.total)} tokens · {fmtInt(split.offPeak.calls)} 次</span>
      </div>
      <div className="dq-peak-figures">
        {!pricing.splitActive && (
          <div className="dq-stat">
            <div className="dq-stat-label">同样用量在新价下</div>
            <div className="dq-stat-value">
              ¥ {fmt(split.peakEraCost)}
              <span className="dq-peak-delta">较现价 +{increasePercent.toFixed(0)}%</span>
            </div>
          </div>
        )}
        <div className="dq-stat">
          <div className="dq-stat-label">若高峰用量都挪到闲时</div>
          <div className="dq-stat-value">
            ¥ {fmt(split.offPeakEraCost)}
            <span className="dq-peak-delta dq-peak-delta--save">可省 ¥{fmt(shiftSaving)}</span>
          </div>
        </div>
      </div>
      <p className="dq-peak-foot">
        高峰时段为北京时间 {pricing.peakWindows.join('、')}，闲时价格减半。
        {pricing.splitActive
          ? '把批量、可延后的任务放到闲时跑，同样的 token 只要一半的钱。'
          : `新价 ${pricing.switchDate} 00:00 生效；上面两个数字是按你已有的全部用量重算的。`}
      </p>
    </div>
  )
}

/** Coarse "how long ago", enough to tell a live session from last week's. */
function agoText(ms: number): string {
  const minutes = Math.floor((Date.now() - ms) / 60_000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  return `${Math.floor(hours / 24)} 天前`
}

/**
 * Which sessions burned the money. Per-model and per-day views say what and
 * when; this says *which run*, which is the one an agent user can act on —
 * a single expensive session is a prompt or a loop worth looking at.
 */
function SessionRanking(props: { sessions: SessionCost[]; count: number; totalCost: number }): ReactElement {
  const { sessions, count, totalCost } = props
  if (sessions.length === 0) return <div className="dq-empty">还没有产生费用的会话。</div>
  const top = sessions[0].cost
  return (
    <>
      <ol className="dq-sessions">
        {sessions.map(s => (
          <li key={s.id} className="dq-session">
            <div className="dq-session-head">
              <span className="dq-session-title" title={`${s.title}\n${s.id}`}>{s.title}</span>
              <span className="dq-session-cost">¥ {fmt(s.cost)}</span>
            </div>
            <div className="dq-session-track">
              <div className="dq-session-fill" style={{ width: `${Math.max((s.cost / (top || 1)) * 100, 1.5)}%` }} />
            </div>
            <div className="dq-session-sub">
              {fmtCompact(s.total)} tokens · {fmtInt(s.calls)} 次调用 · {agoText(s.lastActive)}
              {totalCost > 0 && <> · 占 {((s.cost / totalCost) * 100).toFixed(1)}%</>}
            </div>
          </li>
        ))}
      </ol>
      {count > sessions.length && (
        <p className="dq-session-foot">共 {fmtInt(count)} 个会话有用量，上面是最贵的 {sessions.length} 个。</p>
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
  const { models, totalCost } = props
  if (models.length === 0) return <div className="dq-empty">还没有可归类的模型用量。</div>
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
                {modelNameOf(m)}
              </span>
              <span className="dq-rank-cost">
                ¥ {fmt(m.cost)}
                <span className="dq-rank-share">{(share * 100).toFixed(1)}%</span>
              </span>
            </div>
            <div
              className="dq-rank-track"
              role="img"
              aria-label={`${modelNameOf(m)} 占总费用 ${(share * 100).toFixed(1)}%`}
            >
              <div className="dq-rank-fill" style={{ width: `${Math.max(share * 100, 1.5)}%`, background: props.colorOf(key) }} />
            </div>
            <div className="dq-rank-sub">
              {fmtCompact(m.total)} tokens · {fmtInt(m.calls)} 次调用 · 输入 {fmtCompact(m.input)} / 输出 {fmtCompact(m.output)} / 缓存 {fmtCompact(m.cache)}
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

  const label = props.selected.length === 0 ? '全部模型' : `模型 ×${props.selected.length}`

  return (
    <div className="dq-model-picker" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="dq-model-btn"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls="dq-model-menu"
        title="筛选图表中显示的模型"
        onClick={() => setOpen(value => !value)}
      >
        {label}
      </button>
      {open && (
        <div id="dq-model-menu" ref={menuRef} className="dq-model-menu" role="group" aria-label="筛选图表模型">
          <label className="dq-model-item dq-model-item--all">
            <input
              type="checkbox"
              checked={props.selected.length === 0}
              onChange={() => props.onChange([])}
            />
            <span>全部模型</span>
          </label>
          {models.map(m => {
            const key = modelKeyOf(m)
            return (
              <label key={key} className="dq-model-item">
                <input type="checkbox" checked={props.selected.includes(key)} onChange={() => toggle(key)} />
                <span className="dq-legend-swatch" style={{ background: props.colorOf(key) }} />
                <span>{modelNameOf(m)}</span>
                <span className="dq-model-tag">{fmtCompact(m.total)}</span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

const windowName = (days: UsageWindowDays): string => days === 365 ? '近 1 年' : `近 ${days} 天`

/** One range choice controls every metric whose title carries that range. */
function UsageWindowPicker(props: { value: UsageWindowDays; onChange: (days: UsageWindowDays) => void }): ReactElement {
  return (
    <div className="dq-window-switch" role="group" aria-label="统计周期">
      {USAGE_WINDOW_DAYS.map(days => (
        <button
          key={days}
          type="button"
          className={`dq-window-btn${props.value === days ? ' dq-window-btn--on' : ''}`}
          aria-pressed={props.value === days}
          title={`查看${windowName(days)}的用量与排行`}
          onClick={() => props.onChange(days)}
        >
          {days === 365 ? '1 年' : `${days} 天`}
        </button>
      ))}
    </div>
  )
}

export function BalanceDashboard(): ReactElement {
  // Seed state from the cache so the tab never waits on the network when
  // data has been fetched before (stale-while-revalidate).
  const cachedBalance = getCachedBalance()
  const cachedUsage = getCachedUsage()
  const cachedUsageAt = getCachedUsageAt()
  const [balance, setBalance] = useState<BalanceData | null>(cachedBalance?.data ?? null)
  const [usage, setUsage] = useState<UsageData | null>(cachedUsage?.data ?? null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
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
  const budgetInputRef = useRef<HTMLInputElement | null>(null)

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
      if (hadDataRef.current) setNotice(`刷新失败，正在展示缓存数据（${balanceError}）`)
      else setError(balanceError)
    } else if (balanceError !== null) {
      setNotice(`余额刷新失败，正在展示缓存余额（${balanceError}）`)
    } else if (usageError !== null) {
      setNotice(`用量刷新失败，正在展示缓存用量（${usageError}）`)
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
    : daysLeft >= 365 ? '> 365 天' : `${daysLeft < 10 ? daysLeft.toFixed(1) : Math.round(daysLeft)} 天`
  const runwayTitle = daysLeft === null
    ? `近 ${recentDays.length || 7} 天没有用量，无法估算`
    : `按近 ${recentDays.length} 天日均 ¥${fmt(avgDailyCost)} 估算（含无用量的日子；今天尚未过完）`

  const activeWindow = usage?.windows.find(window => window.days === windowDays) ?? null
  const activeWindowName = windowName(windowDays)

  const dailyBars = (activeWindow?.daily ?? []).map(d => ({
    label: windowDays === 365 ? d.date.slice(5).replace('-', '/') : d.date.slice(8, 10),
    value: d.total,
    title: `${d.date} · ${fmtInt(d.total)} tokens · ¥${fmt(d.cost)} · ${d.calls} 次调用`,
  }))
  const hourlyBars = (activeWindow?.hourly ?? []).map(h => ({
    label: String(h.hour),
    value: h.total,
    title: `${h.hour} 点 · ${fmtInt(h.total)} tokens · ${h.calls} 次调用`,
  }))

  // One canonical model order — most expensive first — shared by the ranking
  // card, the picker and the chart, so a model keeps its colour everywhere
  // instead of being coloured by the order it happened to be ticked in.
  // Tallest bar currently on screen — the chart has no y axis, so this is the
  // only thing giving the bars a magnitude.
  const chartPeak = (barMode === 'daily' ? dailyBars : hourlyBars)
    .reduce((peak, bar) => (bar.value > peak ? bar.value : peak), 0)

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
    const name = m === undefined ? key : modelNameOf(m)
    const color = colorOf(key)
    if (barMode === 'daily') {
      return {
        key,
        name,
        color,
        bars: (m?.daily ?? []).map((p, i) => ({
          label: (activeWindow?.daily ?? [])[i]?.date.slice(8, 10) ?? '',
          value: p.total,
          title: `${name} · ${(activeWindow?.daily ?? [])[i]?.date ?? ''} · ${fmtInt(p.total)} tokens · ¥${fmt(p.cost)} · ${p.calls} 次调用`,
        })),
      }
    }
    return {
      key,
      name,
      color,
      bars: (m?.hourly ?? []).map((p, i) => ({
        label: String(i),
        value: p.total,
        title: `${name} · ${i} 点 · ${fmtInt(p.total)} tokens · ¥${fmt(p.cost)} · ${p.calls} 次调用`,
      })),
    }
  })
  const dailyLabelEvery = windowDays === 7 ? 1 : windowDays === 30 ? 5 : windowDays === 90 ? 15 : 30
  const dailyMinWidth = windowDays === 365 ? 1825 : undefined

  return (
    <div className="dq-balance">
      <div className="dq-status-row">
        <div className="dq-status-messages">
          <span
            className={`dq-sync dq-sync--${syncState}`}
            role="status"
            aria-live="polite"
            title={usageUpdatedAt === null
              ? '还没有成功同步过用量数据'
              : `用量数据时间：${new Date(usageUpdatedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`}
          >
            <span className="dq-sync-dot" aria-hidden="true" />
            {syncStatusText(syncState, usageUpdatedAt, freshnessNow)}
          </span>
          {notice !== null && <span className="dq-warn">{notice}</span>}
          {error !== null && <span className="dq-error">{error}</span>}
        </div>
        <button
          type="button"
          className="dq-refresh-btn"
          title="强制刷新（绕过缓存）"
          disabled={refreshing}
          aria-busy={refreshing}
          onClick={() => { void load(true) }}
        >
          <span className={`dq-refresh-icon${refreshing ? ' dq-refresh-icon--spin' : ''}`}>↻</span>
          {refreshing ? '刷新中' : '刷新'}
        </button>
      </div>

      {balanceLow && (
        <div className="dq-alert" role="status">
          <span className="dq-alert-icon" aria-hidden="true">!</span>
          <div>
            <strong>余额 {fmt(balanceValue)} {primary?.currency} 已低于预警线 {fmt(lowBalance)}</strong>
            {daysLeft !== null && <>，按近期用量估计还能撑 {daysLeftText}</>}。
            <a className="dq-alert-link" href="https://platform.deepseek.com/top_up" target="_blank" rel="noreferrer">去充值</a>
          </div>
        </div>
      )}

      <div className="dq-card">
        <div className="dq-card-title">账户余额</div>
        {primary !== null ? (
          <div className="dq-balance-grid">
            <div className="dq-stat">
              <div className="dq-stat-label">剩余余额</div>
              <div className="dq-stat-value dq-remaining">
                <span>{fmt(primary.total)} {primary.currency}</span>
                <div className="dq-remaining-breakdown">
                  <span>充值额度 {fmt(primary.toppedUp)}</span>
                  <span className="dq-remaining-granted">赠送额度 {fmt(primary.granted)}</span>
                </div>
              </div>
            </div>
            <div className="dq-stat">
              <div className="dq-stat-label">预计可用</div>
              <div
                className={`dq-stat-value dq-runway${daysLeft !== null && daysLeft < 3 ? ' dq-stat-value--bad' : ''}`}
                title={runwayTitle}
              >
                {daysLeftText}
              </div>
            </div>
            <Stat label="状态">
              <div className={`dq-stat-value${balance?.isAvailable === false ? ' dq-stat-value--bad' : ' dq-stat-value--ok'}`}>
                {balance?.isAvailable === false ? '不可用' : '可用'}
              </div>
            </Stat>
          </div>
        ) : loadingBalance ? (
          <BalanceSkeleton />
        ) : (
          <div className="dq-empty">读不到余额。请确认「设置 → 模型」里已填 DEEPSEEK_API_KEY，然后点右上角刷新。</div>
        )}
      </div>

      <div className="dq-card">
        <div className="dq-card-title">消耗概览（费用为估算）</div>
        {usage !== null ? (
          <div className="dq-period-grid">
            <Period label="今日" period={usage.summary.today} previous={usage.summary.yesterday} compare="较昨日" />
            <Period label="本月" period={usage.summary.month} previous={usage.summary.lastMonthToDate} compare="较上月同期" />
            <Period
              label="累计"
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
          <div className="dq-empty">还没有可统计的消耗。</div>
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

      <div className="dq-card">
        <div className="dq-card-head">
          <div className="dq-card-title">DSH 用量（tokens）</div>
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
              <Stat label={`${activeWindowName}输入`}><div className="dq-stat-value">{fmtCompact(activeWindow.totals.input)}</div></Stat>
              <Stat label="输出"><div className="dq-stat-value">{fmtCompact(activeWindow.totals.output)}</div></Stat>
              <Stat label="缓存命中"><div className="dq-stat-value">{fmtCompact(activeWindow.totals.cache)}</div></Stat>
              <Stat label="模型调用"><div className="dq-stat-value">{fmtInt(activeWindow.totals.calls)}</div></Stat>
            </div>
            <div className="dq-chart-block-head">
              <div className="dq-chart-title">
                {barMode === 'daily' ? `${activeWindowName} · 逐天用量` : `${activeWindowName} · 按小时分布（0–23 点）`}
                {chartPeak > 0 && <span className="dq-chart-peak">峰值 {fmtCompact(chartPeak)} tokens</span>}
              </div>
              <div className="dq-chart-controls">
                <ModelPicker models={modelList} selected={effectiveSelection} colorOf={colorOf} onChange={setSelectedModels} />
                <div className="dq-chart-switch" role="tablist" aria-label="切换图表维度">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={barMode === 'daily'}
                    className={`dq-chart-switch-btn${barMode === 'daily' ? ' dq-chart-switch-btn--on' : ''}`}
                    onClick={() => setBarMode('daily')}
                  >
                    逐天
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={barMode === 'hourly'}
                    className={`dq-chart-switch-btn${barMode === 'hourly' ? ' dq-chart-switch-btn--on' : ''}`}
                    onClick={() => setBarMode('hourly')}
                  >
                    逐小时
                  </button>
                </div>
              </div>
            </div>
            {activeWindow.totals.calls === 0 ? (
              <div className="dq-empty">{activeWindowName}没有用量记录，换个更长周期看看。</div>
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
            <div className="dq-chart-title">近一年 · 每日用量热力图</div>
            <Heatmap data={usage.heatmap} />
            <CoverageDiagnostics coverage={usage.coverage} />
          </>
        ) : loadingUsage ? (
          <UsageSkeleton />
        ) : (
          <div className="dq-empty">还没有用量记录。在 DSH 里跑一轮对话，这里会出现逐天 / 逐小时统计与费用估算。</div>
        )}
      </div>

      <div className="dq-card">
        <div className="dq-card-title">高峰 / 闲时分布</div>
        {usage !== null ? (
          <PeakCard split={usage.peakSplit} pricing={usage.pricing} currentCost={usage.totals.cost} />
        ) : loadingUsage ? (
          <>
            <div className="dq-peak-track" />
            <div className="dq-peak-figures"><Skel w={120} h={11} /><Skel w={96} h={20} /></div>
          </>
        ) : (
          <div className="dq-empty">还没有可按时段归类的用量。</div>
        )}
      </div>

      <div className="dq-card">
        <div className="dq-card-title">缓存命中与节省</div>
        {usage !== null ? (
          <CacheCard totals={usage.totals} />
        ) : loadingUsage ? (
          <div className="dq-cache-figures">
            {[60, 96, 72].map((w, i) => (
              <div key={i} className="dq-stat"><Skel w={w} h={11} /><Skel w={72} h={20} /></div>
            ))}
          </div>
        ) : (
          <div className="dq-empty">还没有 prompt token 可统计缓存命中。</div>
        )}
      </div>

      <div className="dq-card">
        <div className="dq-card-title">模型成本排行 · {activeWindowName}</div>
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
          <div className="dq-empty">还没有可归类的模型用量。</div>
        )}
      </div>

      <div className="dq-card">
        <div className="dq-card-title">会话成本排行 · {activeWindowName}</div>
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
          <div className="dq-empty">还没有产生费用的会话。</div>
        )}
      </div>

      <div className="dq-card">
        <div className="dq-card-title">官方平台</div>
        <div className="dq-links">
          <Link href="https://platform.deepseek.com/usage">查看额度 / 用量</Link>
          <Link href="https://platform.deepseek.com/api_keys">生成 API Key</Link>
          <Link href="https://status.deepseek.com">服务状态</Link>
        </div>
      </div>

      <div className="dq-card">
        <div className="dq-card-title">设置</div>
        <label className="dq-toggle">
          <input type="checkbox" checked={widgetOn} onChange={toggle} />
          <span>在其他页面显示右下角悬浮额度窗口</span>
        </label>
        <div className="dq-toggle-hint">当前额度页已展示完整数据，悬浮窗会自动隐藏；切回 Chat 或 Trajectory 后恢复。</div>
        <div className="dq-setting">
          <label className="dq-setting-label" htmlFor="dq-low-balance">余额预警线</label>
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
                ? `余额低于 ${fmt(lowBalance)} ${primary?.currency ?? 'CNY'} 时，这里和悬浮窗都会转为警示色。填 0 关闭。`
                : '已关闭余额预警。填一个大于 0 的数开启。'}
            </span>
          </div>
        </div>
        <div className="dq-setting">
          <label className="dq-setting-label" htmlFor="dq-monthly-budget">月度预算</label>
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
                ? `按北京时间自然月跟踪 ${fmt(monthlyBudget)} CNY 预算，并在消耗概览预测月底花费。填 0 关闭。`
                : '填一个大于 0 的金额，消耗概览会显示进度与月底预测。'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
