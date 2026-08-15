# DESIGN NOTES — 设计决策与约定

## 视觉语言

- **一切颜色走 DSH 的 CSS 变量**，第二参数是回退值：`var(--dsw-alias-label-primary, #1f2328)`。
  本机 GUI 是浅色主题，插件不得硬编码深色底，也不得引入自己的主题色系。
- 常用变量：`--dsw-alias-bg-layer-1/2`、`--dsw-alias-bg-overlay`、`--dsw-alias-border-l1/l2`、
  `--dsw-alias-label-primary/secondary/tertiary`、`--dsw-alias-state-business-primary`（主色/链接）、
  `--dsw-alias-state-success-primary`、`--dsw-alias-state-error-primary`。
- 卡片：`border-radius:12px`，1px 边框，`padding:16px`；卡片标题 12px / 600 / 次级色。
- 数字一律 `font-variant-numeric: tabular-nums`，避免刷新时抖动。
- 类名前缀：悬浮窗 `dsh-quota-*`，仪表盘 `dq-*`。全部样式集中在 `src/client/styles.ts` 一张表里。

## 信息层级（仪表盘）

1. 余额（最大号数字，24px 级）
2. 今日 / 本月消耗（用户第二关心）
3. 累计用量统计 + 图表
4. 官方链接、开关等配置项沉底

- 数据完整性属于用量图表的审计信息，放在图表底部的轻量 disclosure 中；折叠态就要看见扫描规模与状态，
  展开后再呈现失败 / 跳过明细和本机日志口径，避免再增加一张同权重卡片抢占首屏。

## 交互约定

- 慢接口（usage ~4.8s）必须区分三态：**加载中用骨架**、**空数据用空态文案**、**刷新失败保留旧数据 + 提示**。
  绝不用空态文案冒充加载态。
- 悬浮窗：拖动中关闭 transition（`.dsh-quota-dragging{transition:none}`），松手再吸附时开启，
  缓动统一 `cubic-bezier(.22,1,.36,1)`，时长 `.28s`。
- 用户设置类状态（悬浮窗显示/位置/收起、阈值、预算）一律持久化到 localStorage，
  key 统一前缀 `dsh-usage-dashboard:`，并带 `:v<N>` 版本后缀便于演进。
- 悬浮窗只用 `position:absolute` 挂在 `[data-shell-overlay]` 上，拖动边界排除侧边栏与会话头部。
- 弹出式菜单打开后聚焦首个选项；Escape 关闭并回焦触发按钮；触发按钮始终同步 `aria-expanded`，
  菜单内选择后不强制关闭，便于多选连续操作。
- 统计周期属于用量卡、模型排行、会话排行三块共享上下文；控件放在用量卡头部，两个排行标题必须重复当前周期，
  避免用户滚动后失去口径。365 天逐日图允许卡片内部横向滚动，但页面本身不能横向溢出，初始位置对齐最新日期。
- 图表指标控件紧邻模型过滤与逐天 / 逐小时切换；选中态沿用同一分段控件语言。柱高和峰值单位跟随指标，
  但 tooltip 不裁掉其他指标，保证每个数据点仍可解释。
- 异常消耗提示放在用量汇总与图表控制之间，复用 DSH warning 状态色；只在服务端判定命中时出现，
  同时给异常日期柱体 / 标签加警示标记。提示必须解释基线和主要贡献，不能只显示“异常”而不给原因。
- i18n 完成后，新增用户可见文案必须通过统一词条函数获取；语言默认跟随宿主 / 浏览器，手动选择属于持久化偏好。

## 计价

- 费用是**估算**，UI 必须让用户看得到「按什么价算的」。
- 价目表按 model 名匹配，未知模型回退到 pro 价并在说明里标注。
- 2026-08-17 起 DeepSeek 峰谷定价：按事件本地时间判定时段，生效日之前的事件仍用旧价。
