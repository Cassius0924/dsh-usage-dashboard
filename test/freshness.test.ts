import assert from 'node:assert/strict'
import test from 'node:test'
import { syncStatusText, updatedText } from '../src/client/freshness.ts'

const NOW = Date.parse('2026-08-15T10:00:00Z')

test('freshness copy moves from just now through minutes, hours, and days', () => {
  assert.equal(updatedText(NOW - 10_000, NOW), '刚刚更新')
  assert.equal(updatedText(NOW - 3 * 60_000, NOW), '更新于 3 分钟前')
  assert.equal(updatedText(NOW - 5 * 60 * 60_000, NOW), '更新于 5 小时前')
  assert.equal(updatedText(NOW - 2 * 24 * 60 * 60_000, NOW), '更新于 2 天前')
})

test('freshness copy clamps future timestamps and handles missing history', () => {
  assert.equal(updatedText(NOW + 60_000, NOW), '刚刚更新')
  assert.equal(updatedText(null, NOW), '尚无成功记录')
})

test('sync states distinguish live, cached, fallback, and failed data', () => {
  const at = NOW - 3 * 60_000
  assert.equal(syncStatusText('syncing', at, NOW), '同步中 · 当前数据更新于 3 分钟前')
  assert.equal(syncStatusText('fresh', at, NOW), '已同步 · 更新于 3 分钟前')
  assert.equal(syncStatusText('cached', at, NOW), '缓存数据 · 更新于 3 分钟前')
  assert.equal(syncStatusText('fallback', at, NOW), '缓存回退 · 更新于 3 分钟前')
  assert.equal(syncStatusText('error', null, NOW), '同步失败 · 暂无可显示的用量')
})
