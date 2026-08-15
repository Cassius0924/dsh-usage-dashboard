import assert from 'node:assert/strict'
import test from 'node:test'
import { isTapGesture, lastPopulatedIndex, nextChartFocus, nextPinnedIndex } from '../src/client/chart-focus.ts'

test('bar chart focus moves one point at a time and clamps at its edges', () => {
  assert.equal(nextChartFocus(3, 10, 'ArrowLeft'), 2)
  assert.equal(nextChartFocus(3, 10, 'ArrowRight'), 4)
  assert.equal(nextChartFocus(0, 10, 'ArrowUp'), 0)
  assert.equal(nextChartFocus(9, 10, 'ArrowDown'), 9)
  assert.equal(nextChartFocus(4, 10, 'Home'), 0)
  assert.equal(nextChartFocus(4, 10, 'End'), 9)
})

test('heatmap focus follows its seven-row visual grid', () => {
  assert.equal(nextChartFocus(15, 84, 'ArrowLeft', 7), 8)
  assert.equal(nextChartFocus(15, 84, 'ArrowRight', 7), 22)
  assert.equal(nextChartFocus(15, 84, 'ArrowUp', 7), 14)
  assert.equal(nextChartFocus(15, 84, 'ArrowDown', 7), 16)
  assert.equal(nextChartFocus(3, 84, 'ArrowLeft', 7), 0)
})

test('charts enter at their latest populated point', () => {
  assert.equal(lastPopulatedIndex([0, 2, 0, 7, 0]), 3)
  assert.equal(lastPopulatedIndex([0, 0]), 1)
  assert.equal(lastPopulatedIndex([]), 0)
})

test('tapping a pinned point again releases it; tapping another point switches the pin', () => {
  assert.equal(nextPinnedIndex(null, 3), 3)
  assert.equal(nextPinnedIndex(3, 3), null)
  assert.equal(nextPinnedIndex(3, 5), 5)
})

test('a tap gesture is short and nearly still; a scroll or long press is not', () => {
  assert.equal(isTapGesture(2, 3, 120), true)
  assert.equal(isTapGesture(40, 0, 120), false)
  assert.equal(isTapGesture(0, 40, 120), false)
  assert.equal(isTapGesture(0, 0, 900), false)
  assert.equal(isTapGesture(10, 0, 500), true)
  assert.equal(isTapGesture(6, 6, 200, 5, 500), false)
})
