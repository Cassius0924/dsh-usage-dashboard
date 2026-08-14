# PROGRESS

## 当前阶段

模式 B 迭代中。目标：持续长功能 + 打磨已有功能。轮次上限 15。

## 假设（用户未指定方向时的合理假设）

- 迭代方向 = 「加新功能为主，顺手打磨」，优先做 TODO.md 里 P0。
- 「与 DSH 风格一致」= 走 `--dsw-alias-*` CSS 变量；本机实测 GUI 是**浅色**主题。
- 费用估算的准确性算产品功能问题（不是代码质量问题），可以改 `src/usage.ts`。

## 基线（轮次 0，2026-08-15）

- 建立了真实验证链路：playwright 登录 → 打开会话 → 点「额度」tab → 全页截图 + 控制台捕获。
- 构建门修复：`pnpm run build` / `typecheck` 原本因 pnpm 11 的 `ERR_PNPM_IGNORED_BUILDS` 直接失败（exit 1）。
- 实测数据：累计 164.7M tokens / ¥15.19 / 641 次调用 / 2 个模型（v4-pro、v4-flash），仅 3 天有数据。

## 已完成

- （轮次 0）`fix(build)`: pnpm-workspace.yaml allowBuilds，恢复 build/typecheck 硬门。
- （轮次 1）`feat(widget)`: 悬浮窗状态持久化 + 吸附边界修复。
  证据：playwright 实测 拖到左上→收起→硬刷新，位置 (296, 92) 与收起态完全保持；
  关掉开关再刷新 widget 不再出现；控制台 0 错误。
  同轮修掉 P0：刷新后 widget 盖住 Chat/Trajectory/额度 tab 栏（顶部边界退化成 0）。

## 遗留问题

- P0 用量卡在 usage 接口加载的 ~4.8s 内显示「暂无用量数据」，把加载态误报成空态。
- P0 flash 模型按 pro 价计费，费用估算偏高。
- P0 2026-08-17 峰谷定价未适配。
- P1 无「今日 / 本月」时间维度，只有累计数字。

## 下轮计划

轮次 1：悬浮窗状态持久化（visible / corner / collapsed → localStorage），消灭 README 已知限制第 1 条。
