# LEARNINGS — 踩过的坑

- **DSH 已提供完整 locale 注册表、响应式 slot 翻译座和持久化 Language 设置**；插件只需注册自己的 namespace，
  在 slot options 声明 `locale` 并把宿主注入的 `t` 传进组件树。另做插件内语言开关会产生两份互相打架的偏好。
- **英文文案会暴露宿主容器的隐性最小宽度**；仅写 `max-width:860px` 时，620px 视口下宿主仍可能给 view 701px，
  页面没有 document overflow 却会被右侧裁切。窄屏要把插件根宽度显式封顶为 `100vw - 56px`（DSH 图标栏宽度）。
- **本机短周期日志不适合做确定性“异常消耗”告警**；记录覆盖不完整、活跃日过少，批量任务也会天然形成尖峰。
  即使叠加历史调用量、最低金额、相对倍数和绝对金额门槛，仍无法证明提示准确，反而容易制造噪音与虚假信心。
  保留透明的趋势和原始数据，把风险判断交给用户。
- **token 量不是费用的可靠代理**；缓存命中价与未命中价差距很大时，同一根柱在 tokens、费用、调用三个指标下
  排序和高度都会变化。切换主指标时 tooltip 仍应保留全部上下文，避免用户为了比较而丢失解释信息。
- **周期筛选必须让同屏汇总、逐天、逐小时、模型和会话排行来自同一聚合窗口**；只在前端切 `daily.slice()`
  会留下全量 hourly / 排行，造成看似合理但口径互相冲突的数字。一次 host 回放并行折叠四档窗口，成本远低于重复读盘四次。
- **365 根逐日柱不能压缩到卡片宽度**；给图表内容最小宽度、默认滚到最右侧，再按月间隔显示 `MM/DD`，
  才能兼顾最新数据优先和历史可回看。
- **不要在可能随数据变化的条件返回之后调用 hooks**；模型数组首刷为空、后台刷新后变为非空时，
  `if (models.length === 0) return null` 放在 `useState/useEffect` 之前会改变 hooks 顺序。先声明 hooks，再决定是否渲染。
- **“跳过坏日志继续算”必须同时返回覆盖元数据**；只有 `catch {}` 会把部分结果伪装成完整账单。
  本机日志统计至少要暴露成功 / 失败会话、有效 / 跳过 usage 记录和时间范围，UI 还要明确无法推断其他设备与已删除日志。
- **月度预算预测要按北京时间自然月切边界**；直接用浏览器本地时区，同一份数据在不同时区会得到不同月底预测。
- **新鲜度必须展示缓存自己的 `at`，不能拿组件挂载时间冒充更新时间**；强刷失败时也必须保留最后成功时间戳。
- **持久化偏好与页面临时避让要分层**：额度页隐藏悬浮窗不能改写 `widget.visible`，否则用户切回会话页后偏好被意外覆盖。
- **DSH rc.5 没有公开的 view 切换动作**：`setView` 只在 ui-conversation 私有 `BoundActions`，`shell.overlay` 标准 props 和公开 `IConversation` 都拿不到；不要用 DOM 文案点击冒充 API。
- **CSV 导出要同时防两类坑**：逗号/引号/换行按 RFC 4180 转义，字符串以 `= + - @` 开头时前置单引号，避免表格软件执行公式。
- **`pnpm run build` 会先跑依赖检查并因 `ERR_PNPM_IGNORED_BUILDS` 失败**（pnpm 11）。
  修法：仓库根 `pnpm-workspace.yaml` 写 `allowBuilds: { esbuild: true }`。
  pnpm 11 **不再读** `package.json` 里的 `pnpm` 字段，`.npmrc` 的 `only-built-dependencies[]` 也无效。
- **部署差异**：`lib/client.js` 由 DSH 按请求从磁盘读取（`Cache-Control: no-cache`），
  所以只改 `src/client/**` 时浏览器硬刷新即可生效；改 `src/index.ts` 等 host 端才需要 `systemctl restart dsh.service`。
- **本机 DSH Web 有登录门**（`@deepseek-ai/dsh-web-auth`，密码在 `/root/.dsh/profiles/web/cordis.patch.yml`）。
  裸 `curl http://127.0.0.1:3080/` 返回 401 是正常的，不代表服务坏了；要先 POST `/login` 拿 `dsh_session` cookie。
- **「额度」view tab 只在打开某个会话后才出现**（`conversation.view` slot）。
  首页 New Session 状态下顶部没有 Chat / Trajectory / 额度 三个 tab，截图脚本必须先点侧栏里的一个会话。
- **首次进入会弹 “Internal Testing Notice” 模态**，截图前要先点 Continue。
- **usage 接口首刷约 4.8s**（要重放所有会话日志），UI 必须按「慢接口」设计加载态。
- **本机 DSH GUI 实际是浅色主题**，不是深色；样式必须走 `--dsw-alias-*` CSS 变量，不能硬编码深色底色。
- **改包名会连带三处**，漏一处就静默坏掉：
  1. `cordis.patch.yml` 的 `name`（loader 解析用的模块标识符）；
  2. `build.mjs` banner 里 `__ModuleLoader__.load({ id })` —— **必须等于包名**，
     否则 host 半边一切正常（API 全 200、bundle 也能 200 拉到），但客户端半边不注册，
     **整个 GUI 启动图会卡住**（侧栏都不出来）。现已改为从 package.json 读取，不再手写。
  3. profile 的 `package.json`：`dependencies` 的 key 和 `dsh.profile.bundles` 两处都要改，然后 `pnpm install`。
  客户端包的 URL 也随包名走：`/plugins/<包名>/client.js`（作用域包含 `@scope/`）。
- **持久化缓存必须校验结构**（这条踩过一次，代价是用户白屏）：
  仪表盘首屏直接用 localStorage 里的旧 payload 渲染。今天陆续加了 summary / pricing /
  peakSplit / sessions / cacheSavings 五批字段而 `LS_VERSION` 一直没动，
  于是老浏览器里的缓存被当成新结构用 → `Cannot read properties of undefined` → 整棵组件树白屏。
  症状极具迷惑性：**无痕窗口和新浏览器一切正常**（没有缓存），只有天天在用的那个浏览器坏。
  现在 `createCache` 收一个 `isUsable` 谓词，读到不匹配的持久化条目就丢弃并删除；
  两个 slot 各包一层 ErrorBoundary 兜底。**以后 UI 每新读一个顶层字段，要在 api.ts 的校验里补一行。**
- 截图脚本：`/tmp/claude-0/.../scratchpad/shot.mjs`（playwright 从 `/root/.npm/_npx/e41f203b7505f1fb/node_modules/` 取，
  需 `PLAYWRIGHT_BROWSERS_PATH=/root/.cache/ms-playwright` 且清空 `HTTP(S)_PROXY`）。
- **触屏 `touchend` 之后紧跟的 `pointerleave`/`pointerout` 在同一 tick 内触发，早于 React 重渲染**；
  如果"固定 tooltip"的判定读的是 state 闭包（上一次渲染时捕获的值），`pointerup` 里刚 `setPinned(i)`，
  紧接着的 `pointerleave` 处理器里读到的仍是渲染前的旧值，会把刚固定的 tooltip 立刻隐藏掉。
  要用一个和 state 同步写入的 ref（`pinnedRef`）做判断，不能只依赖 state。
- **触屏点按 tooltip 不能复用 `pointermove` 的 hover 展示路径**：`pointermove` 对触摸同样会连续触发
  （手指划过时），如果不按 `pointerType==='touch'` 短路掉，拖动/滚动图表时会连续弹出沿途每个点的 tooltip。
  改为只在 `pointerdown`→`pointerup` 且位移 / 耗时都低于阈值时才判定为一次点按。
- **DSH 没有语义化的 composer 高度 CSS 变量**（搜过全部 `--dsw-*` 用法和 node_modules 里的 DSH 包类型定义，
  均无匹配）；唯一可靠来源是 DOM：`[data-slot="conversation.composer.dock"]` 的 0×0 slot 包装元素本身不能用，
  真正占位的是它父级链上第一个 `height > 0` 的"座位"元素（`widget.tsx` 排除拖动边界时已验证过这个读法，
  现抽到 `src/client/dom.ts` 的 `getComposerElement`/`slotBox` 共享，两处不再各写一套）。2026-08-16 实测该
  座位在本机 DSH 于 620 / 480 / 390px 三档视口下高度一致为 **126px**（含输入框和下方的「N 轮 · LLM 用时」状态条），
  据此把窄屏安全区兜底值定为 `126px + 16px margin = 142px`，写在 `dashboard.tsx` 的 `COMPOSER_FALLBACK_PX`
  常量注释和 `styles.ts` 的 `calc()` 里；正常路径用 `ResizeObserver` 实时测量，兜底值只在测量失败时生效。
- **窄屏安全区必须只出现在窄屏媒体查询里，不能用 JS 判断视口宽度门控测量**：`--dq-composer-h` 这个 CSS 变量
  始终由 `useLayoutEffect` 计算并写在根节点上，桌面样式规则单纯不引用它，天然不受影响——比另写一套
  "仅窄屏时才测量"的 JS 分支更简单，也不会在断点附近出现测量滞后的闪烁。
- **给"复用同一组件的某个特殊实例"升级视觉权重时，先找它是否已经带专属类**，不要急着发明新类或加内联样式：
  余额数字渲染用的是 `<details className="dq-stat-value dq-remaining">`，`.dq-remaining` 原本只用来做
  `position:relative` 定位悬浮明细，但它已经是这个元素独占的类——直接在这条规则里追加字号 / 字重就能让
  只有余额变大，其余 `.dq-stat-value` 用法（同选择器特异度、但源码顺序更靠前）不受影响，不需要
  `!important` 也不需要新写一个 `--hero` 修饰符类。追加数值时抄本站已定义过的 hero 数字档位
  （`.dq-period-cost` 的 22px/680/-.01em/1.25）而不是自己拍一个新数字，避免重蹈"新增仅用一次字号档位"。
- **新增或审计卡内多列统计值容器时，要顺手检查 620px 媒体查询是否覆盖到它**（轮次 38 踩过一次）：
  `.dq-usage-totals`（DSH 用量卡的近 30 天输入/输出/缓存命中/模型调用 4 项）一直只有
  `display:flex;flex-wrap:wrap` 加子项 `min-width:110px` 的自动换行，620px 下这套组合恰好塞不下第 4 项，
  形成"前 3 个同行、第 4 个独占一行留大片空白"的断行空洞，而全仓库其它同类窄屏媒体查询
  （`.dq-period-grid`/`.dq-card-head`/`.dq-budget-head`/`.dq-coverage-metrics`/`.dq-chart-block-head`）
  都已覆盖，只有它被漏掉——说明"自动换行"本身不是响应式设计，只是没显式处理窄屏的默认行为，数量凑巧
  在某个断点卡住时才会暴露。修法沿用 `.dq-coverage-metrics` 已验证过的模式：620px 内改 `display:grid`+
  `grid-template-columns:repeat(2,minmax(0,1fr))`（`minmax(0,1fr)` 让轨道能收缩到 0 避免溢出，比固定
  `1fr` 更安全），并把子项原有的 `min-width`（用于桌面 flex 换行时的阅读宽度下限）在这条媒体查询里
  覆盖为 `0`，否则窄列宽度小于该值会撑破网格轨道产生溢出。
- **给"9 个同构卡片"分级时，不加类＝保留基线本身就是最安全的一档**：只给需要升级的 3 张主卡片加
  `.dq-card--primary` 修饰类，次级分析卡片和导航/配置卡片都不动、继续吃 `.dq-card` 原有基线规则，
  不需要为"次级"再发明一个只做减法的类，否则容易把次级卡片的权重意外压到比导航类卡片还低。修饰类里
  只写要覆盖的属性（`padding`、`border-color`、`.dq-card-title` 的字号/字重/取色），不重复设置 `margin`——
  `.dq-card-head .dq-card-title{margin:0}` 这类既有的场景覆盖规则和新修饰类是同一特异度（单类选择器），
  源码顺序决定谁生效，两条规则不冲突就不用改。边框颜色变量沿用已在本文件其他卡片状元素（导出按钮、
  模型筛选按钮、链接按钮）用过的 `--dsw-alias-border-l2` 回退值 `rgba(0,0,0,.12)`，不是新拍一个数字，
  方便审阅时一眼看出这是同一套深浅分档。
- **数字类窄屏网格要用压力数据测试断行，不能只用当天巧合较短的真实数据**（轮次 38 修复 1，独立 Critic
  用压力数据发现）：`.dq-usage-totals` 320px 降级为 2 列网格后，只拿当天真实数据（236.0万/68.4万/1.6亿/
  642）测过"不产生页面级横向溢出"（`docScrollWidth===docClientWidth`），这组数字凑巧都很短，测不出
  数值本身会不会在自己的列内换行错位。`fmtCompact` 对更大量级会产出 `9999.9万`/`1234.5亿` 这类"数字+
  CJK 单位字符"组合，CJK 表意文字前存在隐式断行机会点，即使没有空格也可能在数字和单位之间断行——在
  320px 每列仅 83px 时，18px 字号下这类字符串实测宽度约 87.5px，正好超出列宽触发断行，把一个统计数值
  拆成两行。"没有撑破页面宽度"和"数值内部没有断行"是两个独立的检查项，只做第一个不能替代第二个；
  凡是可能被压缩到窄列里的数字容器，验证时要额外构造几个"该格式理论上能产生的最长/最坏字符串"
  （不是等哪天真实数据长了才发现），直接改写已渲染节点的 `textContent` 做压力测试，比等真实数据凑巧
  变长成本低得多。
- **拆分一张超载卡片时，先看子模块的渲染条件是否真的依赖了同卡的其它状态，还是只是"恰好挤在一起"**（轮次
  40 拆 DSH 用量卡）：原代码热力图和覆盖诊断都嵌在 `usage !== null && activeWindow !== null` 的分支里，
  但两者实际只读 `usage.heatmap`/`usage.coverage`，从不读 `activeWindow`（那是统计周期选择器产出的、
  只有逐天/逐小时图表和用量总数才用得到的派生值）。拆成独立卡片时把热力图卡的渲染门槛改成只判
  `usage !== null`，不是"顺手改了统计逻辑"，而是让每张卡的渲染条件对齐它真实依赖的数据——继续照抄
  `activeWindow !== null` 反而会在这个几乎不可能触发的边界条件上把一张本该稳定展示的卡片跟着变成"周期选
  错就消失"，跟拆卡"解耦不同时间口径"的初衷矛盾。
- **`.dq-chart-title:first-of-type{margin-top:0}` 是按"同一父节点下同标签的第一个"生效的，不是按"卡片内
  第一个"**：拆用量卡时确认过这条规则在新的热力图卡里依然只有一个 `.dq-chart-title` 直接子节点（热力图卡
  内那句「近一年 · 每日用量热力图」小节标题），所以行为和拆分前一致（`margin-top:0`，贴着卡标题下方）；
  但如果未来哪张卡的直接子节点里出现第二个 `.dq-chart-title`，`:first-of-type` 只会豁免第一个，第二个仍吃
  `margin-top:16px`——排查"为什么这条小节标题间距和别处不一样"时，要按渲染出的 DOM 父子关系读这条规则，
  不能只看类名是否相同。
- **审计类任务的原始数字有保质期，动手前必须重新统计**（轮次 41）：字号档位收敛的原始审计是轮次 34 之前
  做的，此后轮次 34/36/38 又新增了 15px/13px（两种不同来源）等字号规则；如果直接照抄审计原文的"约 52 处"
  就去改，既可能漏看新增的档位，也没法确认那批旧数字今天是否还成立。重新用脚本逐条解析 `styles.ts` 的
  `{...}` 规则块（而不是简单 grep 计数，避免把注释或同名子串误算进去）得到 53 处，与旧数字基本吻合但不是
  巧合——是因为这几轮新增的字号都落在区间之外，没有动过审计瞄准的那批选择器。同样的道理适用于任何"基于
  历史审计/清单行动"的任务：先重新产出一份当下真实的清单，再和历史清单对比差异，而不是默认历史清单仍然
  准确。
- **0.5px 的 `font-size` 步进在浏览器里基本等价于没有区别，收敛这类"档位过密"问题时应该并到整数像素**
  （轮次 41）：11/11.5/12/12.5px 四档表面上是"精细分层"，但 0.5px 差异会被亚像素渲染抹平，实际观感只有
  一档，多出的档位纯粹是维护成本。判断"往哪个整数并"时不能只看数值最近，要看语义更贴近哪一群——本轮
  11.5px（次要说明性长文本）语义更接近 12px 的"标题/按钮/正文"群而不是 11px 的"徽章/微标签"群，所以
  11.5→12 而不是 11.5→11；反过来 11px 本身语义自成一群（dt 标签/徽章/占比），即使数值上离 12px 只差
  1px 也不需要跟着并，保留它才是"语义角色不同该继续区分"的正确做法。方向选择上，"增大"通常比"缩小"更
  安全（更易读，且本轮涉及的都是自由流式文本或自适应宽度容器，没有固定宽度会被撑破），除非验证过目标
  容器没有宽度约束，否则不要凭直觉断定某个方向绝对安全，仍要拿窄屏 + 压力数据实测过一遍。
