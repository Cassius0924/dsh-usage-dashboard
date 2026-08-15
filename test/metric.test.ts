import assert from 'node:assert/strict'
import test from 'node:test'
import { chartMetricName, chartMetricValue, isChartMetric } from '../src/client/metric.ts'

const point = { total: 12_000, cost: 1.25, calls: 4 }

test('chart metrics select the matching value and label', () => {
  assert.equal(chartMetricValue('tokens', point), 12_000)
  assert.equal(chartMetricValue('cost', point), 1.25)
  assert.equal(chartMetricValue('calls', point), 4)
  assert.deepEqual(['tokens', 'cost', 'calls'].map(metric => chartMetricName(metric as 'tokens' | 'cost' | 'calls')), ['用量', '费用', '调用'])
})

test('chart metric preference validation rejects stale or malformed values', () => {
  assert.equal(isChartMetric('tokens'), true)
  assert.equal(isChartMetric('cost'), true)
  assert.equal(isChartMetric('calls'), true)
  assert.equal(isChartMetric('money'), false)
  assert.equal(isChartMetric(null), false)
})
