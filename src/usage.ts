/**
 * Balance and usage data sources.
 *
 * - Balance: the signed-in DeepSeek account through the optional
 *   `deepseekAccount` service (`getBalance`, no API key needed), falling back
 *   to `GET /user/balance` with the key resolved through the credentials
 *   service (`DEEPSEEK_API_KEY`).
 * - Usage: token usage folded from the DSH session logs (`sessionPersistence`),
 *   one record per `assistant/message` event, bucketed by local day / hour.
 */
import { isValidSessionId, USAGE_WINDOW_DAYS } from './contract.ts'
import type { BalanceData, BalanceInfo, BalanceResponse, ModelSeriesPoint, ModelUsage, PeakSplit, PeriodUsage, SessionCost, SessionModelUsage, SessionUsageResponse, UsageCoverage, UsageData, UsageResponse, UsageSummary, UsageWindowDays, VisionDayPoint, VisionSession, VisionStats } from './contract.ts'
import type { AccountClientFace, AccountWalletFace, ContentBlockFace, CredentialsFace, DeepSeekAccountFace, ImageAttachmentFace, SessionEventFace, SessionHeaderFace, SessionPersistenceFace } from './context.ts'
import { cacheSavingOf, costOf, costUnderPeakEra, estimateImageTokens, isPeak, pricingInfo } from './pricing.ts'

const pad2 = (n: number): string => (n < 10 ? `0${n}` : String(n))

function errorMessage(err: unknown): string {
  return (err as { message?: string } | null)?.message ?? String(err)
}

/** Identity the account service forwards to Platform as client headers. The
 *  host has no browser identity; wallet totals don't depend on it, so the
 *  desktop build's version (when the host environment carries one) and the
 *  host's own UTC offset are enough. */
const ACCOUNT_CLIENT: AccountClientFace = {
  version: process.env.DSH_CLIENT_VERSION ?? '0.0.0',
  locale: 'zh-CN',
  timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60,
}

/** The account service reports the recharge (`value`) and granted
 *  (`bonusWallets`) wallets separately; the card shows one total per currency
 *  with that same breakdown, so fold the two lists into its shape. */
function accountBalances(
  toppedUpWallets: readonly AccountWalletFace[],
  grantedWallets: readonly AccountWalletFace[],
): BalanceInfo[] {
  const byCurrency = new Map<string, { total: number; granted: number; toppedUp: number }>()
  const add = (wallets: readonly AccountWalletFace[], field: 'toppedUp' | 'granted'): void => {
    for (const wallet of wallets) {
      const currency = wallet.currency ?? ''
      const amount = Number(wallet.balance ?? '0')
      if (currency === '' || !Number.isFinite(amount)) continue
      const acc = byCurrency.get(currency) ?? { total: 0, granted: 0, toppedUp: 0 }
      acc[field] += amount
      acc.total += amount
      byCurrency.set(currency, acc)
    }
  }
  add(toppedUpWallets, 'toppedUp')
  add(grantedWallets, 'granted')
  return [...byCurrency].map(([currency, acc]) => ({
    currency,
    total: acc.total.toFixed(2),
    granted: acc.granted.toFixed(2),
    toppedUp: acc.toppedUp.toFixed(2),
  }))
}

/** Query the signed-in account's wallets. `signed-out` (the service's own
 *  null) and `failed` (Platform rejected the query, or the service threw) both
 *  let the caller fall back to the API key; only `failed` is worth surfacing
 *  when no key exists. */
async function readAccountBalance(account: DeepSeekAccountFace): Promise<
  { ok: true; data: BalanceData } | { ok: false; reason: 'signed-out' | 'failed' }
> {
  try {
    const result = await account.getBalance(ACCOUNT_CLIENT)
    if (result === null) return { ok: false, reason: 'signed-out' }
    if (result.status !== 'ready') return { ok: false, reason: 'failed' }
    const balances = accountBalances(result.value ?? [], result.bonusWallets ?? [])
    return { ok: true, data: { isAvailable: balances.length > 0, balances } }
  } catch {
    return { ok: false, reason: 'failed' }
  }
}

export async function fetchBalance(
  credentials: CredentialsFace | undefined,
  account?: DeepSeekAccountFace,
): Promise<BalanceResponse> {
  const fromAccount = account === undefined ? undefined : await readAccountBalance(account)
  if (fromAccount?.ok === true) return { ok: true, data: fromAccount.data }
  if (credentials === undefined) return { ok: false, error: '凭证服务不可用' }
  let cred: { value: string } | undefined
  try {
    cred = await credentials.resolve('DEEPSEEK_API_KEY')
  } catch (err) {
    return { ok: false, error: `读取 API Key 失败：${errorMessage(err)}` }
  }
  if (cred === undefined || cred.value === '') {
    // Report the reason that actually applies: a failing account endpoint is
    // not the same as no credential at all, and telling a signed-in user to
    // configure an API key they don't need hides the real problem.
    return {
      ok: false,
      error: fromAccount?.reason === 'failed'
        ? '账号余额接口不可用，且未配置 DEEPSEEK_API_KEY'
        : '未配置 DEEPSEEK_API_KEY（可在「设置 → 模型」中填写）',
    }
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

/** Cost is computed once per event (it depends on the model and on whether
 *  the event landed in a peak window) and folded into every bucket that
 *  needs it — shared by the account-wide replay and the single-session one. */
function bump(map: Map<string, Bucket>, key: string, input: number, output: number, cache: number, cost: number): void {
  const bucket = map.get(key) ?? emptyBucket()
  bucket.input += input
  bucket.output += output
  bucket.cache += cache
  // reasoningTokens is a subset of outputTokens; never double-count it.
  bucket.total += input + output + cache
  bucket.cost += cost
  bucket.calls += 1
  map.set(key, bucket)
}

type OverallBucket = Bucket & { reasoning: number; cacheSavings: number }
const emptyOverall = (): OverallBucket => ({ ...emptyBucket(), reasoning: 0, cacheSavings: 0 })

/** Image usage folded one record at a time; `imageTokens`/`cost` are official-
 *  rule estimates, `bytes` is the counted payload size when refs carry one. */
interface VisionAcc {
  images: number
  imageTokens: number
  cost: number
  bytes: number
}

const emptyVision = (): VisionAcc => ({ images: 0, imageTokens: 0, cost: 0, bytes: 0 })

function bumpVisionInto(
  acc: VisionAcc,
  images: number,
  imageTokens: number,
  cost: number,
  bytes: number,
): void {
  acc.images += images
  acc.imageTokens += imageTokens
  acc.cost += cost
  acc.bytes += bytes
}

function bumpVisionMap(
  map: Map<string, VisionAcc>,
  key: string,
  images: number,
  imageTokens: number,
  cost: number,
  bytes: number,
): void {
  const acc = map.get(key) ?? emptyVision()
  bumpVisionInto(acc, images, imageTokens, cost, bytes)
  map.set(key, acc)
}

interface WindowAccumulator {
  days: UsageWindowDays
  startKey: string
  endKey: string
  dayMap: Map<string, Bucket>
  hourMap: Map<string, Bucket>
  overall: OverallBucket
  modelTotals: Map<string, Bucket>
  modelDays: Map<string, Map<string, Bucket>>
  modelHours: Map<string, Map<string, Bucket>>
  sessions: SessionCost[]
  vision: VisionAcc
  visionDays: Map<string, VisionAcc>
  visionSessions: Map<string, VisionAcc & { title: string }>
}

/** How many sessions the ranking keeps; the rest are summarised by count. */
const SESSION_TOP_N = 6

/**
 * The session's own title, folded from its log: `session/title` events are
 * append-only and the last one wins. It rides along with the usage replay, so
 * naming a session costs no extra read.
 */
function titleOf(events: SessionEventFace[] | undefined, id: string): string {
  let title = ''
  if (events !== undefined) {
    for (const ev of events) {
      if (ev?.type !== 'session/title') continue
      const next = ev.data?.title
      if (typeof next === 'string' && next !== '') title = next
    }
  }
  return title !== '' ? title : `会话 ${id.slice(0, 8)}`
}

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
 *
 * Image blocks are collected alongside: `user/message` content and tool
 * results (`tool/result`, screenshots from tools) may carry `image` blocks,
 * and every pending image is attributed to the next usage record — the model
 * call whose prompt actually carried it. Images followed by no usage record
 * (the request failed or never ran) contribute nothing to the fold, since no
 * model call was billed for them.
 */
function addUsageEvent(
  events: SessionEventFace[] | undefined,
  onEvent: (
    time: number,
    input: number,
    output: number,
    cache: number,
    reasoning: number,
    provider: string,
    model: string,
    messageId: string | undefined,
    turn: number | undefined,
    images: ImageAttachmentFace[],
  ) => void,
): Pick<UsageCoverage, 'usageRecords' | 'skippedRecords'> {
  const result = { usageRecords: 0, skippedRecords: 0 }
  if (events === undefined) return result
  let provider = ''
  let model = ''
  const pendingImages: ImageAttachmentFace[] = []
  for (const ev of events) {
    if (ev?.type === 'request/header') {
      const cfg = ev.data?.header?.config
      if (cfg?.provider !== undefined && cfg?.model !== undefined) {
        provider = cfg.provider
        model = cfg.model
      }
      continue
    }
    pendingImages.push(...imagesInEvent(ev))
    if (ev?.type !== 'assistant/message') continue
    const usage = ev.data?.usage
    if (usage === undefined) continue
    const values = [usage.inputTokens, usage.outputTokens, usage.cacheReadTokens, usage.reasoningTokens]
      .map(value => value === undefined ? 0 : Number(value))
    if (typeof ev.time !== 'number' || !Number.isFinite(ev.time) || values.some(value => !Number.isFinite(value) || value < 0)) {
      result.skippedRecords += 1
      continue
    }
    const [input = 0, output = 0, cache = 0, reasoning = 0] = values
    const rawMessageId = ev.data?.message?.id
    const messageId = typeof rawMessageId === 'string' && rawMessageId !== '' ? rawMessageId : undefined
    const rawTurn = ev.data?.turn
    const turn = typeof rawTurn === 'number' && Number.isFinite(rawTurn) ? rawTurn : undefined
    onEvent(ev.time, input, output, cache, reasoning, provider, model, messageId, turn, pendingImages)
    pendingImages.length = 0
    result.usageRecords += 1
  }
  return result
}

/** Every `image` attachment ref inside one content-block tree, including
 *  blocks nested in tool-result blocks (`tool/result` screenshots). */
function imageBlocks(blocks: ContentBlockFace[] | undefined): ImageAttachmentFace[] {
  const found: ImageAttachmentFace[] = []
  const walkAll = (items: ContentBlockFace[] | undefined): void => {
    for (const item of items ?? []) {
      if (item?.type === 'image' && item.attachment !== undefined && item.attachment !== null) {
        found.push(item.attachment)
      }
      if (Array.isArray(item?.content)) walkAll(item.content)
    }
  }
  walkAll(blocks)
  return found
}

/** Image attachment refs carried by one event: `user/message` blocks at
 *  `data.content`, `tool/result` blocks at `data.message.content`. */
function imagesInEvent(ev: SessionEventFace | undefined): ImageAttachmentFace[] {
  if (ev === undefined) return []
  return [
    ...imageBlocks(ev.data?.content),
    ...imageBlocks(ev.data?.message?.content),
  ]
}

/**
 * Read one session's full event log across host generations. Handle-era DSH
 * (the one without `readFrom`) exposes `open(id, 'read')` → slice reads that
 * must be looped until an empty slice, then `close()`; legacy hosts returned
 * the whole log from `readFrom(id, 0)`. One shared path so `fetchUsage` and
 * `fetchSessionUsage` close the handle on every outcome, success or failure.
 */
async function readSessionEvents(persistence: SessionPersistenceFace, id: string): Promise<SessionEventFace[] | undefined> {
  if (typeof persistence.open === 'function') {
    const handle = await persistence.open(id, 'read')
    try {
      const events: SessionEventFace[] = []
      for (;;) {
        const slice = await handle.read(events.length)
        const batch = slice.events ?? []
        if (batch.length === 0) return events
        // Loop, not spread: one slice can carry a whole long session and
        // `push(...batch)` would overflow the call-argument stack.
        for (const event of batch) events.push(event)
      }
    } finally {
      // A read handle has nothing durable to drain, and a close failure
      // must not mask the read's result or error.
      try { await handle.close() } catch { /* nothing to drain */ }
    }
  }
  if (persistence.readFrom === undefined) {
    throw new Error('宿主 sessionPersistence 缺少 open() 与 readFrom()，无法读取会话日志')
  }
  const { events } = await persistence.readFrom(id, 0)
  return events
}

export async function fetchUsage(persistence: SessionPersistenceFace | undefined, nowMs = Date.now()): Promise<UsageResponse> {
  if (persistence === undefined) return { ok: false, error: '会话持久化服务不可用' }
  let headers: SessionHeaderFace[]
  try {
    headers = await persistence.list()
  } catch (err) {
    return { ok: false, error: `读取会话列表失败：${errorMessage(err)}` }
  }
  const dayMap = new Map<string, Bucket>()
  const hourMap = new Map<string, Bucket>()
  const overall = emptyOverall()
  // Per model: key `${provider}/${model}` -> totals and day/hour maps.
  const modelTotals = new Map<string, Bucket>()
  const modelDays = new Map<string, Map<string, Bucket>>()
  const modelHours = new Map<string, Map<string, Bucket>>()
  const sessions: SessionCost[] = []
  // Image usage across everything the replay sees. Day-keyed series mirrors
  // the daily bucket map; per-session tracks "which run kept sending pictures".
  const vision = emptyVision()
  const visionDays = new Map<string, VisionAcc>()
  const visionSessions = new Map<string, VisionAcc & { title: string }>()
  const coverage: UsageCoverage = {
    scope: 'local-dsh-session-logs',
    listedSessions: 0,
    scannedSessions: 0,
    usageRecords: 0,
    skippedRecords: 0,
    failedSessions: 0,
    earliestAt: null,
    latestAt: null,
  }
  // Peak / off-peak split, plus the same usage re-priced as if everything
  // had landed in an idle window (the shift-off-peak saving).
  const peakSplit: PeakSplit = {
    peak: { total: 0, cost: 0, calls: 0 },
    offPeak: { total: 0, cost: 0, calls: 0 },
    peakEraCost: 0,
    offPeakEraCost: 0,
  }

  const now = new Date(nowMs)
  const dateBefore = (days: number): Date => new Date(now.getFullYear(), now.getMonth(), now.getDate() - days)
  const windowAggregates: WindowAccumulator[] = USAGE_WINDOW_DAYS.map(days => ({
    days,
    startKey: dayKeyOf(dateBefore(days - 1)),
    endKey: dayKeyOf(now),
    dayMap: new Map(),
    hourMap: new Map(),
    overall: emptyOverall(),
    modelTotals: new Map(),
    modelDays: new Map(),
    modelHours: new Map(),
    sessions: [],
    vision: emptyVision(),
    visionDays: new Map(),
    visionSessions: new Map(),
  }))

  const bumpOverall = (
    bucket: OverallBucket,
    input: number,
    output: number,
    cache: number,
    reasoning: number,
    cost: number,
    cacheSavings: number,
  ): void => {
    bucket.input += input
    bucket.output += output
    bucket.cache += cache
    bucket.reasoning += reasoning
    bucket.total += input + output + cache
    bucket.cost += cost
    bucket.cacheSavings += cacheSavings
    bucket.calls += 1
  }

  const bumpModel = (
    totals: Map<string, Bucket>,
    days: Map<string, Map<string, Bucket>>,
    hours: Map<string, Map<string, Bucket>>,
    modelKey: string,
    dayKey: string,
    hourKey: string,
    input: number,
    output: number,
    cache: number,
    cost: number,
  ): void => {
    bump(totals, modelKey, input, output, cache, cost)
    let dayBuckets = days.get(modelKey)
    if (dayBuckets === undefined) {
      dayBuckets = new Map()
      days.set(modelKey, dayBuckets)
    }
    bump(dayBuckets, dayKey, input, output, cache, cost)
    let hourBuckets = hours.get(modelKey)
    if (hourBuckets === undefined) {
      hourBuckets = new Map()
      hours.set(modelKey, hourBuckets)
    }
    bump(hourBuckets, hourKey, input, output, cache, cost)
  }

  const bumpSession = (session: SessionCost, time: number, total: number, cost: number): void => {
    session.total += total
    session.cost += cost
    session.calls += 1
    if (time > session.lastActive) session.lastActive = time
  }

  const sessionIds = headers
    .map(header => header.id ?? header.sessionId ?? header.header?.id ?? header.header?.sessionId)
    .filter((sid): sid is string => sid !== undefined && sid !== '')
  coverage.listedSessions = sessionIds.length

  for (const sid of sessionIds) {
    try {
      const events = await readSessionEvents(persistence, sid)
      coverage.scannedSessions += 1
      const session: SessionCost = { id: sid, title: '', total: 0, cost: 0, calls: 0, lastActive: 0 }
      const windowSessions = windowAggregates.map((): SessionCost => ({ id: sid, title: '', total: 0, cost: 0, calls: 0, lastActive: 0 }))
      const sessionVision: VisionAcc & { title: string } = { ...emptyVision(), title: '' }
      const windowVisionSessions = windowAggregates.map((): VisionAcc & { title: string } => ({ ...emptyVision(), title: '' }))
      const scanned = addUsageEvent(events, (time, input, output, cache, reasoning, provider, model, _messageId, _turn, images) => {
        if (coverage.earliestAt === null || time < coverage.earliestAt) coverage.earliestAt = time
        if (coverage.latestAt === null || time > coverage.latestAt) coverage.latestAt = time
        const d = new Date(time)
        const dayKey = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
        const hourKey = String(d.getHours())
        const modelKey = `${provider}/${model}`
        const cost = costOf(time, model, input, cache, output)
        const cacheSavings = cacheSavingOf(time, model, cache)
        const eventTotal = input + output + cache
        bump(dayMap, dayKey, input, output, cache, cost)
        bump(hourMap, hourKey, input, output, cache, cost)
        bumpModel(modelTotals, modelDays, modelHours, modelKey, dayKey, hourKey, input, output, cache, cost)
        bumpOverall(overall, input, output, cache, reasoning, cost, cacheSavings)
        bumpSession(session, time, eventTotal, cost)
        // Image blocks ride the record that consumed them: estimated tokens
        // (official resizing rule) priced at that call's cache-miss input rate.
        if (images.length > 0) {
          let imageTokensSum = 0
          let imageCostSum = 0
          let imageBytesSum = 0
          for (const image of images) {
            const width = typeof image.width === 'number' ? image.width : 0
            const height = typeof image.height === 'number' ? image.height : 0
            const tokens = estimateImageTokens(width, height)
            imageTokensSum += tokens
            imageCostSum += costOf(time, model, tokens, 0, 0)
            imageBytesSum += typeof image.bytes === 'number' ? image.bytes : 0
          }
          bumpVisionInto(vision, images.length, imageTokensSum, imageCostSum, imageBytesSum)
          bumpVisionMap(visionDays, dayKey, images.length, imageTokensSum, imageCostSum, imageBytesSum)
          bumpVisionInto(sessionVision, images.length, imageTokensSum, imageCostSum, imageBytesSum)
          for (let i = 0; i < windowAggregates.length; i++) {
            const aggregate = windowAggregates[i]
            if (dayKey < aggregate.startKey || dayKey > aggregate.endKey) continue
            bumpVisionInto(aggregate.vision, images.length, imageTokensSum, imageCostSum, imageBytesSum)
            bumpVisionMap(aggregate.visionDays, dayKey, images.length, imageTokensSum, imageCostSum, imageBytesSum)
            bumpVisionInto(windowVisionSessions[i], images.length, imageTokensSum, imageCostSum, imageBytesSum)
          }
        }
        for (let i = 0; i < windowAggregates.length; i++) {
          const aggregate = windowAggregates[i]
          if (dayKey < aggregate.startKey || dayKey > aggregate.endKey) continue
          bump(aggregate.dayMap, dayKey, input, output, cache, cost)
          bump(aggregate.hourMap, hourKey, input, output, cache, cost)
          bumpModel(aggregate.modelTotals, aggregate.modelDays, aggregate.modelHours, modelKey, dayKey, hourKey, input, output, cache, cost)
          bumpOverall(aggregate.overall, input, output, cache, reasoning, cost, cacheSavings)
          bumpSession(windowSessions[i], time, eventTotal, cost)
        }
        const window = isPeak(time) ? peakSplit.peak : peakSplit.offPeak
        window.total += eventTotal
        window.cost += cost
        window.calls += 1
        peakSplit.peakEraCost += costUnderPeakEra(time, model, input, cache, output)
        peakSplit.offPeakEraCost += costUnderPeakEra(time, model, input, cache, output, true)
      })
      coverage.usageRecords += scanned.usageRecords
      coverage.skippedRecords += scanned.skippedRecords
      if (session.calls > 0) {
        const title = titleOf(events, sid)
        session.title = title
        sessions.push(session)
        for (let i = 0; i < windowAggregates.length; i++) {
          const windowSession = windowSessions[i]
          if (windowSession.calls === 0) continue
          windowSession.title = title
          windowAggregates[i].sessions.push(windowSession)
        }
      }
      if (sessionVision.images > 0) {
        sessionVision.title = titleOf(events, sid)
        visionSessions.set(sid, sessionVision)
        for (let i = 0; i < windowAggregates.length; i++) {
          const windowVision = windowVisionSessions[i]
          if (windowVision.images === 0) continue
          windowVision.title = sessionVision.title
          windowAggregates[i].visionSessions.set(sid, windowVision)
        }
      }
    } catch {
      // One broken session log must not sink the whole dashboard.
      coverage.failedSessions += 1
    }
  }

  const makeDaily = (map: Map<string, Bucket>, count: number): UsageData['daily'] => {
    const result: UsageData['daily'] = []
    for (let i = count - 1; i >= 0; i--) {
      const key = dayKeyOf(dateBefore(i))
      const b = map.get(key) ?? emptyBucket()
      result.push({ date: key, input: b.input, output: b.output, cache: b.cache, total: b.total, cost: b.cost, calls: b.calls })
    }
    return result
  }

  const makeHourly = (map: Map<string, Bucket>): UsageData['hourly'] => {
    const result: UsageData['hourly'] = []
    for (let i = 0; i < 24; i++) {
      const b = map.get(String(i)) ?? emptyBucket()
      result.push({ hour: i, total: b.total, cost: b.cost, calls: b.calls })
    }
    return result
  }

  const makeModels = (
    totals: Map<string, Bucket>,
    daysByModel: Map<string, Map<string, Bucket>>,
    hoursByModel: Map<string, Map<string, Bucket>>,
    dayCount: number,
  ): ModelUsage[] => {
    const result: ModelUsage[] = []
    for (const [modelKey, bucket] of totals) {
      const slash = modelKey.indexOf('/')
      const provider = slash < 0 ? '' : modelKey.slice(0, slash)
      const model = slash < 0 ? modelKey : modelKey.slice(slash + 1)
      const days = daysByModel.get(modelKey)
      const hours = hoursByModel.get(modelKey)
      const daily: ModelSeriesPoint[] = makeDaily(days ?? new Map(), dayCount)
        .map(point => ({ total: point.total, cost: point.cost, calls: point.calls }))
      const hourly: ModelSeriesPoint[] = makeHourly(hours ?? new Map())
        .map(point => ({ total: point.total, cost: point.cost, calls: point.calls }))
      result.push({
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
    result.sort((a, b) => b.total - a.total)
    return result
  }

  const daily = makeDaily(dayMap, 30)
  const hourly = makeHourly(hourMap)

  // 52 full weeks (364 days) rather than a calendar year, so the grid is
  // always a whole number of week-columns and never carries an orphan day.
  const heatmap: UsageData['heatmap'] = []
  for (let i = 363; i >= 0; i--) {
    const key = dayKeyOf(dateBefore(i))
    const b = dayMap.get(key) ?? emptyBucket()
    heatmap.push({ date: key, total: b.total, cost: b.cost, calls: b.calls })
  }

  const makeVisionDaily = (map: Map<string, VisionAcc>, count: number): VisionDayPoint[] => {
    const result: VisionDayPoint[] = []
    for (let i = count - 1; i >= 0; i--) {
      const key = dayKeyOf(dateBefore(i))
      const b = map.get(key) ?? emptyVision()
      result.push({ date: key, images: b.images, imageTokens: b.imageTokens, cost: b.cost })
    }
    return result
  }

  const makeVisionSessions = (map: Map<string, VisionAcc & { title: string }>): VisionSession[] =>
    [...map.entries()]
      .map(([id, acc]) => ({
        id,
        title: acc.title !== '' ? acc.title : `会话 ${id.slice(0, 8)}`,
        images: acc.images,
        imageTokens: acc.imageTokens,
        cost: acc.cost,
      }))
      .sort((a, b) => b.images - a.images)
      .slice(0, SESSION_TOP_N)

  const models = makeModels(modelTotals, modelDays, modelHours, 30)
  const windows = windowAggregates.map(aggregate => ({
    days: aggregate.days,
    daily: makeDaily(aggregate.dayMap, aggregate.days),
    hourly: makeHourly(aggregate.hourMap),
    totals: { ...aggregate.overall },
    models: makeModels(aggregate.modelTotals, aggregate.modelDays, aggregate.modelHours, aggregate.days),
    sessions: [...aggregate.sessions].sort((a, b) => b.cost - a.cost).slice(0, SESSION_TOP_N),
    sessionCount: aggregate.sessions.length,
    vision: { ...aggregate.vision },
    visionDaily: makeVisionDaily(aggregate.visionDays, aggregate.days),
    visionSessions: makeVisionSessions(aggregate.visionSessions),
  }))

  return {
    ok: true,
    data: {
      daily,
      hourly,
      heatmap,
      models,
      summary: summarize(dayMap, new Date(nowMs)),
      pricing: pricingInfo(nowMs),
      peakSplit,
      sessions: [...sessions].sort((a, b) => b.cost - a.cost).slice(0, SESSION_TOP_N),
      sessionCount: sessions.length,
      coverage,
      windows,
      vision: { ...vision },
      visionDaily: makeVisionDaily(visionDays, 30),
      visionSessions: makeVisionSessions(visionSessions),
      totals: {
        input: overall.input,
        output: overall.output,
        cache: overall.cache,
        reasoning: overall.reasoning,
        total: overall.total,
        cost: overall.cost,
        calls: overall.calls,
        cacheSavings: overall.cacheSavings,
      },
    },
  }
}

/**
 * Usage for exactly one session — the 「额度」tab's own conversation, as
 * opposed to `fetchUsage`'s account-wide replay. Reads a single session log
 * (not every session on disk), so it is cheap enough to call on every tab
 * mount without a TTL memo; the caller is expected to re-fetch whenever the
 * session id it cares about changes.
 */
export async function fetchSessionUsage(persistence: SessionPersistenceFace | undefined, sessionId: string): Promise<SessionUsageResponse> {
  if (persistence === undefined) return { ok: false, error: '会话持久化服务不可用' }
  if (typeof sessionId !== 'string' || sessionId === '') return { ok: false, error: '缺少会话 id' }
  // Defense in depth: src/index.ts already rejects a malformed `id` before
  // this function is ever called (see SESSION_ID_PATTERN in contract.ts),
  // but this function is also unit-tested and reachable directly, so the
  // same check is repeated here rather than trusted to the one caller.
  if (!isValidSessionId(sessionId)) return { ok: false, error: '会话 id 格式不合法' }

  let events: SessionEventFace[] | undefined
  try {
    events = await readSessionEvents(persistence, sessionId)
  } catch (err) {
    return { ok: false, error: `读取会话日志失败：${errorMessage(err)}` }
  }

  const modelTotals = new Map<string, Bucket>()
  let total = 0
  let cost = 0
  let calls = 0
  let firstActive: number | null = null
  let lastActive: number | null = null
  const turnTotals = new Map<string, { messageId: string; total: number; cost: number; calls: number }>()

  addUsageEvent(events, (time, input, output, cache, _reasoning, provider, model, messageId, turn) => {
    const modelKey = `${provider}/${model}`
    const eventCost = costOf(time, model, input, cache, output)
    const eventTotal = input + output + cache
    bump(modelTotals, modelKey, input, output, cache, eventCost)
    total += eventTotal
    cost += eventCost
    calls += 1
    if (firstActive === null || time < firstActive) firstActive = time
    if (lastActive === null || time > lastActive) lastActive = time
    if (messageId !== undefined) {
      // A turn may make several model calls while tools run. The chat renders
      // one action strip beside its final assistant message, so keep replacing
      // the address while accumulating every step's usage under the turn id.
      const key = turn === undefined ? `message:${messageId}` : `turn:${turn}`
      const aggregate = turnTotals.get(key) ?? { messageId, total: 0, cost: 0, calls: 0 }
      aggregate.messageId = messageId
      aggregate.total += eventTotal
      aggregate.cost += eventCost
      aggregate.calls += 1
      turnTotals.set(key, aggregate)
    }
  })

  const models: SessionModelUsage[] = [...modelTotals.entries()]
    .map(([modelKey, bucket]): SessionModelUsage => {
      const slash = modelKey.indexOf('/')
      const provider = slash < 0 ? '' : modelKey.slice(0, slash)
      const model = slash < 0 ? modelKey : modelKey.slice(slash + 1)
      return {
        provider,
        model,
        input: bucket.input,
        output: bucket.output,
        cache: bucket.cache,
        total: bucket.total,
        cost: bucket.cost,
        calls: bucket.calls,
      }
    })
    .sort((a, b) => b.cost - a.cost)

  return {
    ok: true,
    data: {
      sessionId,
      title: titleOf(events, sessionId),
      total,
      cost,
      calls,
      firstActive,
      lastActive,
      models,
      turns: [...turnTotals.values()],
    },
  }
}
