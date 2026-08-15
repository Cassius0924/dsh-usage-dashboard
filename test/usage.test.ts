import assert from 'node:assert/strict'
import test from 'node:test'
import type { CredentialsFace, SessionEventFace, SessionPersistenceFace } from '../src/context.ts'
import { cacheSavingOf, costOf, costUnderPeakEra } from '../src/pricing.ts'
import { fetchBalance, fetchUsage } from '../src/usage.ts'

const pad2 = (value: number): string => String(value).padStart(2, '0')
const dayKey = (time: number): string => {
  const date = new Date(time)
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}
const localTime = (day: number, hour: number): number =>
  new Date(2026, 6, day, hour, 0, 0).getTime()

const closeTo = (actual: number, expected: number): void => {
  assert.ok(Math.abs(actual - expected) < 1e-12, `${actual} != ${expected}`)
}

test('usage replay aggregates totals, periods, models, sessions, and pricing projections', async () => {
  const now = localTime(20, 16)
  const yesterday = localTime(19, 10)
  const todayFlash = localTime(20, 15)
  const todayUnknown = localTime(20, 11)

  const logs: Record<string, SessionEventFace[]> = {
    'session-one': [
      { type: 'session/title', data: { title: '旧标题' } },
      { type: 'request/header', data: { header: { config: { provider: 'deepseek', model: 'deepseek-v4-pro' } } } },
      {
        type: 'assistant/message',
        time: yesterday,
        data: { usage: { inputTokens: 1_000, outputTokens: 200, cacheReadTokens: 500, reasoningTokens: 50 } },
      },
      { type: 'request/header', data: { header: { config: { provider: 'deepseek', model: 'deepseek-v4-flash' } } } },
      {
        type: 'assistant/message',
        time: todayFlash,
        data: { usage: { inputTokens: 2_000, outputTokens: 400, cacheReadTokens: 1_000, reasoningTokens: 100 } },
      },
      { type: 'session/title', data: { title: '最终标题' } },
    ],
    'session-two': [
      {
        type: 'assistant/message',
        time: todayUnknown,
        data: { usage: { inputTokens: 10, outputTokens: 5 } },
      },
      { type: 'assistant/message', data: { usage: { inputTokens: 99_999 } } },
    ],
  }

  const reads: string[] = []
  const persistence: SessionPersistenceFace = {
    list: async () => [
      { id: 'session-one' },
      { sessionId: 'session-two' },
      { id: 'broken' },
      { id: '' },
    ],
    readFrom: async (id, fromSeq) => {
      assert.equal(fromSeq, 0)
      reads.push(id)
      if (id === 'broken') throw new Error('corrupt log')
      return { events: logs[id] }
    },
  }

  const response = await fetchUsage(persistence, now)
  assert.equal(response.ok, true)
  assert.ok(response.data)
  const data = response.data

  assert.deepEqual(reads, ['session-one', 'session-two', 'broken'])
  assert.deepEqual({
    input: data.totals.input,
    output: data.totals.output,
    cache: data.totals.cache,
    reasoning: data.totals.reasoning,
    total: data.totals.total,
    calls: data.totals.calls,
  }, {
    input: 3_010,
    output: 605,
    cache: 1_500,
    reasoning: 150,
    total: 5_115,
    calls: 3,
  })

  const proCost = costOf(yesterday, 'deepseek-v4-pro', 1_000, 500, 200)
  const flashCost = costOf(todayFlash, 'deepseek-v4-flash', 2_000, 1_000, 400)
  const unknownCost = costOf(todayUnknown, '', 10, 0, 5)
  closeTo(data.totals.cost, proCost + flashCost + unknownCost)
  closeTo(data.totals.cacheSavings,
    cacheSavingOf(yesterday, 'deepseek-v4-pro', 500)
      + cacheSavingOf(todayFlash, 'deepseek-v4-flash', 1_000))

  assert.equal(data.daily.length, 30)
  assert.equal(data.hourly.length, 24)
  assert.equal(data.heatmap.length, 364)
  const today = data.daily.find(point => point.date === dayKey(now))
  const previous = data.daily.find(point => point.date === dayKey(yesterday))
  assert.deepEqual(today && {
    input: today.input,
    output: today.output,
    cache: today.cache,
    total: today.total,
    calls: today.calls,
  }, { input: 2_010, output: 405, cache: 1_000, total: 3_415, calls: 2 })
  assert.deepEqual(previous && {
    input: previous.input,
    output: previous.output,
    cache: previous.cache,
    total: previous.total,
    calls: previous.calls,
  }, { input: 1_000, output: 200, cache: 500, total: 1_700, calls: 1 })
  assert.deepEqual({
    today: data.summary.today.total,
    yesterday: data.summary.yesterday.total,
    month: data.summary.month.total,
    lastMonthToDate: data.summary.lastMonthToDate.total,
  }, { today: 3_415, yesterday: 1_700, month: 5_115, lastMonthToDate: 0 })

  const models = new Map(data.models.map(model => [`${model.provider}/${model.model}`, model]))
  assert.equal(models.size, 3)
  assert.deepEqual(models.get('deepseek/deepseek-v4-pro') && {
    total: models.get('deepseek/deepseek-v4-pro')?.total,
    calls: models.get('deepseek/deepseek-v4-pro')?.calls,
  }, { total: 1_700, calls: 1 })
  assert.deepEqual(models.get('deepseek/deepseek-v4-flash') && {
    total: models.get('deepseek/deepseek-v4-flash')?.total,
    calls: models.get('deepseek/deepseek-v4-flash')?.calls,
  }, { total: 3_400, calls: 1 })
  assert.equal(models.get('/')?.total, 15)

  assert.equal(data.sessionCount, 2)
  assert.equal(data.sessions.length, 2)
  assert.equal(data.sessions[0]?.id, 'session-one')
  assert.equal(data.sessions[0]?.title, '最终标题')
  assert.equal(data.sessions[1]?.title, '会话 session-')
  assert.deepEqual(data.coverage, {
    scope: 'local-dsh-session-logs',
    listedSessions: 3,
    scannedSessions: 2,
    usageRecords: 3,
    skippedRecords: 1,
    failedSessions: 1,
    earliestAt: yesterday,
    latestAt: todayFlash,
  })

  assert.equal(data.peakSplit.peak.calls + data.peakSplit.offPeak.calls, 3)
  closeTo(data.peakSplit.peakEraCost,
    costUnderPeakEra(yesterday, 'deepseek-v4-pro', 1_000, 500, 200)
      + costUnderPeakEra(todayFlash, 'deepseek-v4-flash', 2_000, 1_000, 400)
      + costUnderPeakEra(todayUnknown, '', 10, 0, 5))
  closeTo(data.peakSplit.offPeakEraCost,
    costUnderPeakEra(yesterday, 'deepseek-v4-pro', 1_000, 500, 200, true)
      + costUnderPeakEra(todayFlash, 'deepseek-v4-flash', 2_000, 1_000, 400, true)
      + costUnderPeakEra(todayUnknown, '', 10, 0, 5, true))
  assert.equal(data.pricing.splitActive, false)
})

test('usage replay builds consistent 7, 30, 90, and 365 day windows', async () => {
  const now = localTime(20, 16)
  const daysAgo = (days: number): number => new Date(2026, 6, 20 - days, 12, 0, 0).getTime()
  const events: SessionEventFace[] = [
    { type: 'request/header', data: { header: { config: { provider: 'deepseek', model: 'deepseek-v4-pro' } } } },
    ...[0, 10, 100, 400].map(days => ({
      type: 'assistant/message',
      time: daysAgo(days),
      data: { usage: { inputTokens: 100, outputTokens: 20, cacheReadTokens: 50 } },
    } satisfies SessionEventFace)),
  ]
  const persistence: SessionPersistenceFace = {
    list: async () => [{ id: 'windowed-session' }],
    readFrom: async () => ({ events }),
  }

  const response = await fetchUsage(persistence, now)
  assert.equal(response.ok, true)
  assert.ok(response.data)
  const windows = new Map(response.data.windows.map(window => [window.days, window]))
  const periods = [7, 30, 90, 365] as const
  assert.deepEqual([...windows.keys()], [7, 30, 90, 365])
  assert.deepEqual(periods.map(days => windows.get(days)?.daily.length), [7, 30, 90, 365])
  assert.deepEqual(periods.map(days => windows.get(days)?.totals.calls), [1, 2, 2, 3])
  assert.deepEqual(periods.map(days => windows.get(days)?.models[0]?.calls), [1, 2, 2, 3])
  assert.deepEqual(periods.map(days => windows.get(days)?.sessions[0]?.calls), [1, 2, 2, 3])
  assert.deepEqual(periods.map(days => windows.get(days)?.sessionCount), [1, 1, 1, 1])
  assert.equal(response.data.totals.calls, 4)
  assert.equal(response.data.anomalies.length, 0)
})

test('usage replay flags a cost spike and attributes its top model and session', async () => {
  const now = localTime(20, 16)
  const baselineEvents: SessionEventFace[] = [
    { type: 'session/title', data: { title: '日常会话' } },
    { type: 'request/header', data: { header: { config: { provider: 'deepseek', model: 'deepseek-v4-pro' } } } },
    ...[17, 18].flatMap(day => Array.from({ length: 5 }, (_, index) => ({
      type: 'assistant/message',
      time: localTime(day, 10) + index * 1_000,
      data: { usage: { inputTokens: 200_000 } },
    } satisfies SessionEventFace))),
    { type: 'assistant/message', time: localTime(19, 10), data: { usage: { inputTokens: 1_000_000 } } },
  ]
  const spikeEvents: SessionEventFace[] = [
    { type: 'session/title', data: { title: '批量 Flash 任务' } },
    { type: 'request/header', data: { header: { config: { provider: 'deepseek', model: 'deepseek-v4-flash' } } } },
    { type: 'assistant/message', time: localTime(19, 11), data: { usage: { inputTokens: 10_000_000 } } },
  ]
  const persistence: SessionPersistenceFace = {
    list: async () => [{ id: 'baseline' }, { id: 'spike' }],
    readFrom: async id => ({ events: id === 'baseline' ? baselineEvents : spikeEvents }),
  }

  const response = await fetchUsage(persistence, now)
  assert.equal(response.ok, true)
  assert.ok(response.data)
  assert.equal(response.data.anomalies.length, 1)
  const anomaly = response.data.anomalies[0]
  assert.equal(anomaly.date, dayKey(localTime(19, 10)))
  assert.equal(anomaly.baselineDays, 2)
  closeTo(anomaly.baselineCost, 3)
  closeTo(anomaly.cost, 13)
  closeTo(anomaly.multiple, 13 / 3)
  assert.equal(anomaly.model.model, 'deepseek-v4-flash')
  closeTo(anomaly.model.cost, 10)
  assert.equal(anomaly.session.id, 'spike')
  assert.equal(anomaly.session.title, '批量 Flash 任务')
  closeTo(anomaly.session.cost, 10)
})

test('usage replay reports unavailable services and list failures', async () => {
  assert.deepEqual(await fetchUsage(undefined), {
    ok: false,
    error: '会话持久化服务不可用',
  })

  const persistence: SessionPersistenceFace = {
    list: async () => { throw new Error('disk offline') },
    readFrom: async () => ({ events: [] }),
  }
  assert.deepEqual(await fetchUsage(persistence), {
    ok: false,
    error: '读取会话列表失败：disk offline',
  })
})

test('balance fetch resolves credentials and maps the DeepSeek response', async t => {
  const originalFetch = globalThis.fetch
  t.after(() => { globalThis.fetch = originalFetch })

  globalThis.fetch = (async (input, init) => {
    assert.equal(String(input), 'https://api.deepseek.com/user/balance')
    assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer test-key')
    assert.ok(init?.signal instanceof AbortSignal)
    return new Response(JSON.stringify({
      is_available: true,
      balance_infos: [{
        currency: 'CNY',
        total_balance: '42.50',
        granted_balance: '2.50',
        topped_up_balance: '40.00',
      }],
    }), { status: 200 })
  }) as typeof fetch

  const credentials: CredentialsFace = {
    resolve: async ref => {
      assert.equal(ref, 'DEEPSEEK_API_KEY')
      return { value: 'test-key', source: 'test' }
    },
  }
  assert.deepEqual(await fetchBalance(credentials), {
    ok: true,
    data: {
      isAvailable: true,
      balances: [{
        currency: 'CNY',
        total: '42.50',
        granted: '2.50',
        toppedUp: '40.00',
      }],
    },
  })
})

test('balance fetch returns actionable errors without calling an absent credential', async () => {
  assert.deepEqual(await fetchBalance(undefined), {
    ok: false,
    error: '凭证服务不可用',
  })
  assert.deepEqual(await fetchBalance({ resolve: async () => undefined }), {
    ok: false,
    error: '未配置 DEEPSEEK_API_KEY（可在「设置 → 模型」中填写）',
  })
  assert.deepEqual(await fetchBalance({ resolve: async () => { throw new Error('locked') } }), {
    ok: false,
    error: '读取 API Key 失败：locked',
  })
})

test('balance fetch handles HTTP and malformed-JSON failures', async t => {
  const originalFetch = globalThis.fetch
  t.after(() => { globalThis.fetch = originalFetch })
  const credentials: CredentialsFace = {
    resolve: async () => ({ value: 'test-key', source: 'test' }),
  }

  globalThis.fetch = (async () => new Response('unavailable', { status: 503 })) as typeof fetch
  assert.deepEqual(await fetchBalance(credentials), {
    ok: false,
    error: '余额接口返回错误（HTTP 503）',
  })

  globalThis.fetch = (async () => new Response('{', { status: 200 })) as typeof fetch
  assert.deepEqual(await fetchBalance(credentials), {
    ok: false,
    error: '解析余额响应失败',
  })
})
