/**
 * localStorage-backed user preferences for the plugin.
 *
 * Everything the user deliberately sets (widget visibility, the corner it was
 * dragged to, whether it is collapsed) belongs here so a page refresh does not
 * throw the choice away. Keys share one prefix and carry a version suffix so
 * the shape can evolve without reading back stale values.
 *
 * Every read is validated by the caller's guard: a corrupted or hand-edited
 * entry falls back instead of poisoning the UI.
 */

const PREFIX = 'dsh-usage-dashboard:pref:'
const VERSION = 1

const keyOf = (key: string): string => `${PREFIX}${key}:v${VERSION}`

export function loadPref<T>(key: string, isValid: (value: unknown) => boolean, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(keyOf(key))
    if (raw === null) return fallback
    const parsed = JSON.parse(raw) as unknown
    return isValid(parsed) ? (parsed as T) : fallback
  } catch {
    return fallback
  }
}

export function savePref(key: string, value: unknown): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(keyOf(key), JSON.stringify(value))
  } catch {
    // Quota / private-mode failures must never break the UI.
  }
}

export const isBoolean = (value: unknown): boolean => typeof value === 'boolean'
