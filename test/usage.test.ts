import assert from 'node:assert/strict'
import test from 'node:test'
import type { CredentialsFace, SessionEventFace, SessionPersistenceFace } from '../src/context.ts'
import { isValidSessionId } from '../src/contract.ts'
import { cacheSavingOf, costOf, costUnderPeakEra } from '../src/pricing.ts'
import { fetchBalance, fetchSessionUsage, fetchUsage } from '../src/usage.ts'

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

test('session usage folds one session into per-model totals with a first/last active range', async () => {
  const first = localTime(20, 9)
  const last = localTime(20, 15)
  const events: SessionEventFace[] = [
    { type: 'session/title', data: { title: '会话标题' } },
    { type: 'request/header', data: { header: { config: { provider: 'deepseek', model: 'deepseek-v4-pro' } } } },
    {
      type: 'assistant/message',
      time: first,
      data: {
        turn: 1,
        step: 1,
        message: { id: 'message-tool-step' },
        usage: { inputTokens: 1_000, outputTokens: 200, cacheReadTokens: 500 },
      },
    },
    { type: 'request/header', data: { header: { config: { provider: 'deepseek', model: 'deepseek-v4-flash' } } } },
    {
      type: 'assistant/message',
      time: last,
      data: {
        turn: 1,
        step: 2,
        message: { id: 'message-final' },
        usage: { inputTokens: 4_000, outputTokens: 800, cacheReadTokens: 2_000 },
      },
    },
  ]
  const persistence: SessionPersistenceFace = {
    list: async () => { throw new Error('fetchSessionUsage must not call list()') },
    readFrom: async (id, fromSeq) => {
      assert.equal(id, 'session-a')
      assert.equal(fromSeq, 0)
      return { events }
    },
  }

  const response = await fetchSessionUsage(persistence, 'session-a')
  assert.equal(response.ok, true)
  assert.ok(response.data)
  const data = response.data

  assert.equal(data.sessionId, 'session-a')
  assert.equal(data.title, '会话标题')
  assert.equal(data.calls, 2)
  assert.equal(data.firstActive, first)
  assert.equal(data.lastActive, last)

  const proCost = costOf(first, 'deepseek-v4-pro', 1_000, 500, 200)
  const flashCost = costOf(last, 'deepseek-v4-flash', 4_000, 2_000, 800)
  closeTo(data.cost, proCost + flashCost)
  assert.equal(data.total, 1_700 + 6_800)
  assert.equal(data.turns.length, 1)
  assert.equal(data.turns[0]?.messageId, 'message-final')
  assert.equal(data.turns[0]?.calls, 2)
  assert.equal(data.turns[0]?.total, 1_700 + 6_800)
  closeTo(data.turns[0]?.cost ?? 0, proCost + flashCost)

  // Most expensive model first — flash's larger token volume outcosts pro here.
  assert.equal(data.models.length, 2)
  assert.equal(data.models[0]?.model, 'deepseek-v4-flash')
  assert.equal(data.models[0]?.provider, 'deepseek')
  assert.equal(data.models[0]?.calls, 1)
  assert.deepEqual({ input: data.models[0]?.input, output: data.models[0]?.output, cache: data.models[0]?.cache, total: data.models[0]?.total }, {
    input: 4_000, output: 800, cache: 2_000, total: 6_800,
  })
  closeTo(data.models[0]?.cost ?? 0, flashCost)
  assert.equal(data.models[1]?.model, 'deepseek-v4-pro')
  closeTo(data.models[1]?.cost ?? 0, proCost)
})

test('session usage reports a clean empty result for a session with no usage yet, without touching list()', async () => {
  const persistence: SessionPersistenceFace = {
    list: async () => { throw new Error('fetchSessionUsage must not call list()') },
    readFrom: async () => ({ events: [{ type: 'session/title', data: { title: '空会话' } }] }),
  }
  const response = await fetchSessionUsage(persistence, 'empty-session')
  assert.deepEqual(response, {
    ok: true,
    data: {
      sessionId: 'empty-session',
      title: '空会话',
      total: 0,
      cost: 0,
      calls: 0,
      firstActive: null,
      lastActive: null,
      models: [],
      turns: [],
    },
  })
})

test('session usage falls back to a short id title when the session never logged one', async () => {
  const persistence: SessionPersistenceFace = {
    list: async () => [],
    readFrom: async () => ({ events: [] }),
  }
  const response = await fetchSessionUsage(persistence, 'abcdefgh-1234')
  assert.ok(response.ok)
  assert.equal(response.data?.title, '会话 abcdefgh')
})

test('session usage reports actionable errors for bad input and broken reads, without throwing', async () => {
  assert.deepEqual(await fetchSessionUsage(undefined, 'session-a'), {
    ok: false,
    error: '会话持久化服务不可用',
  })

  const persistence: SessionPersistenceFace = {
    list: async () => [],
    readFrom: async () => { throw new Error('disk offline') },
  }
  assert.deepEqual(await fetchSessionUsage(persistence, 'session-a'), {
    ok: false,
    error: '读取会话日志失败：disk offline',
  })
  assert.deepEqual(await fetchSessionUsage(persistence, ''), {
    ok: false,
    error: '缺少会话 id',
  })
})

test('isValidSessionId whitelists a safe charset and rejects path-traversal-shaped input', () => {
  // Real-world / test-fixture shapes seen in this codebase all pass.
  for (const ok of [
    'session-484a1c14-c6fe-4d6a-abfd-a2d8d2f664d5',
    'session-one',
    'abcdefgh-1234',
    'windowed-session',
    'a',
    '0123456789',
    '_-_-_',
  ]) {
    assert.equal(isValidSessionId(ok), true, ok)
  }

  // Path separators, `..`, null bytes, and anything outside the safe
  // charset must all be rejected — this is what stands between a
  // browser-controlled `?id=` and `persistence.readFrom`.
  for (const bad of [
    '',
    '../../etc/passwd',
    '..',
    'foo/bar',
    'foo\\bar',
    '/etc/passwd',
    'a\0b',
    'session id',
    'session/../../secret',
    'a'.repeat(129),
    'sessión',
    'a\nb',
    '%2e%2e%2f',
  ]) {
    assert.equal(isValidSessionId(bad), false, bad)
  }
})

test('session usage rejects a malformed session id without touching persistence', async () => {
  const persistence: SessionPersistenceFace = {
    list: async () => { throw new Error('fetchSessionUsage must not call list()') },
    readFrom: async () => { throw new Error('fetchSessionUsage must not read a malformed id') },
  }
  assert.deepEqual(await fetchSessionUsage(persistence, '../../etc/passwd'), {
    ok: false,
    error: '会话 id 格式不合法',
  })
  assert.deepEqual(await fetchSessionUsage(persistence, 'foo/bar'), {
    ok: false,
    error: '会话 id 格式不合法',
  })
})
