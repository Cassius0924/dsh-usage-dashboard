import assert from 'node:assert/strict'
import test from 'node:test'
import { budgetSnapshot } from '../src/client/budget.ts'

const beijingTime = (iso: string): number => Date.parse(`${iso}+08:00`)

test('budget forecast uses elapsed Beijing calendar month', () => {
  const snapshot = budgetSnapshot(15, 40, beijingTime('2026-08-16T00:00:00'))
  assert.equal(snapshot.spent, 15)
  assert.equal(snapshot.budget, 40)
  assert.equal(snapshot.forecast, 31)
  assert.equal(snapshot.status, 'healthy')
})

test('budget warns when forecast will exceed the limit', () => {
  const snapshot = budgetSnapshot(15, 20, beijingTime('2026-08-11T00:00:00'))
  assert.equal(snapshot.ratio, 0.75)
  assert.equal(snapshot.forecast, 46.5)
  assert.equal(snapshot.forecastOver, 26.5)
  assert.equal(snapshot.status, 'risk')
})

test('budget reports actual overspend and sanitizes invalid values', () => {
  const over = budgetSnapshot(25, 20, beijingTime('2026-08-16T00:00:00'))
  assert.equal(over.remaining, -5)
  assert.equal(over.status, 'over')

  const invalid = budgetSnapshot(Number.NaN, Number.POSITIVE_INFINITY, beijingTime('2026-08-16T00:00:00'))
  assert.equal(invalid.spent, 0)
  assert.equal(invalid.budget, 0)
  assert.equal(invalid.status, 'healthy')
})
