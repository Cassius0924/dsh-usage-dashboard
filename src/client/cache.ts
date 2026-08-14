/**
 * Package-local TTL caches shared by the widget, the dashboard, and every
 * tab switch. Cached values outlive the TTL: `get()` still returns them
 * (marked by `at`) so a reopening tab can render instantly and refresh in
 * the background, while `getFresh()` is the cache-aware fetch path.
 *
 * When a `storageKey` is given, every `put()` also mirrors the entry to
 * localStorage so a page refresh keeps the instant first paint (the data
 * shown is the last known good value; a background refresh updates it).
 */

const LS_VERSION = 1

export interface CacheHit<T> {
  data: T
  at: number
}

export interface ResourceCache<T> {
  /** Last cached value even when stale; null when never cached. */
  get(): CacheHit<T> | null
  /** Value only when it is still within the TTL. */
  getFresh(): T | null
  put(data: T): void
}

function loadPersisted<T>(storageKey: string): CacheHit<T> | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(`${storageKey}:v${LS_VERSION}`)
    if (raw === null) return null
    const parsed = JSON.parse(raw) as { data?: T; at?: number }
    if (parsed.data === undefined || typeof parsed.at !== 'number') return null
    return { data: parsed.data, at: parsed.at }
  } catch {
    return null
  }
}

function persist<T>(storageKey: string, hit: CacheHit<T>): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(`${storageKey}:v${LS_VERSION}`, JSON.stringify(hit))
  } catch {
    // Quota / private-mode failures must never break the in-memory path.
  }
}

export function createCache<T>(ttlMs: number, storageKey?: string): ResourceCache<T> {
  let hit: CacheHit<T> | null = storageKey === undefined ? null : loadPersisted<T>(storageKey)
  return {
    get: () => hit,
    getFresh: () => (hit !== null && Date.now() - hit.at < ttlMs ? hit.data : null),
    put: (data) => {
      hit = { data, at: Date.now() }
      if (storageKey !== undefined) persist(storageKey, hit)
    },
  }
}
