/**
 * Durable breaker settings.
 *
 * The file lives at `$DSH_HOME/storages/dsh-usage-dashboard/breaker.json`
 * (`DSH_HOME` defaults to `~/.dsh`, the same root DSH uses for its own
 * storages) and records the master switch plus the sessions that opted in:
 * `{ "enabled": true, "sessions": ["session-…"] }`. Writes go through a temp
 * file + rename so a crash mid-write can never leave a truncated JSON document
 * behind; a corrupt or unreadable file falls back to the default ("on, with no
 * session opted in") with a warning rather than leaving the feature in an
 * unknown state.
 */
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { BREAKER_DEFAULT_SETTINGS, type BreakerSettings } from './contract.ts'
import { normalizeBreakerSettings } from './breaker.ts'

const PLUGIN_LABEL = 'dsh-usage-dashboard'

/** Path below the DSH home; kept as path segments so Windows joins correctly. */
const STORAGE_RELATIVE_PATH = join('storages', 'dsh-usage-dashboard', 'breaker.json')

/**
 * Resolve the settings file path from the environment. The env parameter is
 * injectable so tests can exercise the `DSH_HOME` branch without touching the
 * process environment.
 * @param env - environment to read `DSH_HOME` from; defaults to `process.env`.
 */
export function breakerSettingsPath(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.DSH_HOME?.trim()
  const home = configured !== undefined && configured !== '' ? configured : join(homedir(), '.dsh')
  return join(home, STORAGE_RELATIVE_PATH)
}

/** Shared IO options; the defaults are what the running plugin uses. */
export interface BreakerSettingsIoOptions {
  /** Explicit file path, bypassing {@link breakerSettingsPath}. */
  filePath?: string
  /** Warning sink, so tests can capture instead of printing. */
  warn?: (message: string) => void
}

const errorText = (error: unknown): string => (error instanceof Error ? error.message : String(error))

const defaultWarn = (message: string): void => {
  console.warn(message)
}

/**
 * Settings from a parsed document, or `undefined` when the document is not
 * shaped like settings at all. Non-string session entries are dropped — a
 * stale client or a hand-edited file must not take the whole setting down —
 * and the rest is deduplicated, validated and sorted by
 * `normalizeBreakerSettings`. A document from before the master switch existed
 * has no `enabled` field and reads as enabled: that is the value the feature
 * already ran with.
 */
function settingsOf(raw: unknown): BreakerSettings | undefined {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return undefined
  const candidate = raw as { enabled?: unknown; sessions?: unknown }
  if (!Array.isArray(candidate.sessions)) return undefined
  if (candidate.enabled !== undefined && typeof candidate.enabled !== 'boolean') return undefined
  const ids = candidate.sessions.filter((entry): entry is string => typeof entry === 'string')
  return normalizeBreakerSettings({
    enabled: candidate.enabled ?? true,
    sessions: ids,
  })
}

/**
 * Read persisted settings. A missing file is the first-run case and returns
 * the defaults silently; unreadable, malformed, or structurally invalid
 * content warns and returns the defaults.
 */
export async function loadBreakerSettings(options: BreakerSettingsIoOptions = {}): Promise<BreakerSettings> {
  const filePath = options.filePath ?? breakerSettingsPath()
  const warn = options.warn ?? defaultWarn
  let text: string
  try {
    text = await readFile(filePath, 'utf8')
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code !== 'ENOENT') {
      warn(`[${PLUGIN_LABEL}] 读取高峰暂停设置失败，按默认值处理：${errorText(error)}`)
    }
    return { ...BREAKER_DEFAULT_SETTINGS }
  }
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch (error) {
    warn(`[${PLUGIN_LABEL}] 高峰暂停设置不是合法 JSON，按默认值处理：${errorText(error)}`)
    return { ...BREAKER_DEFAULT_SETTINGS }
  }
  const settings = settingsOf(raw)
  if (settings === undefined) {
    warn(`[${PLUGIN_LABEL}] 高峰暂停设置结构不合法，按默认值处理`)
    return { ...BREAKER_DEFAULT_SETTINGS }
  }
  return settings
}

/**
 * Persist settings atomically. The temp file is created beside the target and
 * renamed over it, so readers only ever see a complete document.
 * @param settings - master switch and session opt-ins; normalized before writing.
 * @param options - explicit path, if any.
 */
export async function saveBreakerSettings(
  settings: BreakerSettings,
  options: Pick<BreakerSettingsIoOptions, 'filePath'> = {},
): Promise<void> {
  const filePath = options.filePath ?? breakerSettingsPath()
  const normalized = normalizeBreakerSettings(settings)
  await mkdir(dirname(filePath), { recursive: true })
  const tempPath = `${filePath}.${process.pid}.${Date.now().toString(36)}.tmp`
  try {
    await writeFile(tempPath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8')
    await rename(tempPath, filePath)
  } catch (error) {
    await rm(tempPath, { force: true }).catch(() => {})
    throw error
  }
}
