import assert from 'node:assert/strict'
import test from 'node:test'
import { TOP_UP_URL, needsTopUp } from '../src/client/top-up.ts'

test('the top-up shortcut uses the DeepSeek platform top-up page', () => {
  assert.equal(TOP_UP_URL, 'https://platform.deepseek.com/top_up')
})

test('a balance under the fixed 10 floor always offers the shortcut', () => {
  assert.equal(needsTopUp(4.76, 0), true)
  assert.equal(needsTopUp(9.99, 0), true)
  assert.equal(needsTopUp(9.99, 3), true)
})

test('a raised warning line carries the shortcut above the floor', () => {
  assert.equal(needsTopUp(46.03, 100), true)
  assert.equal(needsTopUp(46.03, 47), true)
})

test('the shortcut stays hidden when neither condition holds', () => {
  assert.equal(needsTopUp(10, 0), false)
  assert.equal(needsTopUp(10, 10), false)
  assert.equal(needsTopUp(46.03, 10), false)
  assert.equal(needsTopUp(46.03, 0), false)
})

test('an unreadable balance never offers the shortcut', () => {
  assert.equal(needsTopUp(Number.NaN, 100), false)
  assert.equal(needsTopUp(Number.POSITIVE_INFINITY, 100), false)
  assert.equal(needsTopUp(Number.NEGATIVE_INFINITY, 100), false)
})
