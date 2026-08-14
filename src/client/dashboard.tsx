/** The 「额度」 conversation view tab: full balance & usage dashboard.
 *
 * Caching: the first render comes straight from the package-local cache
 * (see ./api.ts), so reopening the tab shows data instantly. A background
 * refresh then updates it without blocking; a full-screen 加载中 only
 * appears when nothing has ever been cached.
 */
import { Fragment, useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react'
import { fetchBalance, fetchUsage, getCachedBalance, getCachedUsage } from './api.ts'
import { Bars, GroupedBars, Heatmap, MODEL_COLORS, fmt, fmtCompact, fmtInt } from './charts.tsx'
import type { BalanceData, ModelUsage, PeriodUsage, PricingInfo, UsageData } from '../contract.ts'
import { lowBalanceStore, widgetVisibleStore } from './store.ts'

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
        <span><span className="dq-legend-swatch dq-legend-swatch--miss" />未命中 {fmtCompact(totals.input)}</span>
      </div>
      <p className="dq-cache-foot">
        {low
          ? '命中率偏低：频繁改动 system prompt / 工具定义会让前缀缓存失效，把稳定内容放在对话最前面能提高命中率。'
          : '前缀缓存把重复的 prompt 前缀按命中价计费，是这份账单上最大的省钱杠杆。'}
      </p>
    </div>
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
  if (models.length === 0) return null
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent): void => {
      if (rootRef.current !== null && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

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
      <button type="button" className="dq-model-btn" onClick={() => setOpen(!open)}>{label}</button>
      {open && (
        <div className="dq-model-menu">
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

export function BalanceDashboard(): ReactElement {
  // Seed state from the cache so the tab never waits on the network when
  // data has been fetched before (stale-while-revalidate).
  const cachedBalance = getCachedBalance()
  const cachedUsage = getCachedUsage()
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
  const hadDataRef = useRef(cachedBalance !== null || cachedUsage !== null)
  const [widgetOn, setWidgetOn] = useState(widgetVisibleStore.get())
  const [lowBalance, setLowBalance] = useState(lowBalanceStore.get())
  const [barMode, setBarMode] = useState<'daily' | 'hourly'>('daily')
  const [selectedModels, setSelectedModels] = useState<string[]>([])

  const errText = (err: unknown): string => (err as { message?: string } | null)?.message ?? String(err)

  /** Load both resources; each resolves to null on success or to its error
   *  string on failure, so a partial failure can name the half that broke. */
  const load = async (force: boolean): Promise<void> => {
    setError(null)
    setNotice(null)
    setRefreshing(true)
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

  const toggle = (): void => {
    const next = !widgetOn
    setWidgetOn(next)
    widgetVisibleStore.set(next)
  }

  const changeLowBalance = (value: number): void => {
    setLowBalance(value)
    lowBalanceStore.set(value)
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

  const dailyBars = (usage?.daily ?? []).map(d => ({
    label: d.date.slice(8, 10),
    value: d.total,
    title: `${d.date} · ${fmtInt(d.total)} tokens · ¥${fmt(d.cost)} · ${d.calls} 次调用`,
  }))
  const hourlyBars = (usage?.hourly ?? []).map(h => ({
    label: String(h.hour),
    value: h.total,
    title: `${h.hour} 点 · ${fmtInt(h.total)} tokens · ${h.calls} 次调用`,
  }))

  // One canonical model order — most expensive first — shared by the ranking
  // card, the picker and the chart, so a model keeps its colour everywhere
  // instead of being coloured by the order it happened to be ticked in.
  const modelList = [...(usage?.models ?? [])].sort((a, b) => b.cost - a.cost)
  const availableModelKeys = new Set(modelList.map(modelKeyOf))
  const effectiveSelection = selectedModels.filter(k => availableModelKeys.has(k))
  const colorOf = (key: string): string => {
    const index = modelList.findIndex(m => modelKeyOf(m) === key)
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
          label: (usage?.daily ?? [])[i]?.date.slice(8, 10) ?? '',
          value: p.total,
          title: `${name} · ${(usage?.daily ?? [])[i]?.date ?? ''} · ${fmtInt(p.total)} tokens · ¥${fmt(p.cost)} · ${p.calls} 次调用`,
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

  return (
    <div className="dq-balance">
      <div className="dq-status-row">
        <div>
          {(loadingBalance || loadingUsage) && <span className="dq-muted">加载中…</span>}
          {!loadingBalance && !loadingUsage && refreshing && <span className="dq-muted">更新中…</span>}
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
        {usage !== null && <PricingNote pricing={usage.pricing} />}
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
        <div className="dq-card-title">DSH 用量（tokens）</div>
        {usage !== null ? (
          <>
            <div className="dq-usage-totals">
              <Stat label="输入"><div className="dq-stat-value">{fmtCompact(usage.totals.input)}</div></Stat>
              <Stat label="输出"><div className="dq-stat-value">{fmtCompact(usage.totals.output)}</div></Stat>
              <Stat label="缓存命中"><div className="dq-stat-value">{fmtCompact(usage.totals.cache)}</div></Stat>
              <Stat label="模型调用"><div className="dq-stat-value">{fmtInt(usage.totals.calls)}</div></Stat>
            </div>
            <div className="dq-chart-block-head">
              <div className="dq-chart-title">
                {barMode === 'daily' ? '近 30 天 · 逐天用量' : '按小时分布（0–23 点）'}
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
            {grouped.length > 0 ? (
              <>
                <GroupedBars
                  series={grouped}
                  height={barMode === 'daily' ? 120 : 100}
                  labelEvery={barMode === 'daily' ? 5 : 3}
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
              <Bars data={dailyBars} height={120} labelEvery={5} />
            ) : (
              <Bars data={hourlyBars} height={100} labelEvery={3} />
            )}
            <div className="dq-chart-title">近 12 周 · 每日用量热力图</div>
            <Heatmap data={usage.heatmap} />
          </>
        ) : loadingUsage ? (
          <UsageSkeleton />
        ) : (
          <div className="dq-empty">还没有用量记录。在 DSH 里跑一轮对话，这里会出现逐天 / 逐小时统计与费用估算。</div>
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
        <div className="dq-card-title">模型成本排行</div>
        {usage !== null ? (
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
        <div className="dq-card-title">设置</div>
        <label className="dq-toggle">
          <input type="checkbox" checked={widgetOn} onChange={toggle} />
          <span>显示右下角悬浮额度窗口</span>
        </label>
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
      </div>
    </div>
  )
}
