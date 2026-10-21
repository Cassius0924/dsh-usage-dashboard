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
 *
 * The host also owns the peak-pause gate: `agent/pre-step` parks a user turn
 * of an opted-in session while DeepSeek's peak pricing is active. The master
 * switch and opt-in list persist across restarts, and `/breaker` +
 * `/breaker/release` let the client read state, flip either switch, and let
 * parked work run immediately.
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { BreakerData, BreakerSettings } from './contract.ts'
import { BREAKER_API, isBreakerSettingsRequest, isValidSessionId } from './contract.ts'
import type { HostContext, HostEventFace } from './context.ts'
import { BreakerGate, type BreakerTimerFace } from './breaker-gate.ts'
import { breakerProject, normalizeBreakerSettings } from './breaker.ts'
import { breakerSettingsPath, loadBreakerSettings, saveBreakerSettings } from './breaker-settings.ts'
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

/** Hard cap on a breaker request body; the settings document is a list of ids. */
const BREAKER_BODY_LIMIT_BYTES = 8 * 1024

const NO_STORE = { 'cache-control': 'no-store' } as const

/**
 * Test seams for the breaker half. The host calls `apply(ctx)` (or passes its
 * plugin config, whose unknown keys are not read here), so every field falls
 * back to production behaviour: the real clock, the DSH home, console.warn.
 */
export interface BreakerHostOptions {
  /** Explicit settings file, bypassing `breakerSettingsPath`. */
  settingsFile?: string
  /** Clock seam, epoch ms; defaults to `Date.now`. */
  now?: () => number
  /** Timer seam; defaults to the real (unref'd) clock. */
  timers?: BreakerTimerFace
  /** Warning sink; defaults to `console.warn`. */
  warn?: (message: string) => void
}

const errorText = (error: unknown): string => (error instanceof Error ? error.message : String(error))

/** Outcome of reading a request body under the size cap. */
type BodyRead =
  | { kind: 'ok'; text: string }
  | { kind: 'too-large' }
  | { kind: 'unreadable' }

/**
 * Read a request body, refusing to buffer more than `limit` bytes. On overflow
 * the remaining bytes are drained (not destroyed) so the client still receives
 * the 413 instead of a reset connection.
 */
async function readBody(req: IncomingMessage, limit: number): Promise<BodyRead> {
  const chunks: Buffer[] = []
  let size = 0
  try {
    for await (const chunk of req) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      size += buffer.length
      if (size > limit) {
        req.resume()
        return { kind: 'too-large' }
      }
      chunks.push(buffer)
    }
  } catch {
    return { kind: 'unreadable' }
  }
  return { kind: 'ok', text: Buffer.concat(chunks).toString('utf8') }
}

/**
 * Mount the /api/dsh-usage-dashboard routes and the peak-window breaker gate.
 * @param ctx - host Cordis context.
 * @param options - test seams; the host passes none.
 */
export function apply(ctx: HostContext, options: BreakerHostOptions = {}): void {
  // `deepseekAccount` is optional (API-key-only hosts never mount it), so it
  // is read through `get()` rather than declared in `inject` — a required
  // service would keep this plugin from loading at all on those hosts.
  const balanceMemo = memoize(BALANCE_TTL_MS, () => fetchBalance(ctx.credentials, ctx.get('deepseekAccount')))
  const usageMemo = memoize(USAGE_TTL_MS, () => fetchUsage(ctx.sessionPersistence))

  // The host may pass its plugin config here; nothing in it is read, so an
  // absent/null config simply means "all production defaults".
  const seams = options ?? {}
  const warn = seams.warn ?? ((message: string): void => { console.warn(message) })
  const now = seams.now ?? Date.now
  const settingsFile = seams.settingsFile ?? breakerSettingsPath()
  const gate = new BreakerGate({ now, timers: seams.timers })

  // Persisted settings load asynchronously; the gate starts from the defaults
  // (on, no session opted in) and is updated once the file has been read. A
  // switch write that lands in the meantime wins — the load must not clobber a
  // fresher user choice.
  let settingsTouched = false
  void loadBreakerSettings({ filePath: settingsFile, warn })
    .then((settings) => {
      if (!settingsTouched) gate.update(settings)
    })
    .catch((error: unknown) => {
      warn(`[${name}] 高峰暂停设置加载失败，按默认值处理：${errorText(error)}`)
    })

  const projection = (): BreakerData => breakerProject(gate.settings, now(), gate.heldSessions)

  const hostEvents = ctx as unknown as HostEventFace
  ctx.effect(() => {
    const dispose = hostEvents.on('agent/pre-step', async (payload, next) => {
      try {
        // `agent.id` is the session id the composer switch writes. An agent
        // without one belongs to no session the user could have opted in.
        await gate.hold(payload.agent?.id, payload.turn, payload.messages, payload.signal)
      } catch (error) {
        // A gate failure must never fail the proposal: log it and let the
        // step run as if peak pause were off.
        warn(`[${name}] 高峰暂停挂起失败，本次 step 直接放行：${errorText(error)}`)
      }
      return next()
    })
    return () => {
      dispose()
      gate.dispose()
    }
  }, 'dsh-usage-dashboard: 高峰暂停')

  /** Apply the master switch or one conversation's switch and persist it. */
  const writeSettings = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const body = await readBody(req, BREAKER_BODY_LIMIT_BYTES)
    if (body.kind === 'too-large') {
      writeJson(res, 413, { ok: false, error: '请求体超过 8KB 限制' }, NO_STORE)
      return
    }
    if (body.kind === 'unreadable') {
      writeJson(res, 400, { ok: false, error: '无法读取请求体' }, NO_STORE)
      return
    }
    let raw: unknown
    try {
      raw = JSON.parse(body.text)
    } catch {
      writeJson(res, 400, { ok: false, error: '请求体不是合法 JSON' }, NO_STORE)
      return
    }
    if (!isBreakerSettingsRequest(raw)) {
      writeJson(res, 400, { ok: false, error: '请求体必须是合法的开关请求' }, NO_STORE)
      return
    }
    const previous = gate.settings
    let next: BreakerSettings
    if (raw.sessionId === undefined) {
      next = normalizeBreakerSettings({ enabled: raw.enabled, sessions: previous.sessions })
    } else {
      const sessions = new Set(previous.sessions)
      if (raw.enabled) sessions.add(raw.sessionId)
      else sessions.delete(raw.sessionId)
      next = normalizeBreakerSettings({ enabled: previous.enabled, sessions: [...sessions] })
    }
    settingsTouched = true
    gate.update(next)
    try {
      await saveBreakerSettings(next, { filePath: settingsFile })
    } catch (error) {
      // The API is atomic from the caller's view: a failed write rolls the
      // live settings back instead of letting them diverge.
      gate.update(previous)
      warn(`[${name}] 高峰暂停设置保存失败，已回退：${errorText(error)}`)
      writeJson(res, 500, { ok: false, error: '设置保存失败' }, NO_STORE)
      return
    }
    writeJson(res, 200, { ok: true, data: projection() }, NO_STORE)
  }

  /** Let parked work continue: all sessions, or the one named in the body. */
  const releaseHeld = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const body = await readBody(req, BREAKER_BODY_LIMIT_BYTES)
    if (body.kind === 'too-large') {
      writeJson(res, 413, { ok: false, error: '请求体超过 8KB 限制' }, NO_STORE)
      return
    }
    if (body.kind === 'unreadable') {
      writeJson(res, 400, { ok: false, error: '无法读取请求体' }, NO_STORE)
      return
    }
    let target: string | undefined
    // An empty body is the bare "continue everything" request; when a body is
    // present it must be a release request naming at most one session.
    if (body.text.trim() !== '') {
      let raw: unknown
      try {
        raw = JSON.parse(body.text)
      } catch {
        writeJson(res, 400, { ok: false, error: '请求体不是合法 JSON' }, NO_STORE)
        return
      }
      if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
        writeJson(res, 400, { ok: false, error: '请求体必须是 JSON 对象' }, NO_STORE)
        return
      }
      const candidate = raw as { sessionId?: unknown }
      if (Object.keys(candidate).some(key => key !== 'sessionId')) {
        writeJson(res, 400, { ok: false, error: '请求字段不合法' }, NO_STORE)
        return
      }
      if (candidate.sessionId !== undefined) {
        if (typeof candidate.sessionId !== 'string' || !isValidSessionId(candidate.sessionId)) {
          writeJson(res, 400, { ok: false, error: '会话 id 格式不合法' }, NO_STORE)
          return
        }
        target = candidate.sessionId
      }
    }
    gate.release(target)
    writeJson(res, 200, { ok: true, data: projection() }, NO_STORE)
  }

  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: '/api/dsh-usage-dashboard',
    handler: async (req, res) => {
      if (!isTrustedApiRequest(req)) {
        writeJson(res, 403, { ok: false, error: 'forbidden' })
        return
      }
      const url = new URL(req.url ?? '/', 'http://dsh.internal')
      const pathname = url.pathname
      const method = req.method ?? 'GET'

      // Peak-pause routes are method-specific: GET reads, PUT flips the master
      // switch or one conversation, and POST /breaker/release lets parked work
      // run now.
      if (pathname === BREAKER_API.state) {
        if (method === 'GET') {
          writeJson(res, 200, { ok: true, data: projection() }, NO_STORE)
          return
        }
        if (method === 'PUT') {
          await writeSettings(req, res)
          return
        }
        writeJson(res, 405, { ok: false, error: 'method not allowed' }, { ...NO_STORE, allow: 'GET, PUT' })
        return
      }
      if (pathname === BREAKER_API.release) {
        if (method === 'POST') {
          await releaseHeld(req, res)
          return
        }
        writeJson(res, 405, { ok: false, error: 'method not allowed' }, { ...NO_STORE, allow: 'POST' })
        return
      }

      const knownReadPath = pathname === '/api/dsh-usage-dashboard/balance'
        || pathname === '/api/dsh-usage-dashboard/usage'
        || pathname === '/api/dsh-usage-dashboard/session'
      if (!knownReadPath) {
        // Unknown routes keep their existing 404 answer regardless of method;
        // only a known route reports a wrong method.
        writeJson(res, 404, { ok: false, error: 'not found' })
        return
      }
      if (method !== 'GET') {
        writeJson(res, 405, { ok: false, error: 'method not allowed' })
        return
      }
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
        // rejected here — before it ever reaches the persistence read path —
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
      }
    },
  }), 'dsh-usage-dashboard: /api routes')
}
