/**
 * Same-origin fetchers for the host half's JSON API, backed by package-local
 * TTL caches (see ./cache.ts). A fresh cache hit resolves without any network
 * work, so tab switches render instantly; `force` bypasses both the memory
 * cache and the HTTP cache (fetch cache: 'no-store') and asks the host to
 * bypass its own memo via `?refresh=1`.
 */
import { createCache } from './cache.ts'
import type { BalanceResponse, UsageResponse } from '../contract.ts'

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

const balanceCache = createCache<BalanceResponse>(BALANCE_TTL_MS, 'dsh-usage-dashboard:balance')
const usageCache = createCache<UsageResponse>(USAGE_TTL_MS, 'dsh-usage-dashboard:usage')

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
