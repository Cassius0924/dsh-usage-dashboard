import assert from 'node:assert/strict'
import test from 'node:test'
import { currentSessionIdOf } from '../src/client/sessions.ts'

test('current session id follows mainView retention, with the legacy flat field as fallback', () => {
  // 0.1.6+ shape: the main panel's retained row is the open session.
  assert.equal(currentSessionIdOf({
    byId: {
      a: { id: 'a', retainedBy: { mainView: 0 } },
      b: { id: 'b', retainedBy: { mainView: 1 } },
    },
  }), 'b')
  // No retained row → no open session.
  assert.equal(currentSessionIdOf({ byId: { a: { id: 'a', retainedBy: {} } } }), undefined)
  // 0.1.5-era shape: rows carry no retention counts, the flat field decides.
  assert.equal(currentSessionIdOf({ byId: { a: { id: 'a' } }, current: 'a' }), 'a')
  assert.equal(currentSessionIdOf({}), undefined)
})
