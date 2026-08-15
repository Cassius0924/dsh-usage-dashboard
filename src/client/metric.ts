import { fallbackT, type Translate } from './i18n.tsx'

/** Value axis shared by daily, hourly, and per-model usage charts. */
export const CHART_METRICS = ['tokens', 'cost', 'calls'] as const
export type ChartMetric = (typeof CHART_METRICS)[number]

export interface ChartMetricPoint {
  total: number
  cost: number
  calls: number
}

export const isChartMetric = (value: unknown): value is ChartMetric =>
  typeof value === 'string' && CHART_METRICS.some(metric => metric === value)

export function chartMetricValue(metric: ChartMetric, point: ChartMetricPoint): number {
  if (metric === 'cost') return point.cost
  if (metric === 'calls') return point.calls
  return point.total
}

export function chartMetricName(metric: ChartMetric, t: Translate = fallbackT): string {
  if (metric === 'cost') return t('metric.cost')
  if (metric === 'calls') return t('metric.calls')
  return t('metric.usage')
}
