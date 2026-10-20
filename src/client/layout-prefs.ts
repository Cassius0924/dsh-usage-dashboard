/**
 * Layout preferences shared by the dashboard's Settings section and the
 * client registration half (`./index.tsx`).
 *
 * These two sides must agree on two placement choices, and neither may import
 * the other (the registration half mounts the dashboard, so the reverse import
 * would be a cycle). Keeping the stores in their own module lets both read and
 * write the same persisted values.
 */
import { createStore, type Store } from './store.ts'

/** The global panel id shared by the `main` slot entry and the sidebar entry
 *  that selects it. Stable: it is only ever compared within this package. */
export const QUOTA_PANEL_ID = 'quota'

/** Where the optional「额度」shortcut, if enabled, lives in the sidebar. */
export type SidebarEntryPlacement = 'off' | 'top' | 'bottom'

const isPlacement = (value: unknown): value is SidebarEntryPlacement =>
  value === 'off' || value === 'top' || value === 'bottom'

/**
 * `off` keeps the host's sidebar untouched (the default, so updating the
 * plugin never silently adds chrome). `top` joins the global-panel icon row;
 * `bottom` sits beside Settings in the sidebar foot.
 */
export const sidebarEntryStore: Store<SidebarEntryPlacement> =
  createStore<SidebarEntryPlacement>('layout.sidebarEntry', isPlacement, 'off')

const isTabIndex = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 50

/**
 * Position of the「额度」tab among the registered conversation views, as an
 * index in the live tab roster (0 = first). The registration half maps it onto
 * a slot `order` relative to the neighbouring entries, so it survives host
 * plugins arriving with their own orders. Default 2 reproduces the historical
 * fixed position: 对话, 轨迹, 额度.
 */
export const quotaTabIndexStore: Store<number> =
  createStore<number>('layout.tabIndex', isTabIndex, 2)

/** One `conversation.view` slot entry, as far as ordering needs to see it. */
export interface ViewOrderEntry {
  options: { id?: string; order?: number }
}

/**
 * Clamp a persisted roster index into `[0, count]`; `count` itself is the
 * legal "end of the list" insertion position when there are `count` tabs.
 */
export function clampTabIndex(index: number, count: number): number {
  return Math.max(0, Math.min(index, Math.max(count, 0)))
}

/**
 * Turn a 0-based roster position into the `order` for our own view entry.
 *
 * The host sorts list entries by `order` (ties keep registration order), so
 * the placement is expressed relative to the live neighbours rather than as an
 * absolute number: the first/last positions step outside the current range,
 * and an interior position lands between the two adjacent orders (including
 * the degenerate equal-order case). Other entries are never touched.
 * @param entries - live `conversation.view` entries.
 * @param index - desired 0-based position in the roster *including* our tab.
 * @param selfId - this plugin's entry id (excluded from the anchor list).
 * @param fallback - order used while the host has no other view registered.
 * @returns the slot `order` for our registration.
 */
export function viewOrderForIndex(
  entries: readonly ViewOrderEntry[],
  index: number,
  selfId = 'balance',
  fallback = 20,
): number {
  const others = entries.filter(entry => entry.options.id !== selfId)
  if (others.length === 0) return fallback
  const clamped = clampTabIndex(index, others.length)
  // The host sorts an omitted `order` as 0, so mirror that effective value
  // instead of inventing a per-position default.
  const orderAt = (position: number): number => others[position]?.options.order ?? 0
  if (clamped === 0) return orderAt(0) - 10
  if (clamped === others.length) return orderAt(others.length - 1) + 10
  const previous = orderAt(clamped - 1)
  const next = orderAt(clamped)
  return previous >= next ? previous + 0.5 : (previous + next) / 2
}
