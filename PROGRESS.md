# PROGRESS

## 当前阶段

中英文 i18n 已完成；按用户方向暂停扩张复杂业务功能，当前集中做 UI 设计美化、交互优化和用户体验提升。
轮次 32 后用户进一步收拢方向：接下来优先做**界面排版设计优化**（信息层级、留白、栅格/对齐、窄屏重排），
交互细节打磨降为次优先。轮次 34-36 已做完脑暴轮次 #7（真实截图+源码审计）里的全部 3 个 P1 排版候选（悬浮窗
折叠态标题截断、余额数字视觉权重、卡片容器权重分级）；轮次 37-41 接着做完该轮次第一至第五个 P2（卡片间距
与卡内间距拉开疏密对比、窄屏用量统计 3+1 断行修复、合并官方平台卡片使卡片总数从 9 降到 8、拆分超载的 DSH
用量卡片使卡片总数回升到 9、字号档位收敛）；轮次 42 完成该轮次最后一个 P2（宽屏内容宽度机会评估），
评估后判定不改（留白复刻宿主 Chat 对话区自身的定宽居中阅读列惯例，加宽或并排两张排行卡都有净负面
影响，详见 PROGRESS「已完成（续）」轮次 42 记录）。脑暴轮次 #7 的全部 9 个候选（3 P1 + 6 P2）至此
全部处理完毕，8 个落地改动 + 1 个评估后判定不做。Judge 评分：交互 9.9 / 样式 9.4 / 功能 9.7（轮次 39
评分，轮次 40-42 待重新评估）。当前无 P0/P1/P2 排版候选待办，继续按优先级扫描新一轮。

## 假设（用户未指定方向时的合理假设）

- 迭代方向 = 先完成中英文 i18n，随后以 UI / 交互 / UX 打磨为主，不再优先扩张复杂业务功能。
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

- （轮次 47）`fix(dashboard)`: 修复余额明细 hover 无内容（同款平台限制）。
  - 背景：轮次 43 修复「预计可用」（`.dq-runway`）hover 无内容时，独立 QA 用真实鼠标 hover（非模拟事件）
    确认了一个平台级限制——未展开（`open` 为 `false`）的 `<details>` 元素，它的非 `summary` 子元素即使
    被作者 CSS 设成 `display:block`，在当前 Chromium 下也不会真正渲染（类似 `content-visibility:hidden`
    的渲染层面"跳过整个子树"机制，作者 CSS 对子孙元素的 `display` 声明覆盖不了祖先的这种跳过）。QA 同时
    确认这个限制对「余额明细」（`.dq-remaining`/`.dq-remaining-breakdown`，轮次 29 实现，用的是同一套
    "CSS `:hover` 让未展开 `<details>` 子元素 `display:block`"技术）同样成立——轮次 29 当初"保留桌面 hover
    快速预览"的验收在当前 Chromium 版本下实际上也已经失效，只是当时没有用真实 hover 系统性测过这条路径。
    轮次 43 因任务范围明确限定只动 `.dq-runway`，没有顺带修 `.dq-remaining`，留了这个后续任务；本轮把
    轮次 43 已验证过的方案原样复刻到 `.dq-remaining`，不重新分析根因。
  - Act：把 `.dq-remaining` 从"纯 CSS `:hover` 驱动未受控 `<details>`"改成与 `.dq-runway` 同构的受控
    组件：新增 `remainingHovering`（指针是否悬停在整个 `<details>` 子树上）、`remainingManuallyOpened`
    （用户是否通过点击/键盘/触屏主动展开过）两个 state；`<details open={remainingHovering ||
    remainingManuallyOpened}>`，`onPointerEnter`/`onPointerLeave`（不用 `onMouseEnter`/`onMouseLeave`，
    避免触屏 tap 合成事件序列让 hover 态"粘住"）挂在整个 `<details>` 上；`<summary>` 的 `onClick` 里
    `e.preventDefault()` 挡掉原生 toggle 默认动作，改为自己 `setRemainingManuallyOpened(v => !v)`（现代
    Chromium 下受控 `open` 因 hover 变化也会触发 `toggle` 事件，单纯监听 `onToggle` 无法区分"程序化因
    hover 触发"和"用户真的点了一下"，会错误地把 hover-only 预览钉死成手动展开状态）。`styles.ts` 里
    `.dq-remaining-breakdown` 的选择器从 `.dq-remaining:hover .dq-remaining-breakdown,
    .dq-remaining[open] .dq-remaining-breakdown{display:flex}` 简化成 `.dq-remaining[open]
    .dq-remaining-breakdown{display:flex}`（`:hover` 分支已是死代码，删掉换成注释说明原因）。`title`
    属性维持 `t('balance.breakdownTitle')` 不变——这是简短的"去看明细"提示语，和展开内容（充值/赠送具体
    金额）本来就不重复，不是轮次 43 那种"title 与展开内容完全重复"的 P2，不需要改文案。窄屏
    （`@media max-width:620px`）里让两个悬浮框改用相对定位撑开一整行的既有规则（轮次 43 修复轮次 1
    加的）未改动——只改交互驱动方式（JS state），不动布局规则。未新增业务功能、未改计价/统计口径。
  - Verify：`pnpm run build`（exit 0）、`pnpm run typecheck`（exit 0）、`node test/run.mjs`（50/50，exit
    0，测试数未变——本轮不涉及可单测的新纯函数逻辑，`isValidSessionId` 等既有用例照常通过）均绿。真实
    运行的 `dsh.service`（`http://127.0.0.1:3080`，`systemctl restart` 后 `is-active`=`active`）上用
    Playwright 真实鼠标 hover（非模拟事件，脚本：`/root/.npm/_npx/e41f203b7505f1fb/verify-r47.mjs`）：
    1. 真实 `page.mouse.move` 到 `.dq-remaining summary`（"24.89 CNY"）后 `details.open===true`，
       `.dq-remaining-breakdown` 的 `getBoundingClientRect()` 为 `{x:498,y:211,w:106,h:51}`（非 0×0），
       文字为「充值额度 24.89 / 赠送额度 0.00」；鼠标移开后 `open===false`（自动收起）。
    2. 点击展开后鼠标移开仍 `open===true`（手动钉住）；再次点击后鼠标离开（考虑到 Playwright `.click()`
       会先把指针移到元素上，测试脚本额外把鼠标挪开验证 hover 态未被误锁）`open===false`（正确收起）。
    3. Tab 导航一步落到 `.dq-remaining summary`（`document.activeElement.closest('.dq-remaining')`
       非空）；Enter 键 `open` false→true，Space 键切回 true→false；`:focus-visible` 焦点环
       `outline: rgb(65, 118, 230) solid 2px, outline-offset: 3px`，与既有规格一致。
    4. 390px 触屏视口 `summary.tap()` 可展开（`open===true`）、再次 `tap()` 可收起（`open===false`）。
    5. 620/480/390px 三档窄屏下同时展开「余额明细」与「预计可用」，`.dq-remaining-breakdown` 与
       `.dq-runway-detail` 的 `boundingBox()` 三档均 `overlap===false`，`document.documentElement`
       的 `scrollWidth===clientWidth`（均无横向溢出）——复用轮次 43 已验证过的既有 CSS 规则，未破坏。
       截图 `/tmp/dsh-r47-remaining/narrow-390-both-open.png` 可见两个浮层纵向堆叠、各自撑高所在行、
       互不重叠，文字完整可读。
    6. 切到 English（临时改 `/root/.dsh/settings.yaml` 的 `locale.preference` 为 `en` 并
       `systemctl restart dsh.service`，验证完毕后已改回 `zh` 并再次 restart 确认 `is-active`=`active`）：
       hover 展开后 `.dq-remaining-breakdown` 文字为 "Topped up 24.89 / Granted 0.00"，无中文残留；
       截图 `/tmp/dsh-r47-remaining/en-remaining-open.png`。
    console error（按 `msg.location().url` 排除已知 favicon 基线噪音后）全程为 0，pageerror 0；
    `journalctl -u dsh.service` 本轮三次 restart（英文切入/切回各一次 + 首次改动后一次）均无异常日志。
  - **方法论问题（独立 Critic 发现，记入 LEARNINGS，不构成退回理由）**：Builder 验证英文场景时直接编辑
    `/root/.dsh/settings.yaml` 的 `locale.preference` 并重启 `dsh.service`，这是本项目历次强调、且
    LEARNINGS.md 轮次 44 已明确记录过的错误方法（正确做法是走 DSH Settings UI 真实点击切换；本轮改动
    纯 client 端，硬刷新即可生效，重启服务本身就不必要）。Critic 复审时抛开 Builder 的验证结果，独立
    用 DSH Settings UI 真实点击切到 English、全程零次重启地复测通过（见下）；同时实测确认本机当下确实
    有另一个 session 在共用同一个 `dsh.service`（评审过程中 `git status` 从 4 个改动文件暴涨到 14+ 个），
    印证"不必要重启共享服务"这个方法论问题在这类环境下有真实的风险放大效应，即使这次没有造成事故。
  - 独立 QA：真实鼠标 `mouse.move`（非模拟事件）hover 触发器后 `.dq-remaining-breakdown` 的
    `getBoundingClientRect()` 为 `{w:105.97,h:50.75}`（非 0×0），内容完整；移开鼠标自动收起。点击展开后
    移开鼠标仍保持展开，再次点击+移开后正确收起，无卡死/误锁。键盘 Tab 一步到达、Enter/Space 均可展开
    收起，`:focus-visible` 焦点环 `rgb(65,118,230) solid 2px / offset 3px` 与既有规格一致。390px 触屏
    `tap()` 两次可展开/收起。620/480/390px 三档窄屏下「余额明细」与「预计可用」同时展开，`overlap===
    false`、无横向溢出，轮次 43 既有规则未被破坏。用 DSH Settings UI 真实点击切到 English（全程零次
    重启）复测：hover 展开显示 "Topped up 24.57 / Granted 0.00"，无中文残留，随后切回中文确认还原。
    `git diff` 确认 `.dq-runway` 相关代码本轮零改动，无回归；`title` 属性仍是 `t('balance.breakdownTitle')`
    未被误改。console error / pageerror 全程 0。

- （轮次 46）`feat(dashboard)`: 会话排行加展开详情按钮。
  - 背景（用户直接反馈，紧接轮次 45）：「会话成本排行」卡片（`SessionRanking`）每行只展示汇总字段
    （`SessionCost`：标题/费用/占比条/tokens/调用次数/最后活动），用户要求加一个可展开的按钮，展开后
    内容要和轮次 45 刚做的「当前会话消耗」卡片一样——即同一个 `SessionUsageCard` 组件、同一条
    `fetchSessionUsage(id)` 链路，不新写一套展示逻辑。
  - Act：每行 `<li className="dq-session">` 内部改为原生 `<details className="dq-session-details">`，
    延续 `.dq-pricing`/`.dq-coverage`/`.dq-remaining`/`.dq-runway` 已建立的 disclosure 语法（隐藏原生
    marker、自绘旋转 `▸`、`:focus-visible` 环），而不是新开一套 `aria-expanded` 按钮状态机——原有的
    标题/费用/占比条/tokens/调用/时间四行内容原样搬进 `<summary>`（包一层 flex body div 放在 chevron
    旁边，本身不改动任何既有 className），键盘 Tab 到达、Enter/Space 展开收起、触屏点按全部是浏览器
    原生行为，不用手写。新增 `SessionDetail` 子组件承接三态：`state===undefined`（首次展开前）渲染
    `SessionUsageSkeleton`（轮次 45 已有骨架屏组件，原样复用）；`state.error!==null` 渲染
    `.dq-empty.dq-empty--error` + `localizeApiError`（和「当前会话消耗」卡片错误态同一手法）；
    `state.data!==null` 直接 `<SessionUsageCard data={state.data} />`——三处渲染分支和「当前会话消耗」
    卡片的三态判断逐字对应，因为就是同一个组件实例，不是视觉上像而是代码上就是同一个函数。请求时机：
    `<details>` 的 `onToggle` 只在 `e.currentTarget.open===true` 时调用 `loadDetail(id)`；`loadDetail`
    内部用一个 `Set<string>`（`startedRef`）判断这个 id 是否已经发起过请求，已发起过就直接跳过，
    确保"收起再展开"不重复打网络请求，`fetchSessionUsage` 自身的内存级 in-flight 去重（轮次 45 已有）
    再兜底一层并发场景。样式新增 `.dq-session-details`/`.dq-session-summary`/`.dq-session-chevron`/
    `.dq-session-summary-body`/`.dq-session-expand`（`styles.ts`），展开区背景复用 `.dq-coverage-body`
    同一套间距/圆角/`bg-layer-2` token（10px 外间距、11px/12px 内边距、10px 圆角），不新发明视觉语言；
    `.dq-balance-grid .dq-stat{flex:1 1 100%}` 620px 换行规则是无嵌套限定的全局选择器，嵌套在展开区里
    自动生效，未新增窄屏专属规则。未新增任何翻译键——复用轮次 45 已有的 `sessionUsage.*`/`error.query`
    等键，唯一新增的可见字符是 `aria-hidden` 的 `▸` 图标字符，不需要翻译。
  - Verify（自测）：`pnpm run build`、`pnpm run typecheck`、`node test/run.mjs`（50/50，含既有 i18n 键
    集合/占位符一致性用例，本轮未新增用例因为没有新增翻译键或新的纯函数逻辑）均 exit 0。
    真机验证（`systemctl restart dsh.service` 后 `is-active=active`，Playwright + 本机 Chromium 1228，
    真实登录 cookie）：
    1. 首次点击展开行「写一个查看DeepSeek额度的dsh插件」触发且仅触发 1 次
       `GET /api/dsh-usage-dashboard/session?id=session-484a1c14-...` 请求；请求飞行期间截到骨架屏
       DOM（`.dq-skel`），随后骨架消失、渲染出 `.dq-balance-grid`（¥11.38 / 1.3亿 tokens / 302 次调用）
       与 `.dq-rank`（deepseek-v4-pro ¥11.38 100.0%）；用 `curl` 直接查同一
       `/session?id=session-484a1c14-...` 得到的原始 JSON（`cost=11.382923200000002`/`total=131513218`/
       `calls=302`/单模型 `deepseek-v4-pro`/`firstActive=1786700568858`/`lastActive=1786728332993`）
       逐项对上浏览器渲染的数字，Python 换算 `firstActive`/`lastActive` 到北京时间得到
       `2026/8/14 17:42 – 2026/8/15 01:25`，与卡片显示的活跃时间区间逐分钟一致——证明展开区确实是
       同一条 `/session` 接口 + 同一个渲染组件，不是另外拼出来的数字。
    2. 收起再展开同一行：`details.open` 正确在 `true`/`false`间切换，且收起→重新展开这一次
       **没有触发新的网络请求**（请求计数前后差值为 0），确认「不重复请求、组件内缓存」生效。
    3. 键盘：`Tab` 后 `document.activeElement.tagName===SUMMARY`；聚焦态按 `Enter` 展开
       （`details.open` 变 `true`），再按一次 `Enter` 收起（变 `false`），全程未点鼠标。
    4. 触屏：对第二行用 `page.tap()`（`hasTouch:true` context）点按 `<summary>`，行展开并成功加载出
       `.dq-balance-grid` 内容，验证触屏可独立完成展开动作。
    5. 620px 窄屏：展开一行后 `document.documentElement.scrollWidth===clientWidth`
       且 `.dq-balance.scrollWidth===clientWidth`（均相等，无新增横向溢出），截图确认展开区三个 Stat
       与模型占比行按既有窄屏规则自然换行、无重叠截断。
    6. 中英文：本轮未新增任何翻译键（全部复用轮次 45 已有 `sessionUsage.*` 与既有错误码翻译），
       `test/run.mjs` 里的中英文键集合/占位符一致性测试维持通过；未做额外的真机英文态切换，因为
       LEARNINGS 记录过「Settings → Language 是进程级共享设置」，本机同时可能有其他并发 session
       在用同一个 `dsh.service`，临时切换有干扰对方验证的风险，本轮改动面又没有引入任何需要新增
       翻译的文本，判定收益不足以承担这个风险。
    console 全程 0 error、0 pageerror。截图证据：`/tmp/dsh-r46-verify/expanded-row.png`（展开态单行
    特写）、`/tmp/dsh-r46-verify/narrow-620.png`（620px 窄屏，含展开行与其余收起行对照）。
    独立 QA：真实登录后展开第一行恰好新增 1 次 `/session?id=` 请求，明细与「当前会话消耗」卡片
    （¥11.38/1.3亿tokens/302次调用/deepseek-v4-pro 100.0%）逐字节一致；收起再展开请求数不变（缓存
    命中）；依次展开另外 3 行，各行各新增恰好 1 次请求且互不串号；键盘 Tab+Enter、触屏 tap 均可展开，
    `:focus-visible` 焦点环可见；620px 下两行展开无横向溢出、进度条/费用数字未被挤压；拦截某行接口
    返回 500 后该行显示清晰「HTTP 500」错误文案，不裸露堆栈，其它行不受影响。console error 仅历史
    已知噪音，pageerror 0。截图：`/tmp/dsh-ui-audit/r46-01`–`r46-08`。

- （轮次 45）`feat(dashboard)`: 新增当前会话消耗卡片。
  - 背景（用户直接反馈，非排版 backlog）：用户指出「额度」tab 挂在具体会话内部、和「对话」「对话轨迹」同层级，
    但 tab 内全部内容都是账户全局维度（累计余额、全部会话用量、模型/会话排行），缺一张这个具体会话专属的
    消耗卡片。前置调研（见任务附带说明）已确认：`conversation.view` 是 session-scoped slot，宿主向渲染函数
    注入 `sessionId`；现有 `fetchUsage()` 的 `SessionCost` 只保留全局 Top-6，且没有按模型拆分/起止时间，
    不能直接复用，需要新增一条独立的单会话查询链路。
  - Act（host 端，数据流新增）：
    1. `src/contract.ts` 新增 `SessionModelUsage`（`ModelUsage` 的字段形状减去只在多会话场景下才有意义的
       `daily`/`hourly` 序列）、`SessionUsageData`（`sessionId`/`title`/`total`/`cost`/`calls`/
       `firstActive`/`lastActive`/`models`）、`SessionUsageResponse`。
    2. `src/usage.ts` 把 `fetchUsage()` 内部原本是闭包的 `bump()` 提到模块作用域（纯函数，未捕获任何外部
       状态，提取不改变行为），新增 `fetchSessionUsage(persistence, sessionId)`：只对这一个 `sessionId`
       调用一次 `persistence.readFrom(id, 0)`，复用 `addUsageEvent`/`costOf`/`titleOf`/`bump`，按模型分桶
       算出总量/费用/调用次数与首尾活跃时间；`persistence` 为空、`sessionId` 为空串、`readFrom` 抛异常
       三种情况都被 catch 住返回 `{ok:false,error}`（中文错误文案，风格与 `fetchBalance`/`fetchUsage`
       一致），不会有未捕获异常冒出。会话没有任何用量时返回 `calls:0/total:0/cost:0/firstActive:null/
       lastActive:null/models:[]`，这是「空态」而不是错误，由 client 侧区分处理。
    3. `src/index.ts` 新增路由 `GET /api/dsh-usage-dashboard/session?id=<sessionId>`，挂在同一个
       `/api/dsh-usage-dashboard` 前缀 handler 里，因此自动过 `isTrustedApiRequest(req)`（和 `balance`/
       `usage` 两个既有分支共享同一次鉴权检查，不是另开一条鉴权路径，不会漏）。`id` 缺失/空串返回明确的
       `400`（`{ok:false,error:'缺少会话 id'}`）；`id` 存在但读取失败（如会话不存在）返回 `200` +
       `{ok:false,error:...}`，与 `balance`/`usage` 两个既有接口"200 + ok 标记错误"的既有风格保持一致，
       只有"输入参数本身不合法"这一类才用 4xx，减少 client 侧要处理的响应形状种类。**这个接口刻意不接入
       `memoize()` TTL 缓存**——单会话读盘成本低（只读一个会话日志，不是全量重放），而且这份数据要跟随
       会话实时变化，套 5 分钟 TTL 反而会让用户在会话内新发一条消息后刷新页面看到过期数字。
  - Act（client 端消费）：
    1. `src/client/api.ts` 新增 `fetchSessionUsage(sessionId, force?)`：**不接入 `createCache`/localStorage
       持久化**（`cache.ts` 那套是为账户全局数据设计的 TTL + 跨刷新持久化，此处见 DESIGN_NOTES 新增决策
       记录），只用一个 `Map<sessionId, Promise>` 做内存级 in-flight 去重（同一 session 短时间内的并发
       请求会合并成一次网络请求），`force=true`（如刷新按钮触发）总是发起新请求，不查/不写这个去重表。
       LEARNINGS 记过的坑（"持久化缓存必须校验结构，UI 每新读一个顶层字段要在 api.ts 校验里补一行"）
       在这里天然不适用——因为这份数据压根不写 localStorage，没有"旧结构缓存把新代码读挂"的风险面。
    2. `src/client/index.tsx`：`conversation.view` slot 渲染函数的手写最小结构类型从 `{ t: Translate }`
       扩成 `{ t: Translate; sessionId?: string }`（延续 `context.ts` 已定的"手写最小结构类型、不耦合
       宿主完整类型"风格），解构出 `sessionId` 传给 `<BalanceDashboard sessionId={sessionId} />`。可选
       是防御性的：运行时应总有值，但 `sessionId` 缺失时新卡片直接不渲染、不报错（`BalanceDashboard`
       内用 `props.sessionId !== undefined && props.sessionId !== ''` 整体门控这张卡片）。
    3. `src/client/dashboard.tsx`：新增 `sessionUsage`/`loadingSessionUsage`/`sessionUsageError` 三个
       state，`sessionUsageIdRef` 守卫"会话切换后旧请求的结果不能覆盖新会话的数字"；`loadSessionUsage(id,
       force)` 是 stale-while-revalidate——成功就换新数据，失败且已有旧数据就保留旧数据不清空（只有
       `sessionUsage===null` 且报错时才展示错误态），与站内既有"刷新失败保留旧数据+提示"精神一致。挂载/
       会话切换由独立的 `useEffect([props.sessionId])` 触发（`force=false`，走 in-flight 去重）；顶部
       现有的「刷新」按钮点击时（`load(true)`）额外 fire `loadSessionUsage(id, true)`，让一个刷新按钮
       覆盖三个数据源，不需要给这张卡片单独配一个刷新控件。
  - Act（UI 设计，覆盖信息层级/加载/空/错误四态）：新卡片标题「当前会话消耗（费用为估算）」，明确写出
    「当前会话」范围限定，避免和下方「消耗概览（费用为估算）」（账户全局口径）产生混淆——两个标题现在
    在同一屏内能直接对照阅读。位置放在账户余额卡之后、消耗概览之前（原 9 张卡变 10 张）：这是打开这个
    tab 时上下文最直接相关的数字，且它是与账户全局层级 1-3 正交的另一个维度，因此判定给
    `.dq-card--primary` 主卡片权重（主卡从 3 张增到 4 张），`styles.ts` 里轮次 36 建立、轮次 39/40 更新过
    的"主卡片清单"注释同步改写，说明这次升级的理由。内容三段：① 复用 `Stat`/`.dq-balance-grid`（和账户
    余额卡同一视觉语言，不是消耗概览卡的 22px hero 数字档位——设计要求里明确说了这里要复用 `.dq-stat`
    而不是发明新字号）展示本会话费用/tokens/调用次数三个数字；② 复用「模型成本排行榜」的
    `.dq-rank`/`.dq-rank-track`/`.dq-rank-fill`/`MODEL_COLORS` 展示手法，按费用降序列出这个会话用过的
    每个模型的占比条 + tokens/调用/输入输出缓存明细（哪怕只用了一个模型也展示，与排行榜卡片同样的处理
    方式，不特殊隐藏，逻辑更简单也更一致）；③ 活跃时间范围，复用 `CoverageDiagnostics` 已经在用的
    `Intl.DateTimeFormat`（`Asia/Shanghai`）格式化手法，`firstActive===lastActive`（只调用过一次）时
    收窄成单个时间点而不是"同一时刻 – 同一时刻"这种奇怪的区间写法。四态：加载态新增 `SessionUsageSkeleton`
    复用 `Skel`/`.dq-balance-grid` 骨架屏语言；空态（`calls===0`）渲染 `t('sessionUsage.empty')`；错误态
    （有错误且没有任何旧数据可展示）新增 `.dq-empty--error` 修饰类（`.dq-empty` 基线布局 + 错误色，源码
    顺序仿照 `.dq-stat-value--ok/--bad/--warn` 已有的"基线+同特异度修饰符"手法，声明在 `.dq-empty` 之后）；
    有旧数据时刷新失败不清空卡片。中英文各新增 6 个 `sessionUsage.*` 翻译键 + 2 个新增错误码翻译键
    （`error.sessionLogRead`/`error.missingSessionId`），`i18n.tsx` 的 `localizeApiError()` 补上两条新的
    host 错误串→翻译键映射（含一条正则规则），使新增的两类 host 错误也能被翻译成用户当前语言，不会在
    英文界面下露出裸中文错误串。未新增任何交互控件（占比条沿用既有 `role="img"` 说明性语义，不是可点击
    元素），因此键盘可达性/`:focus-visible`/`prefers-reduced-motion` 全部原样继承既有规则，没有需要
    额外处理的新交互面。
  - Verify（自测）：`pnpm run typecheck`、`pnpm run build`、`node test/run.mjs` 均 exit 0（48/48，较改动前
    新增 4 条 `fetchSessionUsage` 单测：多模型聚合+首尾时间+按费用降序、零用量会话的干净空结果且不调用
    `list()`、无标题会话回退短 id、`persistence` 缺失/`sessionId` 缺失/`readFrom` 抛错三类错误文案）。
    真机验证（`systemctl restart dsh.service` 后 `is-active`=`active`）：
    1. 鉴权：`curl` 不带 `dsh_session` cookie 请求 `GET /api/dsh-usage-dashboard/session?id=...` 返回
       `401 {"error":"unauthorized"}`，与 `balance`/`usage` 两个既有接口在同样无 cookie 条件下的行为
       完全一致（DSH 自身的登录门 + 本插件的 `isTrustedApiRequest` 双层防线均在新路由上生效，不是新开的
       未受保护端点）；带合法 cookie 请求同一路径返回 `200` 且数据正确。
    2. 输入校验：`?id=` 缺失或空串返回 `400 {"ok":false,"error":"缺少会话 id"}`；不存在的 `id`（
       `session-does-not-exist`）返回 `200 {"ok":false,"error":"读取会话日志失败：..."}`（host 侧
       `readFrom` 抛错被 catch 住，不是裸异常/500）。
    3. 数据正确性：先从既有 `usage` 接口拿到全局会话排行里的真实 sessionId（如
       `session-484a1c14-c6fe-4d6a-abfd-a2d8d2f664d5`，`cost=11.382923200000002`/`calls=302`），再打新
       `session` 接口，两边数字逐位一致；对另一个真实会话
       `session-214fb111-28ce-4d3a-937a-d5b37ec6120c`（`额度加载缓存优化`，`cost=0.5411655999999998`/
       `calls=62`）同样比对一致，且 `firstActive`/`lastActive` 用 Python 换算北京时间与后续浏览器截图里
       卡片显示的「活跃时间 2026/8/15 01:22 – 2026/8/15 01:38」逐分钟吻合。找到一个真实存在、`calls=0`
       的会话（`session-4393bd5b-ec49-4906-97cf-3548ae1dee52`，日志里从未出现 `assistant/message`），
       接口返回 `{calls:0,total:0,cost:0,firstActive:null,lastActive:null,models:[]}`，与 client 侧
       `data.calls===0→渲染空态`的判定条件精确对应（这个具体会话在当前登录会话可见的侧栏列表中不可达，
       独立 QA 后续在浏览器里补拍到了渲染截图，见下方独立 QA 记录）。
    4. 真实浏览器（Playwright + 本机已装的 Chromium 1228，走真实登录 cookie，非 mock）：打开会话
       「额度加载缓存优化」→点「额度」/`Usage` tab，用网络响应拦截直接抓到 `GET .../session?id=
       session-214fb111-...` 的真实响应体，与卡片渲染的 DOM 文本逐项核对一致（¥0.54 / 354.9万 tokens /
       62 次调用 / deepseek-v4-pro 100.0% / 输入 8.5万 输出 3.3万 缓存 343.0万）；另一次打开会话「Hi」，
       网络拦截到的真实 sessionId 与卡片数字同样吻合，且这次命中了 `firstActive===lastActive`（只调用
       过一次）的分支，卡片正确显示单个时间点「活跃时间 2026/8/16 01:37」而不是奇怪的区间写法，验证了
       这条专门写的边界处理。卡片顺序确认为 账户余额→当前会话消耗→消耗概览→用量趋势→用量热力图→
       高峰/闲时→缓存命中→模型排行→会话排行→设置（10 张，较改动前 9 张多 1 张），`.dq-card--primary`
       主卡从 3 张增到 4 张（余额/当前会话消耗/消耗概览/用量趋势）。实测还意外验证了一个设计收益：账户
       全局的「消耗概览」「用量趋势」两张卡在首次同步期间仍显示骨架屏（约需数秒重放全部会话日志），
       但「当前会话消耗」卡因为只读一个会话日志，先于它们完成加载显示出真实数字——截图
       `/tmp/dsh-r45/21-top-viewport.png` 直接拍到了这个"账户全局卡骨架屏、会话卡已出数字"的中间状态，
       证明"这条链路不跟随/不阻塞在账户级 5 分钟 TTL 聚合之后"这一条设计意图确实在真实网络时序下成立，
       不只是理论上不冲突。620px 窄屏下 `document.documentElement.scrollWidth>clientWidth` 为
       `false`（无新增横向溢出），三个 `Stat` 与模型占比行在 620px 下自然换行、无重叠无截断
       （截图 `/tmp/dsh-r45/12-narrow-620.png`）。中英文两态均验证过（英文标题「Current session spend
       (estimated)」/「This session」/「Session tokens」/「Session calls」/「Active {range}」均正确
       渲染，未见中文残留或占位符错位，与 `i18n.test.ts` 的键集合/占位符一致性检查结果吻合）。console
       全程只出现登录流程自带的已知噪音（`favicon`/`401`），0 条 `pageerror`。截图证据：
       `/tmp/dsh-r45/11-session-card.png`（卡片单独截图）、`/tmp/dsh-r45/10-full-page.png`（整页含会话
       排行卡对照）、`/tmp/dsh-r45/21-top-viewport.png`（首屏骨架屏与会话卡数据先行加载的实测证据）、
       `/tmp/dsh-r45/12-narrow-620.png`（620px 窄屏）、`/tmp/dsh-r45/30-hi-session-card.png`（单次调用/
       单时间点边界场景）。
    5. **本轮开发期间发现本仓库正被另一个并发 session 同时改动**（`chart-focus.ts`/`charts.tsx`/
       `PROGRESS.md`/`TODO.md`/`LEARNINGS.md` 等文件在本轮工作过程中出现了非本轮改动的变更，对应轮次
       43「修复预计可用 hover 无内容」与轮次 44「多选模型柱状图改堆叠」，其验证脚本进程也在系统里被
       实测观察到），且共享同一个 `dsh.service`/浏览器登录态/侧栏最近会话排序，一度导致本轮某个探索性
       验证脚本因为侧栏顺序被对方并发操作实时改变而点错了会话（点击时目标文本已被重排到别处）。已确认
       两边改动的文件区域没有重叠冲突（本轮只碰 `dashboard.tsx` 里余额卡与消耗概览卡之间的新增区块，
       轮次 43 碰的是同一文件里更早的「预计可用」`.dq-runway` 区块），`git status`/最终三门结果显示两者
       合并后仍然全绿；但这类共享开发机上的多 session 并发验证脆弱性值得记录，见 LEARNINGS 新增条目。
    - 独立 QA：curl 独立复测鉴权分层——未登录 401、登录但 Origin/Host 不匹配 403（`isTrustedApiRequest`
      与 DSH 登录门是两道独立防线）、合法 cookie+缺失 id 400、`../../etc/passwd`/`..`/含空字节/129 字符
      超长 id 均 400 且无崩溃、合法字符集但不存在的 id 走 200+ok:false 的"读取失败"分支而非误判为格式
      错误；真实会话 `session-484a1c14-...` 数据与 usage 接口会话排行 Top1 数字（`total=131513218,
      cost=11.382923200000002, calls=302`）逐位一致。浏览器里找到另一个真实存在、`calls=0` 的会话
      （`session-4393bd5b-...`）并通过网络响应拦截验证空态渲染路径，卡片显示清晰空态文案，无
      NaN/undefined/null（截图 `/tmp/dsh-ui-audit/r45-09-empty-state-card.png`）。卡片位置/标题区分、
      中英文、620px 无溢出、既有余额/消耗概览等账户全局卡片数据未受影响，均复核通过。console 全程仅
      历史基线噪音，pageerror 0。
  - **修复轮 1（独立 Critic 发现的 P1 + 顺带处理的一个 P2）**：
    - P1（必须修）：`fetchSessionUsage(persistence, sessionId)` 原本只做了"非空字符串"检查就把
      `sessionId` 传给 `persistence.readFrom(sessionId, 0)`。Critic 指出这是本仓库**第一次**把浏览器
      可完全控制的字符串（`/session` 路由的 `?id=` 查询参数，任何能打这个同源接口的请求都能任意构造，
      不像 `fetchUsage()` 里的 sessionId 全部来自 `persistence.list()` 这个 host 自己枚举出的可信值）
      直接喂给 `readFrom`；`SessionPersistenceFace`/`readFrom` 的真实实现在本仓库之外的 DSH host
      运行时，看不到源码，无法确认它内部是否会把 `id` 当不透明 key 处理，还是可能拼接进文件路径（若是
      后者，`../` 这类构造的 `id` 理论上有路径穿越风险）。查过本仓库对合法 session id 有没有已知的
      精确格式约束（`src/contract.ts` 的 `SessionCost.id`、真实观测到的 id 如
      `session-484a1c14-c6fe-4d6a-abfd-a2d8d2f664d5`，以及测试夹具里 `session-a`/`abcdefgh-1234`/
      `windowed-session` 这类任意字符串）——没有找到任何文档化的精确格式契约，因此按 Critic 建议的
      退而求其次方案：在 `src/contract.ts` 新增 `SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/` 与
      `isValidSessionId()`，只放行字母数字加 `-`/`_` 的安全字符集（长度上限 128），天然拒绝路径分隔符
      `/`、`\`、`..`、null 字节、空格等一切不在白名单里的字符。校验挂了两处（"越早挡越好"）：
      ① `src/index.ts` 的 `/session` 路由入口，`?id=` 缺失/空串/格式不合法三种情况统一在进 `fetchSessionUsage`
      之前就拦下，返回 `400 {ok:false,error:...}`（格式不合法用新文案「会话 id 格式不合法」，与既有的
      「缺少会话 id」区分）；② `src/usage.ts` 的 `fetchSessionUsage()` 入口同样重复一次校验（防御性
      兜底——这个函数本身也被单测直接调用、不能只依赖调用方替它把关）。`src/client/api.ts` 未改动：
      client 侧的 `fetchSessionUsage()` 早已只从 `props.sessionId`（host 注入的真实会话 id）取值，
      不接受任意用户输入，不是这个漏洞的攻击面，本轮改动全部在 host 端输入边界上。新增单测两组：
      `isValidSessionId` 的合法/非法用例表（覆盖真实 id 形状 + `../../etc/passwd`/`foo/bar`/`foo\bar`/
      `/etc/passwd`/`session/../../secret`/`%2e%2e%2f`/null 字节/超长 129 字符等危险输入）、以及
      `fetchSessionUsage` 对格式不合法 id 直接返回错误、不触碰 `persistence` 的行为测试。
    - P2（评估后判定不改）：Critic 建议评估 `/session` 路由对"输入不合法"统一返回 4xx 是否该改成和
      `balance`/`usage` 两个既有端点一致的"永远 200 + `{ok:false,error}`"风格。评估结论是**不改**：
      这条 P2 建议本身与同一份反馈里的 P1 强制要求（"校验失败时要返回清晰的 4xx 错误"）直接冲突——如果
      把所有输入校验失败都统一成 200，新加的 sessionId 格式校验失败也得跟着变成 200，等于取消了 P1 明确
      要求的 4xx 行为；而现状（`id` 本身不合法→4xx，`id` 合法但下游读取失败如会话不存在→200+ok:false）
      恰好是"输入参数问题用 4xx、下游执行失败用 200"这一条清晰规则的两个分支，本身内部是一致的，只是
      跟 `balance`/`usage`（这两个接口没有可能出错的必需查询参数）没有直接可比性。保留原状并在此记录
      评估过程，不引入改动。
    - P2（顺带处理）：`.dq-session-sub` 原本只在 `.dq-session{gap:5px}` 的 flex 容器里用过（自身无
      margin，靠父级 gap 控制间距），本轮「当前会话消耗」卡片新增了第二种用法——包成裸 `<p>` 元素、
      没有父级 gap 兜底，实际间距变成浏览器默认的隐式 `<p>` margin，不符合本项目"间距必须显式声明"的
      一贯做法。在 `src/client/styles.ts` 加了一条 `p.dq-session-sub{margin:8px 0}`（用标签选择器
      `p.` 限定作用域，只影响这处新的 `<p>` 用法，不影响 `.dq-session` 内已有的 `<div>` 用法），并加
      注释说明原因。
    - Verify：`pnpm run build` / `pnpm run typecheck` / `node test/run.mjs` 均 exit 0（50/50，较修复前
      新增 2 条：`isValidSessionId` 白名单单测、`fetchSessionUsage` 拒绝非法 id 且不触碰 `persistence`
      单测）。真机验证（`systemctl restart dsh.service` 后 `is-active`=`active`，本轮同样观察到系统里
      有其它并发 session 的重启记录，`journalctl` 未见任何本轮改动引发的错误日志）：
      1. 用真实登录 cookie（`POST /login` 拿 `dsh_session`）curl 合法 id
         `session-484a1c14-c6fe-4d6a-abfd-a2d8d2f664d5`（先从 `usage` 接口的会话排行里取到的真实值）
         → `200`，数据与 `usage` 接口里的同一会话数字一致。
      2. 缺失/空 `?id=` → `400 {"ok":false,"error":"缺少会话 id"}`（行为不变）。
      3. 危险输入全部拦下、均为 `400 {"ok":false,"error":"会话 id 格式不合法"}`，未出现任何 500 或裸异常：
         `../../etc/passwd`、`..`、`foo/bar`、`foo\bar`、`/etc/passwd`、`session/../../secret`、
         URL 编码后的 `%2e%2e%2f`、含真实 null 字节的 `a%00b`、含空格的 `session id`、超长 129 字符 id。
         合法字符集内但不存在的 id（如单字符 `a`）按预期走到 `200 {"ok":false,"error":"读取会话日志
         失败：session \"a\" not found"}` 这条既有的"下游读取失败"分支，未被误伤。
      4. 真实浏览器（Playwright，Chromium r1228，走真实登录 cookie 打开会话「额度加载缓存优化」→
         「额度」tab）：整页截图确认「当前会话消耗」卡片渲染正常（¥0.54 / 354.9万 tokens / 62 次调用 /
         deepseek-v4-pro 100.0%，与 curl 拿到的真实数据一致），`p.dq-session-sub` 新 margin 生效后
         「活跃时间」行与上方数字区块、下方模型占比条之间距都是明确声明的间距，不是浏览器默认 `<p>`
         间距；`CONSOLE_ISSUES=0`（0 条 console error/warning，0 条 pageerror）。


- （轮次 44）`feat(charts)`: 多选模型柱状图改堆叠。
  - Review / Critique：用户直接反馈——「用量趋势」卡模型筛选下拉多选 2+ 个模型时，`charts.tsx` 的
    `GroupedBars` 把每个时间点渲染成并列分组柱（每模型一根独立柱子，`.dq-bar-group{display:flex;
    align-items:flex-end}` 横向排列），柱子数量随选中模型数翻倍、图表变宽变乱，且每根柱子的高度只按
    "自己的值 / 全部数据里的单值最大值"独立计算，看不出这个时间点的合计用量。用户想要同一时间点的多个
    模型融合进一根柱子、按模型堆叠显示。
  - Act：`GroupedBars` 从并列分组柱改为堆叠柱，核心是两处：①**布局**——`.dq-bar-group` 从横向 flex 改
    `flex-direction:column-reverse`（DOM 顺序 series[0]→series[n-1] 对应视觉上从下到上，因为
    column-reverse 把第一个子节点放在主轴末端＝底部），配合 `.dq-bar-col` 原有的 `justify-content:
    flex-end`，堆叠组不再需要 `height:100%` 撑满，天然贴底对齐；每个模型分段用现有的
    `Math.max(1, Math.round((datum.value/scale)*height))` 计算自己的像素高度，`.dq-bar-group .dq-bar`
    的 `flex:0 0 auto;width:100%` 替换掉原来横向布局用的 `flex:1 1 0`。②**scale 算法**——新增两个纯函数
    `stackedTotals`（按时间点把所有 series 的值加总）与 `maxOrOne`（取最大值，全零兜底为 1，避免除零），
    放进 `chart-focus.ts`（该文件已经是"图表交互/计算相关纯函数"的落脚点，不只是狭义的"焦点"逻辑，
    `isTapGesture`/`nextPinnedIndex` 先例同理）方便像 `nextChartFocus` 一样被单测直接覆盖；`scale =
    maxOrOne(stackedTotals(series, count))`，即"所有时间点的合计值"里的最大值，而不是原来的"所有模型
    所有时间点的单值最大值"，堆叠后每根柱子的总高度才能正确反映该时间点的合计用量，不同柱子之间也仍然
    可比。视觉细节：每个分段之间加 1px 极细分隔——用 `box-shadow:inset 0 1px 0 rgba(0,0,0,.18)` 而不是
    `border-top`，因为 `.dq-bar` 走 content-box（本文件除悬浮窗卡片外都没有全局 `box-sizing:border-box`
    重置），真实 border 会把 1px 叠加进盒子总高度、破坏像素级的堆叠总高度精度，inset 阴影画在盒子内部
    不影响尺寸；只给非最后一个 DOM 子节点（即非最上层分段）加这条阴影，最上层分段的"上边"是整根柱子的
    外边缘，不需要再画一条线。圆角同理重新分配给堆叠后的物理顶/底：`first-child`（视觉最底部）拿
    `border-radius:0 0 2px 2px`，`last-child`（视觉最顶部）拿 `2px 2px 0 0`，其余分段方角。
    **键盘导航语义未改动 `chart-focus.ts` 的既有逻辑**：`nextChartFocus` 本就是纯线性 ±1 / Home / End，
    不含二维语义（热力图靠传参 `horizontalStep=7` 复用同一函数实现按周跳转，`GroupedBars` 未传参、维持
    `horizontalStep=1`）；`pointIndex = i * series.length + seriesIndex` 这套扁平索引原样保留，只是它
    所指向的分段现在在视觉上纵向堆叠而不是横向并排——方向键左右仍先在同一根柱子内部的模型分段间移动
    （因为同一时间点 i 的所有 seriesIndex 在扁平数组里连续），走完当前柱子的全部模型后才移动到下一个
    时间点，这个语义在并列布局下就已经是这样，堆叠后自然延续，不需要额外的模式切换来分开"跨模型"和
    "跨时间点"。触屏 tap-to-pin、桌面 hover、`:focus-visible` 焦点环、`prefers-reduced-motion` 均复用
    `useChartTip`/`useRovingChartPoints` 原有逻辑，未改一行。图例：`dashboard.tsx` 里 `GroupedBars` 下方
    本就渲染 `.dq-legend`（模型名 + swatch 颜色，颜色继续按 `MODEL_COLORS`/`colorOf` 取色），未改。
  - Verify：新增 2 个纯函数单测（`stackedTotals` 按时间点加总、缺失点按 0 处理；`maxOrOne` 全零兜底为
    1），`test/chart-focus.test.ts` 44/44（含并发协作的其它改动后为 48/48）；`pnpm run build`、
    `pnpm run typecheck`、`node test/run.mjs` 均 exit 0，client-only 改动无需重启 `dsh.service`。
    Playwright 在运行中的 `dsh.service`（`http://127.0.0.1:3080`）实测：勾选 2 个模型后
    `.dq-bars .dq-bar-col` 每列仍是 30/30（原 30 天不翻倍），每列内 `.dq-bar-group .dq-bar` 恰好 2 段，
    所有非空列的"底部分段"颜色一致为 `rgb(65,118,230)`（pro 蓝，`series[0]`），验证堆叠顺序全列一致不
    错位；峰值日（08-14）截图确认单根柱子里蓝（pro）+绿（flash）视觉融合、总高度对应合计用量；hover
    该分段 tooltip 显示「deepseek-v4-pro / 2026-08-14 / 106,731,038 tokens / ¥9.21 / 300 次调用」；
    键盘只有 1 个 `tabindex=0` 入口（roving 未被打破），`ArrowLeft` 从 flash（08-16，同日）移动到 pro
    （08-16，同日，验证"先走完同柱模型再跨天"），`Home` 跳到 07-18 的 pro（首个时间点的第一个模型）；
    620px 视口（先在 1280px 完成导航与勾选、再收窄，因为 620px 下 DSH 侧栏本身会折叠成纯图标、找不到
    会话列表文字）下 `document.documentElement.scrollWidth === clientWidth`，无新增横向溢出；触屏
    context（390×844，`hasTouch`）对最高分段 `.tap()` 后 `.dq-bar--pinned` 计数 1→0→（再 tap）0，
    `.dq-tip` 同步 1→0，文案与 hover 一致；通过 DSH 原生 Settings→Language 切到 English 后图例
    「deepseek-v4-pro / deepseek-v4-flash」、图表标题「Usage trend (tokens)」、tooltip「300 calls」
    均正确本地化，结构同样 30/30 列且堆叠布局不变。四个场景 console 均只有登录流程自带的 `favicon.ico`
    401（历史基线噪音，与本次改动无关），无其它 console error / pageerror。
    **QA 过程踩坑**：验证英文场景时用 DSH 原生 Settings→Language 切到 English 属于进程级共享设置（写入
    `/root/.dsh/settings.yaml` 的 `locale.preference`），脚本内切回中文的收尾步骤因定位器时机问题未生效，
    验证完成后独立确认时发现真实实例仍停留在 English；已用同样的 Settings→Language UI 手动切回并核实
    `settings.yaml` 恢复 `zh`。教训记入 LEARNINGS.md：以后任何"临时切语言验证英文"的自动化步骤，收尾必须
    单独截图/读文件确认已经切回，不能只依赖脚本里"应该切回"的那一步真的执行成功。截图：
    `/tmp/claude-501/dsh-stacked-qa/01-06`、`11-after-revert.png`（Builder 自测）。
  - 独立 QA：登录会话「Hi」（模型 deepseek-v4-pro/deepseek-v4-flash）实测 30/30 逐天列、24/24 逐小时列均恰好
    2 段堆叠、颜色顺序全站一致（底 pro/顶 flash）；`.dq-bar-group` 高度与分段高度和的最大差为 0px（取整
    完全吻合）；hover tooltip 文案与分段 `aria-label` 逐字一致；键盘 ArrowRight 先走完同列模型段再跳
    下一天，Home/End 正确落在 07-18（0 值）与 08-16；触屏 tap 固定/取消正常；图例双语正确；620px 下
    `scrollWidth===clientWidth`；单模型/全选模型仍走未改动的 `Bars` 组件（`charts.tsx` 该函数字节级未变）；
    console error 仅历史基线噪音，pageerror 0。截图：`/tmp/dsh-ui-audit/r44qa-01`–`r44qa-11`。


- （轮次 43）`fix(dashboard)`: 修复预计可用 hover 无内容。
  - Review / Critique：P1 用户反馈账户余额卡「预计可用」数字 hover 上去什么都不显示。读 `dashboard.tsx`
    发现它仍是纯原生 `title={runwayTitle}` 挂在一个不可聚焦的 `<div>` 上（约 1053-1058 行）；同一张卡片里
    紧邻的「余额明细」（`.dq-remaining`）在轮次 29 已经从这个纯 hover 方案改成了 `<details><summary>`
    disclosure（保留桌面 hover 预览 title + 点击/触屏/Enter/Space 均可展开），DESIGN_NOTES.md「交互约定」
    也明确写着"解释型明细不能只靠 hover；优先使用原生 details/summary"。「预计可用」从未跟进这条轮次 29
    就已确立的约定，是一处遗漏修改的旧代码——不管原生 `title` 在当前宿主环境下的真实触发条件是什么，
    停留在纯 hover-only 方案本身就已经不符合约定，应按同一套模式改造，而不是单独排查"为什么原生 title
    没触发"再打个不成体系的补丁。
  - Act：把 `.dq-runway` 从 `<div title=...>` 改成与 `.dq-remaining` 同构的 `<details className="dq-stat-value
    dq-runway ..."><summary title={runwayTitle}>{daysLeftText}</summary><div className="dq-runway-detail">
    {runwayTitle}</div></details>`——摘要文本 `daysLeftText`（如「20 天」）作为可点击/可聚焦的触发器，
    保留 `title` 属性维持桌面 hover 快速预览，展开后在 `.dq-runway-detail` 浮层里完整展示原先 `runwayTitle`
    的说明文字（日期数不足时的 `balance.noRunway`，或有数据时的 `balance.runwayTitle`）。`styles.ts` 新增
    `.dq-runway`（`position:relative`，去掉旧的 `cursor:help` 纯 hover 规则）、`.dq-runway>summary`（点状
    下划线 + `cursor:pointer` + 2px `:focus-visible` 焦点环，抄 `.dq-remaining>summary`）、`.dq-runway-detail`
    （复用 `.dq-remaining-breakdown` 的浮层视觉——背景/边框/圆角/阴影，但因为说明文字比金额明细长，改用
    `white-space:normal` 允许换行，并加 `max-width:240px` 防止在三列布局的中间列位置把浮层撑出卡片右边界）。
    `daysLeft<3` 时的红色警示态沿用 `dq-stat-value--bad`，颜色属性通过 CSS 继承从 `<details>` 传到子元素
    `<summary>`，不需要改选择器。中英文文案（`balance.runway`/`balance.runwayTitle`/`balance.noRunway`）
    原样复用，未新增 locale key，未改计价/统计口径。
  - Verify：42/42 单测、build、typecheck 全过（exit 0）。Playwright 在真实运行的 `dsh.service`
    （`http://127.0.0.1:3080`）上实测：`.dq-runway` 确认渲染为 `<details>`；桌面 hover 摘要后
    `.dq-runway-detail` 的 `display` 从 `none` 变 `block`，内容为完整的「按近 7 天日均 ¥2.09 估算（含
    无用量的日子；今天尚未过完）」；从「余额明细」Tab 一次即落到「预计可用」摘要，`:focus-visible` 焦点环
    `outline: 2px solid rgb(65, 118, 230)`；Enter 键切换 `details.open` false→true，Space 键切回
    true→false；鼠标点击可展开/收起；390px 触屏视口下 `summary.tap()` 后 `details.open===true`；
    620/480/390px 三档视口下 `document.documentElement.scrollWidth===clientWidth`（均无横向溢出）；
    余额卡三列结构（`.dq-stat`×3：余额明细/预计可用/状态）未被破坏；切到 English 后摘要 `title` 与展开内容
    均为英文（"Based on ¥2.09 average daily spend over the last 7 days (including idle days; today is
    incomplete)"），无中文残留；语言复测完毕后已切回中文并确认 `/root/.dsh/settings.yaml` 的
    `locale.preference` 为 `zh`。console error 排除已知的登录流程自带的 `favicon.ico` 401（同轮次 34 记录的
    基线噪音，与本次改动无关）后为 0，pageerror 0。截图：`/tmp/dsh-runway-audit/zh-runway-open.png`、
    `en-runway-open.png`、`narrow-390-runway-open.png`。独立 QA：发现 1 个 P1（窄屏悬浮框互相遮挡）+
    1 个 P2（title 与展开内容重复），修复见下。

  - **修复轮次 1（独立 Critic P1 + P2）**：
    - Review / Critique：独立 Critic 用 Playwright 在 400px 视口实测复现——`.dq-balance-grid` 是
      `display:flex;flex-wrap:wrap`，窄屏（620px 及更窄）下三个 `.dq-stat`（余额明细/预计可用/状态）
      挤不下一行会换行；「余额明细」展开后 `.dq-remaining-breakdown` 是 `position:absolute`，绝对定位
      浮层不占正常流的空间，会直接悬浮盖住换行后紧邻其下方的「预计可用」——实测 `.dq-remaining-breakdown`
      矩形 x:65-194,y:128.5-179 与 `.dq-runway>summary` 矩形 x:65-121,y:153-180 重叠，点击
      `.dq-runway>summary` 被拦截超时。这个"绝对定位浮层 + flex-wrap 换行"结构问题源头是轮次 29 的
      `.dq-remaining-breakdown` 设计（早就有，只是此前「预计可用」是不可交互的纯 `<div>`，盖住了也没有
      功能损失），本轮把「预计可用」升级成 `<details>` 之后才把这块死区变成一个会被挡住、点不到的新增
      功能点——是本轮真实暴露的回归，必须修。同时 Critic 指出 `.dq-runway` 的 `summary title={runwayTitle}`
      和展开内容 `.dq-runway-detail` 文案完全重复，桌面 hover 时先看到自定义浮层、约 1 秒后浏览器原生
      `title` 提示再叠一层相同文字，双重提示；对照 `.dq-remaining` 的既有模式——它的 `title` 是
      `t('balance.breakdownTitle')`（"查看充值与赠送额度明细"）这种简短的"去看明细"提示语，和展开后的
      实际数据内容不同、不重复，`.dq-runway` 应该跟上同一套约定而不是直接复用完整说明句当 title。
    - Act：
      1. `styles.ts` 在既有 620px 断点（`.dq-balance` 等一整批组件已用的同一个媒体查询断点，非新拍数字）
         内新增规则：`.dq-balance-grid .dq-stat{flex:1 1 100%}` 让三个统计项在窄屏下总是各占一整行
         （而不是让 flex-wrap 的自动换行结果去决定哪两项恰好同行、哪项落单，行为不确定）；
         `.dq-remaining-breakdown,.dq-runway-detail{position:static;margin-top:6px;box-shadow:none;
         max-width:none;white-space:normal}` 把两个浮层从"悬浮在文档流之上、不占位置"改成"参与正常文档流
         排版、把自己所在的行撑高"——展开的浮层变成把当前这一整行（因为 1 已让每行只有一个 stat）撑高，
         而不是绝对定位悬浮到下一行盖住别人；`.dq-remaining-breakdown` 原本 `white-space:nowrap` 在窄屏
         下也一并覆盖为 `normal`，防止 static 布局下内容把行撑宽出视口（之前 nowrap 只在 absolute 悬浮、
         不参与主流宽度计算时才安全）。桌面态（>620px）两条规则都不生效，`.dq-remaining`/`.dq-runway`
         维持轮次 29/43 原有的 `position:absolute` 独立悬浮，互不影响、互不改变彼此的展开逻辑——没有引入
         受控 state 或互斥展开这类更重的方案，纯 CSS 断点局部覆盖，改动面最小。
      2. `locales.ts` 新增 `balance.runwayBreakdownTitle` 键（仿照 `balance.breakdownTitle` 的措辞），
         中文「查看预计可用天数说明」/ 英文 "View estimated runway details"；`dashboard.tsx` 把
         `.dq-runway>summary` 的 `title={runwayTitle}` 改成 `title={t('balance.runwayBreakdownTitle')}`，
         不再和展开内容重复。`LocaleKey` 类型从 `zh` 派生、`en` 声明为 `Record<LocaleKey,string>`，两个
         对象都补了这一行，跑 `typecheck` 校验过双语键集合一致（含 `test/i18n.test.ts` 的
         "两份词典键完全一致" + "英文词典不含未翻译中文" 两条单测）。
    - Verify：`pnpm run build` exit 0，`pnpm run typecheck` exit 0，`node test/run.mjs` 48/48 通过、
      exit 0。真实运行的 `dsh.service`（`http://127.0.0.1:3080`）上用 Playwright 复现 Critic 的场景——
      先点开「余额明细」`.dq-remaining`，再在其展开状态下操作「预计可用」`.dq-runway`：
      - 620/480/390px 三档窄屏视口下：`.dq-remaining-breakdown` 与 `.dq-runway>summary` 的
        `boundingBox()` 矩形 `overlap===false`（三档全部）；`.dq-runway>summary` 在此状态下点击
        **不再超时**（`click({timeout:3000})` 直接成功）、点击后 `details.open===true`；两浮层都展开后
        `.dq-runway-detail` 与 `.dq-remaining-breakdown` 仍 `overlap===false`；`document.documentElement`
        的 `scrollWidth===clientWidth`（三档均无横向溢出）；Tab 从「余额明细」summary 一步落到「预计
        可用」summary（`document.activeElement.closest('.dq-runway')!==null`），Enter 键可展开；
        `summary.tap()` 触屏路径可展开。390px 截图 `/tmp/dsh-r43-overlap/390-both-open.png` 可见三个
        统计项纵向堆叠、各占一整行，「预计可用」的浮层完整显示在「余额明细」浮层下方，两者不重叠、
        文字都完整可读。
      - 桌面 860/1440px 两档：同样先展开「余额明细」再点「预计可用」，两个浮层各自 `position:absolute`
        独立悬浮，`overlap===false`（本来就不重叠，桌面态未受影响）；860px 截图
        `/tmp/dsh-r43-overlap/860-both-open.png` 确认两浮层并排展开、互不干扰，与轮次 43 主改动实测的
        桌面行为一致，未被本次窄屏修复破坏。
      - console error 排除已知的 `favicon.ico` 401 基线噪音（用 `msg.location().url` 精确匹配，而非只
        匹配 `msg.text()`——`msg.text()` 本身不含 "favicon" 字样，只靠文本过滤会漏判，本次验证脚本已
        同时检查两处）后为 0，pageerror 0。验证脚本：
        `/root/.npm/_npx/e41f203b7505f1fb/verify-r43.mjs`（playwright-core 只能从这个已安装依赖的目录
        解析到，故脚本落在这里而非仓库内）。

  - **修复轮次 2（独立 QA，本 feature 最后一轮修复机会）**：
    - Review / Critique：独立 QA 用真实 Playwright hover（鼠标移到 summary 上、不点击）复测修复轮次 1
      的成果，发现虽然 `getComputedStyle(.dq-runway-detail).display` 报告 `"block"`，但
      `getBoundingClientRect()` 是 `{x:0,y:0,w:0,h:0}`——计算样式说"显示"，但实际渲染尺寸是零，用户
      hover 上去仍然什么都看不到。QA 尝试注入 `display:block !important` 强制覆盖仍是 0×0，排除了选择器
      优先级问题；又在一个完全独立、不含本项目任何代码的裸 `<details><summary>`+CSS `:hover` 测试页面上
      复现了同样的现象，确认这是**当前 Chromium 版本本身的平台行为**：一个未展开（`open` 为 `false`）的
      `<details>` 元素，它的非 `summary` 子元素即使被作者 CSS 设成 `display:block`，也不会真正渲染
      出来——这不是简单的 UA 样式表 `display:none`（那种可以被子孙 `display:block` 覆盖），而更像
      `content-visibility:hidden` 这类渲染层面"跳过整个子树"的机制，作者 CSS 对子孙元素的 `display`
      声明覆盖不了祖先的这种跳过。也就是说修复轮次 1 把 `.dq-runway` 从纯 `<div title>` 换成
      `<details><summary>` disclosure 这个方向本身是对的（不改就没有可聚焦、可键盘操作的触发器），但
      "让子元素在**未展开**状态下靠 CSS `:hover{display:block}` 显形"这条具体技术路径，在当前 Chromium
      下从一开始就不可能奏效，属于同一个方案里两个独立的问题被误判成了一个。**根因不是本轮或修复轮次 1
      引入的新 bug**，`.dq-runway-detail` 的展开机制在修复轮次 1 提交时就已经这样写，只是没有用真实
      hover（而非点击/键盘/触屏）系统性测过这条路径。QA 同时确认这个平台限制对本站现有的「余额明细」
      （`.dq-remaining`/`.dq-remaining-breakdown`，轮次 29 实现，用的是同一套"CSS `:hover` 让未展开
      `<details>` 子元素 `display:block`"技术）同样成立——轮次 29 当初"保留桌面 hover 快速预览"的验收
      在当前 Chromium 版本下实际上也已经失效，只是这次借「预计可用」的问题才被发现。任务明确要求本轮
      **只修 `.dq-runway`，不动 `.dq-remaining`**（那是轮次 29 的既有代码，不在本轮评审范围内，顺手改了
      反而扩大改动面），因此这里只记录、留给后续新开一个任务专门处理「余额明细」的同一问题，不在本轮
      动它的代码。
    - Act：抛弃"CSS `:hover` 让未展开 `<details>` 的子元素 `display:block`"这个技术方案，把 `.dq-runway`
      改成一个真正的**受控组件**：`dashboard.tsx` 的 `BalanceDashboard` 新增两个 state——`runwayHovering`
      （鼠标/指针是否悬停在整个 `.dq-runway` 子树上）、`runwayManuallyOpened`（用户是否通过点击/键盘/
      触屏主动展开过，会一直保持到再次点击/Enter/Space/再次 tap 收起）。`<details>` 的 `open` 属性改成
      `open={runwayHovering || runwayManuallyOpened}`（受控，鼠标一旦真的移到它或它的后代（含浮层本身）
      上方，`open` 就变成真的 `true`——真正 open 的 `<details>`，其子元素在当前 Chromium 下会正常渲染，
      不再触发上面那条平台限制），`onPointerEnter`/`onPointerLeave`（而不是 `onMouseEnter`/`onMouseLeave`）
      挂在 `<details>` 上更新 `runwayHovering`——用 Pointer Events 是因为触屏 tap 后合成的鼠标事件序列在
      一些浏览器上会让 `:hover`/`mouseenter` 状态"粘住"直到点别处才清除，而 Pointer Events 对 touch
      指针会在 `pointerup` 之后不久就正常派发 `pointerleave`，不会有这个"触屏误触发常驻 hover 态"的
      问题。**没有采用"监听原生 `onToggle` 事件读取 `e.currentTarget.open` 来判断用户是否手动展开"这个
      任务描述里给出的备选实现**：现代 Chromium（约 120+）对 `<details>` 的 `open` 属性无论是被脚本
      赋值（我们的受控 `open` prop 因为 `runwayHovering` 变化而改变）还是被浏览器原生点击/键盘默认行为
      切换，都会触发 `toggle` 事件——这意味着单纯"`onToggle` 里读到 `open` 就当作用户手动展开"这条简单
      规则，会把"鼠标只是移上去、React 因此把受控 `open` 设成 `true`"这类程序化变化，和"用户真的点了一下"
      混为一谈，导致 hover-only 预览被错误地"钉死"成手动展开状态、鼠标移开后不会自动收起——这正是任务
      要保留的核心行为（hover-only 预览应该在移开后自动收起）会被破坏的地方。改用更直接、不依赖"区分
      程序化 toggle 事件和用户 toggle 事件"这类隐含时序假设的方式：`<summary>` 的 `onClick` 里先
      `e.preventDefault()` 挡掉浏览器对该点击（包括 Enter/Space 键盘激活合成出的 click 事件——`<summary>`
      对 Enter/Space 的默认激活行为本身就是派发一个 click 事件，和鼠标点击走同一条默认动作）的原生
      展开/收起默认动作，再自己 `setRunwayManuallyOpened(v => !v)` 翻转"手动钉住"状态——这样"用户到底
      点没点"这件事完全由我们自己的 `onClick` handler 一次性决定，不需要在 `onToggle` 里反推 toggle
      事件是程序触发还是用户触发。`onPointerEnter`/`onPointerLeave` 挂在整个 `<details>`（而不是只挂
      `<summary>`）上，是为了复刻旧版 CSS `.dq-runway:hover` 的语义——鼠标从 `<summary>` 移进已展开的
      `.dq-runway-detail` 浮层（`position:absolute`，视觉上悬浮在正常文档流之外，但仍是 `<details>`
      的 DOM 后代）不应该被当成"离开了"，`pointerenter`/`pointerleave` 按 DOM 树、而不是按 CSS 视觉盒
      判定"进入/离开"边界，这一点和旧的 `:hover` 伪类完全一致，改造后不会出现"鼠标移进浮层反而立刻自己
      收起"的新回归。`styles.ts` 里 `.dq-runway-detail` 原来的选择器
      `.dq-runway:hover .dq-runway-detail,.dq-runway[open] .dq-runway-detail{display:block}` 简化成
      `.dq-runway[open] .dq-runway-detail{display:block}`——`:hover` 分支现在是死代码（`open` 现在真的
      随 hover 同步变化，覆盖了 `:hover` 原本想覆盖的全部场景），保留只会误导后来者以为 hover 展示还在
      靠 CSS 驱动，删掉换成一段注释说明新的受控组件方案和为什么旧写法在当前 Chromium 下走不通。未改动
      `.dq-remaining`/`.dq-remaining-breakdown` 的任何代码（按任务要求排除在本轮范围外）。
    - Verify（自测）：`pnpm run build`、`pnpm run typecheck`、`node test/run.mjs`（50/50）均 exit 0。
      `systemctl restart dsh.service` 后 `is-active`=`active`，Playwright（Chromium r1228，走真实登录
      cookie，会话「额度加载缓存优化」→「额度」tab）实测：
      1. **真实鼠标 hover、不点击**：`page.mouse.move()` 到 `.dq-runway>summary` 中心后，
         `document.querySelector('.dq-runway').open===true`，`.dq-runway-detail` 的
         `getBoundingClientRect()` 是 `{w:110,h:90}`（非零，QA 报告的 0×0 复现问题已修复），
         `textContent` 是完整的说明文字「按近 7 天日均 ¥2.09 估算（含无用量的日子；今天尚未过完）」；
         `page.screenshot()` 截图 `/tmp/dsh-r43-2/01-hover-only.png` 可见浮层带真实边框/阴影/文字
         悬浮在「预计可用」下方，与「余额明细」并排展示互不重叠。鼠标移开（`mouse.move(5,5)`）后
         `details.open` 变回 `false`、浮层 rect 变回 `{w:0,h:0}`——hover-only 预览按预期自动收起。
      2. **点击展开/收起**（Playwright `.click()` 会先把鼠标移到元素上再点，天然覆盖"先 hover 再点"
         这个真实用户最常见的路径）：点一次后 `open===true`；之后把鼠标移开（`mouse.move(5,5)`），
         `open` 仍为 `true`、浮层仍非零尺寸——手动展开不受鼠标离开影响，与"钉住直到用户再次操作"的
         设计意图一致；再点一次后（点击瞬间鼠标又回到元素上，`open` 会因为 `runwayHovering` 短暂仍是
         `true` 而暂时保持 `true`，这是预期行为——鼠标确实还悬停在上面）、随后移开鼠标，`open` 才变回
         `false`、浮层归零——两次点击配合鼠标离开，构成一次完整的"展开→收起"闭环，未发现状态卡死或
         意外常驻展开的情况。
      3. **键盘 Tab + Enter/Space**：先 `.focus()` 到相邻的「余额明细」`<summary>`（同一个 `.dq-stat`
         网格里紧邻的、真实可 Tab 到的元素，复刻修复轮次 1 报告里"从余额明细 Tab 一次落到预计可用"的
         起点），按一次真实 `Tab` 键后 `document.activeElement.closest('.dq-runway')!==null`——焦点
         正确落到「预计可用」`<summary>`；此时 `getComputedStyle` 读到的 `outline` 是
         `rgb(65, 118, 230) solid 2px`、`outlineOffset` 是 `3px`，与修复轮次 1 记录的
         `:focus-visible` 焦点环规格完全一致，未受控件化影响。按 `Enter` 后 `open` 变 `true`（浮层
         `{w:110,h:90}`），再按一次 `Enter` 变回 `false`；单独测过 `Space` 键同样能展开/收起一轮，
         两个键都按预期在受控组件下正常工作（因为 `<summary>` 对两个键的默认激活行为都合成同一个
         `click` 事件，走的是同一条 `onClick` 逻辑）。
      4. **触屏 tap**（390×844、`hasTouch:true`、`isMobile:true` 的独立 context，非复用桌面 context）：
         `summary.tap()` 后 `open===true`、浮层 `{w:260,h:54}`（非零，390px 窄屏下的 `position:static`
         版式，浮层撑高了自己所在的行而不是悬浮覆盖），再 `tap()` 一次变回 `false`；截图
         `/tmp/dsh-r43-2/06-touch-tap-open.png` 可见浮层完整展示、未被截断或被相邻卡片遮挡。
      5. **窄屏不遮挡**：390px 触屏 context 下 `document.documentElement.scrollWidth===clientWidth===390`
         （无新增横向溢出），与修复轮次 1 已验证过的 620/480/390 三档窄屏防遮挡布局（`.dq-balance-grid
         .dq-stat{flex:1 1 100%}` + 两个浮层在窄屏下切 `position:static`）没有冲突——这些 CSS 规则本轮
         未改动，`.dq-runway` 控件化只影响 `open` 从哪里来，不影响窄屏断点的布局规则。
         console error（排除已知 `favicon.ico` 401 基线噪音）0 条，pageerror 0 条（桌面 + 触屏两个
         context 都检查过）。验证脚本：`/tmp/dsh-r43-2/verify.mjs`，截图目录 `/tmp/dsh-r43-2/`
         （`01-hover-only.png`/`02-after-click-open.png`/`03-still-open-mouse-away.png`/
         `04-after-toggle-close.png`/`05-keyboard-enter-open.png`/`06-touch-tap-open.png`/
         `07-desktop-hover-full-card.png`，另有 `results.json` 保存全部实测数值）。
    - 独立复核（Critic，最后一轮）：搭建独立的 React 18+esbuild 测试台，把当前 `dashboard.tsx`/
      `styles.ts` 里 `.dq-runway` 的真实实现原样复制进去，用真实 Playwright 鼠标/键盘/触屏输入
      （非 `dispatchEvent` 合成事件）驱动，独立复现"真实 hover 出现非零尺寸浮层"（成立）、"点击钉住/
      再点收起"（成立，无卡死或错乱状态）、"键盘 Tab+Enter/Space 展开、`:focus-visible` 焦点环正常"
      （成立）、"触屏 tap 展开/收起，且 `runwayHovering` 全程不被触屏误置为 `true`"（成立，证明
      Pointer Events 选型确实避免了触屏下的常驻 hover 态）、"375px 窄屏下不与余额明细互相遮挡"（成立）。
      唯一发现的偏差：Builder 关于"鼠标从 summary 移进悬浮浮层不会被误判为离开"这条论证，独立复核用
      真实连续鼠标轨迹（含纯垂直、含斜向多组路径）反复复现均为**不成立**——因为 `.dq-runway-detail`
      是 `position:absolute`，不撑大父级 `<details>` 的实际布局盒，summary 底部到浮层顶部之间那段
      `top:calc(100%+6px)` 的空隙没有任何属于 `.dq-runway` 的可命中区域，连续移动的鼠标路径穿过这段
      空隙时会先命中外部兄弟/祖先元素触发 `pointerleave`，浮层在鼠标真正到达之前就已收起——判定为
      P2（代码注释的这句论证事实有误，可能误导后来维护者，但不影响验收标准本身：hover/点击/键盘/触屏
      四条必需路径全部独立验证通过，且"移入浮层"从来不是验收标准要求的场景，只是 Builder 为解释实现
      选择多写的一句话）。**结论：验收标准"桌面 hover 有可见反馈"这次真正兑现，判定该 feature 已修复，
      不判定为阻塞。**
    - **待办（不在本轮范围内，供后续新开任务）**：「余额明细」（`.dq-remaining`/`.dq-remaining-breakdown`，
      轮次 29）用的是和本轮修复前「预计可用」完全相同的"CSS `:hover` 让未展开 `<details>` 子元素
      `display:block`"技术，在当前 Chromium 版本下有同样的"hover 上去内容渲染尺寸为 0"的平台限制问题，
      只是点击/键盘/触屏路径（真正 `open=true`）不受影响。建议后续单独开一个任务，把本轮同样的"受控
      `<details>` + hover/toggle 双状态"方案套用到 `.dq-remaining` 上；不建议在这轮顺带改，任务范围已
      明确要求本轮只动 `.dq-runway`。


- （轮次 42）`docs(dashboard)`: 宽屏内容宽度机会评估——评估后判定不改。
  - Review / Critique：脑暴轮次 #7 最后一个候选。审计原文说 1440px 视口下
    `.dq-balance{max-width:860px;margin:0 auto}` 两侧各闲置约 290px，1024 与 1440 之间没有结构性差异，
    看起来像"没用满屏幕"的浪费。任务要求先评估是否值得改，折中方案限定在"提高 max-width"或"模型/会话
    排行两张分析卡在 ≥1200px 并排"，不做更大改动；也允许"评估后判定不做"作为合法结果（参照轮次 20
    「悬浮窗直达额度能力边界确认」的先例）。
  - Act（这是评估动作，非代码改动）：真实截图 + 实测数据，不凭直觉判断。
    1. 用本机 `dsh.service`（`http://127.0.0.1:3080`，账号见 `LEARNINGS.md` 登录门）+ Playwright 在
       1440/1600/1920px 三档视口下量 `.dq-balance` 实际宽度与两侧空白：1440px 下内容宽度 868px（含
       max-width 860px 计入的少量边界像素），两侧各留白 286px（占视口 39.7%）；1600px 留白 366px
       （45.8%）；1920px 留白 526px（54.8%）——空白占比随视口线性增长，且不封顶，复核了审计原文
       "约 290px"这个数字在 1440px 下基本准确。
    2. 关键对照：同一 DSH 窗口的 Chat 对话消息列宽度在 1440px 与 1920px 视口下实测**完全相同**（748px，
       `[data-slot*="message"]` 系元素），说明宿主自己的正文阅读列宽本就不随视口缩放——`.dq-balance` 的
       860px 封顶（比 Chat 的 748px 还宽）是在跟随宿主已有的"内容宽度与视口解耦、居中定宽阅读列"惯例，
       不是插件自己发明的、和宿主风格脱节的收窄。截图证据：`/tmp/dsh-r42/chat-1920.png`（Chat 消息列
       748px 居中）、`/tmp/dsh-r42/quota-viewport-1920.png`（额度页同一视口下的实际留白）、
       `/tmp/dsh-r42/wide-1440.png`/`wide-1600.png`/`wide-1920.png`（`.dq-balance` 面板本身，三档一致，
       印证"内容不随视口变宽"是设计意图而非 bug）。
    3. 检查"提高 max-width"这条折中路径本身的副作用：站内所有 footnote/说明性正文（`.dq-pricing-foot`/
       `.dq-coverage-note`/`.dq-peak-foot`/`.dq-cache-foot`/`.dq-session-foot`，均 12px/line-height
       1.55-1.6）都是卡片全宽、没有自己的行长上限，直接吃 `.dq-balance` 的 `max-width`。粗暴调大
       `max-width` 会让这些说明性长句的单行字符数一起变长，13px/12px 字号下超出常见排版建议的舒适行长
       （中文一行约 20-45 字为宜），反而降低这些次要说明文字本身的可读性，与本任务验收标准里
       「Operate 类工具单列内容本身是合理的克制设计」这条既定判断相悖。
    4. 检查"模型/会话排行并排"这条路径：两张卡当前 820px 宽（1440px 视口下），`.dq-rank-name`/
       `.dq-session-title` 都是 `overflow:hidden;text-overflow:ellipsis;white-space:nowrap` 单行截断。
       若要并排还不显局促，需要两条路径之一：(a) 保持 `.dq-balance` 860px 总宽不变，两卡各分到约
       400px——实测当前数据能放下，但真实会话标题可以任意长（如"写一个查看DeepSeek额度的dsh插件的功能
       扩展与优化方案（第二轮迭代）"这类更长标题），减半宽度会明显提高截断概率，这正是轮次 38
       LEARNINGS 里踩过的"要用该格式能产生的最坏字符串测试，不能只用当天巧合较短的真实数据"那类风险；
       (b) 只为这两张卡单独开一个更宽的子容器——这会在同一页面内出现"其余 7 张卡 860px、这两张卡
       1200px+"的宽度跳变，与轮次 36-41 建立的"全站统一卡片家族、只用 padding/边框/字号分两档权重，
       不引入结构性差异"的既有规范冲突，属于任务边界里明确排除的"大改卡片结构"。两条路径都不干净。
  - 结论：**不改动代码**。1440-1920px 下的两侧留白是真实存在的（39.7%-54.8%，随视口线性增长），但
    它不是"没用满屏幕"意义上的缺陷——它复刻了宿主 Chat 对话区自己的定宽居中阅读列惯例（748px，且不
    随视口缩放），本插件的 860px 封顶只是延续这个已有的产品级设计语言；本项目当前方向是 Operate
    模式工具类界面，把可扫读性/一致性/信息密度优先于"填满屏幕"（这条判断在本任务验收标准里已写明，
    与 DESIGN_NOTES.md 卡片权重分级、"不引入结构性差异"等既有克制取向精神一致）；折中方案里
    "提高 max-width"会拉长站内说明性正文的行长、伤害次要文字可读性，"两卡并排"要么明显提高会话/模型
    长标题的截断概率、要么在页面内制造宽度不一致，两者都不是干净的净收益。这是一个"眯眼测试下留白确实
    存在，但留白本身是合理设计选择而非可修复缺陷"的判断，与轮次 20「悬浮窗直达额度能力边界确认」同类：
    评估后判定不做也是有效交付。脑暴轮次 #7 的全部 9 个候选（3 个 P1 + 6 个 P2）至此处理完毕，8 个
    落地改动 + 1 个评估后判定不做。
  - Verify：无代码改动，`.dq-balance`/`.dq-card`/`.dq-rank`/`.dq-sessions` 相关样式与结构原样保留；
    未触碰费用/计价/统计口径，未新增业务功能；未跑 build/typecheck/test（无代码变更，跑了也是空 diff）。

- （轮次 41）`style(ui)`: 字号档位收敛。
  - Review / Critique：P2 脑暴轮次 #7 的原始审计（轮次 34 之前做的）说全站 11/11.5/12/12.5px 四档
    挤在 1.5px 区间内、合计约 52 处使用；但审计之后轮次 34/36/38 又新增了几处字号规则（轮次 34 悬浮窗
    折叠总额 15px、轮次 36 主卡片标题 13px、轮次 38 窄屏用量统计 13px），审计原文数字已经过时，验收标准
    明确要求先重新审计。对 `src/client/styles.ts` 当前状态做了一次完整重新统计（Python 脚本按 `{...}`
    拆分规则、逐条提取 `font-size` 声明，覆盖全部 81 处选择器，非仅 grep 计数）：**11px 13 处 / 11.5px
    19 处 / 12px 19 处 / 12.5px 2 处**（这四档合计 53 处，与旧审计的"约 52 处"基本吻合，说明这个致密
    区间本身没有被近几轮改动动过，仍然是真问题）；另外还有 9px(1)/10px(5)/10.5px(1)/13px(13，含轮次
    34/36/38 新增的三种 13px 用法)/14px(3)/15px(1，轮次 34)/18px(1)/22px(2)/24px(1) 分布在这个区间之外，
    与 11-12.5 的间距均≥1px，本身已可辨识，不属于本轮"密集区间"问题、不touch。逐条读了 11/11.5/12/12.5
    这 53 个选择器的实际语义角色（非仅数值排序），发现四档已经不是随机分布，而是各自聚集出清晰的语义
    子群：11px＝dt 风格小标签/徽章/胶囊/占比（`.dq-stat-label`、`.dq-period-label`、
    `.dq-coverage-metrics dt`、`.dq-delta`、`.dq-pricing-now`、`.dq-coverage-status`、`.dq-rank-share`、
    `.dq-chart-peak`、`.dq-model-tag` 等）；11.5px＝次要说明性长文本（`.dq-period-sub`、
    `.dq-budget-meta`、`.dq-pricing-table`/`.dq-pricing-foot`、`.dq-coverage-brief`/`-range`/`-note`/
    `-warning`、`.dq-peak-legend`/`-foot`、`.dq-cache-legend`/`-foot`、`.dq-session-sub`/`-foot`、
    `.dq-rank-sub`、`.dq-setting-hint`、`.dq-toggle-hint`、`.dq-tip`、`.dq-crash`、`.dq-window-btn`）；
    12px＝小节标题/按钮/正文（`.dq-card-title`、`.dq-budget-title`、`.dq-coverage-title`、
    `.dq-chart-title`、`.dq-links-title`、`.dq-export-btn`/`-menu button`、`.dq-model-btn`/`-item`、
    `.dq-chart-switch-btn`、`.dq-legend`、`.dq-alert-icon`、`.dsh-quota-row`、`.dq-sync`、
    `.dq-refresh-btn` 等）；12.5px 只有 `.dq-alert`（预算告警横幅正文）与 `.dq-empty`（空态提示句）两处，
    读起来像"完整句子，需要比标签更好读"。问题不在于语义混乱——恰恰相反，这四档语义已经足够清楚，但
    0.5px 步进本身就是浏览器亚像素渲染会抹平的差异，四档挤压成"数值上分四层、视觉上一层"，纯粹是维护
    负担而非实际的可辨识层级，这正是原始审计判断的核心问题，重新审计后依然成立。功能扫描继续遵循用户
    方向：只调 font-size 数值，不碰任何计价/统计口径，不改选择器结构、不改颜色/字重/间距。
  - Act：把 11/11.5/12/12.5px 四档收敛为两档整数像素值 **11px / 12px**（1px 整数级差，不再是浏览器会
    吃掉的 0.5px 步进），按"就近取整数、且语义更贴近哪个新档"归类，不是盲目四舍五入：
    1. 11.5px（19 处）全部并入 **12px**——这批本来就是"次要说明性长文本"，语义上更接近 12px 现有的
       "标题/按钮/正文"文本群（都是要被完整阅读的内容，而不是一眼扫过的徽章标签），+0.5px 是安全方向
       （变大不会引入截断/溢出，且这 19 个选择器全部是自由流式文本或自适应宽度容器——`.dq-pricing-table`
       本身就包在 `.dq-pricing-body{overflow-x:auto}` 里，`.dq-tip`/`.dq-window-btn` 都是内容自适应宽度，
       没有一个是固定宽度会被撑破的场景）。这批里专门检查了 `.dq-window-btn`（统计周期切换 7/30/90/365天
       分段按钮）——它和已经是 12px 的 `.dq-chart-switch-btn`（逐天/逐小时分段按钮）、`.dq-model-btn`
       （模型筛选按钮）本是同一个"分段控件/过滤按钮"家族，历史上只是凑巧各自写了不同数值，合并后三者
       第一次真正统一成同一档，属于验收标准第 3 条说的"语义角色相近、历史凑巧写了不同数值"的典型案例。
    2. 12.5px（2 处：`.dq-alert`、`.dq-empty`）并入 **12px**——0.5px 的"读起来该更大一点"的意图本来就
       没有实际视觉效果（凭肉眼分不出 12 与 12.5），与其保留一个不起作用的假差异，不如直接并入 12px 这个
       更大的正文/标题池；这个方向是缩小 0.5px，两处都是自由流式文本块，没有宽度约束，不会引入新截断。
    3. 11px（13 处）**原样保留、不动**——它是"dt 标签/徽章/占比"这一批，语义上和 11.5→12 合并后的那批
       "说明性长文本"本来就不是一回事（微标签 vs 可读句子），继续做全站最小的文字层级，天然和 12px 拉开
       整整 1px 的可辨识差距，不需要为了"凑成更少档位"再往上并——验收标准第 3 条明确要求"语义角色不同
       可以保留区分"，这正是那种情形。
    结果：全站小字号从"11/11.5/12/12.5px 四档、53 处使用"收敛为"11px（13 处不变）/ 12px（40 处，
    19+19+2 合并而来）两档、且两档间隔从最密处的 0.5px 变成完整的 1px"。**明确不动的锚点**（逐条核对
    过验收标准点名的几处）：`.dq-card--primary .dq-card-title`（轮次 36，13px/700，主/次卡片权重锚点，
    本轮改动区间在 11-12.5px，13px 完全不在范围内，未触碰）；`.dq-usage-totals .dq-stat-value` 在
    620px 媒体查询内的 13px 覆盖（轮次 38，专为压力数据不断行选定的字号，同样不在 11-12.5px
    区间，未触碰，见下方 Verify 的压力复测）；`.dsh-quota-collapsed-total`（轮次 34，15px，悬浮窗折叠
    总额，不在区间内，未触碰）；`.dq-remaining`/`.dq-period-cost`（轮次 35，22px hero 数字锚点，未触碰）。
    顺手评估了字重：`font-weight` 现存 400/500/550/600/650/680/700 共 7 档，比字号更碎，但 650/680/700
    这几档分别锚定在轮次 35（680＝hero 数字权重，特意从基线 650 拉出区分度）、轮次 36（700＝主卡片标题
    权重，特意从基线 600 拉出区分度）这两个刚验证过的既定设计决策上，合并会直接推翻这两轮已经截图验证
    过的效果且没有已知的可读性收益；验收标准第 5 条明确说这项可选、要保守，本轮判断不动，只记录评估结论。
  - Act（styles.ts 内新增设计注释）：在 `.dq-stat-label` 前新增一段两档体系的说明注释，解释 11px/12px
    各自的语义边界、为什么 11.5→12 是安全方向、为什么 11px 不参与合并，以及"以后新增这个区间的字号时
    不要再引入 0.5px 中间值，如果确实需要和这两档拉开，去用已经建立的其它档位（10px 图标类字符 / 13px+
    hero 邻近文本）"，避免未来重蹈"数值上分层、视觉上没分层"的覆辙。
  - Verify（自测）：42/42 单测、`pnpm run build`、`pnpm run typecheck` 全过（exit 0，三门与改动前一致）。
    `dashboard.tsx`/`widget.tsx` 全文 grep 确认没有内联 `fontSize`/`font-size`，改动只涉及 `styles.ts`
    一个文件。Playwright 真实登录后端到端验证：
    - 计算样式核对：合并后 `.dq-window-btn`/`.dq-period-sub`/`.dq-coverage-brief`/`.dq-setting-hint`/
      `.dq-toggle-hint` 均为 `12px`（原 11.5px）；`.dq-stat-label`/`.dq-period-label`/
      `.dq-coverage-status`/`.dq-rank-share` 均保持 `11px`（未合并组，验证未被误改）；
      `.dq-card--primary .dq-card-title` 仍是 `13px`、非主卡片的 `.dq-card-title`（用量热力图/高峰闲时/
      缓存命中/模型排行/会话排行/设置，逐条读取全部 6 个非主卡标题）均为 `12px/600`，与轮次 36 建立的
      主/次卡片两档权重完全一致，未产生新的层级坍塌；`.dq-remaining`/`.dq-period-cost` 仍是 `22px`；
      基线 `.dq-stat-value`（非余额，如用量分解数字/预计可用天数）仍是 `18px`，只有 `.dq-remaining`
      单独实例走 `22px` 覆盖，符合轮次 35 既定设计。
    - 620px 窄屏用量统计压力复测（复用轮次 38 的方法论，构造 `9999.9万`/`1234.5亿`/`99,999` 这类长度
      上限附近的压力值直接改写 `textContent`，不是等真实数据凑巧变长）：320/480/620px 三档
      `.dq-usage-totals .dq-stat-value` 计算样式仍为 `13px`（轮次 38 的覆盖规则完全没被本轮触碰，
      因为它已经不在 11-12.5px 区间内），4 个压力值在 83/163/233px 列宽下 `scrollWidth<=clientWidth`
      全部成立、`getClientRects().length===1`（未断行未截断），与轮次 38 验证过的结论一致，没有退化。
    - 四档视口（1440/620/480/320px）`document.scrollWidth===clientWidth` 全部成立，无新增横向溢出。
    - 中英文双语覆盖：从 DSH Settings → 语言 真实点击切到 English（非 URL 参数或 mock），复测同一批
      选择器字号完全一致（`primaryTitle:13px`、`windowBtn:12px`、`settingHint:12px`、`statLabel:11px`），
      英文版「7 days/30 days/90 days/1 year」窗口切换按钮、「Daily/Hourly」图表切换按钮（比中文「7天/
      30天/90天/1年」「逐天/逐小时」明显更长）在合并后的 12px 下，620px 窄屏同样不换行不溢出；验证完
      切回中文，`新会话`/`额度` 等中文关键字重新出现，确认语言状态已还原，不残留在 English。
    - 截图对比：`/tmp/round41-full-desktop-zh.png`（桌面整页）、`/tmp/round41-balance-card-zh.png`
      （账户余额卡）、`/tmp/round41-widget-expanded-zh.png`/`round41-widget-collapsed-zh.png`（悬浮窗
      展开/收起两态）、`/tmp/round41-620-zh.png`（620px 整页）、`/tmp/round41-stress-320.png`（320px
      压力测试整页，4 个压力值清晰落在各自列内无断行无重叠）、`/tmp/round41-en-full2.png`/
      `/tmp/round41-en-620-2.png`（英文桌面/620px），肉眼比对卡片标题层级（主卡粗黑 13px vs 次卡灰
      12px）、悬浮窗身份标签与折叠总额、窄屏用量统计四宫格均与合并前设计意图一致，未见层级坍塌或断行。
    - console：全程只出现登录流程自带的 1 条 `favicon 401`（已知噪音，非本轮引入），0 条 pageerror。
    - 待独立 QA 验证：本轮验证脚本与截图均为自测产出（`/tmp/round41-*.mjs`、`/tmp/round41-*.png`），
      建议独立 QA 复核合并方向（11.5→12 而非 11.5→11）是否与既定"避免文字整体缩小"的可读性直觉一致，
      并额外检查悬浮窗内 `.dsh-quota-row`（12px，widget 内今日消耗等行文本，本轮未触碰但与本次改动的
      12px 主档同值，值得确认视觉上仍协调）。

- （轮次 40）`style(dashboard)`: 拆分超载的 DSH 用量卡片。
  - Review / Critique：P2「DSH 用量」卡把 4 个时间口径不同的子模块塞进一张卡——①近 30 天用量总数统计
    （`.dq-usage-totals`）②逐天/逐小时柱状图（含模型筛选、统计周期 7/30/90/365 天切换、图表指标切换）
    ③近一年热力图（固定口径，不受②的周期控件影响）④覆盖诊断 disclosure（全量扫描信息）。①②共享同一套
    可变周期口径，③固定近一年，④是独立于周期之外的数据完整性审计——四者挤在同一卡片边框内，实测卡片高度
    约 550px，是全站最臃肿的信息容器，也让"统计周期切换"控件在语义上笼罩了不受它影响的热力图。功能扫描
    继续遵循用户方向：只重新分组已有 JSX 到新卡片容器，不碰任何统计口径、聚合逻辑、数据获取方式，图表/
    disclosure/热力图组件内部实现原样不动。
  - Act：把「DSH 用量」拆成 2 张卡片，占据原卡片位置（消耗概览之后、高峰/闲时分布之前，不打乱其余卡片
    顺序）：
    1. 「用量趋势」（`t('usage.trendTitle')`，保留 `.dq-card--primary` 主卡权重）：用量总数统计
       （`.dq-usage-totals`）+ 逐天/逐小时柱状图（模型筛选 `ModelPicker`、统计周期 `UsageWindowPicker`、
       图表指标 `ChartMetricPicker`、导出菜单 `ExportMenu`）+ 覆盖诊断 `CoverageDiagnostics`。选择把
       覆盖诊断留在这张卡底部而非单独成卡：它描述的是"这批用量数据的完整性"，与用量总数/图表关系最近，
       DESIGN_NOTES 早有"数据完整性属于用量图表的审计信息"的既定原则，独立成卡反而会为一个折叠态本就
       很轻的 disclosure 多背一次卡片开销。统计周期切换控件按验收标准第 5 条留在这张卡（唯一受它影响
       的内容都在这里），不孤立出现在别处。
    2. 「用量热力图」(`t('heatmap.title')`)：近一年热力图单独成卡，不加 `.dq-card--primary`——判定为
       次级分析卡：它和高峰/闲时分布、缓存命中与节省这些"深入分析、非首屏必读"的卡片同一性质，日常最需要
       盯的是可变周期的用量趋势与总数，热力图是长期模式的辅助浏览；DESIGN_NOTES 信息层级第 3 条"累计用量
       统计＋图表"这句写在拆分之前，泛指整个原卡片，拆分之后需要重新判断哪半边才是"首屏必读"，我判断是
       趋势卡而非热力图卡，理由见 DESIGN_NOTES 本轮新增说明。渲染条件从原来的 `usage!==null &&
       activeWindow!==null` 改为只判 `usage!==null`——热力图数据（`usage.heatmap`）本就不依赖
       `activeWindow`/`windowDays`，解耦后更准确地反映它的固定口径，不是新的统计逻辑，只是渲染门槛
       与它实际依赖的数据对齐。
    新增 `HeatmapSkeleton` 沿用 `UsageSkeleton` 已用的 `.dq-skel-bars`/`.dq-skel-bar` 骨架屏语言（52 根
    参差高度的占位条），避免热力图卡在首次加载（无缓存）时短暂掉进"空态文案冒充加载态"（DESIGN_NOTES
    禁止的反模式）。翻译键：`usage.title`（原 `DSH 用量（tokens）`）改名为 `usage.trendTitle`
    （`用量趋势（tokens）`/`Usage trend (tokens)`），新增 `heatmap.title`（`用量热力图`/`Usage heatmap`），
    中英文 `locales.ts` 两处同步补齐，`chart.heatmapTitle`（热力图卡内 `.dq-chart-title` 小节标题「近一年 ·
    每日用量热力图」）沿用不变。`styles.ts` 未改一行——两张新卡复用既有 `.dq-card`/`.dq-card--primary`/
    `.dq-card-title`/`.dq-chart-title` 体系，`.dq-chart-title:first-of-type{margin-top:0}` 在热力图卡内
    继续按预期生效（该卡内热力图小节标题是唯一一个 `.dq-chart-title` 直接子节点）。
  - Verify（自测）：`pnpm run typecheck` exit 0，`pnpm run build` exit 0（`lib/client.js` 176.0kb），
    `node test/run.mjs` 42/42 通过、exit 0。源码检查：`grep -n "dq-card-title\">{t("` 确认卡片顺序为
    余额→消耗概览→用量趋势→用量热力图→高峰/闲时→缓存→模型排行→会话排行→设置（9 张），全站不再有
    `t('usage.title')` 残留引用。图表/disclosure/热力图内部实现（`charts.tsx`/`chart-focus.ts`）本轮未碰
    一行，键盘 roving tabindex、tap-to-pin、导出菜单、模型筛选下拉等交互代码路径未变。**待独立 QA 验证**：
    620px 视口实机截图确认两张新卡无横向溢出、卡片高度变化符合预期；键盘 Tab 遍历确认覆盖诊断 disclosure
    与图表焦点在新容器边界下仍可达；中英文切换下两张新卡标题不换行不溢出；触屏 tap 固定 tooltip 在热力图
    独立卡片内仍正常。

- （轮次 39）`style(dashboard)`: 合并官方平台卡片。
  - Review / Critique：P2 「官方平台」卡只放 3 个链接按钮，高度约 99.5px、全站最矮，却背着和信息密集
    卡片同规格的边框 + 标题 + 16px 内边距。轮次 36 给卡片建立主/次视觉权重分级后，「官方平台」和「设置」
    是仅存的两张不参与分级的导航/配置类卡片，「官方平台」本身信息量太少，独占一整张卡片位不划算。审计
    原文建议并入「设置」卡（轮次 13 已把「官方平台」下沉到导航区、紧邻「设置」，两者本就是同一信息层级）。
  - Act：把「官方平台」卡的 3 个链接（`t('links.usage')` 查看额度/用量、`t('links.apiKey')` 生成 API Key、
    `t('links.status')` 服务状态）整体搬进「设置」卡（`src/client/dashboard.tsx` 1242-1298 行），卡标题
    仍是 `t('settings.title')`；在标题正下方新增一个 `.dq-links-title` 小节标题渲染原 `t('links.title')`
    （"官方平台"/"DeepSeek Platform"），复用 `.dq-budget-title`/`.dq-coverage-title` 已定的
    `12px/600/label-primary` 字号字重取色组合，不新开档位。链接区与后面的悬浮窗开关/余额预警线/月度预算
    之间的视觉分隔，直接在只用了一次的 `.dq-toggle` 选择器上追加 `margin-top:14px;padding-top:14px;
    border-top:1px solid --dsw-alias-border-l1`——与卡内既有的 `.dq-setting`/`.dq-budget`/`.dq-pricing`/
    `.dq-coverage` 是同一套 14px/border-top 分节手法，不新建包裹 div、不发明新的分隔语言。`.dq-links`/
    `.dq-link` 样式本就与卡片解耦（未被 `.dq-card` 限定），原样复用。同步更新 `styles.ts` 里轮次 36 那条
    "官方平台/设置都不加 primary 修饰类"的注释与 `DESIGN_NOTES.md` 对应段落，避免文档描述与代码结构脱节。
    未新增/删除任何翻译键（`links.*`、`settings.*` 中英文键值原样保留，只是渲染位置从独立卡片挪到「设置」
    卡内部），未触碰计价/统计口径，不涉及 `src/index.ts` 等 host 端代码。
  - Verify（自测）：`pnpm run build` / `pnpm run typecheck` / `node test/run.mjs`（42/42）均 exit 0。
    Playwright 真实登录（1440px 桌面）实测：`.dq-balance` 下卡片容器数从 9 降到 8，卡片标题顺序为
    账户余额→消耗概览（费用为估算）→DSH 用量（tokens）→高峰/闲时分布→缓存命中与节省→模型成本排行·近30天→
    会话成本排行·近30天→设置，「官方平台」不再作为独立卡片标题出现；「设置」卡内部 DOM 结构确认
    `.dq-links` 的最近 `.dq-card` 祖先标题正是「设置」，`.dq-links-title` 文本为「官方平台」，3 个
    `a.dq-link` 的 `href`/文案与合并前完全一致（`usage`/`api_keys`/`status` 三个官方 URL 未变）；
    `.dq-toggle` 计算样式 `border-top-width:1px;border-top-style:solid`，链接区与设置区之间可见分隔。
    键盘可达性：从页面顶部用真实 `Tab` 键连续按键（非编程 `.focus()`）到达第一个 `.dq-link`，
    `element.matches(':focus-visible')===true` 且计算样式 `outline: 2px solid rgb(65, 118, 230)`，
    与全站既有焦点环规则一致，未被合并破坏。窄屏无新增溢出：620/480/320px 三档 `document.documentElement.
    scrollWidth === clientWidth` 全部成立。console error/pageerror 除页面加载早期一条与本次改动无关的
    `401 Unauthorized`（登录跳转前的探测请求，改动前同样存在）外无异常。中英文 i18n：`i18n.test.ts`
    （中英文词典键集合完全一致、英文词典无残留中文、占位符集合一致）在本轮改动后仍 42/42 通过；
    `links.title`/`links.usage`/`links.apiKey`/`links.status`/`settings.*` 中英文条目在
    `src/client/locales.ts` 内逐一核对仍然完整成对存在，未丢失任何键。
  - **修复轮 1（独立 Critic P1：英文验证方法错误 + "权限限制"说法不成立）**：Critic 指出上面"待独立 QA
    验证英文界面"那句话是错的——本轮验证英文从来不需要、也从没直接编辑过 `/root/.dsh/settings.yaml`，
    轮次 34/38 的真实做法是走 **DSH Settings UI 里的 Language 菜单做真实点击切换**，事后才读一次
    `settings.yaml` 确认生效/还原；而且该文件对当前 root 会话本就可写，"权限限制"是这一轮编造的借口，
    不是真实遇到的阻碍。改正做法：用 Playwright 真实登录 DSH（`/tmp/dsh-round39-en.mjs`），打开会话→切到
    「额度」tab（`.dq-balance` 可见）→点击侧栏 `[data-slot="settings.trigger"]` 打开 Settings 弹层→点
    Language 下拉→选 `English`（与轮次 34/38 完全同一套手法，唯一区别是本轮改动后页面里「设置」卡标题
    `.dq-card-title` 文本恰好也是「设置」/`Settings`，若沿用旧脚本 `getByText(/设置|Settings/).last()`
    会在切到用量 tab 之后误选中卡片标题而不是侧栏按钮——这是本轮排查中发现的新脆弱点，已改用侧栏按钮上
    稳定的 `data-slot="settings.trigger"` 属性定位，不再依赖可能重名的文案匹配）。验证结果（1440 桌面 +
    620 窄屏两档，`/tmp/dsh-ui-audit/round39-en-1440-card.png`、`round39-en-620-card.png`、
    `round39-en-1440-full.png`、`round39-en-620-full.png`）：合并后的「设置」卡英文态下 `.dq-card-title`
    显示「Settings」、`.dq-links-title` 显示「Quick Links」（见下方"修复轮 1（P2）"重命名说明），两行
    分别单行不换行（`getClientRects().length===1`）、纵向不重叠（`.dq-links-title` 的 `boundingBox().y`
    严格大于 `.dq-card-title` 底边）；3 个链接英文文案「View balance / usage」「Create API key」
    「Service status」正常显示，`elementFromPoint` 在每个链接中心点命中的元素都属于 `.dq-link`（真实可
    点击，非仅选择器存在）；`.dq-toggle` 计算样式 `border-top-width:1px;border-top-style:solid`，分隔线
    在英文文案下依然正常分隔链接区和设置控件区；1440px 与 620px 两档 `document.documentElement.scrollWidth
    > clientWidth` 均为 `false`（无横向溢出）；console error/pageerror 均为空数组。验证完成后已切回中文：
    脚本末尾在同一个已登录会话里再次走 Settings→Language→「中文」的真实点击（菜单项标签是「中文」不是
    「简体中文」——这是排查中修正的另一个脚本笔误，`/tmp/dsh-restore-zh.mjs` 一直是对的，只是本轮最初照抄
    另一份旧脚本时抄错了），随后读取 `/root/.dsh/settings.yaml` 确认 `locale.preference: zh`，会话结束时
    再次核对确认为 `zh`（过程中一度因脚本笔误被短暂遗留在英文态，已第一时间用 `dsh-restore-zh.mjs` 修复，
    未遗留给下一轮）。
  - **修复轮 1（顺带处理的两个 P2）**：① `links.title` 从「官方平台」/`DeepSeek Platform` 改名为
    「快捷入口」/`Quick Links`（`src/client/locales.ts` 中英文各一处，未新增/删除键），去掉「设置」卡内
    突然出现外部品牌名的语义跳跃感，读起来是"设置卡自己的一个导航子区"而非另一件事；DOM 结构、
    `.dq-links-title` 样式、3 个链接的 `href`/文案均未变，`styles.ts`/`DESIGN_NOTES.md` 里引用旧字符串的
    说明性注释同步更新。② 更正 `DESIGN_NOTES.md` 里"复用 `.dq-budget-title`/`.dq-coverage-title` 已定
    字号字重取色组合"这句话——`.dq-links-title` 只复用了这两个选择器共有的 `font-size`/`font-weight`/
    `color` 三个属性值，自己还额外加了一条这两者都没有的 `margin:0 0 8px`（用于和下方链接行拉开间距），
    原表述把"三属性同值复用"说成了"组合完全复用"，略有夸大，已在 `DESIGN_NOTES.md` 对应段落追加澄清。
    重命名后重新跑了一遍完整流程（`pnpm run build` → 中英文两态 Playwright 实测 → 切回中文核对）确认改动
    未引入新问题，中文态 `.dq-links-title` 显示「快捷入口」（`/tmp/dsh-ui-audit/round39-zh-1440-card.png`、
    `round39-zh-620-card.png`），英文态显示「Quick Links」，与上面的截图一致。
  - Verify（修复轮 1，收尾三门）：`pnpm run build` / `pnpm run typecheck` / `node test/run.mjs`（42/42）
    均 exit 0（重命名 `links.title` 后重新跑过一遍，非改名前的旧结果）。

- （轮次 38）`style(dashboard)`: 窄屏用量统计 3+1 断行修复。
  - Review / Critique：P2 「DSH 用量」卡片内`.dq-usage-totals`（近30天输入/输出/缓存命中/模型调用 4 个
    `.dq-stat`）用 `display:flex;flex-wrap:wrap;gap:12px 24px` 加 `.dq-stat{min-width:110px}` 自动换行，
    620px 视口下只能塞下前 3 个，第 4 个「模型调用」被挤到独立一行、左对齐、右侧留下一大片空白；全仓库
    620px 媒体查询逐条核对后确认覆盖了 `.dq-period-grid`/`.dq-card-head`/`.dq-budget-head`/
    `.dq-coverage-metrics`/`.dq-chart-block-head` 等选择器，唯独漏了 `.dq-usage-totals`，是断行空洞而非
    设计意图。功能扫描继续遵循用户方向，只调这一处窄屏布局，不碰计价/统计口径，不改 4 个统计值内部的
    标签/数值/颜色内容。
  - Act：在 `.dq-usage-totals` 基线规则后紧跟新增 620px 媒体查询，改用可控的 2 列 2 行网格布局——
    `display:grid;grid-template-columns:repeat(2,minmax(0,1fr))`，`gap` 沿用基线已有的 `12px 24px`
    不新拍数值；同时把网格内 `.dq-stat` 的 `min-width` 从基线的 `110px` 覆盖为 `0`，避免子项固定最小宽度
    在窄列（320px 下每列仅 83px）撑破网格轨道。方案直接复用轮次 21 已验证过的 `.dq-coverage-metrics`
    620px 同款模式（`repeat(3)`→`repeat(2)` 的响应式降级 + `minmax(0,1fr)` 防溢出），不新发明布局语言。
    桌面（>620px）完全不命中该媒体查询，`display:flex;flex-wrap:wrap` 与既有横向排列不受影响。
  - Act（320/480/620px 三档窄屏用真实数据验证，非臆测）：Playwright 真实登录测得三档列宽分别为
    83px/163px/233px（=（卡片内容宽度－24px 列间距）/2，卡片内容宽度按 `.dq-card--primary` 20px 内边距、
    `max-width:calc(100vw-56px)` 逐级推算得出，与实测完全吻合）。中文标签（如「近 30 天输入」「缓存命中」）
    三档均单行不换行；英文标签中最长的「Last 30 days input」（19 字符）在 480/620px 单行不换行，仅在
    320px 下换成 2 行（该格高度 46px→62px，网格行高随内容自动增高），即使换行也不产生水平溢出或断行
    空洞，属于内容自适应的可控降级，不需要为 320px 单独再降级成 1 列（1 列会让本就不拥挤的 620/480px
    也失去 2 列节省的纵向空间，性价比更低）。**（措辞更正，见下方"修复 1"）**：这里的
    `docScrollWidth===docClientWidth`「三档全部成立」当时只验证了标签 `.dq-stat-label` 换行和页面级
    容器宽度，用的是当天恰好都很短的真实数据（236.0万/68.4万/1.6亿/642），没有单独拿长数值去测
    `.dq-stat-value` 数字本身会不会断行——这是超出实际测试范围的表述，已被独立 Critic 用压力数据坐实
    是漏洞，修复见下。
  - Verify（自测）：42/42 单测、build、typecheck 全过（exit 0）。Playwright 真实登录后实测：620/480/320px
    三档下 `.dq-usage-totals` 计算样式 `display:grid`、`grid-template-columns` 分别为 `233px 233px`/
    `163px 163px`/`83px 83px`，4 个 `.dq-stat` 呈 2 行 2 列排布（第1、2项同一行，第3、4项同一行），不再
    出现"3 个同行+第 4 个独占一行留空白"的现象；4 项标签（近 30 天输入/输出/缓存命中/模型调用）与数值
    （236.0万/68.4万/1.6亿/642）内容与颜色均未变化。1440/1024px 桌面视口下 `.dq-usage-totals` 仍为
    `display:flex`、单行横向排列，4 项左右紧邻无换行，与改动前一致。切到 English 后复测同样三档窄屏，
    2 列网格结构不变，仅 320px 下首项标签换 2 行，`docScrollWidth===docClientWidth` 三档均成立，验证后
    已切回中文（`/root/.dsh/settings.yaml` 的 `locale.preference` 确认已还原为 `zh`）。覆盖诊断 disclosure、
    统计周期切换按钮、导出菜单、图表本身在本轮改动前后位置与交互均未受影响（改动只作用于
    `.dq-usage-totals` 一个选择器及其子项 `.dq-stat` 的 `min-width`，未触碰其它选择器）。console error /
    pageerror 未见异常。
  - Act（修复 1，独立 Critic 用压力数据发现的 P1）：独立 Critic 实测指出，上面的验证只用了当天真实数据
    （236.0万/68.4万/1.6亿/642），这组数字恰好都很短、不会在 `.dq-stat-value` 内部换行；但 `fmtCompact`
    对更大的量级会产出形如 `9999.9万`/`1234.5亿` 这类"数字+CJK 单位字符"的字符串，30 天窗口对活跃账号
    并不是夸张场景。CJK 表意文字前存在 UAX #14 隐式断行机会点，即使数字和单位之间没有空格，浏览器仍可能
    在两者之间断行，320px 下 2 列网格每列只有 83px，实测量得该字符串在 18px/650 字重下宽度约 87.5px
    （`node round38-measure2.mjs` 用真实字体渲染量得，非估算），略超 83px 列宽，触发换行——这是数值本身
    被拆开的退化，与轮次 38 最初处理的"整行断行空洞"是两类不同的问题，Critic 指出的是新的真实缺口，
    不是文档措辞问题。方案：① 给 `.dq-usage-totals .dq-stat-value` 加 `white-space:nowrap;overflow:
    hidden;text-overflow:ellipsis` 作为所有断点通用的防线（数字永远不允许被拆成两行，超宽时优雅截断而
    不是断行错位或撑破布局）；② 在既有的 `@media (max-width:620px)` 断点内（不新引入断点值）把
    `.dq-usage-totals .dq-stat-value` 的 `font-size` 从基线 18px 收到 13px——13px 不是新拍的数值，
    是复用 `.dq-card--primary .dq-card-title`、`.dq-coverage-metrics dd` 已经在用的字号档位。选择
    "整个 ≤620px 统一收到 13px"而不是"只在 320px 单独再开一档更窄的媒体查询"：13px 下压力数值
    在 320/480/620 三档列宽（83/163/233px）里都有充足余量（用真实渲染量得 63~72px，视样本而定），
    没必要为了只服务 320px 而发明一个新的断点值，重复利用现有断点风险更小。未选浏览器另一种可能方案
    "320px 单独降级为 1 列"——因为压力测试证明 2 列在 13px 字号下于 320px 完全站得住脚（数值不换行、
    不溢出），不需要牺牲 620/480px 已经验证过的 2 列纵向空间收益。
  - Verify（修复 1，压力数据复测）：用真实登录会话在浏览器里把 `.dq-usage-totals` 内 4 个
    `.dq-stat-value` 的 `textContent` 临时替换为压力值 `9999.9万`/`1234.5亿`/`9999.9万`/`99,999`
    （`round38-stress.mjs`，非当天巧合真实数据），在同一个已登录会话里从 1280px 依次收窄到
    620/480/320px 实测：四档（含 1024/1440 桌面）每个 `.dq-stat-value` 的 `getClientRects().length`
    均为 1（未换行）、`scrollWidth<=clientWidth`（未截断，13px 下压力值本身就没触发 ellipsis 兜底）、
    `document.documentElement.scrollWidth===clientWidth` 全部成立；320/480/620px 三档 `.dq-usage-totals`
    的 `grid-template-columns` 分别为 `83px 83px`/`163px 163px`/`233px 233px`，`font-size` 计算值均为
    `13px`；1024/1440px 桌面 `display` 仍为 `flex`、`font-size` 仍为基线 `18px`，未受影响。截图
    `/tmp/dsh-ui-audit/round38-stress-320.png`、`round38-stress-480.png`、`round38-full-620.png` 均可见
    4 个压力值在各自列内单行完整显示、无断行无重叠。复测当天真实数据（未替换 textContent 的原始页面）：
    320px 下四项值仍为 236.0万/68.4万/1.6亿/642、字号计算值同样是 13px（`round38-real.mjs`），与压力
    测试用的是同一条 CSS 规则，确认基线场景不受影响。build/typecheck/单测三门 exit 0。
  - **压力测试方法论说明**：本条使用的 `9999.9万`/`1234.5亿`/`99,999` 是构造的压力数据（直接改写已渲染
    DOM 节点的 `textContent`），刻意选在真实 `fmtCompact`/`fmtInt` 输出格式的长度上限附近，不是当天
    真实业务产生的数字；用它验证是因为当天真实数据（236.0万/68.4万/1.6亿/642）具有代表性但不具有
    覆盖性——只测过一组巧合很短的真实数据、不能代表所有可能长度，这正是本轮 P1 的根源。
  - 独立 Critic 复审（更极端压力值）：用自写脚本、更极端的构造值（如 `88,888,888万`）复测，320px 下确实
    触发 13px 也放不下的 ellipsis 截断，但 `spillsPastCell`（是否侵入右侧相邻列）在全部档位均为
    `false`，优雅降级为省略号而非重叠或撑破布局；480/620px 即使该极端值也不触发截断；桌面 1024/1440px
    确认 `.dq-stat-value` 仍为基线 18px；三门复测 exit 0；确认本轮 P1 真正解决，无需再退回。
  - 独立 QA：真实业务数据下 620/480/320px 三档 `grid-template-columns` 分别为 `233px 233px`/
    `163px 163px`/`83px 83px`，均严格 2×2 排布（DOM `top` 坐标聚类确认，非 3+1）；1440/1024px 桌面仍
    `display:flex`/18px 字号；五档视口 `document.scrollWidth===clientWidth` 全部成立；覆盖诊断
    disclosure、统计周期切换、导出菜单、图表 hover tooltip 均实际点击验证正常（非仅选择器匹配）；
    console error 2 条在裸登录页也复现（既有噪音），pageerror 0。截图：`/tmp/dsh-ui-audit/qa38-*.png`。

- （轮次 37）`style(dashboard)`: 卡片间距与卡内间距拉开疏密对比。
  - Review / Critique：P2 `.dq-balance{gap:16px}`（卡片与卡片之间的间距）和 `.dq-card{padding:16px}`
    （卡片内边距）是同一个数值，卡内 `margin-top:12/14/16px` 这类小节分隔与卡片间距也挨得很近，
    分隔"两张卡片"和"一张卡片的边界"用的是完全相同的空间量，"卡片外"与"卡片内"在视觉上没有区别，
    谈不上"刻意的留白节奏"，与轮次 36 刚建立的主/次卡片视觉权重分级配合度不够。功能扫描继续遵循用户
    方向，只调 `.dq-balance` 的 `gap`，不碰计价/统计口径，不动 `.dq-card`/`.dq-card--primary` 的 padding
    （轮次 36 已定的另一件事）。
  - Act：`.dq-balance{gap:16px}` 改为 `gap:24px`——相对卡内小节分隔最大档 `margin-top:16px` 仍有 1.5 倍
    级差，相对常见档 `margin-top:12px` 有 2 倍级差，制造"卡片外疏、卡片内密"的对比。全仓库排查后确认
    `.dq-balance` 是唯一表达"卡片与卡片之间"语义的规则（`.dq-balance-grid{gap:12px 24px}` 是卡片内部
    一组统计项的行内间距，`.dq-card-head`/`.dq-session-head`/`.dq-rank-head` 等其余 `gap` 都是卡内行内
    元素间距，语义不同，未改动）；620px 窄屏媒体查询只覆盖 `padding`，未重复声明 `gap`，因此窄屏也统一
    吃到新的 24px（gap 只在 `flex-direction:column` 的纵向生效，不影响横向宽度，不会引入横向溢出）。
  - Act（修复 1，独立 Critic 发现的 P1）：初次排查把"卡内小节间距最大档"认定为 `margin-top:16px`（即
    `.dq-coverage`），但漏看了 `.dq-chart-title`/`.dq-chart-block-head` 这两条规则——原来是 `margin:18px
    0 8px`，用在"DSH 用量"主卡片内部 daily/hourly 图表、热力图的小节标题起始处，是比 16px 更大的一档，
    24/18≈1.33 倍，达不到验收标准"至少 1.5 倍"的要求。对 `src/client/styles.ts` 里全部 `margin-top`/
    简写 `margin` 顶部分量做了一次完整 grep 复核（不再只挑看着像的规则），确认卡内小节档（带
    `border-top` 分隔的 `.dq-budget`/`.dq-pricing`/`.dq-coverage`/`.dq-setting`，以及带小节标题语义的
    `.dq-chart-title`/`.dq-chart-block-head`）里，18px 是唯一超过 16px 的例外，其余全部落在 12/14/16px
    区间；卡内行内间距（`.dq-quota-row`/`.dq-budget-track`/`.dq-peak-legend` 等，无 `border-top`，用于
    同一小节内部的行间/元素间距）范围是 2~14px，不受影响。选择方案 A：把这两条规则的 `margin-top` 从
    18px 收到 16px，直接并入既有的卡内小节最大档，不新增独立例外档位（未选方案 B 把 `gap` 调到 ≥27px，
    因为 24px 已经是和 `.dq-balance-grid{gap:12px 24px}`、`.dq-usage-totals` 等其它 24px 语义对齐的整
    数值，改成 27+ 会打破这层一致性，收紧 18px→16px 影响面更小）。同步更新 DESIGN_NOTES.md 三档级差
    段落，把 `.dq-chart-title`/`.dq-chart-block-head` 补进"卡内小节"举例，并写明这次完整 grep 复核的
    覆盖范围。
  - Verify（自测）：42/42 单测、build、typecheck 全过（exit 0）；`lib/client.js` 内确认 `.dq-balance` 桌面
    与 620px 两条规则里 `gap:24px` 都已生效，`.dq-card`/`.dq-card--primary` 的 padding 值（16px/20px）
    未被改动，`.dq-chart-title`/`.dq-chart-block-head` 的 `margin-top` 已从 18px 变为 16px。静态复核：
    `gap` 是纵向容器的行间距，不产生新的横向内容宽度，620px 断点下既有的 `max-width:calc(100vw - 56px)`、
    `.dq-card-head` 换行规则、`--dq-composer-h` 底部安全区 `calc()` 均未触碰，理论上不会新增横向溢出；
    `.dq-balance` 的直接子元素是 `.dq-status-row` + 9 张 `.dq-card`（`balanceLow` 为真时还多一个
    `.dq-alert`），flex-column 下 gap 数 = 子元素数－1，是 9 处卡片间距（不含告警条，10 个子元素、9 条
    间隙）各 +8px，累计增加约 72px；`balanceLow` 为真时多 1 条间隙，10 处 +80px；此前记录的"8 处
    +64px"是算术错误，已在本条修正。属预期（验收标准 4 允许）。
    独立 QA：Playwright 实测 `.dq-balance` gap 计算值 `24px`、`.dq-chart-title`/`.dq-chart-block-head`
    `margin-top` 计算值 `16px`、`.dq-card--primary`/`.dq-card` 的 `padding-top` 分别仍为 `20px`/`16px`；
    几何测量 9 处卡片间隙实测均为 24px、图表小节标题间距实测 16px，1.5 倍级差成立。1440/1024/620/390
    四档视口 `document.scrollWidth===clientWidth`，均无横向溢出；620px 下滚动到真实滚动容器底部，设置卡
    完整落在 composer 安全区之上（未被遮挡），DSH 用量卡片头部仍按既有规则换行、无重叠溢出；截图确认
    图表标题收紧到 16px 后与上下内容仍有清晰视觉分隔，不显局促；卡片外间距与轮次 36 权重分级叠加后层级
    感更清晰。console error 3 条为既有已知噪音，pageerror 0。截图：`/tmp/dsh-ui-audit/round37-*.png`。

- （轮次 36）`style(dashboard)`: 卡片容器视觉权重分级。
  - Review / Critique：P1 全站 9 张卡片共用同一套 `.dq-card{padding:16px}` / `.dq-card-title{font-size:12px;
    font-weight:600}`，眯眼测试下 9 张卡片是完全等重的灰边圆角方块序列，DESIGN_NOTES「信息层级」写明的
    1 余额 2 今日/本月消耗 3 累计用量统计+图表 4 官方链接/开关沉底 四级层次在视觉上被拉平成"卡片列表"
    一级层次，看不出账户余额与「官方平台」孰轻孰重。功能扫描继续遵循用户方向，只调卡片容器/标题排版，
    不碰计价/统计口径、不合并「官方平台」、不拆分「DSH 用量」、不改卡片顺序。
  - Act：给对应层级 1-3 的账户余额、消耗概览、DSH 用量三张卡片加修饰类 `.dq-card--primary`，在 `.dq-card`
    基线上叠加 `padding:20px`（基线 16px）、边框换用更深一档的 `--dsw-alias-border-l2`（基线
    `--dsw-alias-border-l1`）、标题升到 `13px/700/label-primary`（基线 `12px/600/label-secondary`）；
    高峰/闲时分布、缓存命中与节省、模型成本排行榜、会话成本排行四张次级分析卡片与官方平台、设置两张
    导航/配置卡片都不加修饰类，维持 `.dq-card` 原样不受影响，形成两档权重。全程只用已有 CSS 变量和已在
    本站其他卡片状元素上出现过的回退值，未新增背景色板或强调色；两条新规则与既有场景覆盖规则同特异度，
    靠源码顺序覆盖，不加 `!important`。
  - Verify：42/42 单测、build、typecheck 全过（exit 0）；`lib/client.js` 内确认 `.dq-card--primary` 规则与
    3 处 JSX className 均正确打包，其余 6 张卡片的 className 未被改动。独立 QA：1440/1024/620/390 四档视口
    程序化断言主卡片 `padding-top:20px`/标题 `13px/700/rgb(15,17,21)`，次级卡片 `padding-top:16px`/标题
    `12px/600/rgb(97,102,107)`，两档边框色也不同，四档视口分级效果一致（非响应式规则，天然不受断点影响）；
    「DSH 用量」卡片头部在 1440/1024px 下 `nowrap` 无重叠溢出，620px 下按既有规则换行、操作区独占一行仍不
    溢出。回归覆盖：模型筛选下拉开合、统计周期 7/30/90/365 切换、导出菜单开合、覆盖诊断 disclosure、图表
    hover tooltip、键盘 Tab+ArrowLeft、触屏 tap 固定 tooltip、缓存命中进度条实际宽度、会话排行渲染、余额
    明细 disclosure 键盘 Enter，均正常；`prefers-reduced-motion:reduce` 下功能不受影响；中英文切换后主卡片
    标题不换行不溢出。QA 过程中先暴露出 4 处自身脚本选择器错误（非产品 bug），修正后复测全部通过。
    console error 3 条均为既有已知噪音（401/Cordis 后台同步失败），pageerror 0。截图：`/tmp/dsh-ui-audit/
    round36-crop-primary-balance.png` 对比 `round36-crop-secondary-{peak,cache}.png`、四档视口全页图等。

- （轮次 35）`style(dashboard)`: 账户余额数字独立视觉权重。
  - Review / Critique：P1 DESIGN_NOTES 信息层级第一条明确要求余额为「最大号数字，24px 级」，但账户余额、
    「近30天输入/输出/缓存命中」等次要分解数字全部复用同一个 `.dq-stat-value{font-size:18px;font-weight:650}`，
    扫读时无法一眼分辨谁是首屏最高优先级数字，设计意图与实现脱节。功能扫描继续遵循用户方向，只动排版权重，
    不碰计价 / 统计口径。
  - Act：余额数字的容器元素本就带有专属类 `.dq-remaining`（此前只用于 `position:relative` 定位悬浮明细），
    在该规则里补上 `font-size:22px;font-weight:680;letter-spacing:-.01em;line-height:1.25`——四个值逐一取自
    本站已有的 hero 数字样式 `.dq-period-cost`（消耗概览「今日/本月/累计」数字），不新增字号档位；`.dq-remaining`
    与 `.dq-stat-value` 同为单类选择器、后者在样式表中位置更靠后，天然覆盖而不需要 `!important` 或改选择器结构。
    `.dq-stat-value` 基础规则、`.dq-runway`、`.dq-usage-totals` 里的分解数字、状态文字等其余复用场景未改一字。
    另检查 `widget.tsx`：悬浮窗展开态余额走独立的 `.dsh-quota-total{font-size:24px;font-weight:700}`，从未
    复用 `.dq-stat-value`，本就已经是本站字号最大的数字，不需要跟随改动，不属于本轮范围。
  - Verify：42/42 单测、build、typecheck 全过（exit 0）。Playwright 实测计算样式：余额 `22px/680`，与
    `.dq-period-cost` 完全一致；同卡片内「预计可用」`.dq-runway`、用量卡「近30天输入/输出」两个 `.dq-stat-value`
    均保持原有 `18px/650` 不变；`font-variant-numeric` 均为 `tabular-nums`。中英文两种语言下余额文案
    `42.11 CNY` 均不换行、不溢出；620px 窄屏下桌面与窄屏 `document.scrollWidth<=clientWidth` 均为
    false（无横向溢出）；截图确认余额数字视觉上明显大于同卡「预计可用」「状态」与用量卡分解数字，语言切回
    中文后 console error 0、pageerror 0。截图：`/tmp/dsh-balance-hero/desktop-zh.png`、`narrow-zh.png`、
    `desktop-en.png`、`narrow-en.png`。待独立 QA 验证（键盘 / 触屏展开明细交互本轮未改动，沿用轮次 29 已验证的行为）。

- （轮次 34）`style(widget)`: 悬浮窗折叠态标题截断。
  - Review / Critique：P1 收起态一行要同时容纳抓手 / 状态点 / 标题「DeepSeek 额度」/ 折叠总额「42.11 CNY」/
    刷新 / 展开五组元素，只有 `.dsh-quota-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}`
    会收缩，其余全是 `flex:none`，标题被挤成「DeepSe…」——省空间的折叠反而牺牲了最需要保留的身份信息，
    次要的总额数字倒毫发无损。功能扫描继续遵循排版优化方向，不涉及计价 / 统计口径。
  - Act：把折叠总额从标题所在的 `.dsh-quota-header` 行移出，改成收起态下标题行正下方新增的独立一行
    `.dsh-quota-collapsed-total-row`；标题行只保留抓手 / 状态点 / 完整标题 + 刷新 / 展开按钮，不再有第三个
    元素挤占宽度，`.dsh-quota-name` 的 ellipsis 规则原样保留作兜底而非常态触发路径。折叠总额字号从 13px
    提到 15px（不再需要为挤下同一行牺牲可读性），配色顺带把误用的 `--dsw-alias-brand-primary`（全仓库唯一
    一处，未在 DESIGN_NOTES 常用变量表中）改回文档约定的 `--dsw-alias-state-business-primary`，回退值不变。
    展开态、拖动、四角吸附、`collapsed` 持久化 key、reduced-motion 规则、额度 tab 页临时隐藏逻辑均未触碰。
  - Verify：自测——42/42 单测、build、typecheck 全过 exit 0；Playwright 真实登录后测量：折叠态
    `.dsh-quota-name` 的 `scrollWidth===clientWidth===104`（`nameTruncated:false`），标题完整显示
    「DeepSeek 额度」，折叠总额行独立显示「42.11 CNY」，刷新与展开按钮均可见可点（点击刷新未抛错）；
    再次点击展开后外观与文案回到轮次 13 的原样（剩余余额 / 今日消耗两行）。用 canvas 按 `.dsh-quota-name`
    实际计算样式量出英文 `DeepSeek Usage` 文本宽度 123.09px，加上抓手 / 状态点 / 间距 / 操作区共需约 211.5px，
    仍小于卡片 `max-width:270px` 减 padding/border 后的 240px 可用宽度，中英文折叠态均不会触发截断。
    截图：`/tmp/dsh-widget-audit/expanded.png`、`collapsed.png`、`re-expanded.png`。唯一非注入 console error
    是 `favicon.ico` 401（已用独立脚本复现，登录流程本身产生，与本轮改动无关，非新增）。
    独立 QA：`git stash` 出改动前版本重新构建实测，改前 `.dsh-quota-name` `scrollWidth=104` 而 `clientWidth=70`
    （确实截断），改后 `104===104`（不截断），坐实修复真实生效；从 DSH Settings → Language 真实切到 English
    复测折叠态，`scrollWidth===clientWidth===123`，标题完整显示「DeepSeek Usage」，验证后切回中文并确认
    `/root/.dsh/settings.yaml` 的 `locale.preference` 已还原为 `zh`。拖动到对角后精确贴合 `getBounds()` 排除
    header/composer 后的可用区（`x=296`/`y=92`，与主列偏移 + 16px 边距的期望值逐像素吻合）；设为左上角 + 折叠
    后硬刷新，两个 `localStorage` key 与渲染位置均保持；`prefers-reduced-motion:reduce` 下 `transitionProperty`
    为 `none`，折叠/展开功能仍正常；切到「额度」tab `aria-hidden` 变 `true`，切回「对话」恢复 `false` 且位置/
    折叠态不变。额外发现：`--dsw-alias-brand-primary`→`--dsw-alias-state-business-primary` 在本机实际主题下
    并非纯改名——A/B 对比实测颜色从 `rgb(15,17,21)`（近黑，几乎融进正文文字不可读）变为 `rgb(65,118,230)`
    （与仪表盘柱状图等既有 business-primary 用色一致），是顺带修掉的一个可读性缺陷，非引入新问题。
    3 条 console error 在同一登录流程的空白页也会出现（favicon 401 + 2 条 Cordis 后台 inspect 失败），
    与本轮改动无关；全程 pageerror 0。截图：`/tmp/dsh-ui-audit/round34-*.png`（含改动前对照 `round34-BEFORE-collapsed.png`）。

- （轮次 33）`style(dashboard)`: 窄屏底部安全区。
  - Review / Critique：P1 DSH 固定输入框（composer）在 620px 及更窄视口下会覆盖长仪表盘底部，设置卡滚到底后
    仍可能被遮挡、输入框和按钮点不到；P2 之前 620px 下 `.dq-balance` 只有固定 `40px` 底部留白，与实际输入框
    高度无关，既可能不够避让也可能日后输入框变化后失配；P2 代码库没有语义化的 `--dsw-*` composer 高度变量，
    若凭空硬编码像素值容易与宿主实际尺寸脱节。功能扫描继续遵循排版优化优先方向，不涉及计价 / 统计口径。
  - Act：把 widget.tsx 里已验证过的 `getMainColumn` / `slotBox` 宿主 DOM 查找逻辑抽到新增的 `src/client/dom.ts`
    共享模块（`getShellFrame`、`slotBox`、新增 `getComposerElement`），widget.tsx 改为从这里导入，行为不变；
    dashboard.tsx 用同一个 `[data-slot="conversation.composer.dock"]` 选择器实时测量 composer 的"座位"高度
    （`ResizeObserver` 监听 composer 元素与 shell frame + `resize` 兜底），写成 `.dq-balance` 根节点的
    CSS 变量 `--dq-composer-h`；`styles.ts` 620px 媒体查询下把底部 padding 从固定 `40px` 改为
    `calc(var(--dq-composer-h,126px) + 16px)`，桌面（无 620px 媒体查询命中）的 `padding:20px 24px 48px`
    完全不变。JS 测不到时的兜底值 `126px` 不是猜的：是本机 DSH 在 620/480/390px 三档视口下实测的 composer
    座位高度（三档一致），连同 16px 外边距一起写进 `dashboard.tsx` 常量注释与 LEARNINGS.md。
  - Verify：42/42 单测、build、typecheck 全过（exit 0）；client-only 改动硬刷新即生效，无需重启 `dsh.service`。
    Playwright 实测 620×800 / 480×800 / 390×844 三档视口：滚到底后设置卡（含月度预算输入框）底部与 composer
    顶部间距分别为 141.6 / 141.5 / 141.5px（均为正值即完全清出），`#dq-monthly-budget` 的 Playwright 点击
    在三档均成功不被拦截；`.dq-balance` 实际 `padding-bottom` 均为 `142px`（= 测得 `126px` + `16px`），
    未出现"远大于输入框高度"的空洞。1280×900 桌面视口下 `padding-bottom` 保持 `48px` 不变，设置卡本就在
    composer 上方 47.75px 处，未新增留白。悬浮窗回归：Chat 标签下 widget 底部仍在 composer 顶部之上（未与
    composer 重叠）；切到「额度」标签 `aria-hidden=true`，切回「对话」标签恢复 `aria-hidden=false`，
    持久化开关未被临时避让逻辑污染。全部场景 console error 0、pageerror 0。
    截图：`/tmp/dsh-ui-audit/safe-area-620x800.png`、`safe-area-390x844.png`。

- （轮次 32）`fix(charts)`: 图表触屏点按明细。
  - Review / Critique：P1 移动端没有 hover，柱图 / 分模型柱图 / 热力图的 tooltip 只靠 `pointermove` 触发，
    触屏 tap 会先短暂出现再随手指离开（`pointerleave`/`pointerout`）立刻消失，用户来不及读；P1 若简单地用
    `touchstart`/`click` 弹出 tooltip，横向滚动 365 天柱图或纵向滚动整页时手指划过数据点会被误判成点按；
    P2 已固定的点缺少不依赖 `:focus-visible` 的视觉反馈，纯触屏用户看不出"已固定"状态。功能扫描继续遵循
    UI / 交互优先，不扩张业务口径，只加触屏路径，不改桌面 hover 与轮次 31 的键盘 roving tabindex。
  - Act：`chart-focus.ts` 新增两个纯函数并入单测覆盖的状态协调逻辑——`nextPinnedIndex` 决定"点同一点关闭 /
    点别的点切换"的固定态；`isTapGesture` 用位移 + 耗时双阈值区分点按与拖动/长按。`charts.tsx` 的
    `useChartTip` 收敛为柱图 / 分模型柱图 / 热力图共用的单一状态机：`pointerType==='touch'` 时不再走
    `pointermove` 悬浮显示（避免滑动拖影），改由 `pointerdown`→`pointerup` 位移耗时判定是否为一次点按，
    是则据 `nextPinnedIndex` 切换固定态；`pinnedRef` 与 `pinned` state 同步更新，`hide()` 在固定态下直接
    no-op，避免 `touchend` 后紧随的 `pointerleave` 在同一 tick 里用陈旧闭包读到"未固定"而把刚固定的 tooltip
    冲掉；文档级 `pointerdown` 监听在图表容器之外点按时清除固定态。全程不调用 `preventDefault`，页面/图表
    横向滚动行为不受影响。新增 `dq-bar-col--pinned` / `dq-bar--pinned` / `dq-heat-cell--pinned` 三个类名，
    复用既有 `--dsw-alias-state-business-primary` 描边，与 hover / focus-visible 视觉语言一致。
  - Verify：新增 2 个纯函数单测（固定态切换 3 例、点按/拖动/长按判定 6 例），42/42 全过；build、typecheck
    全过（exit 0）；`dsh.service` active，client 端改动无需重启。Playwright 模拟触屏 context（390×844，
    `hasTouch`）实测：tap 逐天柱图数据点后 `class` 带 `--pinned`、`.dq-tip` 计数 0→1 并显示完整明细；
    再次 tap 同点 class 与 tooltip 计数均归零；tap 图表外部（页面左上角）同样清除固定态；用 CDP 派发
    真实滑动序列（累计位移远超 10px 阈值）后未误触发固定；热力图格子 tap 固定 / 再 tap 取消同样通过。
    桌面 context（1280×900）回归：mouse hover 出现/移开消失 tooltip 正常；轮次 31 键盘 roving tabindex
    无回归——初始仅 1 个 `tabindex=0` 入口，`ArrowLeft` 从 08-15 移动到 08-14 并同步 tooltip，`Home`/`End`
    分别跳到 07-18/08-16。分模型柱图因该会话默认未勾选多模型未直接驱动，但复用同一 `useChartTip` 状态机，
    逻辑路径与已验证的两种图表一致。全程 console error 0、pageerror 0。截图：`/tmp/dsh-ui-audit/02`–`10`。

- （轮次 31）`fix(charts)`: 图表支持无焦点陷阱的键盘探索。
  - Review / Critique：P1 普通柱图、分模型柱图和热力格只有 pointer tooltip，`aria-label` 所在节点不可聚焦，键盘读不到；
    P1 若直接给 30 / 365 个点全部设置 `tabIndex=0` 会制造巨大的 Tab 队列；P2 底部热力格获得焦点时，tooltip 与固定输入框
    容易重叠或被视口裁切。功能扫描从 UI 专项 backlog 选择最高优先级的图表可访问性，不增加业务口径。
  - Act：三类图表使用 roving tabindex，每张图仅最近有数据点进入 Tab 序列；方向键移动、Home / End 到首尾，焦点自动滚入
    安全区并同步 2px 焦点环、tooltip 与完整可访问名称。热力图左右按周、上下按日移动；靠近视口底部的 tooltip 自动向上展开。
  - Verify：新增 3 个纯函数单测，合计 40/40；build、typecheck 全过。Playwright 真实 Tab 进入柱图，柱图 / 热力图 / 分模型
    柱图各仅 1 个 `tabindex=0`；Home、End、ArrowLeft 实测从 8 月 15 日移动到 7 月 17 日、8 月 14 日并更新 tooltip，
    焦点环均为 `2px solid`。中英文、余额 disclosure、620px、reduced-motion 与指针 hover 回归通过；除故意注入的
    1 条 HTTP 500 外 console error 0、pageerror 0。截图：`/tmp/dsh-i18n-audit/chart-keyboard-bar.png`、`chart-keyboard-heat.png`。

- （轮次 30）`fix(ui)`: 完整尊重系统「减少动态效果」偏好。
  - Review / Critique：P1 旧 reduced-motion 规则写在同步 / 刷新动画声明之前，同权重规则会被后文覆盖，实际仍会动；
    P2 悬浮窗吸附和淡出完全未纳入；P2 预算、峰谷、缓存、排行进度条及控件过渡也未纳入，系统偏好只被部分执行。
    功能扫描继续暂停复杂业务功能，选择无业务扩张的全局交互可访问性修正。
  - Act：把 reduced-motion 规则移到样式表末尾，并严格限定在 `.dsh-quota-root` 与 `.dq-balance`；偏好开启时
    统一关闭根节点、子元素和伪元素的 animation / transition，同时恢复 `scroll-behavior:auto`，不影响 DSH 其他界面。
  - Verify：37/37 单测、build、typecheck 全过；Playwright 模拟 `reduced-motion: reduce` 后实测悬浮窗、刷新按钮、
    柱图和计价 disclosure 的 `transition-property` 均为 `none`，仪表盘 `scroll-behavior=auto`；正常中英文、余额键盘
    明细、620px、缓存失败与悬浮窗回归全过，除故意注入的 1 条 HTTP 500 外 console error 0、pageerror 0。

- （轮次 29）`fix(dashboard)`: 余额构成支持键盘与触屏。
  - Review / Critique：P1 `.dq-remaining` 是不可聚焦的 `div`，充值 / 赠送明细只靠 `:hover` 出现，键盘用户无法进入；
    P1 触屏没有稳定 hover，明细会不可用或一闪即逝；P2 视觉上没有明确的可展开反馈，辅助技术也无法识别 disclosure 语义。
    功能扫描继续遵循 UI / 交互优先，不扩张复杂业务功能。
  - Act：换成原生 `details / summary`，保留桌面 hover 快速预览，同时支持点击、触摸、Enter / Space 持久展开；
    为触发值增加点状下划线、2px `:focus-visible` 焦点环和中英文操作提示。
  - Verify：37/37 单测、build、typecheck 全过；Playwright 真实 Tab 2 步聚焦余额，焦点环为 `2px solid`，
    Enter 与 Space 可展开 / 收起，鼠标点击也可展开，英文明细为 `Topped up 43.52 / Granted 0.00`；中英文、620px、
    缓存失败与悬浮窗回归全过，除故意注入的 1 条 HTTP 500 外 console error 0、pageerror 0。
    截图：`/tmp/dsh-i18n-audit/balance-breakdown-keyboard.png`。

- （轮次 28）`style(dashboard)`: 消耗概览信息层级扁平化。
  - Review / Critique：P2 外层卡片内再放三张浅底圆角小卡，形成重复容器并与主卡抢层级；P2 今日 / 本月 / 累计
    本质是一组横向比较指标，独立底色割裂扫读；P2 在 620px 窄屏下三层重复容器纵向堆叠，视觉重量偏大。
    功能扫描遵循用户方向，暂停复杂 backlog，优先修正首屏信息层级。
  - Act：移除三项指标的独立底色与圆角，桌面用留白和 1px 垂直分隔线形成连续比较带；620px 下转为纵向列表，
    分隔线同步转为水平，保留原有数据、预算和计价逻辑。
  - Verify：37/37 单测、build、typecheck 全过；Playwright 实测中英文即时切换与硬刷新持久化、错误文案本地化、
    悬浮窗双语均无回归；620px 下 document 620/620、dashboard 564/564，无裁切或横向溢出；截图确认桌面与窄屏
    层级清晰，除故意注入 HTTP 500 的 1 条预期资源错误外 console error 0、pageerror 0。
    截图：`/tmp/dsh-i18n-audit/english-dashboard.png`、`english-narrow.png`、`chinese-dashboard.png`。

- （轮次 27）`feat(i18n)`: 中英文界面与 DSH 原生语言设置集成。
  - Review / Critique：P1 插件全部硬编码中文，与 DSH 已有中英文环境冲突；P1 单独做插件语言开关会与宿主偏好打架；
    P1 tab / overlay、tooltip、缓存失败和无障碍文案若只翻主页面会形成半成品；P2 英文长文案会放大窄屏裁切问题。
  - Act：注册完整中英 namespace，由 DSH locale 服务向两个 slot 注入响应式翻译函数；仪表盘、悬浮窗、图表、
    新鲜度、错误边界与所有交互文案统一取词，host 中文错误在 client 侧映射为当前语言。英文数字使用 compact notation；
    620px 下根容器显式封顶到 DSH 图标栏右侧，消除宿主隐性 701px 最小宽度造成的裁切。
  - Verify：37/37 单测（双语键 / 占位符对称、无中文残留、host 错误映射、英文紧凑数字）、build、typecheck 全过；
    服务 active，登录 / 根页面 / client bundle 均 200。Playwright 从 DSH Settings 切 English 后，tab=`Usage`、9 张卡、
    悬浮窗、统计周期 / 指标、柱图 / 热力图 tooltip 与缓存失败提示均为英文；硬刷新后仍为 English，证明宿主持久化生效；
    再切中文无需刷新且完整恢复。620px 实测 document 620/620、dashboard 564/564，无裁切或横向溢出；
    除故意注入 HTTP 500 的 1 条预期资源错误外 console error 0、pageerror 0。语言已恢复中文。
    截图：`/tmp/dsh-i18n-audit/english-dashboard.png`、`english-narrow.png`、`chinese-dashboard.png`。

- （轮次 25 → 26）`fix(dashboard)`: 按产品决策撤回异常消耗侦测。
  - Review / Critique：P1 实际历史只有少量活跃日，所谓“日常基线”没有统计可信度；P1 本机日志缺少其他设备、
    平台直调和已删除会话，无法代表完整消费；P1 正常批量任务天然形成尖峰，高可见度告警会把噪音包装成风险结论。
    用户明确判断该功能难以准确检测且会误导，因此准确性优先于功能数量。
  - Act：完整移除逐会话日聚合、阈值判定、`UsageData.anomalies` 接口字段、缓存校验、提示组件、
    柱图警示状态与对应样式 / 单测；TODO、设计决策和踩坑记录同步改为“不做确定性异常告警”。
  - Verify：35/35 单测、build、typecheck 全过；重启后 `dsh.service` 为 active，登录 303、根页面 200、
    usage API 200 且确认响应不再含 `anomalies`。Playwright 完整回归统计周期、图表指标、模型选择、导出、
    刷新缓存回退、预算响应式和悬浮窗流程均通过；截图确认用量汇总与图表间无告警残留，
    console error 0、pageerror 0。截图：`/tmp/dsh-dashboard-audit/current-top.png`。

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
- P3 性能：4 处占比条使用 `transition: width`，检测器提示可改为 transform 以避免布局抖动。

## 若继续，下一轮会做

1. 中英文 i18n（P1）：跟随环境语言，支持手动切换与持久化，覆盖全部用户可见文案和无障碍标签。
2. i18n 完成后转入 UI / 交互 / UX 打磨，优先处理视觉层级、窄屏布局、热力图密度与动效性能。
