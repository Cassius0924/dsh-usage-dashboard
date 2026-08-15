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
