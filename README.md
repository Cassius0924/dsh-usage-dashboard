# dsh-usage-dashboard

一个给 [DeepSeek Harness](https://github.com/deepseek-ai)（DSH）Web GUI 用的额度与用量仪表盘插件，以**动态 Cordis 插件**的形式运行。

它把 DeepSeek 账户余额和 DSH 里的 token 用量汇总到一起，做成两个界面：

- 右下角一个可拖动的**悬浮额度窗**（实时余额）。
- 顶部栏「对话 / 轨迹」旁的一个 **「额度」view tab**（完整仪表盘）。

## 功能

### 悬浮额度窗（右下角）

- 显示当前账户余额（总余额 / 赠送额度 / 充值额度）。
- 可拖动，松手自动吸附到主区域（不含侧边栏、不遮顶栏）四个角落。
- 可收起/展开，60 秒自动刷新。

### 「额度」仪表盘 tab

- **账户余额**：总余额、赠送额度、充值额度、可用状态。
- **官方平台跳转**：查看额度/用量、生成 API Key、服务状态。
- **用量统计**：累计 tokens、消耗费用（估算）、输入/输出/缓存命中、模型调用次数。
- **逐天用量柱状图**：近 30 天。
- **逐小时用量柱状图**：按 0–23 点分布。
- **每日用量热力图**：近 12 周。
- **悬浮窗开关**：控制右下角悬浮窗是否展示。

## 工作原理

| 数据 | 来源 |
| --- | --- |
| 账户余额 | DeepSeek API `GET /user/balance`（通过 `credentials` 服务读取 `DEEPSEEK_API_KEY`） |
| token 用量 | 遍历 DSH 会话日志（`sessionPersistence`），聚合每个 `assistant/message` 事件的 `usage` |
| 消耗费用 | 按 deepseek-v4-pro 单价估算 |

Host 侧注册了两个 Package 私有 RPC 处理器：

- `deepseek-balance` —— 返回当前余额。
- `deepseek-usage` —— 返回逐天/逐小时/热力图聚合结果与费用估算。

Client 侧通过 `host.call(...)` 调用它们，并渲染 UI（纯 `React.createElement`，无 JSX/打包器）。

## 安装 / 使用

这是**动态 Cordis 插件**，通过 DSH Web GUI 的 Cordis 插件工具加载，进程内有效（重启后需重新加载）。

1. 打开 DSH Web GUI，用 `cordis_define` 定义插件，`code.host` 填 `host.js` 的内容，`code.client` 填 `client.js` 的内容（这两个文件是 `cordis_define` 要求的「函数体」格式，直接以 `return { ... }` 开头）。
2. 用 `cordis_run` 激活。
3. 首次加载会请求授权，在页面上的 Run 卡片里允许即可。

前提：已配置 `DEEPSEEK_API_KEY`（在「设置 → 模型」里填写，或放在 `$DSH_HOME/.credentials.yaml`）。

## 文件结构

```
dsh-usage-dashboard/
├── README.md
├── LICENSE
├── host.js      # Host 半：余额 + 用量聚合（cordis_define 的 code.host）
└── client.js    # Client 半：悬浮窗 + 仪表盘 UI（cordis_define 的 code.client）
```

## 已知限制

- 动态插件的 view tab 会被平台强制排在所有内置 tab 之前（动态条目带负的 shadowing priority），因此「额度」会出现在「对话」前面，无法放到「轨迹」之后。
- 悬浮窗的「是否展示」开关是会话内存态，刷新后回到显示状态。
- 用量数据来自本机 DSH 会话日志，不包含其它机器/账户的用量。

## License

[MIT](./LICENSE)
