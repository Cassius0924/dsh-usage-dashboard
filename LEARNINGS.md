# LEARNINGS — 踩过的坑

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
- 截图脚本：`/tmp/claude-0/.../scratchpad/shot.mjs`（playwright 从 `/root/.npm/_npx/e41f203b7505f1fb/node_modules/` 取，
  需 `PLAYWRIGHT_BROWSERS_PATH=/root/.cache/ms-playwright` 且清空 `HTTP(S)_PROXY`）。
