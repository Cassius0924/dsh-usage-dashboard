/** Same-origin fetchers for the host half's JSON API. */
import type { BalanceResponse, UsageResponse } from '../contract.ts'

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { headers: { accept: 'application/json' } })
  if (!res.ok) {
    return { ok: false, error: `HTTP ${res.status}` } as unknown as T
  }
  return res.json() as Promise<T>
}

export const fetchBalance = (): Promise<BalanceResponse> => getJson<BalanceResponse>('/api/dsh-usage-dashboard/balance')
export const fetchUsage = (): Promise<UsageResponse> => getJson<UsageResponse>('/api/dsh-usage-dashboard/usage')
