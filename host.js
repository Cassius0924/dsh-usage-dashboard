// dsh-usage-dashboard — Host half (function body for `cordis_define`'s `code.host`).
//
// Provides two Package-private RPC handlers consumed by the Client half:
//   - `deepseek-balance` : current account balance from DeepSeek's `/user/balance`.
//   - `deepseek-usage`   : aggregated token usage (and estimated cost) folded from
//                          DSH session logs (`assistant/message` events).
return {
  apply(ctx) {
    const shell = ctx.get('shell')
    const credentials = ctx.get('credentials')
    if (shell === undefined || credentials === undefined) return
    const sandboxPolicy = ctx.get('sandboxPolicy')
    const sessionPersistence = ctx.get('sessionPersistence')

    const pad2 = function (n) { return (n < 10 ? '0' : '') + n }

    // deepseek-v4-pro pricing, CNY per 1M tokens (pre-2026-08-17 flat pricing).
    // 2026-08-17 onward DeepSeek switches to peak/off-peak pricing; adjust here
    // if you want per-hour accuracy.
    const PRICE_INPUT_PER_M = 3      // input, cache miss
    const PRICE_CACHE_PER_M = 0.025  // input, cache hit
    const PRICE_OUTPUT_PER_M = 6     // output (includes reasoning tokens)
    const costOf = function (input, cache, output) {
      return (input * PRICE_INPUT_PER_M + cache * PRICE_CACHE_PER_M + output * PRICE_OUTPUT_PER_M) / 1000000
    }

    harness.handle('deepseek-balance', async () => {
      let cred
      try {
        cred = await credentials.resolve('DEEPSEEK_API_KEY')
      } catch (err) {
        return { ok: false, error: '读取 API Key 失败：' + String((err && err.message) || err) }
      }
      if (cred === undefined || cred.value === undefined || cred.value === '') {
        return { ok: false, error: '未配置 DEEPSEEK_API_KEY（可在「设置 → 模型」中填写）' }
      }
      let result
      try {
        const policy = (sandboxPolicy !== undefined)
          ? sandboxPolicy.resolve({ mode: 'danger-full-access' })
          : { mode: 'danger-full-access', workspaceRoot: '/' }
        const spec = shell.resolve({
          command: 'curl -sS --max-time 20 "https://api.deepseek.com/user/balance" -H "Authorization: Bearer $QUOTA_API_KEY"',
          env: { QUOTA_API_KEY: cred.value },
          timeoutMs: 30000,
          stdoutMaxBytes: 8192,
          sandboxPolicy: policy,
        })
        result = await shell.run(spec)
      } catch (err) {
        return { ok: false, error: '请求余额接口失败：' + String((err && err.message) || err) }
      }
      if (result.timedOut) return { ok: false, error: '查询余额超时' }
      if (result.exitCode !== 0) {
        return { ok: false, error: '余额接口返回错误（exit ' + result.exitCode + '）', detail: (result.stderr && result.stderr.text) || '' }
      }
      let parsed
      try { parsed = JSON.parse(result.stdout.text) } catch (err) {
        return { ok: false, error: '解析余额响应失败', detail: result.stdout.text }
      }
      const infos = (parsed && Array.isArray(parsed.balance_infos)) ? parsed.balance_infos : []
      return {
        ok: true,
        data: {
          isAvailable: parsed.is_available === true,
          balances: infos.map(function (b) {
            return { currency: b.currency, total: b.total_balance, granted: b.granted_balance, toppedUp: b.topped_up_balance }
          }),
        },
      }
    })

    harness.handle('deepseek-usage', async () => {
      if (sessionPersistence === undefined) return { ok: false, error: '会话持久化服务不可用' }
      let headers
      try { headers = await sessionPersistence.list() } catch (err) {
        return { ok: false, error: '读取会话列表失败：' + String((err && err.message) || err) }
      }
      const dayMap = {}
      const hourMap = {}
      const overall = { input: 0, output: 0, cache: 0, reasoning: 0, total: 0, cost: 0, calls: 0 }
      const bucket = function (map, key) {
        let b = map[key]
        if (b === undefined) b = map[key] = { input: 0, output: 0, cache: 0, total: 0, cost: 0, calls: 0 }
        return b
      }
      const list = Array.isArray(headers) ? headers : []
      for (const h of list) {
        const sid = h && (h.id || h.sessionId)
        if (!sid) continue
        let events
        try {
          const read = await sessionPersistence.readFrom(sid, 0)
          events = read && read.events
        } catch (err) { continue }
        if (!Array.isArray(events)) continue
        for (const ev of events) {
          if (!ev || ev.type !== 'assistant/message') continue
          const usage = ev.data && ev.data.usage
          if (!usage) continue
          const input = Number(usage.inputTokens) || 0
          const output = Number(usage.outputTokens) || 0
          const cache = Number(usage.cacheReadTokens) || 0
          const reasoning = Number(usage.reasoningTokens) || 0
          // `reasoningTokens` is a subset of `outputTokens`; do not double-count it.
          const total = input + output + cache
          const cost = costOf(input, cache, output)
          const d = new Date(ev.time)
          const dayKey = d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
          const hourKey = String(d.getHours())
          const db = bucket(dayMap, dayKey)
          db.input += input; db.output += output; db.cache += cache; db.total += total; db.cost += cost; db.calls += 1
          const hb = bucket(hourMap, hourKey)
          hb.input += input; hb.output += output; hb.cache += cache; hb.total += total; hb.cost += cost; hb.calls += 1
          overall.input += input; overall.output += output; overall.cache += cache; overall.reasoning += reasoning; overall.total += total; overall.cost += cost; overall.calls += 1
        }
      }
      const daily = []
      for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000)
        const key = d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
        const b = dayMap[key] || { input: 0, output: 0, cache: 0, total: 0, cost: 0, calls: 0 }
        daily.push({ date: key, input: b.input, output: b.output, cache: b.cache, total: b.total, cost: b.cost, calls: b.calls })
      }
      const hourly = []
      for (let i = 0; i < 24; i++) {
        const b = hourMap[String(i)] || { total: 0, cost: 0, calls: 0 }
        hourly.push({ hour: i, total: b.total, cost: b.cost, calls: b.calls })
      }
      const heatmap = []
      for (let i = 83; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000)
        const key = d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
        const b = dayMap[key] || { total: 0, cost: 0, calls: 0 }
        heatmap.push({ date: key, total: b.total, cost: b.cost, calls: b.calls })
      }
      return { ok: true, data: { daily: daily, hourly: hourly, heatmap: heatmap, totals: overall } }
    })
  },
}
