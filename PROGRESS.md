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
- （轮次 2）`fix(dashboard)`: 加载/空/错误/刷新失败四态分离。
  证据：playwright 注入 3s 延迟 + 500 失败，实测 加载中 skeletons=43 / emptyStrings=0；
  加载完 skeletons=0；刷新中按钮 disabled=true 文案「刷新中」；
  刷新失败提示「用量刷新失败，正在展示缓存用量（HTTP 500）」且用量数据仍在。

- （轮次 3）`feat(dashboard)`: 今日 / 本月 / 累计 消耗概览卡（host 端新增 summary 聚合）。
  证据：重启 dsh 后 curl 校验 summary 与 daily 自洽（今日 4.4416 = 08-15；本月 15.1879 = 三天之和）；
  截图确认三列一行、今日「↓52% 较昨日」、上月无数据显示「无对比」；控制台 0 错误。

## 遗留问题

- P0 flash 模型按 pro 价计费，费用估算偏高。
- P0 2026-08-17 峰谷定价未适配。

## 下轮计划

轮次 4：按模型分别计价 + 2026-08-17 峰谷定价适配（两个 P0，费用估算的可信度问题）。
