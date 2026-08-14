/**
 * Package-local TTL caches shared by the widget, the dashboard, and every
 * tab switch. Cached values outlive the TTL: `get()` still returns them
 * (marked by `at`) so a reopening tab can render instantly and refresh in
 * the background, while `getFresh()` is the cache-aware fetch path.
 */

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

export function createCache<T>(ttlMs: number): ResourceCache<T> {
  let hit: CacheHit<T> | null = null
  return {
    get: () => hit,
    getFresh: () => (hit !== null && Date.now() - hit.at < ttlMs ? hit.data : null),
    put: (data) => {
      hit = { data, at: Date.now() }
    },
  }
}
