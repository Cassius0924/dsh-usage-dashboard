/** Estimated spend contributed beside each completed chat turn. */
import { useEffect, useState, type ReactElement } from 'react'
import type { SessionUsageData, TurnUsage } from '../contract.ts'
import { fetchSessionUsage, getCachedSessionUsage, subscribeSessionUsage } from './api.ts'
import { useI18n } from './i18n.tsx'

export interface MessageCostProps {
  sessionId: string
  messageId: string
}

/** Small costs need more than the dashboard's two-decimal money formatter or
 * almost every individual turn would misleadingly read as ¥0.00. */
export const fmtTurnCost = (cost: number): string => cost.toLocaleString(undefined, {
  minimumFractionDigits: cost > 0 && cost < 0.01 ? 4 : 2,
  maximumFractionDigits: cost > 0 && cost < 0.01 ? 6 : 4,
})

const cachedData = (sessionId: string): SessionUsageData | null => {
  const response = getCachedSessionUsage(sessionId)
  return response?.ok === true ? response.data ?? null : null
}

export function MessageCost({ sessionId, messageId }: MessageCostProps): ReactElement | null {
  const { t } = useI18n()
  const [data, setData] = useState<SessionUsageData | null>(() => cachedData(sessionId))

  useEffect(() => {
    setData(cachedData(sessionId))
    const unsubscribe = subscribeSessionUsage(sessionId, () => setData(cachedData(sessionId)))
    const hit = cachedData(sessionId)?.turns.some(turn => turn.messageId === messageId) ?? false
    if (!hit) void fetchSessionUsage(sessionId)
    return unsubscribe
  }, [messageId, sessionId])

  const turn: TurnUsage | undefined = data?.turns.find(candidate => candidate.messageId === messageId)
  if (turn === undefined) return null
  const amount = `¥ ${fmtTurnCost(turn.cost)}`
  const tooltip = t('messageCost.tooltip')
  return (
    <span
      className="dq-message-cost"
      tabIndex={0}
      data-dq-tooltip={tooltip}
      aria-label={t('messageCost.aria', { amount })}
    >
      <span className="dq-message-cost-separator" aria-hidden>·</span>
      <span className="dq-message-cost-amount">{amount}</span>
    </span>
  )
}
