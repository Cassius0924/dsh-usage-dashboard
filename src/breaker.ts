/**
 * Peak-window breaker decisions — pure functions, no timers or IO.
 *
 * DeepSeek charges peak rates in Beijing time 09:00–12:00 and 14:00–18:00 on
 * weekdays (see `pricing.ts`, which owns that definition). A session that opted
 * in parks its user-started steps while a peak window is open and lets them
 * continue at 18:00 — the end of the day's last peak window — so one pause
 * covers both windows without a lunch-time exception.
 *
 * All time math is done in Beijing time (UTC+8) rather than the machine's local
 * zone, matching the price table.
 */
import { isValidSessionId, type BreakerData, type BreakerSettings } from './contract.ts'
import { isPeak } from './pricing.ts'

const BEIJING_OFFSET_MS = 8 * 3_600_000
const HOUR_MS = 3_600_000
const DAY_MS = 86_400_000

/** Peak windows in Beijing time, display-only copy shared with `pricingInfo`. */
export const BREAKER_PEAK_WINDOWS = ['09:00–12:00', '14:00–18:00'] as const

/**
 * The one field of a message this module inspects: its producer. Only
 * `kind === 'user'` means a person started the turn in a chat; scheduled
 * tasks, goal continuations and subagent relays all carry another kind and are
 * therefore never parked.
 */
export interface BreakerMessageFace {
  source?: { kind?: string }
}

/**
 * When the current peak window settles: 18:00 Beijing time on the same day.
 * Outside peak there is nothing to wait for, so the answer is `now`.
 *
 * A peak window can only be open between 09:00 and 18:00 on a weekday, so the
 * same-day 18:00 instant is always in the future here. Converting through
 * UTC+8 schedules the same instant on a host in another timezone.
 */
export function nextResumeAt(nowMs: number): number {
  if (!isPeak(nowMs)) return nowMs
  const beijingMs = nowMs + BEIJING_OFFSET_MS
  const dayStartMs = Math.floor(beijingMs / DAY_MS) * DAY_MS
  return dayStartMs + 18 * HOUR_MS - BEIJING_OFFSET_MS
}

/**
 * Whether these proposed-step messages belong to a turn a person started. A
 * single user-produced message is enough: a step that carries it is part of
 * the user's request, whatever else the batch holds.
 */
export function isUserTurn(messages: readonly BreakerMessageFace[]): boolean {
  return messages.some(message => message.source?.kind === 'user')
}

/**
 * A copy holding exactly the contract fields, with session ids deduplicated,
 * filtered to the charset sessions can actually have, and sorted so persisted
 * documents and API projections are stable.
 */
export function normalizeBreakerSettings(settings: BreakerSettings): BreakerSettings {
  const sessions = [...new Set(settings.sessions.filter(isValidSessionId))].sort()
  return { enabled: settings.enabled, sessions }
}

/** Project live gate state into the wire shape the client renders. */
export function breakerProject(
  settings: BreakerSettings,
  nowMs: number,
  holding: readonly string[],
): BreakerData {
  const peak = isPeak(nowMs)
  const normalized = normalizeBreakerSettings(settings)
  const parkedSessions = [...new Set(holding.filter(isValidSessionId))].sort()
  return {
    enabled: normalized.enabled,
    sessions: normalized.sessions,
    holding: parkedSessions,
    now: new Date(nowMs).toISOString(),
    peak,
    resumeAt: peak ? new Date(nextResumeAt(nowMs)).toISOString() : null,
    peakWindows: [...BREAKER_PEAK_WINDOWS],
  }
}
