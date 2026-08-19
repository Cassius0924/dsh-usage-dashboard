/**
 * Package-local stores for settings both surfaces read: the dashboard writes
 * them, the floating widget reacts. Every value is persisted (see ./prefs.ts),
 * so a choice survives a page refresh.
 */
import { USAGE_WINDOW_DAYS, type UsageWindowDays } from '../contract.ts'
import { isChartMetric, type ChartMetric } from './metric.ts'
import { isBoolean, loadPref, savePref } from './prefs.ts'

export interface Store<T> {
  get(): T
  set(value: T): void
  subscribe(fn: () => void): () => void
}

function createStore<T>(key: string, isValid: (value: unknown) => boolean, fallback: T): Store<T> {
  let current = loadPref<T>(key, isValid, fallback)
  const listeners = new Set<() => void>()
  return {
    get: () => current,
    set: (value: T) => {
      current = value
      savePref(key, value)
      for (const listener of [...listeners]) listener()
    },
    subscribe: (fn: () => void) => {
      listeners.add(fn)
      return () => {
        listeners.delete(fn)
      }
    },
  }
}

const isThreshold = (value: unknown): boolean =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0

/** Whether the floating balance widget is shown. */
export const widgetVisibleStore = createStore<boolean>('widget.visible', isBoolean, true)

const isWidgetTabIds = (value: unknown): boolean => value === null
  || (Array.isArray(value) && value.every(id => typeof id === 'string' && id !== '')
    && new Set(value).size === value.length)

/** Conversation view ids on which the widget is allowed to appear. `null`
 * means "all available views" and preserves the pre-setting default; once a
 * user customizes the list, newly installed plugin tabs arrive unchecked. */
export const widgetTabIdsStore = createStore<string[] | null>('widget.tabIds', isWidgetTabIds, null)

/** Balance (in the account's own currency) below which both surfaces warn.
 *  0 turns the warning off. */
export const lowBalanceStore = createStore<number>('alert.lowBalance', isThreshold, 10)

/** Monthly estimated-cost budget in CNY. 0 leaves budget tracking disabled. */
export const monthlyBudgetStore = createStore<number>('budget.monthly', isThreshold, 0)

const isUsageWindowDays = (value: unknown): value is UsageWindowDays =>
  typeof value === 'number' && USAGE_WINDOW_DAYS.some(days => days === value)

/** Shared time range for the usage chart and both cost rankings. */
export const usageWindowStore = createStore<UsageWindowDays>('usage.windowDays', isUsageWindowDays, 30)

/** Whether charts compare token volume, estimated CNY cost, or call count. */
export const chartMetricStore = createStore<ChartMetric>('usage.chartMetric', isChartMetric, 'tokens')

/** Ephemeral presence of the full dashboard. The widget uses it to step out of
 * the way without changing the user's persisted visibility preference. */
let quotaViewActive = false
const quotaViewListeners = new Set<() => void>()
export const quotaViewActiveStore: Store<boolean> = {
  get: () => quotaViewActive,
  set: (value) => {
    if (value === quotaViewActive) return
    quotaViewActive = value
    for (const listener of [...quotaViewListeners]) listener()
  },
  subscribe: (fn) => {
    quotaViewListeners.add(fn)
    return () => {
      quotaViewListeners.delete(fn)
    }
  },
}
