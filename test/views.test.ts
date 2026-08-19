import assert from 'node:assert/strict'
import test from 'node:test'
import { conversationViewsSource, type ConversationViewSlotEntry } from '../src/client/views.ts'

test('conversation view source preserves the live slot order and resolves labels safely', () => {
  let entries: ConversationViewSlotEntry[] = [
    { options: { id: 'chat', label: 'Chat' } },
    { options: { id: 'trajectory', label: () => '轨迹' } },
    { options: { id: 'plugin-view' } },
    { options: { label: 'missing id' } },
  ]
  let listener: (() => void) | undefined
  const source = conversationViewsSource({
    entries: name => name === 'conversation.view' ? entries : [],
    subscribe: (_name, fn) => {
      listener = fn
      return () => { listener = undefined }
    },
  })

  assert.deepEqual(source.list(), [
    { id: 'chat', label: 'Chat' },
    { id: 'trajectory', label: '轨迹' },
    { id: 'plugin-view', label: 'plugin-view' },
  ])

  let notified = 0
  const unsubscribe = source.subscribe(() => { notified += 1 })
  entries = [...entries, { options: { id: 'late-plugin', label: 'Late' } }]
  listener?.()
  assert.equal(notified, 1)
  assert.equal(source.list().at(-1)?.id, 'late-plugin')
  unsubscribe()
  assert.equal(listener, undefined)
})
