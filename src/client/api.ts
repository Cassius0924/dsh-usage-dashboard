/**
 * Same-origin fetchers for the host half's JSON API, backed by package-local
 * TTL caches (see ./cache.ts). A fresh cache hit resolves without any network
 * work, so tab switches render instantly; `force` bypasses both the memory
 * cache and the HTTP cache (fetch cache: 'no-store') and asks the host to
 * bypass its own memo via `?refresh=1`.
 */
import { createCache } from './cache.ts'
import { USAGE_WINDOW_DAYS } from '../contract.ts'
import type { BalanceResponse, SessionUsageResponse, UsageResponse } from '../contract.ts'

/** Mirror the host memos: balance 60s, usage 5min. */
const BALANCE_TTL_MS = 60_000
const USAGE_TTL_MS = 5 * 60_000

async function getJson<T>(path: string, cache: RequestCache): Promise<T> {
  const res = await fetch(path, { headers: { accept: 'application/json' }, cache })
  if (!res.ok) {
    return { ok: false, error: `HTTP ${res.status}` } as unknown as T
  }
  return res.json() as Promise<T>
}

/**
 * Every field the UI dereferences off a cached payload. A persisted entry that
 * predates one of them would otherwise be rendered as if it were current and
 * take the whole view down; listing them here keeps that failure impossible
 * instead of merely unlikely. Add a line whenever the UI starts reading a new
 * top-level field.
 */
const usageIsUsable = (res: UsageResponse): boolean => {
  if (res.ok !== true) return false
  const data = res.data
  return data !== undefined
    && Array.isArray(data.daily) && Array.isArray(data.hourly) && Array.isArray(data.heatmap)
    && Array.isArray(data.models) && Array.isArray(data.sessions)
    && typeof data.sessionCount === 'number'
    && data.coverage?.scope === 'local-dsh-session-logs'
    && typeof data.coverage.scannedSessions === 'number'
    && typeof data.coverage.skippedRecords === 'number'
    && Array.isArray(data.windows) && data.windows.length === USAGE_WINDOW_DAYS.length
    && USAGE_WINDOW_DAYS.every(days => data.windows.some(window => window.days === days))
    && data.windows.every(window => Array.isArray(window.daily)
      && Array.isArray(window.hourly) && Array.isArray(window.models) && Array.isArray(window.sessions))
    && data.totals !== undefined && typeof data.totals.cacheSavings === 'number'
    && data.summary?.today !== undefined
    && Array.isArray(data.pricing?.tiers)
    && data.peakSplit?.peak !== undefined
}

const balanceIsUsable = (res: BalanceResponse): boolean =>
  res.ok === true && Array.isArray(res.data?.balances)

const balanceCache = createCache<BalanceResponse>(BALANCE_TTL_MS, 'dsh-usage-dashboard:balance', balanceIsUsable)
const usageCache = createCache<UsageResponse>(USAGE_TTL_MS, 'dsh-usage-dashboard:usage', usageIsUsable)

/** Last cached value (possibly stale), for an instant first render. */
export const getCachedBalance = (): BalanceResponse | null => balanceCache.get()?.data ?? null
export const getCachedUsage = (): UsageResponse | null => usageCache.get()?.data ?? null
/** When the cached usage was fetched, so a consumer can say how old it is. */
export const getCachedUsageAt = (): number | null => usageCache.get()?.at ?? null

/**
 * Notified whenever usage is (re)fetched. The floating widget reads usage
 * straight from this cache rather than fetching on its own: aggregating every
 * session log takes seconds, and a background widget must not pay that
 * repeatedly. It subscribes here so it still updates when the dashboard — or
 * its own refresh button — brings fresh data in.
 */
const usageListeners = new Set<() => void>()

export const subscribeUsage = (fn: () => void): (() => void) => {
  usageListeners.add(fn)
  return () => {
    usageListeners.delete(fn)
  }
}

// Non-force calls made while an identical one is already in flight join it
// instead of firing a second request — the case that matters is the
// preload kicked off at plugin load (see index.tsx) landing moments before
// the widget's or the dashboard's own mount-time fetch. `force` (the
// refresh button) always fires its own request, since the user asked for a
// bypass specifically.
let balanceInflight: Promise<BalanceResponse> | null = null
let usageInflight: Promise<UsageResponse> | null = null

export async function fetchBalance(force = false): Promise<BalanceResponse> {
  if (!force) {
    const hit = balanceCache.getFresh()
    if (hit !== null) return hit
    if (balanceInflight !== null) return balanceInflight
  }
  const suffix = force ? '?refresh=1' : ''
  const task = getJson<BalanceResponse>(`/api/dsh-usage-dashboard/balance${suffix}`, force ? 'no-store' : 'default')
    .then(res => {
      if (res.ok) balanceCache.put(res)
      return res
    })
  if (!force) {
    balanceInflight = task.finally(() => { balanceInflight = null })
    return balanceInflight
  }
  return task
}

export async function fetchUsage(force = false): Promise<UsageResponse> {
  if (!force) {
    const hit = usageCache.getFresh()
    if (hit !== null) return hit
    if (usageInflight !== null) return usageInflight
  }
  const suffix = force ? '?refresh=1' : ''
  const task = getJson<UsageResponse>(`/api/dsh-usage-dashboard/usage${suffix}`, force ? 'no-store' : 'default')
    .then(res => {
      if (res.ok) {
        usageCache.put(res)
        for (const listener of [...usageListeners]) listener()
      }
      return res
    })
  if (!force) {
    usageInflight = task.finally(() => { usageInflight = null })
    return usageInflight
  }
  return task
}

/**
 * Session usage stays memory-only: the widget, dashboard, and every visible
 * turn-cost cell share the latest read without persisting one entry per
 * session. A newly completed turn whose message id is absent from this cache
 * triggers one fresh read; the in-flight map coalesces all cells mounting in
 * the same transcript render.
 */
const sessionUsageInflight = new Map<string, Promise<SessionUsageResponse>>()
const sessionUsageCache = new Map<string, SessionUsageResponse>()
const sessionUsageListeners = new Map<string, Set<() => void>>()

export const getCachedSessionUsage = (sessionId: string): SessionUsageResponse | null =>
  sessionUsageCache.get(sessionId) ?? null

export const subscribeSessionUsage = (sessionId: string, fn: () => void): (() => void) => {
  let listeners = sessionUsageListeners.get(sessionId)
  if (listeners === undefined) {
    listeners = new Set()
    sessionUsageListeners.set(sessionId, listeners)
  }
  listeners.add(fn)
  return () => {
    listeners?.delete(fn)
    if (listeners?.size === 0) sessionUsageListeners.delete(sessionId)
  }
}

const publishSessionUsage = (sessionId: string, response: SessionUsageResponse): void => {
  if (!response.ok) return
  sessionUsageCache.set(sessionId, response)
  for (const listener of [...(sessionUsageListeners.get(sessionId) ?? [])]) listener()
}

export async function fetchSessionUsage(sessionId: string, force = false): Promise<SessionUsageResponse> {
  if (typeof sessionId !== 'string' || sessionId === '') {
    return { ok: false, error: '缺少会话 id' }
  }
  if (!force) {
    const inflight = sessionUsageInflight.get(sessionId)
    if (inflight !== undefined) return inflight
  }
  const task = getJson<SessionUsageResponse>(`/api/dsh-usage-dashboard/session?id=${encodeURIComponent(sessionId)}`, 'no-store')
    .then(response => {
      publishSessionUsage(sessionId, response)
      return response
    })
  if (force) return task
  const tracked = task.finally(() => {
    if (sessionUsageInflight.get(sessionId) === tracked) sessionUsageInflight.delete(sessionId)
  })
  sessionUsageInflight.set(sessionId, tracked)
  return tracked
}
