/** Wire contracts shared by the host API and the client fetchers. */

export interface BalanceInfo {
  currency: string
  total: string
  granted: string
  toppedUp: string
}

export interface BalanceData {
  isAvailable: boolean
  balances: BalanceInfo[]
}

export interface BalanceResponse {
  ok: boolean
  error?: string
  data?: BalanceData
}

export interface DailyUsage {
  date: string
  input: number
  output: number
  cache: number
  total: number
  cost: number
  calls: number
}

export interface HourlyUsage {
  hour: number
  total: number
  cost: number
  calls: number
}

export interface HeatmapUsage {
  date: string
  total: number
  cost: number
  calls: number
}

export interface UsageTotals {
  input: number
  output: number
  cache: number
  reasoning: number
  total: number
  cost: number
  calls: number
}

/** One per-day / per-hour point of a single model's series. */
export interface ModelSeriesPoint {
  total: number
  cost: number
  calls: number
}

/** Per-model usage aggregation: overall totals plus 30-day and 24-hour series. */
export interface ModelUsage {
  provider: string
  model: string
  input: number
  output: number
  cache: number
  total: number
  cost: number
  calls: number
  daily: ModelSeriesPoint[]
  hourly: ModelSeriesPoint[]
}

export interface UsageData {
  daily: DailyUsage[]
  hourly: HourlyUsage[]
  heatmap: HeatmapUsage[]
  totals: UsageTotals
  models: ModelUsage[]
}

export interface UsageResponse {
  ok: boolean
  error?: string
  data?: UsageData
}
