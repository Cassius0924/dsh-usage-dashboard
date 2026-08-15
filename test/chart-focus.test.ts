import assert from 'node:assert/strict'
import test from 'node:test'
import { lastPopulatedIndex, nextChartFocus } from '../src/client/chart-focus.ts'

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
