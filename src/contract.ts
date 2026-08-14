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

/** Usage rolled up over one time window. */
export interface PeriodUsage {
  total: number
  cost: number
  calls: number
}

/**
 * Time-anchored rollups. "Accumulated since forever" answers no question a
 * user actually has; these do: what did today cost, what has this month cost,
 * and is that more or less than the comparable window before it.
 */
export interface UsageSummary {
  today: PeriodUsage
  yesterday: PeriodUsage
  /** Current calendar month, to date. */
  month: PeriodUsage
  /** Previous calendar month up to the same day-of-month, so a mid-month
   *  comparison is against a same-length window rather than a full month. */
  lastMonthToDate: PeriodUsage
}

export interface UsageData {
  daily: DailyUsage[]
  hourly: HourlyUsage[]
  heatmap: HeatmapUsage[]
  totals: UsageTotals
  models: ModelUsage[]
  summary: UsageSummary
}

export interface UsageResponse {
  ok: boolean
  error?: string
  data?: UsageData
}
