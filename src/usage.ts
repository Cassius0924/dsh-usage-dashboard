/**
 * Balance and usage data sources.
 *
 * - Balance: DeepSeek API `GET /user/balance` with the key resolved through
 *   the credentials service (`DEEPSEEK_API_KEY`).
 * - Usage: token usage folded from the DSH session logs (`sessionPersistence`),
 *   one record per `assistant/message` event, bucketed by local day / hour.
 */
import type { BalanceResponse, ModelSeriesPoint, ModelUsage, PeriodUsage, UsageData, UsageResponse, UsageSummary } from './contract.ts'
import type { CredentialsFace, SessionEventFace, SessionPersistenceFace } from './context.ts'

const pad2 = (n: number): string => (n < 10 ? `0${n}` : String(n))

// deepseek-v4-pro pricing, CNY per 1M tokens (pre-2026-08-17 flat pricing;
// DeepSeek switches to peak/off-peak on 2026-08-17 — adjust when needed).
const PRICE_INPUT_PER_M = 3
const PRICE_CACHE_PER_M = 0.025
const PRICE_OUTPUT_PER_M = 6

const costOf = (input: number, cache: number, output: number): number =>
  (input * PRICE_INPUT_PER_M + cache * PRICE_CACHE_PER_M + output * PRICE_OUTPUT_PER_M) / 1_000_000

function errorMessage(err: unknown): string {
  return (err as { message?: string } | null)?.message ?? String(err)
}

export async function fetchBalance(credentials: CredentialsFace | undefined): Promise<BalanceResponse> {
  if (credentials === undefined) return { ok: false, error: '凭证服务不可用' }
  let cred: { value: string } | undefined
  try {
    cred = await credentials.resolve('DEEPSEEK_API_KEY')
  } catch (err) {
    return { ok: false, error: `读取 API Key 失败：${errorMessage(err)}` }
  }
  if (cred === undefined || cred.value === '') {
    return { ok: false, error: '未配置 DEEPSEEK_API_KEY（可在「设置 → 模型」中填写）' }
  }
  let res: Response
  try {
    res = await fetch('https://api.deepseek.com/user/balance', {
      headers: { authorization: `Bearer ${cred.value}` },
      signal: AbortSignal.timeout(20000),
    })
  } catch (err) {
    return { ok: false, error: `请求余额接口失败：${errorMessage(err)}` }
  }
  if (!res.ok) return { ok: false, error: `余额接口返回错误（HTTP ${res.status}）` }
  let parsed: unknown
  try {
    parsed = await res.json()
  } catch {
    return { ok: false, error: '解析余额响应失败' }
  }
  const p = parsed as {
    is_available?: boolean
    balance_infos?: Array<{ currency?: string; total_balance?: string; granted_balance?: string; topped_up_balance?: string }>
  }
  return {
    ok: true,
    data: {
      isAvailable: p.is_available === true,
      balances: (p.balance_infos ?? []).map(b => ({
        currency: b.currency ?? '',
        total: b.total_balance ?? '0',
        granted: b.granted_balance ?? '0',
        toppedUp: b.topped_up_balance ?? '0',
      })),
    },
  }
}

interface Bucket {
  input: number
  output: number
  cache: number
  total: number
  cost: number
  calls: number
}

const emptyBucket = (): Bucket => ({ input: 0, output: 0, cache: 0, total: 0, cost: 0, calls: 0 })

const dayKeyOf = (d: Date): string => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`

/**
 * Roll the per-day buckets up into the windows the dashboard's summary card
 * shows. Everything is keyed by local date, matching how the buckets were
 * filled, so "today" means the user's today.
 */
function summarize(dayMap: Map<string, Bucket>, now: Date): UsageSummary {
  const sum = (matches: (key: string) => boolean): PeriodUsage => {
    const acc: PeriodUsage = { total: 0, cost: 0, calls: 0 }
    for (const [key, bucket] of dayMap) {
      if (!matches(key)) continue
      acc.total += bucket.total
      acc.cost += bucket.cost
      acc.calls += bucket.calls
    }
    return acc
  }
  const todayKey = dayKeyOf(now)
  const yesterdayKey = dayKeyOf(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))
  const monthPrefix = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-`
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthPrefix = `${lastMonth.getFullYear()}-${pad2(lastMonth.getMonth() + 1)}-`
  const dayOfMonth = now.getDate()
  return {
    today: sum(key => key === todayKey),
    yesterday: sum(key => key === yesterdayKey),
    month: sum(key => key.startsWith(monthPrefix)),
    lastMonthToDate: sum(key => key.startsWith(lastMonthPrefix) && Number(key.slice(8)) <= dayOfMonth),
  }
}

/**
 * Fold usage out of one session's event log. The model for every
 * `assistant/message` usage record is the one from the latest preceding
 * `request/header` event (each request logs one before dispatch), so usage
 * can be attributed per model. Events without any preceding header fall back
 * to the `''`/`''` (unknown) bucket.
 */
function addUsageEvent(events: SessionEventFace[] | undefined, onEvent: (time: number, input: number, output: number, cache: number, reasoning: number, provider: string, model: string) => void): void {
  if (events === undefined) return
  let provider = ''
  let model = ''
  for (const ev of events) {
    if (ev?.type === 'request/header') {
      const cfg = ev.data?.header?.config
      if (cfg?.provider !== undefined && cfg?.model !== undefined) {
        provider = cfg.provider
        model = cfg.model
      }
      continue
    }
    if (ev?.type !== 'assistant/message') continue
    const usage = ev.data?.usage
    if (usage === undefined) continue
    const input = Number(usage.inputTokens) || 0
    const output = Number(usage.outputTokens) || 0
    const cache = Number(usage.cacheReadTokens) || 0
    const reasoning = Number(usage.reasoningTokens) || 0
    if (ev.time === undefined) continue
    onEvent(ev.time, input, output, cache, reasoning, provider, model)
  }
}

export async function fetchUsage(persistence: SessionPersistenceFace | undefined): Promise<UsageResponse> {
  if (persistence === undefined) return { ok: false, error: '会话持久化服务不可用' }
  let headers: Array<{ id?: string; sessionId?: string }>
  try {
    headers = await persistence.list()
  } catch (err) {
    return { ok: false, error: `读取会话列表失败：${errorMessage(err)}` }
  }
  const dayMap = new Map<string, Bucket>()
  const hourMap = new Map<string, Bucket>()
  const overall: Bucket & { reasoning: number } = { ...emptyBucket(), reasoning: 0 }
  // Per model: key `${provider}/${model}` -> totals and day/hour maps.
  const modelTotals = new Map<string, Bucket>()
  const modelDays = new Map<string, Map<string, Bucket>>()
  const modelHours = new Map<string, Map<string, Bucket>>()

  const bump = (map: Map<string, Bucket>, key: string, input: number, output: number, cache: number): void => {
    const bucket = map.get(key) ?? emptyBucket()
    bucket.input += input
    bucket.output += output
    bucket.cache += cache
    // reasoningTokens is a subset of outputTokens; never double-count it.
    bucket.total += input + output + cache
    bucket.cost += costOf(input, cache, output)
    bucket.calls += 1
    map.set(key, bucket)
  }

  for (const header of headers) {
    const sid = header.id ?? header.sessionId
    if (sid === undefined || sid === '') continue
    try {
      const { events } = await persistence.readFrom(sid, 0)
      addUsageEvent(events, (time, input, output, cache, reasoning, provider, model) => {
        const d = new Date(time)
        const dayKey = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
        const hourKey = String(d.getHours())
        const modelKey = `${provider}/${model}`
        bump(dayMap, dayKey, input, output, cache)
        bump(hourMap, hourKey, input, output, cache)
        bump(modelTotals, modelKey, input, output, cache)
        let days = modelDays.get(modelKey)
        if (days === undefined) {
          days = new Map()
          modelDays.set(modelKey, days)
        }
        bump(days, dayKey, input, output, cache)
        let hours = modelHours.get(modelKey)
        if (hours === undefined) {
          hours = new Map()
          modelHours.set(modelKey, hours)
        }
        bump(hours, hourKey, input, output, cache)
        overall.input += input
        overall.output += output
        overall.cache += cache
        overall.reasoning += reasoning
        overall.total += input + output + cache
        overall.cost += costOf(input, cache, output)
        overall.calls += 1
      })
    } catch {
      // One broken session log must not sink the whole dashboard.
    }
  }

  const daily: UsageData['daily'] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000)
    const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
    const b = dayMap.get(key) ?? emptyBucket()
    daily.push({ date: key, input: b.input, output: b.output, cache: b.cache, total: b.total, cost: b.cost, calls: b.calls })
  }

  const hourly: UsageData['hourly'] = []
  for (let i = 0; i < 24; i++) {
    const b = hourMap.get(String(i)) ?? emptyBucket()
    hourly.push({ hour: i, total: b.total, cost: b.cost, calls: b.calls })
  }

  const heatmap: UsageData['heatmap'] = []
  for (let i = 83; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000)
    const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
    const b = dayMap.get(key) ?? emptyBucket()
    heatmap.push({ date: key, total: b.total, cost: b.cost, calls: b.calls })
  }

  const models: ModelUsage[] = []
  for (const [modelKey, bucket] of modelTotals) {
    const slash = modelKey.indexOf('/')
    const provider = slash < 0 ? '' : modelKey.slice(0, slash)
    const model = slash < 0 ? modelKey : modelKey.slice(slash + 1)
    const days = modelDays.get(modelKey)
    const hours = modelHours.get(modelKey)
    const daily: ModelSeriesPoint[] = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000)
      const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
      const b = days?.get(key) ?? emptyBucket()
      daily.push({ total: b.total, cost: b.cost, calls: b.calls })
    }
    const hourly: ModelSeriesPoint[] = []
    for (let i = 0; i < 24; i++) {
      const b = hours?.get(String(i)) ?? emptyBucket()
      hourly.push({ total: b.total, cost: b.cost, calls: b.calls })
    }
    models.push({
      provider,
      model,
      input: bucket.input,
      output: bucket.output,
      cache: bucket.cache,
      total: bucket.total,
      cost: bucket.cost,
      calls: bucket.calls,
      daily,
      hourly,
    })
  }
  models.sort((a, b) => b.total - a.total)

  return {
    ok: true,
    data: {
      daily,
      hourly,
      heatmap,
      models,
      summary: summarize(dayMap, new Date()),
      totals: {
        input: overall.input,
        output: overall.output,
        cache: overall.cache,
        reasoning: overall.reasoning,
        total: overall.total,
        cost: overall.cost,
        calls: overall.calls,
      },
    },
  }
}
