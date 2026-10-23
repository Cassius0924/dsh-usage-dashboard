/** Where the top-up shortcuts send the user, on both surfaces that offer one. */
export const TOP_UP_URL = 'https://platform.deepseek.com/top_up'

/** Balance (in the account's own currency) below which the shortcut is
 *  offered regardless of the configurable warning line: that line can be
 *  lowered or switched off (0), but a balance this close to zero still deserves
 *  a one-click way out. */
const TOP_UP_FLOOR = 10

/**
 * Whether the balance is low enough to offer the top-up shortcut.
 *
 * Two independent conditions, OR-ed on purpose: the fixed floor keeps the
 * shortcut available when warnings are disabled or set lower than 10, while a
 * raised warning line lets an early warning also carry the shortcut.
 * @param balance - account balance in its own currency; NaN/Infinity never qualifies.
 * @param warningLine - configured balance warning line; 0 disables that half.
 * @returns true when the 去充值 shortcut should be shown.
 */
export function needsTopUp(balance: number, warningLine: number): boolean {
  if (!Number.isFinite(balance)) return false
  return balance < TOP_UP_FLOOR || (warningLine > 0 && balance < warningLine)
}
