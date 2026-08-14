/** Package-local store shared by the floating widget and the dashboard toggle. */

let widgetVisible = true
const listeners = new Set<() => void>()

export const getWidgetVisible = (): boolean => widgetVisible

export const setWidgetVisible = (value: boolean): void => {
  widgetVisible = value
  for (const listener of [...listeners]) listener()
}

export const subscribeWidgetVisible = (fn: () => void): (() => void) => {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
