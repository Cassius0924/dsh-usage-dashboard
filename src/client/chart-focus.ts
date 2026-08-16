export type ChartFocusKey = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown' | 'Home' | 'End'

/** Resolve roving focus without adding every chart point to the page Tab order. */
export function nextChartFocus(
  current: number,
  count: number,
  key: ChartFocusKey,
  horizontalStep = 1,
): number {
  if (count <= 0) return 0
  const index = Math.min(Math.max(0, current), count - 1)
  if (key === 'Home') return 0
  if (key === 'End') return count - 1
  const step = key === 'ArrowLeft' || key === 'ArrowRight' ? Math.max(1, horizontalStep) : 1
  const direction = key === 'ArrowLeft' || key === 'ArrowUp' ? -1 : 1
  return Math.min(Math.max(0, index + direction * step), count - 1)
}

export function lastPopulatedIndex(values: number[]): number {
  for (let index = values.length - 1; index >= 0; index -= 1) {
    if (values[index] > 0) return index
  }
  return Math.max(0, values.length - 1)
}

/**
 * Touch tap toggles a chart point's tooltip pin: tapping the already-pinned
 * point releases it, tapping any other point (or none pinned yet) pins that
 * one instead. Shared by bar, grouped-bar and heatmap touch handling so pin
 * state never forks into a parallel machine per chart type.
 */
export function nextPinnedIndex(current: number | null, tapped: number): number | null {
  return current === tapped ? null : tapped
}

/**
 * Distinguishes a tap from a scroll/drag using the touch/pointer start-to-end
 * displacement and elapsed time. A page scroll that merely passes over a data
 * point moves well past `moveThreshold` before release; a long press held past
 * `timeThreshold` without lifting is not a quick tap either.
 */
export function isTapGesture(dx: number, dy: number, dt: number, moveThreshold = 10, timeThreshold = 500): boolean {
  return Math.hypot(dx, dy) <= moveThreshold && dt <= timeThreshold
}

/**
 * Per-slot totals across every series of a stacked bar chart: each column's
 * height must reflect the *summed* usage of every selected model at that
 * time slot, not any single model's value — otherwise a column with many
 * small models would look shorter than a column with one large one even
 * though it represents more total usage.
 */
export function stackedTotals(series: Array<{ bars: Array<{ value: number }> }>, count: number): number[] {
  return Array.from({ length: count }, (_, i) => series.reduce((sum, s) => sum + (s.bars[i]?.value ?? 0), 0))
}

/**
 * Highest value in the list, or 1 when every value is zero — the shared
 * fallback scale so an all-zero chart still divides safely instead of by 0.
 */
export function maxOrOne(values: number[]): number {
  let max = 0
  for (const v of values) if (v > max) max = v
  return max > 0 ? max : 1
}
