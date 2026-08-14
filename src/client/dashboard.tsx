/** The 「额度」 conversation view tab: full balance & usage dashboard.
 *
 * Caching: the first render comes straight from the package-local cache
 * (see ./api.ts), so reopening the tab shows data instantly. A background
 * refresh then updates it without blocking; a full-screen 加载中 only
 * appears when nothing has ever been cached.
 */
import { useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react'
import { fetchBalance, fetchUsage, getCachedBalance, getCachedUsage } from './api.ts'
import { Bars, GroupedBars, Heatmap, MODEL_COLORS, fmt, fmtCompact, fmtInt } from './charts.tsx'
import type { BalanceData, ModelUsage, UsageData } from '../contract.ts'
import { getWidgetVisible, setWidgetVisible } from './store.ts'

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

/** Multi-select model dropdown feeding the grouped bar chart. */
function ModelPicker(props: {
  models: ModelUsage[]
  selected: string[]
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
  const [loading, setLoading] = useState(cachedBalance === null && cachedUsage === null)
  const [refreshing, setRefreshing] = useState(false)
  const [widgetOn, setWidgetOn] = useState(getWidgetVisible())
  const [barMode, setBarMode] = useState<'daily' | 'hourly'>('daily')
  const [selectedModels, setSelectedModels] = useState<string[]>([])

  const load = async (force: boolean): Promise<void> => {
    setError(null)
    setNotice(null)
    setRefreshing(true)
    try {
      const [b, u] = await Promise.all([fetchBalance(force), fetchUsage(force)])
      const nextB = b.ok && b.data !== undefined ? b.data : null
      const nextU = u.ok && u.data !== undefined ? u.data : null
      if (nextB !== null) setBalance(nextB)
      if (nextU !== null) setUsage(nextU)
      const haveAny = nextB !== null || nextU !== null || balance !== null || usage !== null
      if (!haveAny) {
        setError(b.error ?? u.error ?? '加载失败')
      } else if (nextB === null && nextU === null) {
        // Keep showing the cached data; just say the refresh failed.
        setNotice('刷新失败，正在展示缓存数据')
      }
    } catch (err) {
      if (balance === null && usage === null) {
        setError((err as { message?: string } | null)?.message ?? String(err))
      } else {
        setNotice('刷新失败，正在展示缓存数据')
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void load(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggle = (): void => {
    const next = !widgetOn
    setWidgetOn(next)
    setWidgetVisible(next)
  }

  const primary = balance !== null && balance.balances.length > 0 ? balance.balances[0] : null

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

  const modelList = usage?.models ?? []
  const availableModelKeys = new Set(modelList.map(modelKeyOf))
  const effectiveSelection = selectedModels.filter(k => availableModelKeys.has(k))

  // Per-model series for the grouped bar chart (only when models are selected).
  const grouped = effectiveSelection.map((key, idx) => {
    const m = modelList.find(x => modelKeyOf(x) === key)
    const name = m === undefined ? key : modelNameOf(m)
    const color = MODEL_COLORS[idx % MODEL_COLORS.length]
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
          {loading && <span className="dq-muted">加载中…</span>}
          {!loading && refreshing && <span className="dq-muted">更新中…</span>}
          {notice !== null && <span className="dq-muted">{notice}</span>}
          {error !== null && <span className="dq-error">{error}</span>}
        </div>
        <button
          type="button"
          className="dq-refresh-btn"
          title="强制刷新（绕过缓存）"
          onClick={() => { void load(true) }}
        >
          ↻ 刷新
        </button>
      </div>

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
            <Stat label="状态">
              <div className={`dq-stat-value${balance?.isAvailable === false ? ' dq-stat-value--bad' : ' dq-stat-value--ok'}`}>
                {balance?.isAvailable === false ? '不可用' : '可用'}
              </div>
            </Stat>
          </div>
        ) : (
          <div className="dq-muted">暂无余额数据</div>
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
        <div className="dq-card-title">DSH 用量（tokens）</div>
        {usage !== null ? (
          <>
            <div className="dq-usage-totals">
              <Stat label="累计 tokens"><div className="dq-stat-value">{fmtCompact(usage.totals.total)}</div></Stat>
              <Stat label="消耗费用（估算）"><div className="dq-stat-value">¥ {fmt(usage.totals.cost)}</div></Stat>
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
                <ModelPicker models={modelList} selected={effectiveSelection} onChange={setSelectedModels} />
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
        ) : (
          <div className="dq-muted">暂无用量数据</div>
        )}
      </div>

      <div className="dq-card">
        <label className="dq-toggle">
          <input type="checkbox" checked={widgetOn} onChange={toggle} />
          <span>显示右下角悬浮额度窗口</span>
        </label>
      </div>
    </div>
  )
}
