/**
 * Client-side helpers for the session-scoped peak breaker: response-shape
 * validation (the host half may not be restarted yet, so an absent or
 * malformed payload must degrade to「状态暂不可用」instead of crashing),
 * per-session projections for optimistic switches, and pure display
 * formatting that is independent of the browser timezone.
 */
import { isBreakerSettings, type BreakerData, type BreakerResponse } from '../contract.ts'

const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000

/** Characters kept when a session title has to fall back to its id. */
const SHORT_SESSION_ID = 8

/**
 * Narrow a response to one whose every field the UI dereferences exists.
 * Mirrors `usageIsUsable` in ./api.ts: a stale host that does not serve the
 * breaker route (404) or an older payload shape falls through to the neutral
 * copy rather than being rendered as if it were current.
 */
export function breakerIsUsable(
  res: BreakerResponse | null | undefined,
): res is BreakerResponse & { data: BreakerData } {
  if (res === null || res === undefined || res.ok !== true) return false
  const data = res.data
  if (data === undefined || data === null) return false
  return isBreakerSettings(data)
    && Array.isArray(data.holding) && data.holding.every(id => typeof id === 'string')
    && typeof data.now === 'string'
    && typeof data.peak === 'boolean'
    && (data.resumeAt === null || typeof data.resumeAt === 'string')
    && Array.isArray(data.peakWindows) && data.peakWindows.every(window => typeof window === 'string')
}

/**
 * `HH:mm` in Beijing time for an ISO instant, or null when absent/unparseable.
 *
 * Computed through the fixed +08:00 offset rather than `Intl`/local Date
 * getters: the resume clock is defined in Beijing time, and the browser may be
 * in any timezone (same approach as ./budget.ts's month boundary).
 */
export function beijingClock(iso: string | null | undefined): string | null {
  if (typeof iso !== 'string' || iso === '') return null
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return null
  const beijing = new Date(ms + BEIJING_OFFSET_MS)
  const hours = String(beijing.getUTCHours()).padStart(2, '0')
  const minutes = String(beijing.getUTCMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

/** Whether `sessionId` itself opted in, ignoring the master switch. */
export function isSessionOptedIn(data: BreakerData | null, sessionId: string | null | undefined): boolean {
  if (data === null || sessionId === null || sessionId === undefined || sessionId === '') return false
  return Array.isArray(data.sessions) && data.sessions.includes(sessionId)
}

/** Whether `sessionId`'s opt-in is in force: its own switch and the master switch. */
export function isSessionEnabled(data: BreakerData | null, sessionId: string | null | undefined): boolean {
  if (data === null || data.enabled !== true) return false
  return isSessionOptedIn(data, sessionId)
}

/** Switch a session's breaker can be in; `holding` means it is parked right now. */
export type SessionBreakerState = 'off' | 'on' | 'holding'

/**
 * Per-session state for the composer pill. Holding is only reported for an
 * enabled session: a release can race a stale projection, and a session the
 * host no longer lists must read as off regardless of the holding list. With
 * the master switch off nothing is in force, so the pill reads off too.
 */
export function sessionBreakerState(
  data: BreakerData | null,
  sessionId: string | null | undefined,
): SessionBreakerState {
  if (!isSessionEnabled(data, sessionId)) return 'off'
  return data !== null && Array.isArray(data.holding) && data.holding.includes(sessionId as string)
    ? 'holding'
    : 'on'
}

/**
 * Projection with one session switched on/off, used for the optimistic state
 * before the host answers. Disabling also drops the session from `holding`:
 * off means nothing is parked for it.
 */
export function withSessionToggled(
  data: BreakerData | null,
  sessionId: string,
  enabled: boolean,
): BreakerData | null {
  if (data === null) return null
  const sessions = enabled
    ? (data.sessions.includes(sessionId) ? data.sessions : [...data.sessions, sessionId])
    : data.sessions.filter(id => id !== sessionId)
  const holding = enabled ? data.holding : data.holding.filter(id => id !== sessionId)
  return { ...data, sessions, holding }
}

/**
 * Projection with the master switch flipped, used for the optimistic state
 * before the host answers. Off means nothing is parked — per-session switches
 * are kept, so the 额度 page can still list and manage them.
 */
export function withMasterToggled(data: BreakerData | null, enabled: boolean): BreakerData | null {
  if (data === null) return null
  return { ...data, enabled, holding: enabled ? data.holding : [] }
}

/** Title fallback for a session whose title has not been read yet. */
export function shortSessionId(sessionId: string): string {
  const trimmed = sessionId.trim()
  return trimmed.length <= SHORT_SESSION_ID ? trimmed : `${trimmed.slice(0, SHORT_SESSION_ID)}…`
}

/**
 * Which status row the 额度 page's breaker card shows. `unavailable` means the
 * host route could not be read (or answered with a shape this client cannot
 * use); `masterOff` outranks the peak phases because nothing pauses then. The
 * peak phases depend only on the host clock and holding list.
 */
export type BreakerPhase = 'unavailable' | 'masterOff' | 'offPeak' | 'peak' | 'peakHolding'

export function breakerPhase(data: BreakerData | null): BreakerPhase {
  if (data === null) return 'unavailable'
  if (!data.enabled) return 'masterOff'
  if (!data.peak) return 'offPeak'
  return data.holding.length > 0 ? 'peakHolding' : 'peak'
}
