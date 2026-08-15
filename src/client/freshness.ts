import { fallbackT, type Translate } from './i18n.tsx'

export type SyncState = 'syncing' | 'fresh' | 'cached' | 'fallback' | 'error'

/** Short, stable freshness copy for the dashboard status row. */
export function updatedText(updatedAt: number | null, nowMs = Date.now(), t: Translate = fallbackT): string {
  if (updatedAt === null || !Number.isFinite(updatedAt)) return t('fresh.none')
  const elapsed = Math.max(0, nowMs - updatedAt)
  if (elapsed < 60_000) return t('fresh.justNow')
  const minutes = Math.floor(elapsed / 60_000)
  if (minutes < 60) return t('fresh.minutes', { count: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('fresh.hours', { count: hours })
  return t('fresh.days', { count: Math.floor(hours / 24) })
}

export function syncStatusText(state: SyncState, updatedAt: number | null, nowMs = Date.now(), t: Translate = fallbackT): string {
  const age = updatedText(updatedAt, nowMs, t)
  if (state === 'syncing') return updatedAt === null ? t('sync.first') : t('sync.syncing', { age })
  if (state === 'fresh') return t('sync.fresh', { age })
  if (state === 'cached') return t('sync.cached', { age })
  if (state === 'fallback') return t('sync.fallback', { age })
  return t('sync.error')
}
