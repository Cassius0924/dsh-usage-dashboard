import assert from 'node:assert/strict'
import test from 'node:test'
import { fmtCompact } from '../src/client/charts.tsx'
import { intlLocale, localizeApiError, type Translate } from '../src/client/i18n.tsx'
import { en, zh } from '../src/client/locales.ts'

/** Build a Translate for any dictionary, so expectations never hardcode copy. */
const translateWith = (dictionary: Record<string, string>): Translate => (key, params) => {
  const template = dictionary[key] ?? key
  if (params === undefined) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) => name in params ? String(params[name]) : match)
}

const englishT = translateWith(en)
const chineseT = translateWith(zh)

const placeholders = (value: string): string[] => [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort()

test('Chinese and English dictionaries have exactly the same keys', () => {
  assert.deepEqual(Object.keys(en).sort(), Object.keys(zh).sort())
})

test('English dictionary contains no untranslated Chinese UI copy', () => {
  const untranslated = Object.entries(en).filter(([, value]) => /[\u3400-\u9fff]/.test(value))
  assert.deepEqual(untranslated, [])
})

test('both dictionaries expose locale identity and interpolate the chart tooltip', () => {
  assert.equal(zh['meta.locale'], 'zh')
  assert.equal(en['meta.locale'], 'en')
  assert.equal(zh['chart.tooltip'].replace('{head}', '08-15').replace('{tokens}', '10').replace('{cost}', '1.00').replace('{calls}', '2 次调用'), '08-15 · 10 tokens · ¥1.00 · 2 次调用')
  assert.equal(en['chart.tooltip'].replace('{head}', '08-15').replace('{tokens}', '10').replace('{cost}', '1.00').replace('{calls}', '2 calls'), '08-15 · 10 tokens · ¥1.00 · 2 calls')
  assert.equal(chineseT('common.calls', { count: 3 }), '3 次调用')
  assert.equal(englishT('common.calls', { count: 3 }), '3 calls')
})

test('both dictionaries are non-empty for every key', () => {
  for (const [id, dictionary] of [['zh', zh], ['en', en]] as const) {
    const empty = Object.entries(dictionary).filter(([, value]) => value.length === 0).map(([key]) => key)
    assert.deepEqual(empty, [], id)
  }
})

test('every bilingual entry uses the same placeholder set', () => {
  for (const key of Object.keys(zh) as Array<keyof typeof zh>) {
    assert.deepEqual(placeholders(en[key]), placeholders(zh[key]), key)
  }
})

test('intlLocale maps every plugin locale to its BCP 47 Intl tag', () => {
  assert.equal(intlLocale('zh'), 'zh-CN')
  assert.equal(intlLocale('en'), 'en-US')
})

test('compact numbers use 万/亿 for Chinese and compact notation for English', () => {
  assert.equal(fmtCompact(160_000_000, 'zh'), '1.6亿')
  assert.equal(fmtCompact(23_480_000, 'zh'), '2348.0万')
  assert.equal(fmtCompact(160_000_000, 'en'), '160M')
  assert.equal(fmtCompact(23_480_000, 'en'), '23.5M')
})

test('Chinese mode localizes host errors through the dictionary', () => {
  const balanceHttp = localizeApiError('余额接口返回错误（HTTP 401）', chineseT, 'error.query')
  assert.equal(balanceHttp, zh['error.balanceHttp'].replace('{status}', '401'))
  assert.equal(localizeApiError('缺少会话 id', chineseT, 'error.query'), zh['error.missingSessionId'])
  assert.equal(localizeApiError(undefined, chineseT, 'error.query'), zh['error.query'])
  assert.equal(localizeApiError('未知错误', chineseT, 'error.query'), '未知错误')
})

test('English mode localizes host errors and compact numbers', () => {
  assert.equal(localizeApiError('余额接口返回错误（HTTP 401）', englishT, 'error.query'), 'Balance endpoint returned HTTP 401')
  assert.equal(localizeApiError('会话持久化服务不可用', englishT, 'error.query'), 'Session persistence is unavailable')
})
