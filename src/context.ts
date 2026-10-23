/**
 * Structural service faces this plugin reads from the host Cordis context.
 * They are deliberately minimal: the plugin only touches the methods it
 * needs, so no extra `@deepseek-ai/dsh-*` type packages are required to
 * build it.
 */
import type { Context } from '@deepseek-ai/cordis'
import type { IncomingMessage, ServerResponse } from 'node:http'

/** One HTTP route served by the host web server. */
export interface WebRoute {
  kind: 'exact' | 'prefix'
  path: string
  handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>
}

/** Structural face of the host `webServer` service. */
export interface WebServerFace {
  register(route: WebRoute): () => void
}

/** Structural face of the `credentials` service. */
export interface CredentialsFace {
  resolve(ref: string): Promise<{ value: string; source: string } | undefined>
}

/** One Platform wallet as returned by `deepseekAccount.getBalance`. */
export interface AccountWalletFace {
  currency?: string
  balance?: string
}

/** Balance outcome of `deepseekAccount.getBalance`: `ready` carries the
 *  recharge (`value`) and granted (`bonusWallets`) wallets, `failed` means the
 *  Platform query was rejected, `null` (the whole result) means signed out. */
export interface AccountBalanceFace {
  status?: string
  value?: readonly AccountWalletFace[]
  bonusWallets?: readonly AccountWalletFace[]
}

/** Identity the account service turns into Platform request headers. */
export interface AccountClientFace {
  version: string
  locale: string
  timezoneOffsetSeconds: number
}

/** Structural face of the host `deepseekAccount` service. Optional: hosts
 *  that only do API-key auth never mount the account plugin. */
export interface DeepSeekAccountFace {
  getBalance(client: AccountClientFace): Promise<AccountBalanceFace | null>
}

/** Structural face of the `sessionPersistence` service. */
export interface SessionHeaderFace {
  id?: string
  sessionId?: string
  /** Handle-era `list()` returns snapshots; the header (and its id) rides
   *  one level deeper at `snapshot.header.id` instead of at the entry top. */
  header?: SessionHeaderFace
}

export interface TokenUsageFace {
  inputTokens?: number
  outputTokens?: number
  cacheReadTokens?: number
  reasoningTokens?: number
}

/** Structural face of an `image` content block's attachment ref — only the
 *  fields the image-cost fold reads. Width/height drive the official token
 *  estimate; bytes is reported raw. */
export interface ImageAttachmentFace {
  width?: number
  height?: number
  bytes?: number
  name?: string
  mediaType?: string
}

/** Structural face of one content block, recursive to cover image blocks
 *  nested inside tool-result blocks (tool screenshots). */
export interface ContentBlockFace {
  type?: string
  text?: string
  attachment?: ImageAttachmentFace
  toolCallId?: string
  content?: ContentBlockFace[]
}

export interface SessionEventFace {
  type?: string
  time?: number
  data?: {
    usage?: TokenUsageFace
    header?: { config?: { provider?: string; model?: string } }
    /** Stable turn/step identity and the finalized message id carried by
     * modern `assistant/message` events. Optional for legacy logs. */
    turn?: number
    step?: number
    message?: { id?: string; content?: ContentBlockFace[] }
    /** Payload of a `session/title` event. */
    title?: string
    /** Payload of a `user/message` event: the user message record itself,
     *  whose content blocks may carry `image` blocks. */
    content?: ContentBlockFace[]
  }
}

/** One open read channel onto a session log (`SessionPersistence.open`). */
export interface SessionHandleFace {
  read(offset?: number, length?: number): Promise<{ events?: readonly SessionEventFace[] }>
  close(): Promise<void>
}

export interface SessionPersistenceFace {
  list(): Promise<SessionHeaderFace[]>
  /** Legacy hosts: whole-log read from a seq. Removed in handle-era DSH. */
  readFrom?(id: string, fromSeq: number): Promise<{ events?: SessionEventFace[] }>
  /** Handle-era hosts: per-session read handle, preferred when present. */
  open?(id: string, access: 'read'): Promise<SessionHandleFace>
}

/** The host context this plugin's apply() receives. */
export interface HostContext extends Context {
  webServer: WebServerFace
  credentials: CredentialsFace
  sessionPersistence: SessionPersistenceFace
  /** Present only when the host mounts DSH's DeepSeek account plugin. Read it
   *  through `ctx.get()` so API-key-only deployments keep loading. */
  deepseekAccount?: DeepSeekAccountFace
}
