# PROGRESS

## 当前阶段

用户要求继续迭代，轮次上限重置。当前状态：持续加功能并重新做真实界面审计。
Judge 评分：交互 9.5 / 样式 9.0 / 功能 9.6。缺陷层面 P0、P1 已清空；剩余 P1 是 TODO 中尚未实现的候选功能。

## 假设（用户未指定方向时的合理假设）

- 迭代方向 = 「加新功能为主，顺手打磨」，优先做 TODO.md 里 P0。
- 「与 DSH 风格一致」= 走 `--dsw-alias-*` CSS 变量；本机实测 GUI 是**浅色**主题。
- 费用估算的准确性算产品功能问题（不是代码质量问题），可以改 `src/usage.ts`。
- 每个 commit 后立即部署：client-only 重新 build/typecheck 并硬刷新实测；host 改动还要重启 dsh、确认 active 与接口。

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

- （轮次 4）`feat(pricing)`: 按模型 + 峰谷分段计价，并把价目表暴露到 UI。
  证据：8/8 峰谷边界用例通过（08:59 非峰 / 09:00 峰 / 12:00 非峰 / 14:00 峰 / 18:00 非峰）；
  切换时刻 = 2026-08-16T16:00Z = 北京 08-17 00:00；重启后 curl 实测 flash ¥1.0279 → ¥0.4756，
  Σ各模型 = 总计（差 <1e-6）；截图确认「计价说明」在旧价与峰谷两种形态下都正确，Enter 键可展开。

- （轮次 5）`feat(dashboard)`: 模型成本排行榜 + 统一模型配色。
  证据：实测排行 pro ¥14.16 / 96.8%、flash ¥0.48 / 3.2%，与接口逐项一致；
  排行、选择器、图例三处 swatch 颜色程序化比对完全相同（pro rgb(65,118,230)、flash rgb(45,164,78)）；控制台 0 错误。

- （轮次 6）`feat(dashboard)`: 缓存命中与节省卡。
  证据：实测命中率 98.57%、已节省 ¥458.15（实付 ¥14.64，31 倍杠杆）；
  手算校验 150M×(3−0.025)/M + 11.4M×(1−0.02)/M ≈ ¥457，与接口一致；控制台 0 错误。

- （轮次 7）`feat(dashboard)`: 余额可用天数预估。
  证据：手算 近 7 天日均 ¥2.0908、46.40/2.0908 = 22.2 天；界面显示「22 天」，
  tooltip「按近 7 天日均 ¥2.09 估算（含无用量的日子；今天尚未过完）」；控制台 0 错误。

- （轮次 8）`feat(widget)`: 悬浮窗今日消耗行。
  证据：冷启（清空 localStorage 后刷新）widget 只显示余额且 usage 请求数 = 0（无后台聚合开销）；
  点 ↻ 后请求数 = 1 并显示「今日消耗 ¥3.92」（与仪表盘一致）；再次刷新页面 今日仍在且新增请求 = 0；控制台 0 错误。

- （轮次 9）`feat(charts)`: 热力图补星期/月份坐标与色阶图例。
  证据：实测月份标签 5月|6月|7月|8月、星期标签 一|三|五、图例 少…多、12 列；
  `.dq-balance` scrollWidth 未超出 clientWidth（无横向溢出）；控制台 0 错误。

- （轮次 10）`feat(charts)`: 自定义图表 tooltip + hover 反馈。
  证据：实测 250ms 内出现「2026-08-15 | 43,559,157 tokens | ¥3.92 | 236 次调用」；
  指针离开即消失；热力图 tooltip「2026-08-14 | 106,731,038 tokens | ¥9.21 | 300 次调用」；
  最左侧柱子的 tooltip 仍完整落在图表框内（边缘收拢生效）；控制台 0 错误。

- （轮次 11）`feat(dashboard)`: 余额低预警（阈值可配，双通道）。
  证据：默认阈值 10 时余额 46.40 不告警（banner=0、widget warn=0）；改成 100 后
  banner「余额 46.40 CNY 已低于预警线 100.00，按近期用量估计还能撑 22 天。去充值」
  且悬浮窗圆点与余额同时转警示色；刷新后阈值与警示状态都保持；填 0 两侧告警同时消失；控制台 0 错误。

- （轮次 12）`feat(dashboard)`: 高峰/闲时分布与新价影响预估。
  证据：分项自洽（89+552=641 次 = totals.calls；分项费用和 = totals.cost 到小数点后 4 位）；
  实测高峰占 5.7%，同样用量新价 ¥45.84（现价 ¥14.64，+213%），全挪闲时 ¥41.95；
  截图确认卡片渲染与文案随生效日切换；控制台 0 错误。

- （轮次 13）`style(ui)`: 打磨轮。
  证据：卡片顺序实测 账户余额→消耗概览→DSH 用量→高峰闲时→缓存→模型排行→官方平台→设置；
  柱状图出现「峰值 1.1亿 tokens」；悬浮窗收起态宽度 285 → 270（≤ max-width）；
  键盘 Tab 遍历 10 个可聚焦元素全部拿到 2px 焦点环，顺序合理；控制台 0 错误。

- （轮次 14）`fix(widget)` + `docs`: 悬浮窗停在右下角时压住输入框右端（模型选择/发送按钮）——
  边界下沿改为排除 composer。证据：修前 `overlaps=true` 且输入框右侧控件 `BLOCKED by widget`；
  修后 `overlaps=false`、`reachable`。同轮更新 README 功能清单与 screenshot.png。

## 已完成（续）

- （轮次 24）`feat(charts)`: 图表指标切换。
  - Review / Critique：P1 只看 tokens 会把高缓存、低单价用量误判成高成本；P2 费用 / 调用虽在 tooltip 里却无法作主视觉比较；
    P2 周期偏好已持久化而图表指标没有。功能扫描选择脑暴 #5 的指标切换。
  - Act：新增 tokens / 费用 / 调用三档分段控件与持久化 store；逐天、逐小时、分模型柱图共同取所选指标，
    标题和峰值分别使用 tokens / CNY / 次数单位，tooltip 始终保留四项完整上下文；窄屏控制区自动换行。
  - Verify：32/32 单测（含指标取值 / 偏好校验）、build、typecheck 全过；Playwright 实测同一 8 月 15 日
    tokens / 费用 / 调用柱高分别 49 / 51 / 94px，峰值分别 `1.1亿 tokens` / `¥9.21` / `300 次`，
    tooltip 三档均为 `43,559,157 tokens / ¥3.92 / 236 次调用`；费用逐小时 24 根、峰值 `¥4.83`；
    选择费用后硬刷新仍保持，620px document 无横向溢出，console error 0、pageerror 0。
    截图：`/tmp/dsh-dashboard-audit/metric-cost.png`。
  - Impeccable audit：无新增确定性问题；仅保留既有 4 处 `transition: width` P3 警告。

- （轮次 23）`feat(dashboard)`: 可切换统计周期。
  - Review / Critique：P1 逐日图固定 30 天而小时图 / 排行是全量口径，同屏数字不可比；P1 没有短期排查与长期复盘切换；
    P2 统计周期不持久化，且 365 根柱直接压进 814px 会不可读。功能缺口扫描选择 backlog 中的周期切换。
  - Act：host 一次日志回放产出 7 / 30 / 90 / 365 天四套 daily、hourly、totals、models、sessions 一致聚合；
    前端分段控件持久化选择并联动四项 tokens 汇总、逐天 / 逐小时图、模型与会话排行。年度逐日图设最小宽度、
    横向滚动并自动定位最新日期；导出明确不受屏幕周期影响，旧缓存结构自动失效。
  - Verify：30/30 单测（含 0 / 10 / 100 / 400 天事件边界）、build、typecheck 全过；重启服务后 active，
    登录 API 200，四窗 daily 长度分别 7 / 30 / 90 / 365、hourly 均 24，模型调用和窗口 totals 逐档一致。
    Playwright 实测四档按钮分别渲染 7 / 30 / 90 / 365 根柱，汇总与两个排行标题同步；365 天滚动区
    `scrollWidth=1848 > clientWidth=826` 且 `scrollLeft=1022` 自动位于最新端；选择 90 天硬刷新后仍保持；
    30 天小时图 24 根柱，窄屏 document 无横向溢出，最终 console error 0、pageerror 0。
    截图：`/tmp/dsh-dashboard-audit/window-year.png`。
  - Impeccable audit：仍为 18/20；无新增确定性问题，只有既有 4 处 `transition: width` P3 警告。

- （轮次 22）`fix(dashboard)`: 模型筛选键盘闭环。
  - Review / Critique：P2 下拉只能靠外部点击关闭；P1 `models.length === 0` 在 hooks 之前条件返回，模型列表从空变有时有 hooks 顺序崩溃风险；
    P2 触发按钮没有暴露展开状态 / 控件关联。功能扫描后选择先完成这个核心图表交互，再做统计周期。
  - Act：hooks 改为无条件执行；菜单打开自动聚焦首个 checkbox，Escape 关闭并回焦触发按钮；补齐
    `aria-haspopup`、`aria-expanded`、`aria-controls`、筛选分组标签和操作 title，保留点击外部关闭。
  - Verify：29/29 单测、build、typecheck 全过；真实页面用纯键盘完成 打开 → Tab → Space 选中单模型 → Escape，
    实测按钮变为「模型 ×1」、菜单关闭、`aria-expanded=false`、焦点回到按钮；重新打开后 Space 恢复全部模型，
    外部点击关闭仍正常，console error 0、pageerror 0。截图：`/tmp/dsh-dashboard-audit/model-menu.png`。
  - Impeccable audit：18/20（A11y 4、Performance 3、Theming 4、Responsive 3、Integrity 4）；
    检测器仅报 4 处既有占比条 `transition: width`，属 P3 性能打磨，不在本轮扩大范围。

- （轮次 21）`feat(dashboard)`: 统计覆盖度诊断。
  - Review / Critique：P1 `src/usage.ts` 会静默吞掉损坏会话，汇总仍像完整账单；P2 `ModelPicker` 未处理 Escape；
    P2 约 814px 内容宽度下 52 周热力图扫读偏密。功能缺口扫描后优先选择 backlog 的覆盖度诊断。
  - Act：host 统计有效会话数、成功扫描数、有效 / 跳过 usage 记录、读取失败与最早 / 最新时间；
    用量卡内嵌可展开的「统计范围」，正常显示「本机读取完整」，有缺口时改为警示并解释口径。
  - Verify：29/29 单测、build、typecheck 全过；重启 `dsh.service` 后为 active，未登录根路径按预期返回 401；
    登录后的真实 usage API 为 200，实测 20/20 会话、641 条有效记录、0 失败、0 跳过，时间覆盖
    `2026/8/13 21:45 – 2026/8/15 02:33`；展开交互、窄屏无横向溢出、核心刷新 / 缓存回退 / 导出 / 悬浮窗路径全过，
    最终 console error 0、pageerror 0。截图：`/tmp/dsh-dashboard-audit/coverage-open.png`。

- （轮次 20）`feat(dashboard)`: 导出用量报表。
  用量卡新增导出菜单：逐天 CSV、逐模型 CSV、完整 JSON；文件日期使用北京时间，CSV 带 UTF-8 BOM、
  RFC 4180 转义与表格公式注入防护，JSON 标记 `local-dsh-session-logs` 统计口径；菜单支持 Escape 回焦和下载成功反馈。
  同轮确认悬浮窗无法通过公开 DSH API 切换 view：`shell.overlay` 无 owner actions，公开 `IConversation` 无 `setView`，按 TODO 约定不做 DOM hack。
  证据：29/29 单测通过；build/typecheck exit 0；Playwright 捕获并读取 3 个真实下载：
  `dsh-usage-20260815.csv` 30 行、`dsh-usage-models-20260815.csv` 2 行、JSON 30 天 / 2 模型且 scope 正确；
  Escape 关闭菜单并把焦点还给导出按钮；正常路径控制台 0 错误、pageerror 0。

- （轮次 19）`fix(widget)`: 额度页自动避让悬浮窗。
  完整仪表盘挂载时通过内存态 presence store 让悬浮窗淡出、`visibility:hidden`、禁用 pointer events 并标记 `aria-hidden`；
  退出额度页后恢复用户原有的持久化显示开关、角落与收起状态，设置文案同步解释作用域。
  证据：25/25 单测通过；build/typecheck exit 0；Playwright 实测额度页 visible=false / aria-hidden=true，
  切 Chat visible=true；关闭开关后 Chat 中节点不存在；重新开启后 Chat 恢复、额度页再次隐藏；新截图最右侧柱图与热力格无遮挡；
  正常路径控制台 0 错误、pageerror 0。

- （轮次 18）`feat(dashboard)`: 数据新鲜度与同步状态。
  状态栏复用 usage 缓存真实时间戳，区分首次同步 / 同步中 / 已同步 / 缓存数据 / 缓存回退 / 同步失败；
  每 30 秒更新相对时间，刷新失败不覆盖最后成功时间，状态色与 DSH 变量保持一致。
  证据：25/25 单测通过；build/typecheck exit 0；Playwright 实测缓存命中 →「缓存数据 · 刚刚更新」、
  强刷期间按钮 disabled 且显示「同步中」、成功 →「已同步」、注入 usage HTTP 500 →「缓存回退」并保留 3 个概览数字；
  恢复成功路径后控制台 0 错误、pageerror 0。

- （轮次 17）`feat(dashboard)`: 月度预算与月底预测。
  预算写入带版本 localStorage；概览内显示已用/预算、剩余、进度与按北京时间自然月已过比例外推的月底花费，
  正常 / 预计超支 / 已超支用绿黄红分级；未设置时「设置预算」会聚焦设置区输入框。
  证据：22/22 单测通过；build/typecheck exit 0；Playwright 实测预算 40 → 预计月底 ¥30.82（healthy）、
  15 → 预计超出 ¥15.82（risk）、10 → 已超 ¥4.64（over），硬刷新后 40 保持；620px 下 document 无横向溢出；控制台 0 错误。

- （轮次 16）`feat(dashboard)`: 会话成本排行。
  证据：接口实测 6 个会话、标题 6/6 全部解析成功、按费用降序、Top-6 之和 = totals.cost（100%）；
  界面显示最贵会话「写一个查看DeepSeek额度的dsh插件 ¥11.38 · 占 77.8%」；控制台 0 错误。

## 发布（2026-08-15）

- 已发布 `@cassius0924/dsh-usage-dashboard@0.3.0`（unscoped 名被无关的包先占，改用作用域包）。
- 证据：registry shasum `0b21eca…` 与本地 dry-run 一致；从 npm 干净安装后校验
  `cordis.patch.yml` 的 name、client bundle 的 loader id 均为作用域名，两个 exports 入口都能解析。
- 踩坑见 LEARNINGS：改包名牵连 `cordis.patch.yml` / `build.mjs` loader id / profile 挂载三处，
  漏掉 loader id 会让 host 全绿但整个 GUI 启动图卡死。

## 收尾验证（轮次 15）

- `pnpm run build` exit 0、`pnpm run typecheck` exit 0；`systemctl is-active dsh.service` = active。
- 端到端核心流程 17 项全过（冷启显示悬浮窗 → 开 tab 显示骨架 → 8 张卡片渲染 → 逐天/逐小时切换 →
  模型过滤与图例 → 点外部关闭下拉 → 全部模型重置 → 强制刷新按钮禁用/恢复 → 悬浮窗开关 →
  900×700 / 620×800 / 1440×1000 三档窗口下悬浮窗都在框内且无横向溢出）；控制台 0 错误。
- 加载态单独采样复验：0–1000ms 全程 skel=60 / empty=0（骨架不会被空态文案冒充）。

## 遗留问题

- P2 样式：一年热力图在约 814px 内容宽度下扫读密度偏高，需评估分段或缩放交互。
- P2 交互：模型多选下拉只能点击外部关闭，尚不支持 Escape。

## 若继续，下一轮会做

1. 异常消耗侦测（P1）：识别显著高于近 7 日基线的日期并解释最大模型 / 会话贡献。
2. 会话排行搜索与展开，或单日成本钻取（P1）。
3. 后续打磨时处理一年热力图密度与 4 处占比条宽度动画（P2 / P3）。
