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

const balanceCache = createCache<BalanceResponse>(BALANCE_TTL_MS)
const usageCache = createCache<UsageResponse>(USAGE_TTL_MS)

/** Last cached value (possibly stale), for an instant first render. */
export const getCachedBalance = (): BalanceResponse | null => balanceCache.get()?.data ?? null
export const getCachedUsage = (): UsageResponse | null => usageCache.get()?.data ?? null

export async function fetchBalance(force = false): Promise<BalanceResponse> {
  if (!force) {
    const hit = balanceCache.getFresh()
    if (hit !== null) return hit
  }
  const suffix = force ? '?refresh=1' : ''
  const res = await getJson<BalanceResponse>(`/api/dsh-usage-dashboard/balance${suffix}`, force ? 'no-store' : 'default')
  if (res.ok) balanceCache.put(res)
  return res
}

export async function fetchUsage(force = false): Promise<UsageResponse> {
  if (!force) {
    const hit = usageCache.getFresh()
    if (hit !== null) return hit
  }
  const suffix = force ? '?refresh=1' : ''
  const res = await getJson<UsageResponse>(`/api/dsh-usage-dashboard/usage${suffix}`, force ? 'no-store' : 'default')
  if (res.ok) usageCache.put(res)
  return res
}
