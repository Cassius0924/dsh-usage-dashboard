/**
 * The peak-window breaker gate.
 *
 * DeepSeek's `agent/pre-step` is a waterfall: a listener receives the proposed
 * step and either calls `next()` (let it proceed) or withholds it (park). This
 * gate parks steps only when all conditions hold:
 *
 * - the master switch is on,
 * - the step's agent (its session) opted in via its own switch,
 * - a peak window is open,
 * - the turn was started by a person (`source.kind === 'user'`).
 *
 * Parked steps resume when the window settles at 18:00, when the user lets them
 * continue from the UI, or when the owning turn is cancelled (`signal` aborts —
 * abort must let the loop unwind normally instead of throwing here).
 *
 * Steps after the first one in a turn can carry no messages, so the "was this a
 * user turn" decision is remembered per `(session, turn)`. The same memory
 * records a manual release so the user's "continue now" is not undone by the
 * very next step of that turn. Both are bounded: sessions come and go, but the
 * map must not grow forever on a long-lived host.
 *
 * Timer handling is split behind `BreakerTimerFace` so tests can drive a fake
 * clock; the production face uses a real `setTimeout`, unrefs it (a parked turn
 * must never keep the process alive) and re-arms long waits in chunks, because
 * `setTimeout` cannot represent delays above `MAX_BREAKER_TIMER_DELAY_MS`.
 */
import { BREAKER_DEFAULT_SETTINGS, type BreakerSettings } from './contract.ts'
import { isPeak } from './pricing.ts'
import {
  isUserTurn,
  nextResumeAt,
  normalizeBreakerSettings,
  type BreakerMessageFace,
} from './breaker.ts'

/** The timer seam; production uses `systemBreakerTimers`, tests a fake clock. */
export interface BreakerTimerFace {
  schedule(callback: () => void, delayMs: number): unknown
  cancel(handle: unknown): void
}

/** `setTimeout`'s documented maximum delay; longer waits are re-armed. */
export const MAX_BREAKER_TIMER_DELAY_MS = 2_147_483_647

/** Production timers: a real unref'd `setTimeout`. */
export const systemBreakerTimers: BreakerTimerFace = {
  schedule: (callback, delayMs) => {
    const handle = setTimeout(callback, delayMs)
    ;(handle as { unref?: () => void }).unref?.()
    return handle
  },
  cancel: (handle) => {
    clearTimeout(handle as ReturnType<typeof setTimeout>)
  },
}

/** Clamp one wait into the range a single `setTimeout` can carry. */
export const clampBreakerTimerDelay = (delayMs: number): number => {
  if (!Number.isFinite(delayMs)) return 0
  return Math.max(0, Math.min(Math.trunc(delayMs), MAX_BREAKER_TIMER_DELAY_MS))
}

/**
 * Bound on the per-turn memory. Turns are short-lived, but a host can see many
 * sessions over its lifetime; a bounded FIFO keeps that memory flat.
 */
const MAX_TRACKED_TURNS = 512

/** One parked step, kept only while it waits. */
interface HeldRecord {
  sessionId: string
  turn: number
  resolve: () => void
  detach: () => void
}

/** What is remembered about one turn for as long as it can still produce steps. */
interface TurnState {
  /** The turn was started by a person. */
  user: boolean
  /** The user manually let this turn continue, so later steps skip the gate. */
  released: boolean
}

export interface BreakerGateOptions {
  /** Settings to start from; the host loads persisted ones asynchronously. */
  initialSettings?: BreakerSettings
  /** Clock seam, epoch ms; defaults to `Date.now`. */
  now?: () => number
  /** Timer seam; defaults to the real clock. */
  timers?: BreakerTimerFace
}

export class BreakerGate {
  #settings: BreakerSettings
  #sessions: Set<string>
  readonly #now: () => number
  readonly #timers: BreakerTimerFace
  readonly #held = new Set<HeldRecord>()
  readonly #turns = new Map<string, TurnState>()
  #timer: { handle: unknown } | undefined
  #disposed = false

  constructor(options: BreakerGateOptions = {}) {
    this.#settings = normalizeBreakerSettings(options.initialSettings ?? { ...BREAKER_DEFAULT_SETTINGS })
    this.#sessions = new Set(this.#settings.sessions)
    this.#now = options.now ?? Date.now
    this.#timers = options.timers ?? systemBreakerTimers
  }

  get settings(): BreakerSettings {
    return normalizeBreakerSettings(this.#settings)
  }

  /** Steps parked right now, across every session. */
  get held(): number {
    return this.#held.size
  }

  /** Session ids with at least one parked step, sorted for the wire projection. */
  get heldSessions(): string[] {
    return [...new Set([...this.#held].map(record => record.sessionId))].sort()
  }

  /**
   * Park one proposed step until it may proceed. Resolves immediately when the
   * step is not subject to the breaker (session not opted in, off-peak,
   * machine-started turn, turn already released by hand) or when the turn is
   * aborted/disposed.
   *
   * The listener wrapping this must call `next()` after it resolves — this
   * method never throws and never returns a decision of its own.
   *
   * `sessionId` is the agent id from the payload; an agent without one cannot
   * be matched against the opt-in list, so its steps pass.
   */
  async hold(
    sessionId: string | undefined,
    turn: number,
    messages: readonly BreakerMessageFace[],
    signal: AbortSignal,
  ): Promise<void> {
    if (this.#disposed || signal.aborted || sessionId === undefined || sessionId === '') return

    // Classify the turn on any step that carries messages; a later step can
    // report no messages at all and must inherit the classification. A person
    // writing into a turn at any point makes it user work.
    const key = `${sessionId}:${turn}`
    let state = this.#turns.get(key)
    const user = isUserTurn(messages) || state?.user === true
    if (state === undefined) {
      state = { user, released: false }
      this.rememberTurn(key, state)
    } else {
      state.user = user
    }

    if (state.released || !this.#settings.enabled || !this.#sessions.has(sessionId)
      || !isPeak(this.#now()) || !state.user) return

    await new Promise<void>((resolve) => {
      const onAbort = (): void => {
        this.releaseRecord(record, false)
      }
      const record: HeldRecord = {
        sessionId,
        turn,
        resolve,
        detach: () => {
          signal.removeEventListener('abort', onAbort)
        },
      }
      signal.addEventListener('abort', onAbort)
      this.#held.add(record)
      this.armTimer()
    })
  }

  /**
   * Let parked steps continue now. `sessionId` narrows it to one session; no
   * argument releases every parked step (the UI's "continue all" button). The
   * released turns are remembered, because re-parking their next step would
   * contradict the user's instruction.
   * @returns how many parked steps were released.
   */
  release(sessionId?: string): number {
    const released = [...this.#held]
      .filter(record => sessionId === undefined || record.sessionId === sessionId)
    for (const record of released) this.releaseRecord(record, true)
    return released.length
  }

  /**
   * Apply new settings. Turning off the master switch — or a session's own
   * switch — releases the affected parked steps immediately and without
   * remembering a bypass: that is the user's decision, not a request for one
   * particular turn to run.
   */
  update(settings: BreakerSettings): void {
    this.#settings = normalizeBreakerSettings(settings)
    this.#sessions = new Set(this.#settings.sessions)
    if (this.#disposed) return
    const nowMs = this.#now()
    for (const record of [...this.#held]) {
      if (!this.#settings.enabled || !this.#sessions.has(record.sessionId) || !isPeak(nowMs)) {
        this.releaseRecord(record, false)
      }
    }
    if (this.#held.size > 0) this.armTimer()
    else this.clearTimer()
  }

  /** Release everything and stop the timer; called when the plugin unloads. */
  dispose(): void {
    this.#disposed = true
    this.clearTimer()
    for (const record of [...this.#held]) this.releaseRecord(record, false)
    this.#turns.clear()
  }

  /** (Re)arm the single settle timer for the current peak window. */
  private armTimer(): void {
    this.clearTimer()
    if (this.#disposed || this.#held.size === 0) return
    const nowMs = this.#now()
    const delayMs = nextResumeAt(nowMs) - nowMs
    if (!(delayMs > 0)) return
    const timer = { handle: undefined as unknown }
    timer.handle = this.#timers.schedule(() => {
      // A chunked/late timer re-arms from the fresh clock instead of assuming
      // the whole window elapsed.
      if (this.#timer === timer) this.#timer = undefined
      this.onTimer()
    }, clampBreakerTimerDelay(delayMs))
    this.#timer = timer
  }

  private onTimer(): void {
    if (this.#disposed || this.#held.size === 0) return
    if (isPeak(this.#now())) {
      this.armTimer()
      return
    }
    // The window settled on its own; these turns are not manual releases.
    for (const record of [...this.#held]) this.releaseRecord(record, false)
  }

  private clearTimer(): void {
    const timer = this.#timer
    if (timer === undefined) return
    this.#timer = undefined
    this.#timers.cancel(timer.handle)
  }

  private releaseRecord(record: HeldRecord, remember: boolean): void {
    if (!this.#held.delete(record)) return
    record.detach()
    if (remember) this.markReleased(record.sessionId, record.turn)
    record.resolve()
    if (this.#held.size === 0) this.clearTimer()
  }

  private markReleased(sessionId: string, turn: number): void {
    const key = `${sessionId}:${turn}`
    const state = this.#turns.get(key)
    if (state !== undefined) {
      state.released = true
      return
    }
    // The turn was never classified (it cannot be held without that), so a
    // fresh entry only needs the bypass flag.
    this.rememberTurn(key, { user: false, released: true })
  }

  private rememberTurn(key: string, state: TurnState): void {
    if (this.#turns.size >= MAX_TRACKED_TURNS) {
      const oldest = this.#turns.keys().next()
      if (!oldest.done) this.#turns.delete(oldest.value)
    }
    this.#turns.set(key, state)
  }
}
