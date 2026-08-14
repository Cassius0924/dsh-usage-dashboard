/**
 * Package-local stores for settings both surfaces read: the dashboard writes
 * them, the floating widget reacts. Every value is persisted (see ./prefs.ts),
 * so a choice survives a page refresh.
 */
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

/** Balance (in the account's own currency) below which both surfaces warn.
 *  0 turns the warning off. */
export const lowBalanceStore = createStore<number>('alert.lowBalance', isThreshold, 10)
