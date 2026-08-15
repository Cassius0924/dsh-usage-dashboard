# LEARNINGS — 踩过的坑

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
