export type SyncState = 'syncing' | 'fresh' | 'cached' | 'fallback' | 'error'

/** Short, stable freshness copy for the dashboard status row. */
export function updatedText(updatedAt: number | null, nowMs = Date.now()): string {
  if (updatedAt === null || !Number.isFinite(updatedAt)) return '尚无成功记录'
  const elapsed = Math.max(0, nowMs - updatedAt)
  if (elapsed < 60_000) return '刚刚更新'
  const minutes = Math.floor(elapsed / 60_000)
  if (minutes < 60) return `更新于 ${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `更新于 ${hours} 小时前`
  return `更新于 ${Math.floor(hours / 24)} 天前`
}

export function syncStatusText(state: SyncState, updatedAt: number | null, nowMs = Date.now()): string {
  const age = updatedText(updatedAt, nowMs)
  if (state === 'syncing') return updatedAt === null ? '首次同步中' : `同步中 · 当前数据${age}`
  if (state === 'fresh') return `已同步 · ${age}`
  if (state === 'cached') return `缓存数据 · ${age}`
  if (state === 'fallback') return `缓存回退 · ${age}`
  return '同步失败 · 暂无可显示的用量'
}
