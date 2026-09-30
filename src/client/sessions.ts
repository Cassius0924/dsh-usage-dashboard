/**
 * Structural face of the host's session-list state, and the one selector this
 * plugin needs from it.
 *
 * The hosts this plugin runs on speak two dialects. 0.1.5-era hosts kept a
 * flat `current` field; 0.1.6+ removed it and mark the open session through
 * `byId[*].retainedBy.mainView` — the same signal the host's own document
 * title and sidebar selection read. Both fields stay optional so neither
 * generation fails, and consumers keep working across a host upgrade without
 * a plugin re-release.
 */

/** One session row; only the fields the selector reads. */
export interface SessionSummaryFace {
  id?: string
  retainedBy?: { mainView?: number }
}

export interface SessionListStateFace {
  byId?: Readonly<Record<string, SessionSummaryFace | undefined>>
  /** 0.1.5-era hosts: the flat current-session field. */
  current?: string
}

/** The session currently shown in the main panel, if any. */
export function currentSessionIdOf(state: SessionListStateFace): string | undefined {
  const retained = Object.values(state.byId ?? {})
    .find(row => (row?.retainedBy?.mainView ?? 0) > 0)
  return retained?.id ?? state.current
}
