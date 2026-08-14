# dsh-usage-dashboard

一个给 [DeepSeek Harness](https://github.com/deepseek-ai)（DSH）Web GUI 用的额度与用量仪表盘插件，以 **DSH 插件包（bundle）** 的形式安装。

它把 DeepSeek 账户余额和 DSH 里的 token 用量汇总到一起，做成两个界面：

- 右下角一个可拖动的**悬浮额度窗**（实时余额）。
- 顶部栏「对话 / 轨迹」旁的一个 **「额度」view tab**（完整仪表盘）。

![screenshot](screenshot.png)

## 功能

### 悬浮额度窗（右下角）

- 显示当前账户余额（总余额 / 赠送额度 / 充值额度）。
- 可拖动，松手自动吸附到主区域（不含侧边栏、右侧详情面板与会话顶栏）四个角落。
- 可收起/展开，60 秒自动刷新。
- 显示/隐藏、所在角落、收起状态都会记住，刷新页面后保持原样。

### 「额度」仪表盘 tab

- **账户余额**：总余额、赠送额度、充值额度、可用状态。
- **官方平台跳转**：查看额度/用量、生成 API Key、服务状态。
- **用量统计**：累计 tokens、消耗费用（估算）、输入/输出/缓存命中、模型调用次数。
- **逐天用量柱状图**：近 30 天。
- **逐小时用量柱状图**：按 0–23 点分布。
- **每日用量热力图**：近 12 周。
- **悬浮窗开关**：控制右下角悬浮窗是否展示。

## 安装 / 使用

这是标准 DSH 插件包（bundle + client 双面包），通过 `dsh plugin` 安装：

```sh
# 本地 checkout 安装
dsh plugin --profile web add ./path/to/dsh-usage-dashboard

# 或从 GitHub 安装（git 依赖会执行 prepare 脚本构建）
dsh plugin --profile web add github:Cassius0924/dsh-usage-dashboard
```

然后**重启 dsh**（`dsh --profile web`）生效。

- 前提：已配置 `DEEPSEEK_API_KEY`（在「设置 → 模型」里填写，或放在 `$DSH_HOME/.credentials.yaml`）。
- 前提：本机需要 pnpm（`dsh plugin` 是 pnpm 的转发器）。

## 开发 / 构建

```sh
pnpm install    # 安装 devDependencies
pnpm run build  # esbuild 构建 lib/index.js（host）+ lib/client.js（client bundle），再 tsc 出类型
pnpm run typecheck
```

产物：

- `lib/index.js` —— Host 半（ESM，Node），注册 `/api/dsh-usage-dashboard/*` 路由。
- `lib/client.js` —— Client 半（CJS 闭包），通过 `window.__ModuleLoader__` 注册进 web 启动图。

## 文件结构

```
dsh-usage-dashboard/
├── package.json         # dsh.bundle + dsh.client 声明
├── cordis.patch.yml     # bundle 层（一行 insert）
├── build.mjs            # esbuild 构建脚本
├── tsconfig.json
├── src/
│   ├── index.ts         # Host 半入口（webServer 路由）
│   ├── usage.ts         # 余额 + 用量聚合
│   ├── trust-fence.ts   # 浏览器信任校验
│   ├── wire.ts          # JSON 响应工具
│   ├── contract.ts      # wire 类型
│   └── client/
│       ├── index.tsx    # Client 半入口（slots 注册）
│       ├── widget.tsx   # 悬浮额度窗
│       ├── dashboard.tsx# 「额度」tab 仪表盘
│       ├── charts.tsx   # 柱状图 / 热力图
│       ├── styles.ts    # CSS
│       ├── api.ts       # fetch 客户端
│       └── store.ts     # 悬浮窗开关状态
└── lib/                 # 构建产物（git 忽略）
```

## 已知限制

- 用量数据来自本机 DSH 会话日志，不包含其它机器/账户的用量。
- 费用按 deepseek-v4-pro 现价估算（2026-08-17 起 DeepSeek 改为峰谷定价，届时需要调整 `PRICE_*_PER_M`）。

## License

[MIT](./LICENSE)
