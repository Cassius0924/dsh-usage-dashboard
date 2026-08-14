/**
 * dsh-usage-dashboard host plugin.
 *
 * Registers the package's own fenced JSON API under
 * `/api/dsh-usage-dashboard` (balance + usage), consumed by the client half
 * through same-origin fetch. Both endpoints are memoized with a TTL so that
 * tab switches and the widget's polling don't replay session logs or hammer
 * the DeepSeek API; responses carry `Cache-Control` so the browser's HTTP
 * cache serves repeat requests without a network round trip. `?refresh=1`
 * bypasses the memo for an explicit force refresh.
 */
import type { HostContext } from './context.ts'
import { memoize } from './memo.ts'
import { isTrustedApiRequest } from './trust-fence.ts'
import { fetchBalance, fetchUsage } from './usage.ts'
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
      } else {
        writeJson(res, 404, { ok: false, error: 'not found' })
      }
    },
  }), 'dsh-usage-dashboard: /api routes')
}
