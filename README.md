# dsh-usage-dashboard

[![npm](https://img.shields.io/npm/v/@cassius0924/dsh-usage-dashboard?color=cb3837&logo=npm)](https://www.npmjs.com/package/@cassius0924/dsh-usage-dashboard)
[![license](https://img.shields.io/npm/l/@cassius0924/dsh-usage-dashboard?color=blue)](./LICENSE)

在 [DSH](https://github.com/deepseek-ai)（DeepSeek Harness）的 Web GUI 里，随时看得见 DeepSeek 的钱花在哪：
**余额还能撑几天、今天花了多少、哪个模型最贵、缓存替你省了多少，以及 2026-08-17 峰谷定价之后账单会变成什么样。**

![dsh-usage-dashboard](docs/hero.png)

装上之后 GUI 里多两样东西：右下角一个可拖动的**悬浮额度窗**，顶部栏多一个**「额度」tab**。

---

## 为什么需要它

用 DSH 跑 agent，钱是一点一点漏掉的，而 DSH 自己不会告诉你：

| 你真正想知道的 | 装之前 |
|---|---|
| 余额还能用几天？ | 只有一个余额数字 |
| 今天花了多少？这个月呢？ | 只有「累计」，没有时间感 |
| 钱花在哪个模型上？ | 不知道 |
| 缓存到底帮我省了多少？ | 完全看不到 |
| 8-17 涨价后我的账单会变成多少？ | 只能自己算 |

这个插件把这些问题逐个翻译成一眼能看懂的数字。**费用全部为估算**，算法与单价公开可查（见[费用是怎么算的](#费用是怎么算的)）。

---

## 悬浮额度窗

<img src="docs/widget.png" width="300" alt="悬浮额度窗">

常驻右下角，不打断你干活：

- 余额 + **今日消耗**，一眼就够。
- 可拖动，松手自动吸附四角；边界避开侧边栏、右侧详情面板、会话顶栏和输入框——**不会挡住发送按钮**。
- 可收起成一行；**显示/隐藏、所在角落、收起状态都会记住**，刷新页面后原样回来。
- 余额跌破预警线时，状态点和余额数字一起转成警示色。
- 60 秒自动刷新余额。今日消耗读共享缓存，点 ↻ 同时刷新两者。
- 插件加载时就把余额和用量预取到缓存里，所以打开「额度」tab 通常是秒开，
  不用等那几秒的会话日志重放；预取失败不报错，交给各自挂载时再取。

## 「额度」仪表盘

### 余额：还能撑几天

<img src="docs/balance.png" width="720" alt="账户余额与可用天数">

「还剩多少钱」不解决余额焦虑，「还能用几天」才行。按近 7 个自然日（含没用的日子）的日均消耗折算，hover 能看到估算口径；不足 3 天转红。

### 今日 / 本月花了多少 —— 以及这个数怎么来的

<img src="docs/overview.png" width="860" alt="消耗概览与计价说明">

今日、本月、累计三个窗口，今日带「较昨日」、本月带「较上月同期」环比（**上月同期**而不是上月整月，免得月初总是显得便宜）。

展开**计价说明**能看到费用估算实际套用的单价表——估算不该是个黑箱。

### 涨价之后会变成多少

<img src="docs/peak.png" width="860" alt="高峰 / 闲时分布">

DeepSeek 从 2026-08-17 00:00 起改峰谷定价，高峰（北京时间 09:00–12:00、14:00–18:00）价格是闲时的两倍。

这张卡告诉你用量落在峰谷两侧的比例，并且**在新价生效前就把账单重算一遍**：上图这份用量现价 ¥14.64，新价下是 ¥45.84（+213%）。生效之后，这里会换成「把高峰用量挪到闲时能省多少」。

### 缓存替你省了多少

<img src="docs/cache.png" width="860" alt="缓存命中与节省">

前缀缓存的命中价只有未命中价的百分之一量级，是 DSH 这类高重复 prompt 负载上**最大的省钱杠杆**——上图这份用量实付 ¥14.64，缓存省下了 ¥458.15。

命中率掉到 60% 以下时，文案会换成怎么把它救回来的建议。

### 钱花在哪个模型上

<img src="docs/models.png" width="860" alt="模型成本排行">

按费用降序，带占比条和输入/输出/缓存拆分。模型配色在排行、下拉选择器和图表图例三处一致。

### 哪个会话最烧钱

<img src="docs/sessions.png" width="860" alt="会话成本排行">

按模型、按天的视图告诉你「花在什么上」和「什么时候花的」；这张告诉你**是哪一次跑掉的**——对 agent 用户来说，这是唯一能直接动手改的东西：一个特别贵的会话，通常意味着一段值得看看的 prompt 或一个没收住的循环。上图里一个会话就占了总花费的 77.8%。

会话标题直接从会话日志里读（`session/title` 事件），跟用量重放搭同一趟车，不额外读盘。

### 用量的时间分布

<img src="docs/charts.png" width="860" alt="逐天柱状图与热力图">

近 30 天逐天、0–23 点逐小时（可按模型多选过滤，叠成分组柱状图），外加近 12 周热力图。hover 立刻出 tooltip，不用等系统那一秒。

### 余额预警

<img src="docs/alert.png" width="860" alt="余额低预警警示条">

在「设置」里定一条预警线（默认 ¥10，填 0 关闭）。跌破时仪表盘顶部出现警示条——带上还能撑几天和充值入口——同时悬浮窗一起转警示色，两边不会各说各话：

<img src="docs/widget-low.png" width="300" alt="悬浮窗的警示态">

---

## 安装

标准 DSH 插件包（bundle + client 双面包），用 `dsh plugin` 装：

```sh
# 从 npm 安装
dsh plugin --profile web add @cassius0924/dsh-usage-dashboard

# 或从 GitHub（git 依赖会跑 prepare 脚本现场构建）
dsh plugin --profile web add github:Cassius0924/dsh-usage-dashboard

# 或本地 checkout
dsh plugin --profile web add ./path/to/dsh-usage-dashboard
```

然后**重启 dsh**（`dsh --profile web`）生效。

前提：

- 已配置 `DEEPSEEK_API_KEY`（「设置 → 模型」里填，或放在 `$DSH_HOME/.credentials.yaml`）——余额接口要用。
- 本机有 pnpm（`dsh plugin` 是 pnpm 的转发器）。

装好后打开 GUI，**进入任意一个会话**（「额度」tab 挂在 `conversation.view` 上，New Session 首页没有 tab 栏），顶部就能看到 `Chat / Trajectory / 额度`。

## 费用是怎么算的

费用是**估算**，不是账单。规则都在 [`src/pricing.ts`](src/pricing.ts) 一个文件里：

- 逐条用量记录按「**模型** + **是否落在高峰时段**」计价，而不是全局一套价。
- 2026-08-17 00:00（北京时间）之前的记录按旧的固定价；之后按峰谷价，闲时为高峰的一半。
- 高峰时段按**北京时间**判定，不随机器时区漂移。
- 未识别的模型按 `deepseek-v4-pro`（较贵的一侧）计价。

单价（CNY / 百万 tokens）：

| 模型 | 时段 | 输入·缓存命中 | 输入·未命中 | 输出 |
|---|---|---|---|---|
| deepseek-v4-pro | 08-17 前固定 | 0.025 | 3 | 6 |
| deepseek-v4-pro | 高峰 / 闲时 | 0.3 / 0.15 | 9 / 4.5 | 27 / 13.5 |
| deepseek-v4-flash | 08-17 前固定 | 0.02 | 1 | 2 |
| deepseek-v4-flash | 高峰 / 闲时 | 0.1 / 0.05 | 3 / 1.5 | 9 / 4.5 |

DeepSeek 再调价时，只改这张表。

## 开发 / 构建

```sh
pnpm install
pnpm test           # Node 内置测试运行器：计价、缓存、信任围栏与用量聚合
pnpm run build      # esbuild 出 lib/index.js（host）+ lib/client.js（client），再 tsc 出类型
pnpm run typecheck
```

产物：

- `lib/index.js` —— Host 半（ESM，Node），注册 `/api/dsh-usage-dashboard/*` 路由。
- `lib/client.js` —— Client 半（CJS 闭包），通过 `window.__ModuleLoader__` 注册进 web 启动图。

改动生效方式不同：只改 `src/client/**` 时，浏览器硬刷新（Ctrl/Cmd+Shift+R）即可；改了 `src/index.ts` 等 host 端要重启 dsh。

```
src/
├── index.ts        # Host 半入口（webServer 路由 + TTL 记忆化）
├── usage.ts        # 余额 + 用量聚合（按天/小时/模型/峰谷分桶）
├── pricing.ts      # 价目表与费用估算（唯一改价的地方）
├── contract.ts     # host ↔ client 的 wire 类型
├── trust-fence.ts  # 浏览器信任校验
└── client/
    ├── index.tsx   # Client 半入口（slots 注册）
    ├── widget.tsx  # 悬浮额度窗
    ├── dashboard.tsx # 「额度」tab
    ├── charts.tsx  # 柱状图 / 热力图 / tooltip
    ├── styles.ts   # 全部样式
    ├── api.ts      # fetch + 客户端缓存
    ├── cache.ts    # TTL 缓存（含 localStorage 持久化）
    ├── prefs.ts    # 用户设置持久化
    └── store.ts    # 两个界面共享的设置
```

样式全部走 DSH 自己的 `--dsw-alias-*` CSS 变量，跟随宿主主题，不引入独立配色。

## 已知限制

- 用量数据来自**本机** DSH 会话日志，不含其它机器/账户的用量。
- 费用是估算：不含 DeepSeek 侧的折扣、赠金消耗顺序等因素，以官方账单为准。
- 首次加载用量需要重放全部会话日志（本机实测约 5 秒），因此有 5 分钟的服务端记忆化；界面在此期间显示骨架屏。

## License

[MIT](./LICENSE)
