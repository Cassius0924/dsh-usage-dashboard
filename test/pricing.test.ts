import assert from 'node:assert/strict'
import test from 'node:test'
import {
  PEAK_PRICING_FROM_MS,
  cacheSavingOf,
  costOf,
  isPeak,
  pricingInfo,
  ratesAt,
  tierOf,
} from '../src/pricing.ts'

const atBeijing = (hour: number, minute = 0): number =>
  Date.UTC(2026, 7, 18, hour - 8, minute)

const closeTo = (actual: number, expected: number): void => {
  assert.ok(Math.abs(actual - expected) < 1e-12, `${actual} != ${expected}`)
}

test('model tiers use flash rates only for flash models', () => {
  assert.equal(tierOf('deepseek-v4-flash'), 'flash')
  assert.equal(tierOf('DEEPSEEK-V4-FLASH'), 'flash')
  assert.equal(tierOf('deepseek-v4-pro'), 'pro')
  assert.equal(tierOf('future-unknown-model'), 'pro')
})

test('Beijing peak windows include their start and exclude their end', () => {
  const cases: Array<[number, number, boolean]> = [
    [8, 59, false],
    [9, 0, true],
    [11, 59, true],
    [12, 0, false],
    [13, 59, false],
    [14, 0, true],
    [17, 59, true],
    [18, 0, false],
  ]
  for (const [hour, minute, expected] of cases) {
    assert.equal(isPeak(atBeijing(hour, minute)), expected, `${hour}:${minute}`)
  }
})

test('rates switch exactly at 2026-08-17 00:00 Beijing time', () => {
  assert.deepEqual(ratesAt(PEAK_PRICING_FROM_MS - 1, 'deepseek-v4-pro'), {
    cacheHit: 0.025,
    input: 3,
    output: 6,
  })
  assert.deepEqual(ratesAt(PEAK_PRICING_FROM_MS, 'deepseek-v4-pro'), {
    cacheHit: 0.15,
    input: 4.5,
    output: 13.5,
  })
  assert.deepEqual(ratesAt(atBeijing(9), 'deepseek-v4-flash'), {
    cacheHit: 0.1,
    input: 3,
    output: 9,
  })
})

test('cost and cache-saving calculations price every token component', () => {
  closeTo(costOf(PEAK_PRICING_FROM_MS - 1, 'deepseek-v4-pro', 1_000_000, 2_000_000, 3_000_000), 21.05)
  closeTo(costOf(atBeijing(9, 30), 'deepseek-v4-pro', 1_000_000, 2_000_000, 3_000_000), 90.6)
  closeTo(cacheSavingOf(PEAK_PRICING_FROM_MS - 1, 'deepseek-v4-pro', 2_000_000), 5.95)
})

test('pricing metadata changes shape with the active pricing era', () => {
  const legacy = pricingInfo(PEAK_PRICING_FROM_MS - 1)
  assert.equal(legacy.splitActive, false)
  assert.equal(legacy.inPeakNow, false)
  assert.equal(legacy.tiers.every(tier => tier.offPeak === null), true)

  const peak = pricingInfo(atBeijing(10))
  assert.equal(peak.splitActive, true)
  assert.equal(peak.inPeakNow, true)
  assert.deepEqual(peak.peakWindows, ['09:00–12:00', '14:00–18:00'])
  assert.equal(peak.tiers.every(tier => tier.offPeak !== null), true)
})
