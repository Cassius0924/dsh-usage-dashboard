/** Structural faces the client half reads from the Cordis context. */
import type { Context } from '@deepseek-ai/cordis'
import type { Translate } from './i18n.tsx'
import type { ConversationViewSlotEntry } from './views.ts'

export interface SlotOptions {
  name: string
  id?: string
  /** Keyed slots (the global `main` panel roster) are addressed by `key`. */
  key?: string
  order?: number
  priority?: number
  label?: string | (() => string)
  locale?: string
}

export interface SlotsFace {
  inject(key: string, callback: () => unknown): () => void
  register(options: SlotOptions, component: unknown): () => void
  entries(name: string): ConversationViewSlotEntry[]
  subscribe(name: string, fn: () => void): () => void
}

/** The layout controller's main-panel navigation (global panels such as
 *  「插件」/「自动化任务」 and the account-wide 额度 panel). */
export interface LayoutFace {
  panelInfo: {
    getSnapshot(): { activePanelId: string | null }
    subscribe(fn: () => void): () => void
  }
  selectPanel(panelId: string | null): void
}

export interface LocaleFace {
  register(namespace: string, dictionaries: { zh: Record<string, string>; en: Record<string, string> }): () => void
  bind(namespace: string): Translate
}

/** The client context this plugin's apply() receives. */
export interface ClientContext extends Context {
  slots: SlotsFace
  locale: LocaleFace
  layout: LayoutFace
}
