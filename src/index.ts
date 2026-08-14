/**
 * dsh-usage-dashboard host plugin.
 *
 * Registers the package's own fenced JSON API under
 * `/api/dsh-usage-dashboard` (balance + usage), consumed by the client half
 * through same-origin fetch. The client half ships in the same package
 * (`./client`); the web server serves it under
 * `/plugins/dsh-usage-dashboard/client.js`.
 */
import type { HostContext } from './context.ts'
import { isTrustedApiRequest } from './trust-fence.ts'
import { fetchBalance, fetchUsage } from './usage.ts'
import { writeJson } from './wire.ts'

/** Plugin identity for the cordis.patch.yml row (and the client bundle id). */
export const name = 'dsh-usage-dashboard'

/** Services required before load: the web server plus the two data sources. */
export const inject = ['webServer', 'credentials', 'sessionPersistence']

/**
 * Mount the /api/dsh-usage-dashboard routes.
 * @param ctx - host Cordis context.
 */
export function apply(ctx: HostContext): void {
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
      const pathname = new URL(req.url ?? '/', 'http://dsh.internal').pathname
      if (pathname === '/api/dsh-usage-dashboard/balance') {
        writeJson(res, 200, await fetchBalance(ctx.credentials))
      } else if (pathname === '/api/dsh-usage-dashboard/usage') {
        writeJson(res, 200, await fetchUsage(ctx.sessionPersistence))
      } else {
        writeJson(res, 404, { ok: false, error: 'not found' })
      }
    },
  }), 'dsh-usage-dashboard: /api routes')
}
