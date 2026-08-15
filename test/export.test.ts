import assert from 'node:assert/strict'
import test from 'node:test'
import type { UsageData } from '../src/contract.ts'
import { csvCell, dailyUsageCsv, exportDateStamp, fullUsageJson, modelUsageCsv } from '../src/client/export.ts'

const usage = {
  daily: [{ date: '2026-08-15', input: 10, output: 5, cache: 20, total: 35, cost: 0.125, calls: 2 }],
  models: [{
    provider: '=unsafe,provider', model: 'deep"seek\nmodel', input: 10, output: 5, cache: 20,
    total: 35, cost: 0.125, calls: 2, daily: [], hourly: [],
  }],
  hourly: [],
  heatmap: [],
  totals: { input: 10, output: 5, cache: 20, reasoning: 0, total: 35, cost: 0.125, calls: 2, cacheSavings: 1 },
  summary: {
    today: { total: 35, cost: 0.125, calls: 2 }, yesterday: { total: 0, cost: 0, calls: 0 },
    month: { total: 35, cost: 0.125, calls: 2 }, lastMonthToDate: { total: 0, cost: 0, calls: 0 },
  },
  pricing: { currency: 'CNY', switchDate: '2026-08-17', splitActive: false, inPeakNow: false, peakWindows: [], tiers: [] },
  peakSplit: {
    peak: { total: 0, cost: 0, calls: 0 }, offPeak: { total: 35, cost: 0.125, calls: 2 },
    peakEraCost: 0.25, offPeakEraCost: 0.125,
  },
  sessions: [],
  sessionCount: 0,
  coverage: {
    scope: 'local-dsh-session-logs',
    listedSessions: 0,
    scannedSessions: 0,
    usageRecords: 0,
    skippedRecords: 0,
    failedSessions: 0,
    earliestAt: null,
    latestAt: null,
  },
  windows: [],
  anomalies: [],
} satisfies UsageData

test('CSV cells quote separators and neutralize spreadsheet formulas', () => {
  assert.equal(csvCell('plain'), 'plain')
  assert.equal(csvCell('a,b'), '"a,b"')
  assert.equal(csvCell('a"b'), '"a""b"')
  assert.equal(csvCell('=SUM(A1:A2)'), "'=SUM(A1:A2)")
})

test('daily and model exports use stable headers and preserve values', () => {
  const daily = dailyUsageCsv(usage)
  assert.match(daily, /^\uFEFFdate,input_tokens,output_tokens,cache_hit_tokens,total_tokens,calls,estimated_cost_cny\r\n/)
  assert.match(daily, /2026-08-15,10,5,20,35,2,0\.125/)

  const models = modelUsageCsv(usage)
  assert.match(models, /"'=unsafe,provider"/)
  assert.match(models, /"deep""seek\nmodel"/)
})

test('JSON export identifies local scope and keeps the complete payload', () => {
  const now = Date.parse('2026-08-15T08:00:00Z')
  const parsed = JSON.parse(fullUsageJson(usage, now)) as { schemaVersion: number; scope: string; data: UsageData }
  assert.equal(parsed.schemaVersion, 1)
  assert.equal(parsed.scope, 'local-dsh-session-logs')
  assert.deepEqual(parsed.data, usage)
})

test('export filenames use the Beijing calendar date', () => {
  assert.equal(exportDateStamp(Date.parse('2026-08-14T16:00:00Z')), '20260815')
})
