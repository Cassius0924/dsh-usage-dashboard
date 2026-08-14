/**
 * DeepSeek API price table and cost estimation.
 *
 * Two things the previous flat constant got wrong: every model was billed at
 * deepseek-v4-pro rates (flash is ~3x cheaper), and the 2026-08-17 switch to
 * peak/off-peak pricing was not modelled at all.
 *
 * Rates are CNY per 1M tokens, from DeepSeek's 2026-08-13 price announcement.
 * Peak window is Beijing time 09:00–12:00 and 14:00–18:00; off-peak is half of
 * peak. Usage recorded before the switch is still costed at the old flat rates,
 * so historical days keep the price that was actually charged.
 *
 * Editing this table is the one place to touch when DeepSeek changes prices.
 */
import type { PricingInfo, PricingRates } from './contract.ts'

/** 2026-08-17 00:00 Beijing time (UTC+8), when peak/off-peak pricing starts. */
export const PEAK_PRICING_FROM_MS = Date.UTC(2026, 7, 16, 16, 0, 0)

/** Peak hours in Beijing time, as [startHour, endHour) pairs. */
const PEAK_WINDOWS: Array<[number, number]> = [[9, 12], [14, 18]]

const BEIJING_OFFSET_MS = 8 * 3_600_000

type Tier = 'pro' | 'flash'

/** Flat rates in effect until 2026-08-17. */
const LEGACY_RATES: Record<Tier, PricingRates> = {
  pro: { cacheHit: 0.025, input: 3, output: 6 },
  flash: { cacheHit: 0.02, input: 1, output: 2 },
}

/** Peak rates from 2026-08-17; off-peak is exactly half of each. */
const PEAK_RATES: Record<Tier, PricingRates> = {
  pro: { cacheHit: 0.3, input: 9, output: 27 },
  flash: { cacheHit: 0.1, input: 3, output: 9 },
}

const halved = (rates: PricingRates): PricingRates => ({
  cacheHit: rates.cacheHit / 2,
  input: rates.input / 2,
  output: rates.output / 2,
})

/** Which price tier a model name falls into; anything unrecognised is billed
 *  as pro, the conservative (more expensive) guess. */
export function tierOf(model: string): Tier {
  return model.toLowerCase().includes('flash') ? 'flash' : 'pro'
}

/** Whether a moment falls in a peak window, judged in Beijing time so the
 *  estimate does not drift with the machine's timezone. */
export function isPeak(timeMs: number): boolean {
  const hour = Math.floor((((timeMs + BEIJING_OFFSET_MS) % 86_400_000) + 86_400_000) % 86_400_000 / 3_600_000)
  return PEAK_WINDOWS.some(([from, to]) => hour >= from && hour < to)
}

/** Rates applying to one model at one moment. */
export function ratesAt(timeMs: number, model: string): PricingRates {
  const tier = tierOf(model)
  if (timeMs < PEAK_PRICING_FROM_MS) return LEGACY_RATES[tier]
  const peak = PEAK_RATES[tier]
  return isPeak(timeMs) ? peak : halved(peak)
}

/**
 * What prefix caching saved on one record: the cache-hit tokens re-priced at
 * the cache-miss rate, minus what they actually cost.
 */
export function cacheSavingOf(timeMs: number, model: string, cache: number): number {
  const rates = ratesAt(timeMs, model)
  return (cache * (rates.input - rates.cacheHit)) / 1_000_000
}

const applyRates = (rates: PricingRates, input: number, cache: number, output: number): number =>
  (input * rates.input + cache * rates.cacheHit + output * rates.output) / 1_000_000

/** Estimated CNY cost of one usage record. */
export function costOf(timeMs: number, model: string, input: number, cache: number, output: number): number {
  return applyRates(ratesAt(timeMs, model), input, cache, output)
}

/**
 * The same record priced under the peak/off-peak table regardless of when it
 * happened — `forceOffPeak` prices it as if it had landed in an idle window.
 * Used to answer "what will the new pricing cost me" before the switch and
 * "what would shifting off-peak save" after it.
 */
export function costUnderPeakEra(timeMs: number, model: string, input: number, cache: number, output: number, forceOffPeak = false): number {
  const peak = PEAK_RATES[tierOf(model)]
  const rates = !forceOffPeak && isPeak(timeMs) ? peak : halved(peak)
  return applyRates(rates, input, cache, output)
}

/** The price table to show the user, describing whatever is in effect now. */
export function pricingInfo(nowMs: number): PricingInfo {
  const split = nowMs >= PEAK_PRICING_FROM_MS
  return {
    currency: 'CNY',
    switchDate: '2026-08-17',
    splitActive: split,
    inPeakNow: split && isPeak(nowMs),
    peakWindows: ['09:00–12:00', '14:00–18:00'],
    tiers: (['pro', 'flash'] as Tier[]).map(tier => ({
      model: tier === 'pro' ? 'deepseek-v4-pro' : 'deepseek-v4-flash',
      peak: split ? PEAK_RATES[tier] : LEGACY_RATES[tier],
      offPeak: split ? halved(PEAK_RATES[tier]) : null,
    })),
  }
}
