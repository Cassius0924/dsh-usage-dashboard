/**
 * Package-local store shared by the floating widget and the dashboard toggle.
 * The visibility choice is persisted, so hiding the widget survives a refresh.
 */
import { isBoolean, loadPref, savePref } from './prefs.ts'

const WIDGET_VISIBLE_KEY = 'widget.visible'

let widgetVisible = loadPref<boolean>(WIDGET_VISIBLE_KEY, isBoolean, true)
const listeners = new Set<() => void>()

export const getWidgetVisible = (): boolean => widgetVisible

export const setWidgetVisible = (value: boolean): void => {
  widgetVisible = value
  savePref(WIDGET_VISIBLE_KEY, value)
  for (const listener of [...listeners]) listener()
}

export const subscribeWidgetVisible = (fn: () => void): (() => void) => {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
