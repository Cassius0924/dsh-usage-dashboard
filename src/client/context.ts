/** Structural faces the client half reads from the Cordis context. */
import type { Context } from '@deepseek-ai/cordis'
import type { Translate } from './i18n.tsx'
import type { ConversationViewSlotEntry } from './views.ts'

export interface SlotOptions {
  name: string
  id?: string
  order?: number
  label?: string | (() => string)
  locale?: string
}

export interface SlotsFace {
  inject(key: string, callback: () => unknown): unknown
  register(options: SlotOptions, component: unknown): unknown
  entries(name: string): ConversationViewSlotEntry[]
  subscribe(name: string, fn: () => void): () => void
}

export interface LocaleFace {
  register(namespace: string, dictionaries: { zh: Record<string, string>; en: Record<string, string> }): () => void
  bind(namespace: string): Translate
}

/** The client context this plugin's apply() receives. */
export interface ClientContext extends Context {
  slots: SlotsFace
  locale: LocaleFace
}
