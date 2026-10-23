import assert from 'node:assert/strict'
import test from 'node:test'
import {
  beijingClock,
  breakerIsUsable,
  breakerPhase,
  isSessionEnabled,
  isSessionOptedIn,
  sessionBreakerState,
  shortSessionId,
  withMasterToggled,
  withSessionToggled,
} from '../src/client/breaker.ts'
import type { BreakerData, BreakerResponse } from '../src/contract.ts'

const data: BreakerData = {
  enabled: true,
  sessions: ['sess-alpha', 'sess-beta'],
  holding: ['sess-beta'],
  now: '2026-10-21T10:00:00.000+08:00',
  peak: true,
  resumeAt: '2026-10-21T18:00:00.000+08:00',
  peakWindows: ['09:00–12:00', '14:00–18:00'],
}

const response = (value: unknown): BreakerResponse => value as BreakerResponse

test('breakerIsUsable accepts a complete session projection and rejects unusable shapes', () => {
  assert.equal(breakerIsUsable({ ok: true, data }), true)
  assert.equal(breakerIsUsable(response({ ok: false, error: 'HTTP 404' })), false)
  assert.equal(breakerIsUsable(response({ ok: true })), false)
  assert.equal(breakerIsUsable(response({ ok: true, data: null })), false)
  assert.equal(breakerIsUsable(null), false)
  // A stale host payload or a truncated body must not reach the view.
  assert.equal(breakerIsUsable(response({ ok: true, data: { ...data, sessions: 'sess-alpha' } })), false)
  assert.equal(breakerIsUsable(response({ ok: true, data: { ...data, sessions: ['bad session id'] } })), false)
  assert.equal(breakerIsUsable(response({ ok: true, data: { ...data, holding: true } })), false)
  assert.equal(breakerIsUsable(response({ ok: true, data: { ...data, now: undefined } })), false)
  assert.equal(breakerIsUsable(response({ ok: true, data: { ...data, peak: 'yes' } })), false)
  assert.equal(breakerIsUsable(response({ ok: true, data: { ...data, resumeAt: undefined } })), false)
  assert.equal(breakerIsUsable(response({ ok: true, data: { ...data, peakWindows: '09:00' } })), false)
  // The master switch is part of the projection: a host that does not report it
  // cannot be rendered as if the master were on.
  assert.equal(breakerIsUsable(response({ ok: true, data: { ...data, enabled: undefined } })), false)
  assert.equal(breakerIsUsable(response({ ok: true, data: { ...data, enabled: 'yes' } })), false)
})

test('beijingClock formats ISO instants in Beijing time regardless of the host zone', () => {
  assert.equal(beijingClock('2026-10-21T10:00:00.000Z'), '18:00')
  assert.equal(beijingClock('2026-10-21T16:00:00+08:00'), '16:00')
  assert.equal(beijingClock('2026-10-20T16:30:00.000Z'), '00:30')
  assert.equal(beijingClock(''), null)
  assert.equal(beijingClock(null), null)
  assert.equal(beijingClock(undefined), null)
  assert.equal(beijingClock('not-a-date'), null)
})

test('isSessionEnabled reads the opted-in list and tolerates a missing projection', () => {
  assert.equal(isSessionEnabled(data, 'sess-alpha'), true)
  assert.equal(isSessionEnabled(data, 'sess-gamma'), false)
  assert.equal(isSessionEnabled(data, ''), false)
  assert.equal(isSessionEnabled(data, undefined), false)
  assert.equal(isSessionEnabled(null, 'sess-alpha'), false)
  // The master switch gates every session switch, but the stored opt-in survives.
  const masterOff = { ...data, enabled: false }
  assert.equal(isSessionEnabled(masterOff, 'sess-alpha'), false)
  assert.equal(isSessionOptedIn(masterOff, 'sess-alpha'), true)
  assert.equal(isSessionOptedIn(data, 'sess-gamma'), false)
})

test('sessionBreakerState maps opted-in and parked sessions to off/on/holding', () => {
  assert.equal(sessionBreakerState(data, 'sess-alpha'), 'on')
  assert.equal(sessionBreakerState(data, 'sess-beta'), 'holding')
  assert.equal(sessionBreakerState(data, 'sess-gamma'), 'off')
  assert.equal(sessionBreakerState(null, 'sess-alpha'), 'off')
  // A release can race a stale projection: holding alone must not imply enabled.
  assert.equal(sessionBreakerState({ ...data, sessions: [] }, 'sess-beta'), 'off')
  // Nothing is in force with the master switch off, whatever the sessions say.
  assert.equal(sessionBreakerState({ ...data, enabled: false }, 'sess-alpha'), 'off')
  assert.equal(sessionBreakerState({ ...data, enabled: false }, 'sess-beta'), 'off')
})

test('withSessionToggled projects the optimistic switch without mutating the input', () => {
  const on = withSessionToggled(data, 'sess-gamma', true)
  assert.deepEqual(on?.sessions, ['sess-alpha', 'sess-beta', 'sess-gamma'])
  assert.equal(on?.sessions.includes('sess-gamma'), true)
  // Enabling an already-enabled session does not duplicate it.
  assert.deepEqual(withSessionToggled(data, 'sess-alpha', true)?.sessions, data.sessions)
  // Disabling drops the session from both lists, and off means nothing parked.
  const off = withSessionToggled(data, 'sess-beta', false)
  assert.deepEqual(off?.sessions, ['sess-alpha'])
  assert.deepEqual(off?.holding, [])
  assert.equal(off?.peak, true)
  assert.equal(withSessionToggled(null, 'sess-alpha', true), null)
  // The original projection is untouched (state may still be needed to roll back).
  assert.deepEqual(data.sessions, ['sess-alpha', 'sess-beta'])
  assert.deepEqual(data.holding, ['sess-beta'])
})

test('withMasterToggled projects the optimistic master switch without mutating the input', () => {
  const off = withMasterToggled(data, false)
  assert.equal(off?.enabled, false)
  // Off parks nothing, but per-session switches are kept for the list.
  assert.deepEqual(off?.holding, [])
  assert.deepEqual(off?.sessions, ['sess-alpha', 'sess-beta'])
  const backOn = withMasterToggled(off, true)
  assert.equal(backOn?.enabled, true)
  assert.deepEqual(backOn?.holding, [])
  assert.equal(withMasterToggled(null, false), null)
  assert.equal(data.enabled, true)
  assert.deepEqual(data.holding, ['sess-beta'])
})

test('breakerPhase picks the card status row from the clock and holding list', () => {
  assert.equal(breakerPhase(null), 'unavailable')
  assert.equal(breakerPhase(data), 'peakHolding')
  assert.equal(breakerPhase({ ...data, holding: [] }), 'peak')
  assert.equal(breakerPhase({ ...data, peak: false, holding: [], resumeAt: null }), 'offPeak')
  // A holding list outside a peak window is stale, not a parked state.
  assert.equal(breakerPhase({ ...data, peak: false }), 'offPeak')
  // The master switch outranks the clock: nothing pauses while it is off.
  assert.equal(breakerPhase({ ...data, enabled: false }), 'masterOff')
  assert.equal(breakerPhase({ ...data, enabled: false, peak: false, holding: [] }), 'masterOff')
})

test('shortSessionId keeps ids short enough for a row and marks truncation', () => {
  assert.equal(shortSessionId('short'), 'short')
  assert.equal(shortSessionId('12345678'), '12345678')
  assert.equal(shortSessionId('123456789abcdef'), '12345678…')
  assert.equal(shortSessionId('  padded  '), 'padded')
})
