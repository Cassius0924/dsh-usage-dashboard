import { createContext, useContext, type ReactElement, type ReactNode } from 'react'
import { zh, type LocaleKey } from './locales.ts'

export type LocaleId = 'zh' | 'en'
export type Translate = (key: LocaleKey, params?: Record<string, unknown>) => string

export const fallbackT: Translate = (key, params) => {
  const template = zh[key]
  if (params === undefined) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match)
}

const TranslationContext = createContext<Translate>(fallbackT)

export function LocaleProvider(props: { t: Translate; children: ReactNode }): ReactElement {
  return <TranslationContext.Provider value={props.t}>{props.children}</TranslationContext.Provider>
}

export function useI18n(): { t: Translate; locale: LocaleId } {
  const t = useContext(TranslationContext)
  return { t, locale: t('meta.locale') === 'en' ? 'en' : 'zh' }
}

/** Translate host error copy that predates stable machine-readable error codes. */
export function localizeApiError(message: string | undefined, t: Translate, fallback: LocaleKey): string {
  if (message === undefined || message === '') return t(fallback)
  if (message === '凭证服务不可用') return t('error.credentialsUnavailable')
  if (message === '查询失败') return t('error.query')
  if (message === '余额加载失败') return t('error.balanceLoad')
  if (message === '用量加载失败') return t('error.usageLoad')
  if (message === '未配置 DEEPSEEK_API_KEY（可在「设置 → 模型」中填写）') return t('error.noApiKey')
  if (message === '解析余额响应失败') return t('error.balanceParse')
  if (message === '会话持久化服务不可用') return t('error.persistenceUnavailable')
  const mappings: Array<[RegExp, LocaleKey, string]> = [
    [/^读取 API Key 失败：(.*)$/, 'error.credentialRead', 'detail'],
    [/^请求余额接口失败：(.*)$/, 'error.balanceRequest', 'detail'],
    [/^余额接口返回错误（HTTP (\d+)）$/, 'error.balanceHttp', 'status'],
    [/^读取会话列表失败：(.*)$/, 'error.sessionList', 'detail'],
  ]
  for (const [pattern, key, field] of mappings) {
    const match = message.match(pattern)
    if (match !== null) return t(key, { [field]: match[1] })
  }
  return message
}
