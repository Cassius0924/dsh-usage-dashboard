import assert from 'node:assert/strict'
import test from 'node:test'
import { memoize } from '../src/memo.ts'

interface Result {
  ok: boolean
  value?: number
}

function deferred<T>(): {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (error: unknown) => void
} {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

test('successful values stay cached until the TTL boundary', async t => {
  const originalNow = Date.now
  let now = 1_000
  Date.now = () => now
  t.after(() => { Date.now = originalNow })

  let calls = 0
  const memo = memoize<Result>(100, async () => ({ ok: true, value: ++calls }))

  assert.deepEqual(await memo.get(), { ok: true, value: 1 })
  now = 1_099
  assert.deepEqual(await memo.get(), { ok: true, value: 1 })
  assert.equal(calls, 1)

  now = 1_100
  assert.deepEqual(await memo.get(), { ok: true, value: 2 })
  assert.equal(calls, 2)
})

test('failed results are never cached', async () => {
  let calls = 0
  const memo = memoize<Result>(1_000, async () => {
    calls += 1
    return calls === 1 ? { ok: false } : { ok: true, value: 2 }
  })

  assert.deepEqual(await memo.get(), { ok: false })
  assert.deepEqual(await memo.get(), { ok: true, value: 2 })
  assert.equal(calls, 2)
})

test('concurrent get and refresh calls share one computation', async () => {
  const gate = deferred<Result>()
  let calls = 0
  const memo = memoize<Result>(1_000, () => {
    calls += 1
    return gate.promise
  })

  const first = memo.get()
  assert.strictEqual(memo.get(), first)
  assert.strictEqual(memo.refresh(), first)
  assert.equal(calls, 1)

  gate.resolve({ ok: true, value: 7 })
  assert.deepEqual(await first, { ok: true, value: 7 })
})

test('a rejected computation clears the in-flight state for retry', async () => {
  let calls = 0
  const memo = memoize<Result>(1_000, async () => {
    calls += 1
    if (calls === 1) throw new Error('temporary failure')
    return { ok: true, value: 2 }
  })

  await assert.rejects(memo.get(), /temporary failure/)
  assert.deepEqual(await memo.get(), { ok: true, value: 2 })
  assert.equal(calls, 2)
})

test('refresh replaces a still-fresh cached value', async () => {
  let calls = 0
  const memo = memoize<Result>(60_000, async () => ({ ok: true, value: ++calls }))

  assert.deepEqual(await memo.get(), { ok: true, value: 1 })
  assert.deepEqual(await memo.refresh(), { ok: true, value: 2 })
  assert.deepEqual(await memo.get(), { ok: true, value: 2 })
})
