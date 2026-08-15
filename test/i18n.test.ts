import assert from 'node:assert/strict'
import test from 'node:test'
import { fmtCompact } from '../src/client/charts.tsx'
import { localizeApiError, type Translate } from '../src/client/i18n.tsx'
import { en, zh } from '../src/client/locales.ts'

const englishT: Translate = (key, params) => {
  const template = en[key]
  if (params === undefined) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) => name in params ? String(params[name]) : match)
}

test('Chinese and English dictionaries have exactly the same keys', () => {
  assert.deepEqual(Object.keys(en).sort(), Object.keys(zh).sort())
})

test('English dictionary contains no untranslated Chinese UI copy', () => {
  const untranslated = Object.entries(en).filter(([, value]) => /[\u3400-\u9fff]/.test(value))
  assert.deepEqual(untranslated, [])
})

test('both dictionaries expose locale identity and interpolate the same placeholders', () => {
  assert.equal(zh['meta.locale'], 'zh')
  assert.equal(en['meta.locale'], 'en')
  assert.equal(zh['chart.tooltip'].replace('{head}', '08-15').replace('{tokens}', '10').replace('{cost}', '1.00').replace('{calls}', '2 次调用'), '08-15 · 10 tokens · ¥1.00 · 2 次调用')
  assert.equal(en['chart.tooltip'].replace('{head}', '08-15').replace('{tokens}', '10').replace('{cost}', '1.00').replace('{calls}', '2 calls'), '08-15 · 10 tokens · ¥1.00 · 2 calls')
})

test('every bilingual entry uses the same placeholder set', () => {
  const placeholders = (value: string): string[] => [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort()
  for (const key of Object.keys(zh) as Array<keyof typeof zh>) {
    assert.deepEqual(placeholders(en[key]), placeholders(zh[key]), key)
  }
})

test('English mode localizes host errors and compact numbers', () => {
  assert.equal(localizeApiError('余额接口返回错误（HTTP 401）', englishT, 'error.query'), 'Balance endpoint returned HTTP 401')
  assert.equal(localizeApiError('会话持久化服务不可用', englishT, 'error.query'), 'Session persistence is unavailable')
  assert.equal(fmtCompact(160_000_000, 'en'), '160M')
  assert.equal(fmtCompact(23_480_000, 'en'), '23.5M')
})
