/**
 * dsh-usage-dashboard host plugin.
 *
 * Registers the package's own fenced JSON API under
 * `/api/dsh-usage-dashboard` (balance + usage + session), consumed by the
 * client half through same-origin fetch. `balance` and `usage` are memoized
 * with a TTL so that tab switches and the widget's polling don't replay
 * session logs or hammer the DeepSeek API; responses carry `Cache-Control`
 * so the browser's HTTP cache serves repeat requests without a network
 * round trip. `?refresh=1` bypasses the memo for an explicit force refresh.
 * `session` (usage for exactly one session, keyed by `?id=`) reads a single
 * session log and is deliberately not memoized — it is cheap and must
 * reflect that session's live state, not a 5-minute-stale snapshot.
 */
import type { HostContext } from './context.ts'
import { isValidSessionId } from './contract.ts'
import { memoize } from './memo.ts'
import { isTrustedApiRequest } from './trust-fence.ts'
import { fetchBalance, fetchSessionUsage, fetchUsage } from './usage.ts'
import { writeJson } from './wire.ts'

/** Plugin identity for the cordis.patch.yml row (and the client bundle id). */
export const name = 'dsh-usage-dashboard'

/** Services required before load: the web server plus the two data sources. */
export const inject = ['webServer', 'credentials', 'sessionPersistence']

/** Freshness windows: balance 60s (the widget also polls every 60s), usage
 *  5min (aggregating every session log is the expensive path). */
const BALANCE_TTL_MS = 60_000
const USAGE_TTL_MS = 5 * 60_000

/**
 * Mount the /api/dsh-usage-dashboard routes.
 * @param ctx - host Cordis context.
 */
export function apply(ctx: HostContext): void {
  const balanceMemo = memoize(BALANCE_TTL_MS, () => fetchBalance(ctx.credentials))
  const usageMemo = memoize(USAGE_TTL_MS, () => fetchUsage(ctx.sessionPersistence))

  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: '/api/dsh-usage-dashboard',
    handler: async (req, res) => {
      if (!isTrustedApiRequest(req)) {
        writeJson(res, 403, { ok: false, error: 'forbidden' })
        return
      }
      if (req.method !== 'GET') {
        writeJson(res, 405, { ok: false, error: 'method not allowed' })
        return
      }
      const url = new URL(req.url ?? '/', 'http://dsh.internal')
      const pathname = url.pathname
      const force = url.searchParams.get('refresh') === '1'
      if (pathname === '/api/dsh-usage-dashboard/balance') {
        const payload = await (force ? balanceMemo.refresh() : balanceMemo.get())
        const headers = payload.ok
          ? { 'cache-control': `private, max-age=${Math.round(BALANCE_TTL_MS / 1000)}` }
          : { 'cache-control': 'no-store' }
        writeJson(res, 200, payload, headers)
      } else if (pathname === '/api/dsh-usage-dashboard/usage') {
        const payload = await (force ? usageMemo.refresh() : usageMemo.get())
        const headers = payload.ok
          ? { 'cache-control': `private, max-age=${Math.round(USAGE_TTL_MS / 1000)}` }
          : { 'cache-control': 'no-store' }
        writeJson(res, 200, payload, headers)
      } else if (pathname === '/api/dsh-usage-dashboard/session') {
        const id = url.searchParams.get('id')
        // `id` arrives verbatim from the browser-controlled `?id=` query
        // parameter (unlike `usage`'s session ids, which the host itself
        // enumerates via `persistence.list()`), so a malformed value is
        // rejected here — before it ever reaches `persistence.readFrom` —
        // rather than trusted to fetchSessionUsage's own defense-in-depth
        // check. Reject as early as the route layer allows.
        if (id === null || id.trim() === '' || !isValidSessionId(id)) {
          // A missing/blank/malformed `id` is the caller's mistake (bad
          // input), so it gets a real 4xx; any other failure (e.g. the log
          // itself unreadable) keeps the same "200 with ok:false" shape as
          // balance/usage so the client's one error-handling path covers all
          // three endpoints.
          const error = id === null || id.trim() === '' ? '缺少会话 id' : '会话 id 格式不合法'
          writeJson(res, 400, { ok: false, error }, { 'cache-control': 'no-store' })
          return
        }
        const payload = await fetchSessionUsage(ctx.sessionPersistence, id)
        // id is already known-well-formed here, so any remaining failure is
        // downstream (e.g. the log itself unreadable) and keeps the same
        // "200 with ok:false" shape as balance/usage.
        writeJson(res, 200, payload, { 'cache-control': 'no-store' })
      } else {
        writeJson(res, 404, { ok: false, error: 'not found' })
      }
    },
  }), 'dsh-usage-dashboard: /api routes')
}
