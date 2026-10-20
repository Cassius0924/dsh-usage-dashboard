import assert from 'node:assert/strict'
import test from 'node:test'
import { clampTabIndex, viewOrderForIndex } from '../src/client/layout-prefs.ts'

const view = (id: string, order: number) => ({ options: { id, order } })

/** The live roster as the host reports it: Chat, Trajectory, our own tab. */
const roster = [view('chat', 0), view('trajectory', 10), view('balance', 20)]

test('viewOrderForIndex falls back to the historical order without other views', () => {
  assert.equal(viewOrderForIndex([], 0), 20)
  assert.equal(viewOrderForIndex([view('balance', 20)], 2), 20)
})

test('viewOrderForIndex puts the first/last position outside the live range', () => {
  assert.equal(viewOrderForIndex(roster, 0), -10)
  // The last position keeps a gap after the final remaining entry (order 10).
  assert.equal(viewOrderForIndex(roster, 2), 20)
  assert.equal(viewOrderForIndex(roster, 3), 20)
  assert.equal(viewOrderForIndex(roster, 99), 20)
})

test('viewOrderForIndex lands interior positions between the two neighbours', () => {
  // index 1 = between chat (0) and trajectory (10)
  assert.equal(viewOrderForIndex(roster, 1), 5)
  // an unrelated plugin tab with a wide gap still leaves room for a bisect
  const spaced = [view('chat', 0), view('trajectory', 10), view('context', 30)]
  assert.equal(viewOrderForIndex(spaced, 2), 20)
})

test('viewOrderForIndex ignores this plugin own entry and duplicate neighbours', () => {
  // Own registration still present while the next order is computed.
  assert.equal(viewOrderForIndex([view('chat', 0), view('balance', 5), view('trajectory', 10)], 1), 5)
  // Two host entries claiming the same order: land after the previous one.
  assert.equal(viewOrderForIndex([view('chat', 0), view('trajectory', 0)], 1), 0.5)
  // Missing order behaves like the host's default (0).
  const noOrder = [{ options: { id: 'chat' } }, { options: { id: 'trajectory' } }]
  // Two omitted orders both mean 0 to the host, so the interior position
  // lands just after that shared value and the end still steps 10 past it.
  assert.equal(viewOrderForIndex(noOrder, 1), 0.5)
  assert.equal(viewOrderForIndex(noOrder, 2), 10)
})

test('clampTabIndex keeps a persisted index inside the roster', () => {
  assert.equal(clampTabIndex(0, 3), 0)
  assert.equal(clampTabIndex(2, 3), 2)
  assert.equal(clampTabIndex(9, 3), 3)
  assert.equal(clampTabIndex(-4, 3), 0)
  assert.equal(clampTabIndex(3, 0), 0)
})
