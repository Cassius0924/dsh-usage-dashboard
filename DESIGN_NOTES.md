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
- 同一张卡片内的一组同类对比指标不重复套浅底圆角小卡；用留白与 1px 分隔线表达比较关系，窄屏把垂直分隔
  转成水平分隔，减少“卡片套卡片”的视觉噪音。

## 交互约定

- 慢接口（usage ~4.8s）必须区分三态：**加载中用骨架**、**空数据用空态文案**、**刷新失败保留旧数据 + 提示**。
  绝不用空态文案冒充加载态。
- 悬浮窗：拖动中关闭 transition（`.dsh-quota-dragging{transition:none}`），松手再吸附时开启，
  缓动统一 `cubic-bezier(.22,1,.36,1)`，时长 `.28s`。
- 系统设置 `prefers-reduced-motion: reduce` 时，插件两个根节点内的动画、过渡与平滑滚动全部关闭；规则放在
  样式表末尾并限定作用域，既避免被后续声明覆盖，也不影响 DSH 宿主界面。
- 用户设置类状态（悬浮窗显示/位置/收起、阈值、预算）一律持久化到 localStorage，
  key 统一前缀 `dsh-usage-dashboard:`，并带 `:v<N>` 版本后缀便于演进。
- 悬浮窗只用 `position:absolute` 挂在 `[data-shell-overlay]` 上，拖动边界排除侧边栏与会话头部。
- 弹出式菜单打开后聚焦首个选项；Escape 关闭并回焦触发按钮；触发按钮始终同步 `aria-expanded`，
  菜单内选择后不强制关闭，便于多选连续操作。
- 解释型明细不能只靠 hover；优先使用原生 `details / summary`，同时保留桌面 hover 预览，并确保点击、触屏、
  Enter / Space 与 `:focus-visible` 都能完成同一任务。
- 统计周期属于用量卡、模型排行、会话排行三块共享上下文；控件放在用量卡头部，两个排行标题必须重复当前周期，
  避免用户滚动后失去口径。365 天逐日图允许卡片内部横向滚动，但页面本身不能横向溢出，初始位置对齐最新日期。
- 图表指标控件紧邻模型过滤与逐天 / 逐小时切换；选中态沿用同一分段控件语言。柱高和峰值单位跟随指标，
  但 tooltip 不裁掉其他指标，保证每个数据点仍可解释。
- 图表使用 roving tabindex：每张图只有最近有数据的数据点进入页面 Tab 序列，方向键在点间移动，Home / End 到首尾；
  热力图左右按周、上下按日。焦点、tooltip 与 `aria-label` 必须同步，底部点位滚入固定输入框上方的安全区。
- 触屏没有 hover：图表数据点改为点按固定 tooltip（再点同点或图表外区域关闭），不再靠 `pointermove` 触发；
  用位移 + 耗时阈值区分点按与滚动/拖动，不调用 `preventDefault`，让横向/纵向滚动保持原生。固定态与键盘
  roving 焦点态各自独立又共享同一 tooltip 展示逻辑，判定逻辑集中在 `chart-focus.ts` 的纯函数里，不另起
  并行状态机。
- 不基于本机短周期会话日志显示“异常消耗”告警或风险色：数据覆盖不完整且使用波动天然很大，
  任何弱基线都会产生误导。趋势与原始指标可以如实呈现，但不替用户下风险结论。
- i18n 使用 DSH 原生 `locale` 服务与全局「Settings → Language」设置，不在插件里重复造语言开关；
  slot 注册声明 namespace，tab / overlay 从宿主接收响应式 `t`，内部组件统一从翻译上下文取词。
  新增用户可见文案必须进入中英文同键词典，词典测试校验键、占位符与英文残留。

## 计价

- 费用是**估算**，UI 必须让用户看得到「按什么价算的」。
- 价目表按 model 名匹配，未知模型回退到 pro 价并在说明里标注。
- 2026-08-17 起 DeepSeek 峰谷定价：按事件本地时间判定时段，生效日之前的事件仍用旧价。
