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

/** Bump whenever the persisted shape changes in a way `isUsable` cannot catch. */
const LS_VERSION = 2

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

/**
 * Read a persisted entry, but only trust it if it still matches the shape the
 * current code reads. A payload written by an older build can be missing fields
 * this one dereferences, and because the first render is seeded straight from
 * here, an unchecked stale entry crashes the view — for the user it looks like
 * a blank tab that only a fresh browser profile fixes.
 */
function loadPersisted<T>(storageKey: string, isUsable?: (data: T) => boolean): CacheHit<T> | null {
  if (typeof localStorage === 'undefined') return null
  const key = `${storageKey}:v${LS_VERSION}`
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return null
    const parsed = JSON.parse(raw) as { data?: T; at?: number }
    if (parsed.data === undefined || typeof parsed.at !== 'number') return null
    if (isUsable !== undefined && !isUsable(parsed.data)) {
      localStorage.removeItem(key)
      return null
    }
    return { data: parsed.data, at: parsed.at }
  } catch {
    return null
  }
}

/** Drop entries this key wrote under earlier versions; nothing reads them again. */
function pruneOldVersions(storageKey: string): void {
  if (typeof localStorage === 'undefined') return
  try {
    const current = `${storageKey}:v${LS_VERSION}`
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(`${storageKey}:v`) && key !== current) localStorage.removeItem(key)
    }
  } catch {
    // Leaving stale keys behind is harmless; they are never read.
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

export function createCache<T>(ttlMs: number, storageKey?: string, isUsable?: (data: T) => boolean): ResourceCache<T> {
  if (storageKey !== undefined) pruneOldVersions(storageKey)
  let hit: CacheHit<T> | null = storageKey === undefined ? null : loadPersisted<T>(storageKey, isUsable)
  return {
    get: () => hit,
    getFresh: () => (hit !== null && Date.now() - hit.at < ttlMs ? hit.data : null),
    put: (data) => {
      hit = { data, at: Date.now() }
      if (storageKey !== undefined) persist(storageKey, hit)
    },
  }
}
