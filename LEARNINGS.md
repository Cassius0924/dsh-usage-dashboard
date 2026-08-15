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
