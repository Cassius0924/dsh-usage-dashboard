import assert from 'node:assert/strict'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import {
  BREAKER_API,
  type BreakerData,
  type BreakerResponse,
  type BreakerSettings,
} from '../src/contract.ts'
import type { PreStepDecisionFace, PreStepPayloadFace, WebRoute } from '../src/context.ts'
import { apply } from '../src/index.ts'
import {
  BREAKER_PEAK_WINDOWS,
  breakerProject,
  isUserTurn,
  nextResumeAt,
  normalizeBreakerSettings,
  type BreakerMessageFace,
} from '../src/breaker.ts'
import {
  BreakerGate,
  clampBreakerTimerDelay,
  MAX_BREAKER_TIMER_DELAY_MS,
  type BreakerTimerFace,
} from '../src/breaker-gate.ts'
import {
  breakerSettingsPath,
  loadBreakerSettings,
  saveBreakerSettings,
  type BreakerSettingsIoOptions,
} from '../src/breaker-settings.ts'
import type { IncomingMessage, ServerResponse } from 'node:http'

const BEIJING_OFFSET_MS = 8 * 3_600_000

/** A Beijing-clock instant on a fixed 2026 date (month 1-based). */
const beijingTime = (month: number, day: number, hour: number, minute = 0): number =>
  Date.UTC(2026, month - 1, day, hour - 8, minute)

// 2026-10-21 is a Wednesday, 10-23 a Friday, 10-24 a Saturday. The
// weekday-only peak rule has been in force since 2026-09-10.
const wednesday = (hour: number, minute = 0): number => beijingTime(10, 21, hour, minute)
const friday = (hour: number, minute = 0): number => beijingTime(10, 23, hour, minute)
const saturday = (hour: number, minute = 0): number => beijingTime(10, 24, hour, minute)

const SESSION_A = 'session-a'
const SESSION_B = 'session-b'

const userMessage = (): BreakerMessageFace => ({ source: { kind: 'user' } })
const machineMessage = (kind = 'schedule'): BreakerMessageFace => ({ source: { kind } })

const settingsOf = (...sessions: string[]): BreakerSettings => ({ enabled: true, sessions })
const settingsWith = (enabled: boolean, ...sessions: string[]): BreakerSettings => ({ enabled, sessions })

/** Resolve after one macrotask: enough to tell a parked promise from a settled one. */
const isPending = async (promise: Promise<unknown>): Promise<boolean> => {
  let settled = false
  void promise.then(() => { settled = true }, () => { settled = true })
  await new Promise<void>((resolve) => setImmediate(resolve))
  return !settled
}

const flush = async (): Promise<void> => {
  await new Promise<void>((resolve) => setImmediate(resolve))
}

/** Fake clock + timer seam: deadlines fire when the test advances time. */
class FakeClock {
  #nowMs: number
  #nextId = 1
  readonly #scheduled = new Map<number, { at: number; callback: () => void }>()

  constructor(startMs: number) {
    this.#nowMs = startMs
  }

  now = (): number => this.#nowMs

  readonly timers: BreakerTimerFace = {
    schedule: (callback, delayMs) => {
      const id = this.#nextId
      this.#nextId += 1
      this.#scheduled.set(id, { at: this.#nowMs + delayMs, callback })
      return id
    },
    cancel: (handle) => {
      this.#scheduled.delete(handle as number)
    },
  }

  get pendingTimers(): number {
    return this.#scheduled.size
  }

  /** Move the clock forward and fire every timer that became due, in order. */
  advanceTo(targetMs: number): void {
    this.#nowMs = targetMs
    for (;;) {
      const due = [...this.#scheduled.entries()]
        .filter(([, timer]) => timer.at <= this.#nowMs)
        .sort((left, right) => left[1].at - right[1].at)
      const first = due[0]
      if (first === undefined) break
      this.#scheduled.delete(first[0])
      first[1].callback()
    }
  }
}

const parkableSignal = (): AbortSignal => new AbortController().signal

// ---------------------------------------------------------------------------
// breaker.ts — pure decisions
// ---------------------------------------------------------------------------

test('nextResumeAt waits for 18:00 through both peak windows and returns now outside them', () => {
  const cases: Array<[string, number, number]> = [
    ['Wednesday 08:59', wednesday(8, 59), wednesday(8, 59)],
    ['Wednesday 09:00', wednesday(9), wednesday(18)],
    ['Wednesday 11:59', wednesday(11, 59), wednesday(18)],
    // 12:00–14:00 is off-peak: nothing is parked, so nothing waits for 18:00.
    ['Wednesday 12:00', wednesday(12), wednesday(12)],
    ['Wednesday 13:59', wednesday(13, 59), wednesday(13, 59)],
    ['Wednesday 14:00', wednesday(14), wednesday(18)],
    ['Wednesday 17:59', wednesday(17, 59), wednesday(18)],
    ['Wednesday 18:00', wednesday(18), wednesday(18)],
    ['Friday 10:00', friday(10), friday(18)],
    ['Saturday 10:00', saturday(10), saturday(10)],
  ]
  for (const [label, nowMs, expected] of cases) {
    assert.equal(nextResumeAt(nowMs), expected, label)
  }
})

test('nextResumeAt follows the price era: weekends were peak before 2026-09-10', () => {
  const weekendDuringOldEra = beijingTime(9, 5, 10)
  assert.equal(nextResumeAt(weekendDuringOldEra), beijingTime(9, 5, 18))
})

test('isUserTurn accepts only turns carrying a person-made message', () => {
  assert.equal(isUserTurn([userMessage()]), true)
  assert.equal(isUserTurn([machineMessage('goal'), userMessage()]), true)
  // Every machine source is exempt: scheduled tasks, goal continuations and
  // subagent relays all reach the agent without a user message.
  for (const kind of ['schedule', 'goal', 'subagent', 'steering']) {
    assert.equal(isUserTurn([machineMessage(kind)]), false, kind)
  }
  assert.equal(isUserTurn([]), false)
  assert.equal(isUserTurn([{}]), false)
})

test('normalizeBreakerSettings deduplicates, sorts, and drops unusable ids', () => {
  assert.deepEqual(
    normalizeBreakerSettings(settingsOf('session-b', 'session-a', 'session-b', 'bad/id', '', 'session_c')),
    settingsOf('session-a', 'session-b', 'session_c'),
  )
  assert.deepEqual(normalizeBreakerSettings(settingsOf()), settingsOf())
  assert.deepEqual(
    normalizeBreakerSettings(settingsWith(false, 'session-b', 'session-a')),
    settingsWith(false, 'session-a', 'session-b'),
  )
})

test('breakerProject carries the opt-ins, parked sessions, and the settle instant', () => {
  const nowMs = wednesday(10)
  assert.deepEqual(breakerProject(settingsOf('session-b', 'session-a', 'session-a'), nowMs, ['session-b', 'session-a', 'session-a']), {
    enabled: true,
    sessions: ['session-a', 'session-b'],
    holding: ['session-a', 'session-b'],
    now: new Date(nowMs).toISOString(),
    peak: true,
    resumeAt: new Date(wednesday(18)).toISOString(),
    peakWindows: [...BREAKER_PEAK_WINDOWS],
  })
  const offPeak = breakerProject(settingsOf('session-a'), wednesday(13), [])
  assert.equal(offPeak.peak, false)
  assert.equal(offPeak.resumeAt, null)
  assert.deepEqual(offPeak.holding, [])

  // The master switch is part of the projection even when no session opted in.
  assert.equal(breakerProject(settingsWith(false), nowMs, []).enabled, false)
})

// ---------------------------------------------------------------------------
// breaker-gate.ts — parking, turn memory, releases
// ---------------------------------------------------------------------------

const parkableGate = (clock: FakeClock, sessions: string[] = [SESSION_A]): BreakerGate =>
  new BreakerGate({ now: clock.now, timers: clock.timers, initialSettings: settingsOf(...sessions) })

test('the gate parks an opted-in user turn and resumes it at 18:00', async () => {
  const clock = new FakeClock(wednesday(10))
  const gate = parkableGate(clock)
  try {
    const parked = gate.hold(SESSION_A, 1, [userMessage()], parkableSignal())
    assert.equal(await isPending(parked), true)
    assert.equal(gate.held, 1)
    assert.deepEqual(gate.heldSessions, [SESSION_A])
    assert.equal(clock.pendingTimers, 1)
    // Lunch time is still peak-adjacent work time: the hold continues.
    clock.advanceTo(wednesday(12))
    assert.equal(await isPending(parked), true)
    clock.advanceTo(wednesday(18))
    await parked
    assert.equal(gate.held, 0)
    assert.equal(clock.pendingTimers, 0)
  } finally {
    gate.dispose()
  }
})

test('the gate ignores sessions that did not opt in', async () => {
  const clock = new FakeClock(wednesday(10))
  const gate = parkableGate(clock, [SESSION_A])
  try {
    assert.equal(await isPending(gate.hold(SESSION_B, 1, [userMessage()], parkableSignal())), false)
    assert.equal(await isPending(gate.hold(undefined, 1, [userMessage()], parkableSignal())), false)
    assert.equal(await isPending(gate.hold('', 1, [userMessage()], parkableSignal())), false)
    assert.equal(gate.held, 0)
    assert.equal(clock.pendingTimers, 0)
  } finally {
    gate.dispose()
  }
})

test('the gate never parks machine-started turns of an opted-in session', async () => {
  const clock = new FakeClock(wednesday(10))
  const gate = parkableGate(clock)
  try {
    for (const kind of ['schedule', 'goal', 'subagent']) {
      assert.equal(await isPending(gate.hold(SESSION_A, 1, [machineMessage(kind)], parkableSignal())), false, kind)
    }
    assert.equal(gate.held, 0)
  } finally {
    gate.dispose()
  }
})

test('a user-turn classification is remembered for later steps with no messages', async () => {
  const clock = new FakeClock(wednesday(10))
  const gate = parkableGate(clock)
  try {
    const first = gate.hold(SESSION_A, 7, [userMessage()], parkableSignal())
    assert.equal(await isPending(first), true)
    // Later steps can report an empty message batch...
    const second = gate.hold(SESSION_A, 7, [], parkableSignal())
    assert.equal(await isPending(second), true)
    // ...or only tool-produced messages: neither flips the turn to machine work.
    const third = gate.hold(SESSION_A, 7, [machineMessage('tool')], parkableSignal())
    assert.equal(await isPending(third), true)
    assert.equal(gate.held, 3)
    // The memory is keyed by session too: the same turn number elsewhere is
    // still classified on its own first step.
    assert.equal(await isPending(gate.hold(SESSION_B, 7, [], parkableSignal())), false)
    gate.release()
    await Promise.all([first, second, third])
  } finally {
    gate.dispose()
  }
})

test('a machine-started turn stays machine-started when later steps carry no messages', async () => {
  const clock = new FakeClock(wednesday(10))
  const gate = parkableGate(clock)
  try {
    assert.equal(await isPending(gate.hold(SESSION_A, 3, [machineMessage()], parkableSignal())), false)
    assert.equal(await isPending(gate.hold(SESSION_A, 3, [], parkableSignal())), false)
    assert.equal(gate.held, 0)
  } finally {
    gate.dispose()
  }
})

test('manual release frees the parked step and the rest of its turn', async () => {
  const clock = new FakeClock(wednesday(10))
  const gate = parkableGate(clock)
  try {
    const parked = gate.hold(SESSION_A, 3, [userMessage()], parkableSignal())
    assert.equal(await isPending(parked), true)
    assert.equal(gate.release(), 1)
    await parked
    // The user asked this turn to make progress; the next step must not stop.
    assert.equal(await isPending(gate.hold(SESSION_A, 3, [], parkableSignal())), false)
    // A new turn starts with a clean slate.
    const nextTurn = gate.hold(SESSION_A, 4, [userMessage()], parkableSignal())
    assert.equal(await isPending(nextTurn), true)
    gate.release()
    await nextTurn
  } finally {
    gate.dispose()
  }
})

test('manual release can target one session and remembers only its turn', async () => {
  const clock = new FakeClock(wednesday(10))
  const gate = parkableGate(clock, [SESSION_A, SESSION_B])
  try {
    const a = gate.hold(SESSION_A, 1, [userMessage()], parkableSignal())
    const b = gate.hold(SESSION_B, 1, [userMessage()], parkableSignal())
    assert.equal(await isPending(a), true)
    assert.equal(await isPending(b), true)
    assert.equal(gate.release(SESSION_A), 1)
    await a
    assert.equal(await isPending(b), true)
    assert.deepEqual(gate.heldSessions, [SESSION_B])
    // Released session A runs the rest of its turn without stopping.
    assert.equal(await isPending(gate.hold(SESSION_A, 1, [], parkableSignal())), false)
    // Session B was not released.
    assert.equal(await isPending(b), true)
    assert.equal(gate.release('session-unknown'), 0)
    assert.equal(gate.release(), 1)
    await b
  } finally {
    gate.dispose()
  }
})

test('turning a session off releases its parked step without marking a bypass', async () => {
  const clock = new FakeClock(wednesday(10))
  const gate = parkableGate(clock, [SESSION_A, SESSION_B])
  try {
    const parkedA = gate.hold(SESSION_A, 1, [userMessage()], parkableSignal())
    const parkedB = gate.hold(SESSION_B, 1, [userMessage()], parkableSignal())
    assert.equal(await isPending(parkedA), true)
    assert.equal(await isPending(parkedB), true)

    gate.update(settingsOf(SESSION_B))
    await parkedA
    assert.equal(await isPending(parkedB), true)
    assert.deepEqual(gate.heldSessions, [SESSION_B])

    // Switching back on re-applies the breaker to this still-open user turn:
    // the earlier switch-off released the step but did not release the turn.
    gate.update(settingsOf(SESSION_A, SESSION_B))
    assert.equal(await isPending(gate.hold(SESSION_A, 1, [], parkableSignal())), true)
    gate.release()
  } finally {
    gate.dispose()
  }
})

test('the master switch off parks nothing and releases what is parked', async () => {
  const clock = new FakeClock(wednesday(10))
  const gate = new BreakerGate({
    now: clock.now,
    timers: clock.timers,
    initialSettings: settingsWith(false, SESSION_A, SESSION_B),
  })
  try {
    assert.equal(await isPending(gate.hold(SESSION_A, 1, [userMessage()], parkableSignal())), false)
    assert.deepEqual(gate.heldSessions, [])

    // A parked step is released the moment the master switch turns off.
    gate.update(settingsOf(SESSION_A, SESSION_B))
    const parked = gate.hold(SESSION_A, 2, [userMessage()], parkableSignal())
    assert.equal(await isPending(parked), true)
    gate.update(settingsWith(false, SESSION_A, SESSION_B))
    await parked
    assert.deepEqual(gate.heldSessions, [])
    assert.equal(await isPending(gate.hold(SESSION_A, 3, [userMessage()], parkableSignal())), false)
  } finally {
    gate.dispose()
  }
})

test('aborting the owning turn releases the park without throwing', async () => {
  const clock = new FakeClock(wednesday(10))
  const gate = parkableGate(clock)
  const controller = new AbortController()
  try {
    const parked = gate.hold(SESSION_A, 1, [userMessage()], controller.signal)
    assert.equal(await isPending(parked), true)
    controller.abort()
    await parked
    assert.equal(gate.held, 0)
    assert.equal(clock.pendingTimers, 0)
    // Already-aborted turns are never parked at all.
    const aborted = new AbortController()
    aborted.abort()
    assert.equal(await isPending(gate.hold(SESSION_A, 2, [userMessage()], aborted.signal)), false)
  } finally {
    gate.dispose()
  }
})

test('dispose releases parked steps and clears the settle timer', async () => {
  const clock = new FakeClock(wednesday(10))
  const gate = parkableGate(clock)
  const parked = gate.hold(SESSION_A, 1, [userMessage()], parkableSignal())
  assert.equal(await isPending(parked), true)
  assert.equal(clock.pendingTimers, 1)
  gate.dispose()
  await parked
  assert.equal(gate.held, 0)
  assert.equal(clock.pendingTimers, 0)
  // A disposed gate lets everything through.
  assert.equal(await isPending(gate.hold(SESSION_A, 2, [userMessage()], parkableSignal())), false)
})

test('clampBreakerTimerDelay keeps waits inside setTimeout’s range', () => {
  assert.equal(clampBreakerTimerDelay(1_000), 1_000)
  assert.equal(clampBreakerTimerDelay(MAX_BREAKER_TIMER_DELAY_MS), MAX_BREAKER_TIMER_DELAY_MS)
  assert.equal(clampBreakerTimerDelay(MAX_BREAKER_TIMER_DELAY_MS + 1), MAX_BREAKER_TIMER_DELAY_MS)
  assert.equal(clampBreakerTimerDelay(-5), 0)
  assert.equal(clampBreakerTimerDelay(Number.NaN), 0)
  assert.equal(clampBreakerTimerDelay(Number.POSITIVE_INFINITY), 0)
})

// ---------------------------------------------------------------------------
// breaker-settings.ts — durable opt-in list
// ---------------------------------------------------------------------------

const makeTempDir = async (): Promise<string> => mkdtemp(join(tmpdir(), 'dsh-breaker-test-'))

const quietIo = (filePath: string, warnings: string[] = []): BreakerSettingsIoOptions => ({
  filePath,
  warn: (message) => { warnings.push(message) },
})

test('breaker settings round-trip through an atomic JSON file', async () => {
  const dir = await makeTempDir()
  try {
    const filePath = join(dir, 'breaker.json')
    await saveBreakerSettings(settingsOf(SESSION_B, SESSION_A, SESSION_A), { filePath })
    assert.deepEqual(await readdir(dir), ['breaker.json'])
    assert.deepEqual(await loadBreakerSettings(quietIo(filePath)), settingsOf(SESSION_A, SESSION_B))
    const text = await readFile(filePath, 'utf8')
    assert.equal(text.endsWith('\n'), true)
    assert.deepEqual(JSON.parse(text), settingsOf(SESSION_A, SESSION_B))

    await saveBreakerSettings(settingsWith(false, SESSION_B), { filePath })
    assert.deepEqual(await loadBreakerSettings(quietIo(filePath)), settingsWith(false, SESSION_B))
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('a missing settings file falls back to no opt-ins silently', async () => {
  const dir = await makeTempDir()
  try {
    const warnings: string[] = []
    assert.deepEqual(await loadBreakerSettings(quietIo(join(dir, 'breaker.json'), warnings)), settingsOf())
    assert.deepEqual(warnings, [])
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('corrupt or wrongly shaped settings files fall back to no opt-ins with a warning', async () => {
  const dir = await makeTempDir()
  try {
    const cases: Array<[string, string]> = [
      ['corrupt.json', '{ not json'],
      ['not-object.json', '[]'],
      ['no-sessions.json', JSON.stringify({ sessions: 'session-a' })],
      ['bad-enabled.json', JSON.stringify({ enabled: 'yes', sessions: [] })],
      ['null.json', 'null'],
    ]
    for (const [name, content] of cases) {
      const filePath = join(dir, name)
      await writeFile(filePath, content, 'utf8')
      const warnings: string[] = []
      assert.deepEqual(await loadBreakerSettings(quietIo(filePath, warnings)), settingsOf(), name)
      assert.equal(warnings.length, 1, name)
    }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('a settings file without a master switch reads as enabled', async () => {
  const dir = await makeTempDir()
  try {
    const filePath = join(dir, 'breaker.json')
    // Written by the release before the master switch existed.
    await writeFile(filePath, JSON.stringify({ sessions: [SESSION_A] }), 'utf8')
    assert.deepEqual(await loadBreakerSettings(quietIo(filePath)), settingsOf(SESSION_A))
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('load deduplicates, sorts, and filters ids that cannot be sessions', async () => {
  const dir = await makeTempDir()
  try {
    const filePath = join(dir, 'breaker.json')
    await writeFile(filePath, JSON.stringify({
      sessions: ['session-b', 'session-a', 'session-a', 'bad/id', 'has space', 42, ''],
    }), 'utf8')
    assert.deepEqual(await loadBreakerSettings(quietIo(filePath)), settingsOf(SESSION_A, SESSION_B))
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('breakerSettingsPath honours DSH_HOME and defaults to ~/.dsh', () => {
  assert.equal(
    breakerSettingsPath({ DSH_HOME: '/tmp/custom-dsh-home' } as NodeJS.ProcessEnv),
    join('/tmp/custom-dsh-home', 'storages', 'dsh-usage-dashboard', 'breaker.json'),
  )
  assert.equal(
    breakerSettingsPath({} as NodeJS.ProcessEnv),
    join(homedir(), '.dsh', 'storages', 'dsh-usage-dashboard', 'breaker.json'),
  )
  assert.equal(
    breakerSettingsPath({ DSH_HOME: '   ' } as NodeJS.ProcessEnv),
    join(homedir(), '.dsh', 'storages', 'dsh-usage-dashboard', 'breaker.json'),
  )
})

// ---------------------------------------------------------------------------
// index.ts — routes and the registered pre-step listener
// ---------------------------------------------------------------------------

type PreStepListener = (payload: PreStepPayloadFace, next: () => Promise<PreStepDecisionFace>) => Promise<PreStepDecisionFace>

interface FakeHost {
  ctx: Parameters<typeof apply>[0]
  routes: WebRoute[]
  listeners: PreStepListener[]
  warnings: string[]
  dispose: () => Promise<void>
}

const makeHost = (): FakeHost => {
  const routes: WebRoute[] = []
  const listeners: PreStepListener[] = []
  const warnings: string[] = []
  const cleanups: Array<() => void | Promise<void>> = []
  const fake = {
    webServer: {
      register: (route: WebRoute) => {
        routes.push(route)
        return (): void => {}
      },
    },
    credentials: { resolve: async () => undefined },
    sessionPersistence: { list: async () => [] },
    get: () => undefined,
    effect: (execute: () => (() => void) | void) => {
      const cleanup = execute()
      if (typeof cleanup === 'function') cleanups.push(cleanup)
      return () => Promise.resolve()
    },
    on: (_name: string, listener: PreStepListener) => {
      listeners.push(listener)
      return (): boolean => true
    },
  }
  return {
    ctx: fake as unknown as Parameters<typeof apply>[0],
    routes,
    listeners,
    warnings,
    dispose: async () => {
      for (const cleanup of cleanups.splice(0).reverse()) await cleanup()
    },
  }
}

interface RouteResult {
  status: number
  headers: Record<string, string>
  body: unknown
  text: string
}

const callRoute = async (host: FakeHost, request: {
  method?: string
  path: string
  body?: string
  host?: string
  origin?: string
}): Promise<RouteResult> => {
  const route = host.routes[0]
  assert.ok(route !== undefined, 'route registered')
  const chunks = request.body === undefined ? [] : [Buffer.from(request.body, 'utf8')]
  const req = {
    method: request.method ?? 'GET',
    url: request.path,
    headers: {
      host: request.host ?? '127.0.0.1:3080',
      ...(request.origin === undefined ? {} : { origin: request.origin }),
    },
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) yield chunk
    },
    resume: (): void => {},
  }
  const captured = { status: 0, headers: {} as Record<string, string>, text: '' }
  const res = {
    writeHead: (status: number, headers?: Record<string, string>) => {
      captured.status = status
      for (const [key, value] of Object.entries(headers ?? {})) captured.headers[key.toLowerCase()] = value
      return res
    },
    end: (body?: string) => {
      captured.text = body ?? ''
    },
  }
  await route.handler(req as unknown as IncomingMessage, res as unknown as ServerResponse)
  return {
    ...captured,
    body: captured.text === '' ? undefined : JSON.parse(captured.text),
  }
}

const dataOf = (result: RouteResult): BreakerData => {
  const body = result.body as BreakerResponse
  assert.equal(body.ok, true)
  const data = body.data
  assert.ok(data !== undefined, 'breaker data present')
  return data
}

interface BreakerHostFixture {
  host: FakeHost
  clock: FakeClock
  settingsFile: string
  listener: PreStepListener
}

/**
 * Apply the plugin against a fake host. `timers` defaults to the fake clock's,
 * so a parked step never leaves a real timer behind in the test process.
 */
const makeBreakerHost = async (startMs: number, dir: string): Promise<BreakerHostFixture> => {
  const clock = new FakeClock(startMs)
  const settingsFile = join(dir, 'breaker.json')
  const host = makeHost()
  apply(host.ctx, { settingsFile, now: clock.now, timers: clock.timers, warn: (message) => { host.warnings.push(message) } })
  await flush()
  const listener = host.listeners[0]
  assert.ok(listener !== undefined, 'pre-step listener registered')
  return { host, clock, settingsFile, listener }
}

const preStep = (listener: PreStepListener, sessionId: string, turn: number, messages: BreakerMessageFace[], signal = parkableSignal()): {
  parked: Promise<PreStepDecisionFace>
  nextCalls: () => number
} => {
  let calls = 0
  const parked = listener({
    agent: { id: sessionId },
    messages,
    turn,
    step: 1,
    signal,
  }, async () => {
    calls += 1
    return { kind: 'enter', messages: [] }
  })
  return { parked, nextCalls: () => calls }
}

test('GET /breaker serves the live projection and refuses unknown methods', async () => {
  const dir = await makeTempDir()
  try {
    const fixture = await makeBreakerHost(wednesday(10), dir)
    try {
      const response = await callRoute(fixture.host, { path: BREAKER_API.state })
      assert.equal(response.status, 200)
      assert.equal(response.headers['cache-control'], 'no-store')
      assert.deepEqual(dataOf(response), {
        enabled: true,
        sessions: [],
        holding: [],
        now: new Date(wednesday(10)).toISOString(),
        peak: true,
        resumeAt: new Date(wednesday(18)).toISOString(),
        peakWindows: [...BREAKER_PEAK_WINDOWS],
      })

      const notAllowed = await callRoute(fixture.host, { method: 'POST', path: BREAKER_API.state })
      assert.equal(notAllowed.status, 405)
      assert.equal(notAllowed.headers.allow, 'GET, PUT')
      assert.equal((notAllowed.body as { ok: boolean }).ok, false)
    } finally {
      await fixture.host.dispose()
    }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('PUT /breaker toggles one session, persists it, and re-reads it', async () => {
  const dir = await makeTempDir()
  try {
    const fixture = await makeBreakerHost(wednesday(10), dir)
    try {
      const on = await callRoute(fixture.host, {
        method: 'PUT',
        path: BREAKER_API.state,
        body: JSON.stringify({ sessionId: SESSION_B, enabled: true }),
      })
      assert.equal(on.status, 200)
      assert.deepEqual(dataOf(on).sessions, [SESSION_B])
      assert.deepEqual(JSON.parse(await readFile(fixture.settingsFile, 'utf8')), settingsOf(SESSION_B))

      const second = await callRoute(fixture.host, {
        method: 'PUT',
        path: BREAKER_API.state,
        body: JSON.stringify({ sessionId: SESSION_A, enabled: true }),
      })
      assert.equal(second.status, 200)
      assert.deepEqual(dataOf(second).sessions, [SESSION_A, SESSION_B])

      // Repeating a toggle is idempotent, not an error.
      const repeated = await callRoute(fixture.host, {
        method: 'PUT',
        path: BREAKER_API.state,
        body: JSON.stringify({ sessionId: SESSION_A, enabled: true }),
      })
      assert.equal(repeated.status, 200)

      const readBack = dataOf(await callRoute(fixture.host, { path: BREAKER_API.state }))
      assert.deepEqual(readBack.sessions, [SESSION_A, SESSION_B])

      const off = await callRoute(fixture.host, {
        method: 'PUT',
        path: BREAKER_API.state,
        body: JSON.stringify({ sessionId: SESSION_A, enabled: false }),
      })
      assert.deepEqual(dataOf(off).sessions, [SESSION_B])
      assert.deepEqual(JSON.parse(await readFile(fixture.settingsFile, 'utf8')), settingsOf(SESSION_B))
    } finally {
      await fixture.host.dispose()
    }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('PUT /breaker flips the master switch without touching session opt-ins', async () => {
  const dir = await makeTempDir()
  try {
    const fixture = await makeBreakerHost(wednesday(10), dir)
    try {
      await callRoute(fixture.host, {
        method: 'PUT',
        path: BREAKER_API.state,
        body: JSON.stringify({ sessionId: SESSION_A, enabled: true }),
      })
      const off = await callRoute(fixture.host, {
        method: 'PUT',
        path: BREAKER_API.state,
        body: JSON.stringify({ enabled: false }),
      })
      assert.equal(off.status, 200)
      const data = dataOf(off)
      assert.equal(data.enabled, false)
      assert.deepEqual(data.sessions, [SESSION_A])
      assert.deepEqual(
        JSON.parse(await readFile(fixture.settingsFile, 'utf8')),
        settingsWith(false, SESSION_A),
      )

      const on = await callRoute(fixture.host, {
        method: 'PUT',
        path: BREAKER_API.state,
        body: JSON.stringify({ enabled: true }),
      })
      assert.equal(dataOf(on).enabled, true)
    } finally {
      await fixture.host.dispose()
    }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('PUT /breaker rejects bad bodies with 400/413 and leaves the opt-ins untouched', async () => {
  const dir = await makeTempDir()
  try {
    const fixture = await makeBreakerHost(wednesday(10), dir)
    try {
      const bodies = [
        'not json',
        '[]',
        'null',
        '{}',
        JSON.stringify({ sessionId: SESSION_A }),
        JSON.stringify({ sessionId: 'bad/id', enabled: true }),
        JSON.stringify({ sessionId: 'has space', enabled: true }),
        JSON.stringify({ sessionId: SESSION_A, enabled: 'yes' }),
        JSON.stringify({ enabled: 'yes' }),
      ]
      for (const body of bodies) {
        const response = await callRoute(fixture.host, { method: 'PUT', path: BREAKER_API.state, body })
        assert.equal(response.status, 400, body)
      }
      const tooLarge = await callRoute(fixture.host, {
        method: 'PUT',
        path: BREAKER_API.state,
        body: JSON.stringify({ sessionId: SESSION_A, enabled: true, pad: 'x'.repeat(9_000) }),
      })
      assert.equal(tooLarge.status, 413)

      assert.deepEqual(dataOf(await callRoute(fixture.host, { path: BREAKER_API.state })).sessions, [])
    } finally {
      await fixture.host.dispose()
    }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('a failed persist rolls the in-memory opt-ins back and answers 500', async () => {
  const dir = await makeTempDir()
  try {
    // Making the settings path a child of a regular file forces both the read
    // and the atomic write to fail.
    const blocker = join(dir, 'blocker')
    await writeFile(blocker, 'not a directory', 'utf8')
    const clock = new FakeClock(wednesday(10))
    const settingsFile = join(blocker, 'breaker.json')
    const host = makeHost()
    apply(host.ctx, { settingsFile, now: clock.now, timers: clock.timers, warn: (message) => { host.warnings.push(message) } })
    await flush()
    const listener = host.listeners[0] as PreStepListener
    try {
      const response = await callRoute(host, {
        method: 'PUT',
        path: BREAKER_API.state,
        body: JSON.stringify({ sessionId: SESSION_A, enabled: true }),
      })
      assert.equal(response.status, 500)
      assert.equal((response.body as { ok: boolean }).ok, false)
      assert.deepEqual(dataOf(await callRoute(host, { path: BREAKER_API.state })).sessions, [])

      // The rolled-back state is what the gate acts on: no hold for the session
      // the failed request tried to opt in.
      const step = preStep(listener, SESSION_A, 1, [userMessage()])
      assert.equal(await isPending(step.parked), false)
      assert.equal(step.nextCalls(), 1)
    } finally {
      await host.dispose()
    }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('the pre-step listener parks nothing while the master switch is off', async () => {
  const dir = await makeTempDir()
  try {
    const fixture = await makeBreakerHost(wednesday(10), dir)
    try {
      await callRoute(fixture.host, {
        method: 'PUT',
        path: BREAKER_API.state,
        body: JSON.stringify({ sessionId: SESSION_A, enabled: true }),
      })
      await callRoute(fixture.host, {
        method: 'PUT',
        path: BREAKER_API.state,
        body: JSON.stringify({ enabled: false }),
      })
      const step = preStep(fixture.listener, SESSION_A, 1, [userMessage()])
      assert.equal(await isPending(step.parked), false)
      assert.equal(step.nextCalls(), 1)
      assert.deepEqual(dataOf(await callRoute(fixture.host, { path: BREAKER_API.state })).holding, [])
    } finally {
      await fixture.host.dispose()
    }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('the release route resumes a parked user turn and remembers the turn', async () => {
  const dir = await makeTempDir()
  try {
    const fixture = await makeBreakerHost(wednesday(10), dir)
    try {
      const put = await callRoute(fixture.host, {
        method: 'PUT',
        path: BREAKER_API.state,
        body: JSON.stringify({ sessionId: SESSION_A, enabled: true }),
      })
      assert.equal(put.status, 200)

      const first = preStep(fixture.listener, SESSION_A, 1, [userMessage()])
      assert.equal(await isPending(first.parked), true)
      assert.equal(first.nextCalls(), 0)
      assert.deepEqual(dataOf(await callRoute(fixture.host, { path: BREAKER_API.state })).holding, [SESSION_A])

      const released = await callRoute(fixture.host, { method: 'POST', path: BREAKER_API.release })
      assert.equal(released.status, 200)
      assert.deepEqual(dataOf(released).holding, [])
      assert.deepEqual(await first.parked, { kind: 'enter', messages: [] })
      assert.equal(first.nextCalls(), 1)

      // The same turn's later step proceeds without another release.
      const second = preStep(fixture.listener, SESSION_A, 1, [])
      assert.equal(await isPending(second.parked), false)
      assert.equal(second.nextCalls(), 1)

      // A scheduled turn is exempt even though the session opted in.
      const scheduled = preStep(fixture.listener, SESSION_A, 2, [machineMessage('schedule')])
      assert.equal(await isPending(scheduled.parked), false)
      assert.equal(scheduled.nextCalls(), 1)

      // A new user turn of the same session is parked again.
      const nextTurn = preStep(fixture.listener, SESSION_A, 3, [userMessage()])
      assert.equal(await isPending(nextTurn.parked), true)
      await callRoute(fixture.host, { method: 'POST', path: BREAKER_API.release })
      await nextTurn.parked
    } finally {
      await fixture.host.dispose()
    }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('POST /breaker/release can target one session and validates its optional body', async () => {
  const dir = await makeTempDir()
  try {
    const fixture = await makeBreakerHost(wednesday(10), dir)
    try {
      for (const sessionId of [SESSION_A, SESSION_B]) {
        const put = await callRoute(fixture.host, {
          method: 'PUT',
          path: BREAKER_API.state,
          body: JSON.stringify({ sessionId, enabled: true }),
        })
        assert.equal(put.status, 200)
      }
      const a = preStep(fixture.listener, SESSION_A, 1, [userMessage()])
      const b = preStep(fixture.listener, SESSION_B, 1, [userMessage()])
      assert.equal(await isPending(a.parked), true)
      assert.equal(await isPending(b.parked), true)

      const targeted = await callRoute(fixture.host, {
        method: 'POST',
        path: BREAKER_API.release,
        body: JSON.stringify({ sessionId: SESSION_A }),
      })
      assert.equal(targeted.status, 200)
      assert.deepEqual(dataOf(targeted).holding, [SESSION_B])
      await a.parked
      assert.equal(await isPending(b.parked), true)

      // An empty object means "all sessions", same as an empty body.
      const all = await callRoute(fixture.host, { method: 'POST', path: BREAKER_API.release, body: '{}' })
      assert.equal(all.status, 200)
      assert.deepEqual(dataOf(all).holding, [])
      await b.parked

      for (const body of [
        'not json',
        '[]',
        '"plain"',
        'null',
        JSON.stringify({ sessionId: 42 }),
        JSON.stringify({ sessionId: 'bad/id' }),
        JSON.stringify({ sessionId: SESSION_A, extra: true }),
      ]) {
        const bad = await callRoute(fixture.host, { method: 'POST', path: BREAKER_API.release, body })
        assert.equal(bad.status, 400, body)
      }
      const tooLarge = await callRoute(fixture.host, {
        method: 'POST',
        path: BREAKER_API.release,
        body: JSON.stringify({ sessionId: SESSION_A, pad: 'x'.repeat(9_000) }),
      })
      assert.equal(tooLarge.status, 413)

      // The release route answers POST only.
      const notAllowed = await callRoute(fixture.host, { method: 'GET', path: BREAKER_API.release })
      assert.equal(notAllowed.status, 405)
      assert.equal(notAllowed.headers.allow, 'POST')
    } finally {
      await fixture.host.dispose()
    }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('turning a switch off over the API releases that session and only that session', async () => {
  const dir = await makeTempDir()
  try {
    const fixture = await makeBreakerHost(wednesday(10), dir)
    try {
      for (const sessionId of [SESSION_A, SESSION_B]) {
        await callRoute(fixture.host, {
          method: 'PUT',
          path: BREAKER_API.state,
          body: JSON.stringify({ sessionId, enabled: true }),
        })
      }
      const a = preStep(fixture.listener, SESSION_A, 1, [userMessage()])
      const b = preStep(fixture.listener, SESSION_B, 1, [userMessage()])
      assert.equal(await isPending(a.parked), true)
      assert.equal(await isPending(b.parked), true)

      const off = await callRoute(fixture.host, {
        method: 'PUT',
        path: BREAKER_API.state,
        body: JSON.stringify({ sessionId: SESSION_A, enabled: false }),
      })
      assert.equal(off.status, 200)
      await a.parked
      assert.deepEqual(dataOf(off).holding, [SESSION_B])
      assert.equal(await isPending(b.parked), true)
      await callRoute(fixture.host, { method: 'POST', path: BREAKER_API.release })
      await b.parked
    } finally {
      await fixture.host.dispose()
    }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('persisted opt-ins are loaded at startup and drive the pre-step gate', async () => {
  const dir = await makeTempDir()
  try {
    const settingsFile = join(dir, 'breaker.json')
    await saveBreakerSettings(settingsOf(SESSION_A), { filePath: settingsFile })
    const clock = new FakeClock(wednesday(10))
    const host = makeHost()
    apply(host.ctx, { settingsFile, now: clock.now, timers: clock.timers, warn: (message) => { host.warnings.push(message) } })
    try {
      // The load is asynchronous; poll the route until it lands (bounded, so a
      // broken loader fails the test instead of hanging it).
      let sessions: string[] | undefined
      for (let attempt = 0; attempt < 200; attempt += 1) {
        const response = await callRoute(host, { path: BREAKER_API.state })
        sessions = dataOf(response).sessions
        if (sessions.length > 0) break
        await new Promise<void>((resolve) => setTimeout(resolve, 5))
      }
      assert.deepEqual(sessions, [SESSION_A])

      const listener = host.listeners[0] as PreStepListener
      const optedIn = preStep(listener, SESSION_A, 1, [userMessage()])
      assert.equal(await isPending(optedIn.parked), true)
      const notOptedIn = preStep(listener, SESSION_B, 1, [userMessage()])
      assert.equal(await isPending(notOptedIn.parked), false)
      clock.advanceTo(wednesday(18))
      await optedIn.parked
    } finally {
      await host.dispose()
    }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('aborting a parked turn through the registered listener still calls next', async () => {
  const dir = await makeTempDir()
  try {
    const fixture = await makeBreakerHost(wednesday(10), dir)
    try {
      await callRoute(fixture.host, {
        method: 'PUT',
        path: BREAKER_API.state,
        body: JSON.stringify({ sessionId: SESSION_A, enabled: true }),
      })
      const controller = new AbortController()
      const step = preStep(fixture.listener, SESSION_A, 1, [userMessage()], controller.signal)
      assert.equal(await isPending(step.parked), true)
      controller.abort()
      // The listener resolves and continues the step; it must not throw.
      assert.deepEqual(await step.parked, { kind: 'enter', messages: [] })
      assert.equal(step.nextCalls(), 1)
      assert.deepEqual(dataOf(await callRoute(fixture.host, { path: BREAKER_API.state })).holding, [])
    } finally {
      await fixture.host.dispose()
    }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('unknown routes stay 404 and non-loopback hosts are fenced off', async () => {
  const dir = await makeTempDir()
  try {
    const fixture = await makeBreakerHost(wednesday(10), dir)
    try {
      const unknown = await callRoute(fixture.host, { path: '/api/dsh-usage-dashboard/nope' })
      assert.equal(unknown.status, 404)
      const unknownMethod = await callRoute(fixture.host, { method: 'POST', path: '/api/dsh-usage-dashboard/nope' })
      assert.equal(unknownMethod.status, 404)

      const forbidden = await callRoute(fixture.host, { path: BREAKER_API.state, host: 'attacker.example:3080' })
      assert.equal(forbidden.status, 403)

      const crossSite = await callRoute(fixture.host, {
        path: BREAKER_API.state,
        host: '127.0.0.1:3080',
        origin: 'http://attacker.example',
      })
      assert.equal(crossSite.status, 403)
    } finally {
      await fixture.host.dispose()
    }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
