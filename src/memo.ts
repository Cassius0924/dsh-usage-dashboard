/**
 * Tiny TTL memo for the /api routes.
 *
 * The usage endpoint replays every session log, so it must not run on every
 * tab click; the balance endpoint also calls the DeepSeek API. The memo:
 *
 * - `get()` serves a successful cached response while it is within `ttlMs`,
 *   otherwise recomputes;
 * - `refresh()` recomputes unconditionally and reseeds the cache;
 * - concurrent recomputes (of either kind) are deduped into one upstream
 *   call;
 * - `ok:false` responses are never cached, so a transient failure is retried
 *   on the next request.
 *
 * No timers are held, so nothing needs disposal on plugin unload.
 */

interface Entry<T> {
  value: T
  setAt: number
}

interface MemoState<T> {
  entry: Entry<T> | undefined
  inflight: Promise<T> | undefined
}

export interface Memo<T> {
  get(): Promise<T>
  refresh(): Promise<T>
}

export function memoize<T extends { ok: boolean }>(ttlMs: number, compute: () => Promise<T>): Memo<T> {
  const state: MemoState<T> = { entry: undefined, inflight: undefined }

  const run = (): Promise<T> => {
    if (state.inflight !== undefined) return state.inflight
    const task = compute().then(
      (value) => {
        state.inflight = undefined
        if (value.ok) state.entry = { value, setAt: Date.now() }
        return value
      },
      (err: unknown) => {
        state.inflight = undefined
        throw err
      },
    )
    state.inflight = task
    return task
  }

  return {
    get: () => {
      const hit = state.entry
      if (hit !== undefined && hit.value.ok && Date.now() - hit.setAt < ttlMs) {
        return Promise.resolve(hit.value)
      }
      return run()
    },
    refresh: () => run(),
  }
}
