import { createContext, useContext, type ReactElement, type ReactNode } from 'react'
import { zh, type LocaleKey } from './locales.ts'

/**
 * Locales this plugin ships copy for: DSH's two built-in locales — Simplified
 * Chinese (`zh`, the host's own id) and English (`en`). The plugin keeps the
 * host's language catalog untouched on purpose: language selection stays a DSH
 * setting, and contributing a plugin-private third language would leave the
 * host UI and this dashboard speaking different languages, because no other
 * package ships a dictionary for it.
 */
export type LocaleId = 'zh' | 'en'

/**
 * BCP 47 tags handed to `Intl` for date and number formatting. These are a
 * different vocabulary from {@link LocaleId}: the DSH id also addresses
 * dictionaries and the persisted language preference, while `Intl` wants a tag
 * with settled regional conventions. `zh` maps to `zh-CN`, matching the host's
 * internal document tag for its Simplified dictionary.
 */
const INTL_LOCALES: Record<LocaleId, string> = {
  zh: 'zh-CN',
  en: 'en-US',
}

/**
 * Resolve the `Intl` tag for a plugin locale.
 * @param locale - active plugin locale.
 * @returns the BCP 47 tag to pass to `Intl.*` / `toLocaleString`.
 */
export function intlLocale(locale: LocaleId): string {
  return INTL_LOCALES[locale]
}

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

/**
 * Read the translate function plus the concrete locale it is bound to. The
 * identity rides the dictionary itself (`meta.locale`), because slot components
 * receive only the `t` seat, not the host's locale snapshot; every dictionary
 * stores its own id there, so a language switch moves both together.
 * @returns the active `t` and the plugin locale it resolves to.
 */
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
  if (message === '账号余额接口不可用，且未配置 DEEPSEEK_API_KEY') return t('error.accountBalanceUnavailable')
  if (message === '解析余额响应失败') return t('error.balanceParse')
  if (message === '会话持久化服务不可用') return t('error.persistenceUnavailable')
  if (message === '缺少会话 id') return t('error.missingSessionId')
  const mappings: Array<[RegExp, LocaleKey, string]> = [
    [/^读取 API Key 失败：(.*)$/, 'error.credentialRead', 'detail'],
    [/^请求余额接口失败：(.*)$/, 'error.balanceRequest', 'detail'],
    [/^余额接口返回错误（HTTP (\d+)）$/, 'error.balanceHttp', 'status'],
    [/^读取会话列表失败：(.*)$/, 'error.sessionList', 'detail'],
    [/^读取会话日志失败：(.*)$/, 'error.sessionLogRead', 'detail'],
  ]
  for (const [pattern, key, field] of mappings) {
    const match = message.match(pattern)
    if (match !== null) return t(key, { [field]: match[1] })
  }
  return message
}
