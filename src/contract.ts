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
  /**
   * What the cache-hit tokens would have cost at cache-miss rates, minus what
   * they actually cost — i.e. the money prefix caching saved. Folded per
   * record so it respects each record's model and time-of-day rates.
   */
  cacheSavings: number
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

/** CNY per 1M tokens for one model tier. */
export interface PricingRates {
  cacheHit: number
  input: number
  output: number
}

export interface PricingTier {
  model: string
  peak: PricingRates
  /** Null while flat pricing is in effect (before the peak/off-peak switch). */
  offPeak: PricingRates | null
}

/** What the cost column was computed with, so the estimate can be audited. */
export interface PricingInfo {
  currency: string
  /** Date peak/off-peak pricing takes effect. */
  switchDate: string
  splitActive: boolean
  inPeakNow: boolean
  peakWindows: string[]
  tiers: PricingTier[]
}

/**
 * How usage divides between DeepSeek's peak and off-peak windows, plus the
 * same usage re-priced two ways — so the 2026-08-17 change can be answered
 * before it lands ("what will this cost me") and after ("what would shifting
 * off-peak save me").
 */
export interface PeakSplit {
  peak: PeriodUsage
  offPeak: PeriodUsage
  /** Every record priced under the peak/off-peak table, as actually classified. */
  peakEraCost: number
  /** Every record priced under that table as if it had landed off-peak. */
  offPeakEraCost: number
}

/** One session's share of the bill. */
export interface SessionCost {
  id: string
  /** The session's title from its log; falls back to a short id. */
  title: string
  total: number
  cost: number
  calls: number
  /** Epoch ms of the last usage record in this session. */
  lastActive: number
}

/**
 * What the local log replay could actually inspect. Totals can otherwise look
 * authoritative even when one corrupt session was skipped, so this metadata
 * travels with every usage response and lets the UI disclose partial results.
 */
export interface UsageCoverage {
  scope: 'local-dsh-session-logs'
  /** Session headers with a usable id returned by the local persistence. */
  listedSessions: number
  /** Session logs read successfully, including logs with no usage. */
  scannedSessions: number
  /** Valid assistant usage records folded into the totals. */
  usageRecords: number
  /** Usage records rejected because their time or token data was invalid. */
  skippedRecords: number
  /** Session logs that could not be read at all. */
  failedSessions: number
  /** Epoch ms of the first/last valid usage record across all local logs. */
  earliestAt: number | null
  latestAt: number | null
}

export const USAGE_WINDOW_DAYS = [7, 30, 90, 365] as const
export type UsageWindowDays = (typeof USAGE_WINDOW_DAYS)[number]

/** One internally consistent view of the same local logs over a calendar window. */
export interface UsageWindow {
  days: UsageWindowDays
  daily: DailyUsage[]
  hourly: HourlyUsage[]
  totals: UsageTotals
  models: ModelUsage[]
  /** Most expensive sessions inside this window, capped at SESSION_TOP_N. */
  sessions: SessionCost[]
  /** All sessions that contributed usage inside this window. */
  sessionCount: number
}

export interface UsageData {
  daily: DailyUsage[]
  hourly: HourlyUsage[]
  heatmap: HeatmapUsage[]
  totals: UsageTotals
  models: ModelUsage[]
  summary: UsageSummary
  pricing: PricingInfo
  peakSplit: PeakSplit
  /** Most expensive sessions first, capped — see SESSION_TOP_N. */
  sessions: SessionCost[]
  /** How many sessions contributed usage in total. */
  sessionCount: number
  coverage: UsageCoverage
  windows: UsageWindow[]
}

export interface UsageResponse {
  ok: boolean
  error?: string
  data?: UsageData
}
