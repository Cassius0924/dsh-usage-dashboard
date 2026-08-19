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

/** Structural face of the `sessionPersistence` service. */
export interface SessionHeaderFace {
  id?: string
  sessionId?: string
}

export interface TokenUsageFace {
  inputTokens?: number
  outputTokens?: number
  cacheReadTokens?: number
  reasoningTokens?: number
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
    message?: { id?: string }
    /** Payload of a `session/title` event. */
    title?: string
  }
}

export interface SessionPersistenceFace {
  list(): Promise<SessionHeaderFace[]>
  readFrom(id: string, fromSeq: number): Promise<{ events?: SessionEventFace[] }>
}

/** The host context this plugin's apply() receives. */
export interface HostContext extends Context {
  webServer: WebServerFace
  credentials: CredentialsFace
  sessionPersistence: SessionPersistenceFace
}
