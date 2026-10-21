/**
 * Shared live projection of the peak-pause settings.
 *
 * Two surfaces render the same host state: the composer-dock switch and the
 * 「额度」management card. The dock switch keeps its component mounted (only the
 * composer is hidden while the 额度 view is open), so two independent copies of
 * the projection would drift — flipping the master switch on the 额度 page
 * would leave the pill showing "on" until its own poll came around. Both
 * surfaces read and publish this one store, and a switch write publishes the
 * host's response immediately.
 */
import { useSyncExternalStore } from 'react'
import type { BreakerData } from '../contract.ts'

let current: BreakerData | null = null
const listeners = new Set<() => void>()

/** Latest host projection, or null before the first read lands. */
export function getBreakerData(): BreakerData | null {
  return current
}

/** Replace the projection and notify both surfaces. */
export function publishBreakerData(data: BreakerData | null): void {
  current = data
  for (const listener of [...listeners]) listener()
}

export function subscribeBreakerData(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Subscribe the calling component to the shared projection. */
export function useBreakerData(): BreakerData | null {
  return useSyncExternalStore(subscribeBreakerData, getBreakerData, getBreakerData)
}
