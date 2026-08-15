import assert from 'node:assert/strict'
import type { IncomingHttpHeaders, IncomingMessage } from 'node:http'
import test from 'node:test'
import { isTrustedApiRequest } from '../src/trust-fence.ts'

const requestWith = (headers: IncomingHttpHeaders): IncomingMessage =>
  ({ headers }) as IncomingMessage

test('accepts loopback authorities with no browser Origin header', () => {
  for (const host of ['localhost:3080', '127.0.0.1:3080', '[::1]:3080']) {
    assert.equal(isTrustedApiRequest(requestWith({ host })), true, host)
  }
})

test('accepts same-authority browser requests', () => {
  assert.equal(isTrustedApiRequest(requestWith({
    host: 'localhost:3080',
    origin: 'http://localhost:3080',
    'sec-fetch-site': 'same-origin',
  })), true)
})

test('rejects missing, malformed, and non-loopback Host headers', () => {
  assert.equal(isTrustedApiRequest(requestWith({})), false)
  assert.equal(isTrustedApiRequest(requestWith({ host: '[::1' })), false)
  assert.equal(isTrustedApiRequest(requestWith({ host: 'example.com:3080' })), false)
  assert.equal(isTrustedApiRequest(requestWith({ host: 'localhost.example.com' })), false)
})

test('rejects cross-site metadata and a mismatched Origin', () => {
  assert.equal(isTrustedApiRequest(requestWith({
    host: 'localhost:3080',
    'sec-fetch-site': 'cross-site',
  })), false)
  assert.equal(isTrustedApiRequest(requestWith({
    host: 'localhost:3080',
    origin: 'http://127.0.0.1:3080',
  })), false)
  assert.equal(isTrustedApiRequest(requestWith({
    host: 'localhost:3080',
    origin: 'not a URL',
  })), false)
})
