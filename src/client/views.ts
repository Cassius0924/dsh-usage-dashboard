/** Live projection of the host's `conversation.view` slot ledger. */

export interface ConversationViewTab {
  id: string
  label: string
}

export interface ConversationViewsSource {
  list(): ConversationViewTab[]
  subscribe(fn: () => void): () => void
}

export interface ConversationViewSlotEntry {
  options: {
    id?: string
    label?: string | (() => string)
  }
}

export interface ConversationViewSlots {
  entries(name: string): ConversationViewSlotEntry[]
  subscribe(name: string, fn: () => void): () => void
}

const labelOf = (entry: ConversationViewSlotEntry): string => {
  const { id = '', label } = entry.options
  try {
    const resolved = typeof label === 'function' ? label() : label
    return typeof resolved === 'string' && resolved !== '' ? resolved : id
  } catch {
    return id
  }
}

/** Build a source once at plugin apply-time. The ledger owns ordering, so the
 * same index also maps to the host's rendered tab buttons without relying on
 * hashed class names or translated labels. */
export function conversationViewsSource(slots: ConversationViewSlots): ConversationViewsSource {
  return {
    list: () => slots.entries('conversation.view')
      .flatMap(entry => entry.options.id === undefined
        ? []
        : [{ id: entry.options.id, label: labelOf(entry) }]),
    subscribe: fn => slots.subscribe('conversation.view', fn),
  }
}
