/** Shared lookups into the DSH host shell DOM. Both the floating widget
 *  (keeping its drag bounds clear of the header/composer) and the dashboard
 *  (keeping its scroll content clear of the fixed composer on narrow
 *  viewports) need to find the same host elements — sharing the lookup here
 *  keeps the two readings of "where is the composer" from drifting apart.
 */

/** The shell's main column: the region between the sidebar and the details
 *  panel. Found through the stable `conversation` slot anchor rather than the
 *  hashed layout class names. */
export function getMainColumn(frame: HTMLElement): HTMLElement | null {
  const anchor = frame.querySelector('[data-slot="conversation"]')
  const column = anchor?.parentElement ?? null
  return column === frame ? null : column
}

/**
 * The laid-out element behind a slot. Slot wrappers are 0×0, and which
 * neighbour carries the real box differs per slot: the session header
 * renders inside its wrapper (`'child'`), while the composer's wrapper sits
 * inside the seat that reserves the space (`'ancestor'`). Picking the wrong
 * side silently yields a box in the wrong place, so the caller says which one
 * it means.
 */
function slotElement(frame: HTMLElement, slot: string, side: 'child' | 'ancestor'): HTMLElement | null {
  const anchor = frame.querySelector(`[data-slot="${slot}"]`)
  if (anchor === null) return null
  if (side === 'child') {
    const el = anchor.firstElementChild as HTMLElement | null
    return el !== null && el.getBoundingClientRect().height > 0 ? el : null
  }
  let el: HTMLElement | null = anchor.parentElement
  for (let depth = 0; depth < 4 && el !== null && el !== frame; depth++) {
    if (el.getBoundingClientRect().height > 0) return el
    el = el.parentElement
  }
  return null
}

/** The laid-out box behind a slot (see `slotElement`), or null if the slot is
 *  not currently present or not yet laid out. */
export function slotBox(frame: HTMLElement, slot: string, side: 'child' | 'ancestor'): DOMRect | null {
  return slotElement(frame, slot, side)?.getBoundingClientRect() ?? null
}

/** The DSH shell frame — the element that hosts the sidebar, conversation
 *  column and fixed composer — found by walking up from any node inside our
 *  own plugin root via the stable `[data-shell-overlay]` anchor. */
export function getShellFrame(node: HTMLElement | null): HTMLElement | null {
  const overlay = node !== null && typeof node.closest === 'function' ? node.closest('[data-shell-overlay]') : null
  return (overlay?.parentElement as HTMLElement | null) ?? null
}

/** The composer's laid-out element (the seat that reserves its space, not the
 *  0×0 slot wrapper), or null if the slot is not present in the current DOM
 *  (host markup changed, or mid-navigation). Callers that only need the box
 *  can call `.getBoundingClientRect()`; callers that want to observe size
 *  changes (e.g. `ResizeObserver`) need the element itself. */
export function getComposerElement(frame: HTMLElement | null): HTMLElement | null {
  if (frame === null) return null
  return slotElement(frame, 'conversation.composer.dock', 'ancestor')
}

/** Resolve the active `conversation.view` id from the host's semantic tablist.
 * The DOM intentionally carries no view id, but it renders buttons in the
 * exact order of the slot ledger. Indexing into that same live ledger avoids
 * translated-label matching and remains compatible with third-party tabs. */
export function getActiveConversationViewId(
  frame: HTMLElement | null,
  viewIds: string[],
): string | null {
  if (viewIds.length === 0) return null
  const header = frame === null ? null : slotElement(frame, 'conversation.session.header', 'child')
  const tablist = header?.querySelector('[role="tablist"]') ?? null
  if (tablist === null) return viewIds[0] ?? null
  const tabs = [...tablist.querySelectorAll('[role="tab"]')]
  const activeIndex = tabs.findIndex(tab => tab.getAttribute('aria-selected') === 'true')
  return activeIndex < 0 ? viewIds[0] ?? null : viewIds[activeIndex] ?? null
}
