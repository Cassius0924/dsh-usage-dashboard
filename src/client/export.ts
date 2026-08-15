import type { UsageData } from '../contract.ts'

const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000

/** YYYYMMDD in DeepSeek's billing timezone. */
export function exportDateStamp(nowMs = Date.now()): string {
  const date = new Date(nowMs + BEIJING_OFFSET_MS)
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('')
}

/** RFC 4180 cell escaping plus spreadsheet-formula neutralisation for labels. */
export function csvCell(value: string | number): string {
  let text = String(value)
  if (typeof value === 'string' && /^[=+\-@]/.test(text)) text = `'${text}`
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

const csv = (rows: Array<Array<string | number>>): string =>
  `\uFEFF${rows.map(row => row.map(csvCell).join(',')).join('\r\n')}\r\n`

export function dailyUsageCsv(usage: UsageData): string {
  return csv([
    ['date', 'input_tokens', 'output_tokens', 'cache_hit_tokens', 'total_tokens', 'calls', 'estimated_cost_cny'],
    ...usage.daily.map(day => [day.date, day.input, day.output, day.cache, day.total, day.calls, day.cost]),
  ])
}

export function modelUsageCsv(usage: UsageData): string {
  return csv([
    ['provider', 'model', 'input_tokens', 'output_tokens', 'cache_hit_tokens', 'total_tokens', 'calls', 'estimated_cost_cny'],
    ...usage.models.map(model => [
      model.provider, model.model, model.input, model.output, model.cache, model.total, model.calls, model.cost,
    ]),
  ])
}

export function fullUsageJson(usage: UsageData, nowMs = Date.now()): string {
  return `${JSON.stringify({
    schemaVersion: 1,
    exportedAt: new Date(nowMs).toISOString(),
    scope: 'local-dsh-session-logs',
    data: usage,
  }, null, 2)}\n`
}

export function downloadText(filename: string, text: string, mediaType: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: mediaType }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.hidden = true
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
