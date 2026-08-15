# PROGRESS

## 当前阶段

中英文 i18n 已完成；按用户方向暂停扩张复杂业务功能，当前集中做 UI 设计美化、交互优化和用户体验提升。
轮次 32 后用户进一步收拢方向：接下来优先做**界面排版设计优化**（信息层级、留白、栅格/对齐、窄屏重排），
交互细节打磨降为次优先。轮次 34-36 已做完脑暴轮次 #7（真实截图+源码审计）里的全部 3 个 P1 排版候选（悬浮窗
折叠态标题截断、余额数字视觉权重、卡片容器权重分级）。Judge 评分：交互 9.9 / 样式 9.4 / 功能 9.7。当前无
P0/P1；排版专项剩余 6 个 P2（间距疏密对比、窄屏用量统计断行、合并官方平台卡片、拆分 DSH 用量卡片、
字号档位收敛、宽屏内容宽度评估），继续按优先级扫描。

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
