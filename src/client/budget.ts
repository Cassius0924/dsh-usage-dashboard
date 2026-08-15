export type BudgetStatus = 'healthy' | 'risk' | 'over'

export interface BudgetSnapshot {
  spent: number
  budget: number
  ratio: number
  remaining: number
  forecast: number
  forecastOver: number
  status: BudgetStatus
}

const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000

/**
 * Project the current month's cost to month end. DeepSeek's billing boundary
 * is Beijing time, so this stays deterministic even when the browser runs in
 * another timezone.
 */
export function budgetSnapshot(spentValue: number, budgetValue: number, nowMs = Date.now()): BudgetSnapshot {
  const spent = Number.isFinite(spentValue) ? Math.max(0, spentValue) : 0
  const budget = Number.isFinite(budgetValue) ? Math.max(0, budgetValue) : 0
  const beijingNow = new Date(nowMs + BEIJING_OFFSET_MS)
  const year = beijingNow.getUTCFullYear()
  const month = beijingNow.getUTCMonth()
  const start = Date.UTC(year, month, 1) - BEIJING_OFFSET_MS
  const end = Date.UTC(year, month + 1, 1) - BEIJING_OFFSET_MS
  const elapsedRatio = Math.min(1, Math.max(1 / (end - start), (nowMs - start) / (end - start)))
  const forecast = spent / elapsedRatio
  const ratio = budget > 0 ? spent / budget : 0
  const remaining = budget - spent
  const forecastOver = budget > 0 ? Math.max(0, forecast - budget) : 0
  const status: BudgetStatus = ratio >= 1
    ? 'over'
    : (ratio >= 0.8 || forecastOver > 0 ? 'risk' : 'healthy')

  return { spent, budget, ratio, remaining, forecast, forecastOver, status }
}
