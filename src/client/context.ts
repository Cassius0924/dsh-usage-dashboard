/** Structural faces the client half reads from the Cordis context. */
import type { Context } from '@deepseek-ai/cordis'

export interface SlotOptions {
  name: string
  id?: string
  order?: number
  label?: string | (() => string)
}

export interface SlotsFace {
  inject(key: string, callback: () => unknown): unknown
  register(options: SlotOptions, component: unknown): unknown
}

/** The client context this plugin's apply() receives. */
export interface ClientContext extends Context {
  slots: SlotsFace
}
