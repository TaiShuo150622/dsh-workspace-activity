---
id: 2026-10-23-code-workspace-activity-v01
type: code
modules: [code, test]
date: 2026-10-23
session: session-96eebc6e-92ce-4b60-a0c8-8954c0e70672
session_uri: dsh-session:InNlc3Npb24tOTZlZWJjNmUtOTJjZS00YjYwLWEwYzgtODk1NGMwZTcwNjcyIg
session_log: /Users/taishuo/.dsh/sessions/--Users-taishuo--/session-96eebc6e-92ce-4b60-a0c8-8954c0e70672/session.v4.jsonl.zstd
cards: []
status: pass
commit_range: 6a163c0939f8..5b570fa14bf1
skills_used: [cordis-plugin-development, discussion-draft, work-record]
sediment_count: 6
---

# 工作区活跃度插件 v0.1 · 实施记录

## 目录

- [0. 元信息](#0-元信息)
- [1. 目标与验收](#1-目标与验收)
- [2. 决定与理由](#2-决定与理由)
- [3. 偏离](#3-偏离)
- [4. 变更清单](#4-变更清单)
- [5. 问题与解法](#5-问题与解法)
- [6. 未做与遗留](#6-未做与遗留)
- [7. 复现与验证](#7-复现与验证)
- [8. 沉淀](#8-沉淀)
- [9. 下一步](#9-下一步)
- [M-代码](#m-代码)
- [M-测试编写](#m-测试编写)

## 0. 元信息

| 项 | 值 |
|---|---|
| 任务卡 | 无（用户口述目标） |
| 会话 | session-96eebc6e-92ce-4b60-a0c8-8954c0e70672 |
| commit 区间 | `6a163c0..5b570fa`（本仓从空仓建起；`6a163c0` 是会话第一笔提交） |
| 输入 | 用户 2026-10-23：「做一个插件，主要作用就是在工作区允许根据活跃程度进行显示，我们先计划一下」→ 三轮问答后：「按照顺序将 S0 到 S5 依次做完，中间不问我」 |
| 产出 | 可安装的 DSH bundle `dsh-workspace-activity` 0.1.0（已装进 `~/.dsh/profiles/desktop`）+ 讨论稿 v0.1.2 + 实施稿 + S3/S4 证据 + 本记录 |
| 日志 | ./log.md（共 34 条 `- HH:MM`，按 `check_record` 统计；选入 record 约 23 条；未选入的主要是逐文件读取、探针调试中间步骤） |
| 附件 | 无独立附件（逐文件表并入 §4.1）；S3/S4 证据与截图在 `docs/implementation/` |
| 状态 | 通过（自动化验收；真机人眼项按实施稿明确留给用户） |

## 1. 目标与验收

验收句（事后重建：本记录在收尾时编写，原话回填自会话日志）：「按照顺序将 S0 到 S5 依次做完，中间不问我」；实施稿 §〇 把「S0–S5 做完」拆成 E1–E8，其中 E3/E4/E5 需要用户真机人眼，不属于本会话可执行的尺子。

命令：

```bash
cd /Users/taishuo/projects/dsh-workspace-activity
npm test
node scripts/live-probe.mjs
```

输出：

```
ℹ tests 17
ℹ pass 17
ℹ fail 0

PASS  P1 App 内置 CLI 把本仓装进一次性 web profile — + dsh-workspace-activity 0.1.0 <- /Users/taishuo/projects/dsh-workspace-activity
PASS  P2 一次性宿主启动并打印带 token 的 URL — http://127.0.0.1:63008
PASS  P3 host 只监听 127.0.0.1 — 127.0.0.1
PASS  P4 token URL 换到登录 cookie — status 303
PASS  P5 boot graph 里有本插件的 client 行 — status 200 · 在
PASS  P6 client bundle 被服务且形状正确 — status 200 · 1949436 bytes · combo 命中
PASS  P7 client bundle 带同一个构建章 — id a3123961
PASS  P8 无 cookie 打开页面被认证拦住 — status 401

[probe] 8/8 项通过
```

三态：通过（S0–S5 全部实施动作完成；E1/E7 通过，E2/E6/E8 部分，E3–E5 按实施稿 §〇 明确留待用户真机）。完整三态见 `docs/implementation/S4-真机安装与验收-2026-10-23.md`。

与计划的差距（一句话）：原稿的 Host 端点 + RPC 被换成纯 Client 半边（§3 #1），其余按 S0–S5 顺序执行。

## 2. 决定与理由

| # | 决定 | 备选 | 选它的理由 | 依据 | 失效条件 | 级别 |
|---|---|---|---|---|---|---|
| 1 | 入口先按 A（`sidebar.panellist` + `main`） | B 浮层压标题栏；C 替换整个工作区浏览器 | 标题栏是 ui-workspace 内部 JSX、无插槽；A 是官方声明座位 | 【实测】Slots 目录 + 源码 `WorkspaceBrowser.tsx:1331` | 用户坚持标题栏位置且接受 B/C 维护代价 | 上升-待拍 |
| 2 | 首版形态用状态分节，不做综合评分 | 0–100 评分排序 | Codex 桌面应用的 Activity/Priority 视图就是状态分节；两项现成信号更适合分节 | 【实测】Codex app.asar 文案 | 四项信号齐、评分有明确权重来源 | 卡内 |
| 3 | **v1 纯 Client 半边**：去掉 Host 端点/RPC/轮询，改用插槽标准 props | 原稿：Host 聚合 + `/api` RPC + 30s 轮询 | 技能要求从插槽 selector hooks 读会话数据；订阅实时；消掉 `/api` 信任边界与 Host 热重载两层风险 | 【实测】`main` 槽 standardProps 含 `useSessions`/`useSessionStatus`/`useWorkspaces`/`usePanelInfo` | DSH 收紧插槽 standardProps | 上升-已执行 |
| 4 | 加「等待你」分节 | 只做进行中/今天/昨天/更早 | `useSessionStatus.pendingInteraction` 就是等待状态（审批/提问/计划审阅） | 【实测】ui-session 类型 | 该字段被移除 | 卡内 |
| 5 | 时间窗/过滤/分节选择存 localStorage | 只存内存 | 用户一天里会反复开；Codex 也记视图选择 | 【判断】 | 出现跨窗口一致性需求 | 卡内 |
| 6 | 探针断言改为 boot graph/bundle/构建章/认证边界 | 打 `/api` 端点 | v1 没有端点；实测 bundle 在 combo URL 里 | 【实测】§5 #3 | 将来加 Host 端点（v1.1） | 卡内 |

## 3. 偏离

| # | 计划怎么说 | 实际怎么做 | 原因 | 性质 | 建议改哪张卡 / 哪个 skill |
|---|---|---|---|---|---|
| 1 | S1 做 Host 端点 + `/api` + 缓存 | 改成 `shared/activity.js` 纯函数 + Client 标准 props | 插槽 standardProps 已提供全部数据，再写一套 Host 聚合是重复且多两层风险 | 执行绕行 | 实施稿 §二之二 / 以后类似 UI 插件先查 slot catalog 的 standardProps |
| 2 | S3 探针打 `/api` 的 200/401/403 | 改成 boot graph/bundle/构建章/无 cookie 页面 | v1 没有 `/api` | 计划漏估 | 实施稿 §六 6.1 |
| 3 | S2 完成即「面板可视验证」 | 一次性实例验了空态与交互；**填充态没在浏览器看过** | 一次性实例没有非空数据，造数据的两条路（UI 输入、拷冷日志）都失败（§5 #5） | 计划漏估 | 实施稿 §六 6.3 增加「填充态需要真数据/用户确认」 |
| 4 | S4 人工验收 12 条 | 只做可自动化项；12 条人眼清单留给用户 | 桌面 App 端口随机、token 不打印，不能在不打扰的前提下驱动 | 外部变化 | 实施稿 §〇 / S4 证据 |

## 4. 变更清单

### 4.1 文件

| 路径 | 类型 | 为什么 | 影响谁 |
|---|---|---|---|
| `package.json` | 新增 | bundle 声明：`dsh.bundle.patch`、`dsh.client`（web/immediately）、exports、files | DSH Loader / Plugin Manager |
| `cordis.patch.yml` | 新增 | 一条 `insert` 行把 `workspace-activity` 装进 profile | DSH Loader |
| `index.js` | 新增 | Host 半边；v1 是空 `apply()`，为 bundle 装载与 v1.1 端点留位 | DSH Loader |
| `shared/activity.js` | 新增 | 纯函数：窗口过滤、分节、工作区归属、排序、只看运行中过滤 | Client 面板 + Node 单测 |
| `client/panel.js` | 新增 | Client 源码：入口图标、面板页、控件、空态/错误态、样式 | DSH Web 页面（只读） |
| `client.js` | 新增（生成） | 无打包器构建产物：`__ModuleLoader__.load` factory，内嵌 shared + 面板 | 浏览器模块系统 |
| `build.stamp.json` | 新增（生成） | 两半同构建章：`{id, at, git, version}` | 面板页脚 |
| `scripts/build-client.mjs` | 新增 | 拼接 shared + client，断言只允许一条 import，盖构建章 | 开发者 |
| `scripts/live-probe.mjs` | 新增 | 一次性 `DSH_HOME` 端到端探针 8 项 | 开发者 / 审计 |
| `tests/activity.test.mjs` | 新增 | 17 条纯函数单测（含 2 处变异自证） | 开发者 / CI |
| `icon.svg` | 新增 | 原创脉冲折线图标（324 B） | Plugin Manager 卡片 |
| `locale/zh.json` | 新增 | Bundle 卡片的中文 `meta.title/description` | Plugin Manager |
| `locale/en.json` | 新增 | 同上英文 | Plugin Manager |
| `.gitignore` | 新增 | 忽略 `node_modules/`、`*.log` 等 | 仓库卫生 |
| `README.md` | 修改 | 从「规划中」改成 v0.1 使用/安装/卸载/开发循环/升级回归清单 | 下一个会话、用户 |
| `CHANGELOG.md` | 新增 | 0.1.0 变更条目与已知限制 | 下一个会话 |
| `docs/discussion/工作区活跃度显示讨论稿-v0.1.0.md` | 删除 | 被 v0.1.2 取代（git mv 的另一半） | 讨论稿读者 |
| `docs/discussion/工作区活跃度显示讨论稿-v0.1.2.md` | 新增 | 两种视图模式落成「按工作区 / 按时间」；链到实施稿 | 讨论稿读者 |
| `docs/implementation/工作区活跃度插件-实施稿-2026-10-23.md` | 新增 | S0–S5 切片、契约、验证计划，及实施后的「决策修正」与进度 | 实现者、审计 |
| `docs/implementation/S3-一次性实例验证-2026-10-23.md` | 新增 | 探针 8/8 结果 + 浏览器可视验证证据 + 未覆盖项 | 审计、用户 |
| `docs/implementation/S4-真机安装与验收-2026-10-23.md` | 新增 | 安装态、E1–E8 三态、待用户 12 条清单、卸载刷新发现 | 审计、用户 |
| `docs/implementation/probe-2026-10-23.txt` | 新增 | 探针原始输出（改名 .txt 以绕过 `*.log` 忽略） | 审计 |
| `docs/implementation/assets/s3-panel-empty.png` | 新增 | 一次性实例面板空态截图 | 文档读者 |
| `docs/implementation/assets/s3-panel-time-mode.png` | 新增 | 按时间模式（分节 chip）截图 | 文档读者 |

### 4.2 接口（索引，详见 M-代码）

| 名称 | 变更类型 | 见 |
|---|---|---|
| npm 包 `dsh-workspace-activity`（exports `.` / `./client` / `./locale/*` / `./icon`） | 新增 | M-代码 §1 |
| bundle patch row `workspace-activity` | 新增 | M-代码 §1 |
| client bundle `window.__ModuleLoader__.load({id: 'dsh-workspace-activity'})` | 新增 | M-代码 §1 |
| 插槽 `sidebar.panellist#workspace-activity`、`main#workspace-activity` | 新增 | M-代码 §1 |
| 构建章 `build.stamp.json {id, at, git, version}` | 新增 | M-代码 §1 |

### 4.3 配置

| 键 | 旧值 → 新值 | 为什么 | 环境 |
|---|---|---|---|
| `~/.dsh/profiles/desktop/package.json` `dependencies.dsh-workspace-activity` | 无 → `link:/Users/taishuo/projects/dsh-workspace-activity` | `plugin_manager install_bundle` 写入 | 本机 desktop profile |
| `~/.dsh/profiles/desktop/package.json` `dsh.profile.bundles` | 追加 `dsh-workspace-activity` | 同上 | 同上 |
| 插件 `cordis.patch.yml` | 一条 `insert` 行，无 config | v1 没有可调项 | 仓内 |

### 4.4 数据

| 表 / schema | 迁移编号 | 可逆吗 | 回滚方式 |
|---|---|---|---|
| 浏览器 `localStorage` 键 `dsh-workspace-activity:view` | 无 | 可逆 | 清键即回默认；插件卸载不自动清 |

## 5. 问题与解法

| # | 现象 | 真实原因 | 做法 | 会再发生吗 | 再发生怎么提前发现 |
|---|---|---|---|---|---|
| 1 | 构建脚本报「不允许的 import：import {」 | 校验按单行匹配，import 写成了跨行 | 改成整块匹配并断言恰好一条 | 会（换写法时） | `npm run build` 即报；脚本里已有明确错误 |
| 2 | 探针报「找不到 App 内置 CLI」 | CLI 在 `app.asar` 里，普通 node 的 `existsSync` 看不见 | 只检查 App 二进制；CLI 交给 Electron 子进程读 | 会（任何用 asar 内文件做存在性检查的脚本） | 探针启动即报 |
| 3 | 探针 P6 404 | 本包 client bundle 在 **combo URL**（`plugins/??a/client.js,b/client.js&rev=…`），不是 `/plugins/<pkg>/client.js` | 从 boot HTML 抠出包含本包的 combo 再请求 | 会（每个第三方 UI 插件） | `live-probe` P6 |
| 4 | 探针 P8 预期 401 实际 200 | 无 cookie 打开页面才是 401；client bundle 是公开静态资源 | 口径改成「无 cookie 打开页面被拦」 | 会（把静态资源当信任边界时） | `live-probe` P8 |
| 5 | 一次性实例拿不到非空数据 | ① contenteditable 无法用 chrome_type/chrome_press 输入；② 拷真实冷会话日志后 `updatedAt` 回落到 `createdAt`（9 天前），被窗口滤掉 | 放弃填充态可视；用 17 条纯函数单测覆盖数据逻辑 | 会（每次要「填充态截图」时） | 计划里先写「填充态需要可造数据」 |

## 6. 未做与遗留

### 6.1 明确不做

| 什么 | 为什么这轮不做 |
|---|---|
| 活动量（消息/工具调用/token）与文件改动 | v1.1；要读会话日志，成本高 |
| 综合评分与「按活跃度」排序 | v1.1；状态分节已够 v1 |
| 侧边栏行内指示（`sidebar.session.row.leading` / hover） | v1.2 候选 |
| 已读、等待动作（清理已读、批量归档） | DSH 缺已读数据源；等待动作会引入写路径 |
| 标题栏第 4 个图标（B/C 方案） | 位置另评，不混进 v1 |

### 6.2 债（没有触发条件的不是债，放 6.3）

| 什么 | 什么条件下必须还 | 估计成本 |
|---|---|---|
| 真机人眼/行为验收（E2/E3/E4/E5/E6 人眼项） | 用户第一次打开「活跃度」面板时 | 12 条清单，10 分钟 |
| 填充态可视验证（有工作区/会话行时） | 用户真机看过一次后，或要改行布局时 | 截图 1 张 + 对拍 3 条 |
| 卸载后 client 注册不立即消失 | 下次改卸载/重装流程，或 DSH 升级到有 live eviction 的版本时 | 查 client-modules 的 disable 路径，约 2 小时 |
| 探针只覆盖 web profile | 第一次在非 desktop profile 或远程部署时 | 加 `--profile` 参数，1 小时 |

### 6.3 想法

- 用 DSH 的会话事件 + `sessionPersistence.stat` revision 做 v1.1 的增量活动量缓存；先量 `sessionController.list` 的耗时再决定要不要独立索引。
- 「等待你」已经有数据，未来可以做 Codex 式的「清理已读 / 标记已读」动作，但要先确认 DSH 有没有已读语义（目前客户端有 `completionUnread`，Host 不持久化）。

## 7. 复现与验证

```bash
# 0) 环境：macOS + DeepSeek Harness 0.2.1-rc.2（desktop profile）
cd /Users/taishuo/projects/dsh-workspace-activity

# 1) 单测：期望 17/17
npm test

# 2) 构建（已提交 client.js，改源码才需要）：期望打印 client.js 字节数与构建章
npm run build

# 3) 一次性 profile 端到端：期望 8/8 PASS（会临时装包、起宿主、清理）
node scripts/live-probe.mjs

# 4) 装进本机 desktop profile（已装；重装时跑）
#    plugin_manager install_bundle target=/Users/taishuo/projects/dsh-workspace-activity
#    期望 application: applied；之后 Slots.listSubTree(root=sidebar.panellist) 有 workspace-activity

# 5) 卸载（要验时）
#    plugin_manager remove_bundle target=dsh-workspace-activity
#    期望 Host Config 行消失；已打开页面需刷新才清入口
```

预期：步骤 1 全绿；步骤 3 末行 `[probe] 8/8 项通过`；步骤 4 后 `Slots` 两个座位都有本插件。

## 8. 沉淀

- [坑] `app.asar` 里的 CLI 用普通 node 的 `existsSync` 看不见，要用 Electron 二进制以 `ELECTRON_RUN_AS_NODE=1` 启动 · 来源：§5 #2 · → cordis-plugin-development/references/verification.md
- [坑] 第三方 client bundle 在 boot graph 的 combo URL 里（`plugins/??…`），不是 `/plugins/<pkg>/client.js` · 来源：§5 #3 · → cordis-plugin-development/references/host-plugin.md
- [坑] 卸载 bundle 后 Host 行立即消失，但已打开页面的客户端插槽注册要刷新才清 · 来源：S4 证据 · → cordis-plugin-development/references/practices.md
- [标准] UI 插件先查 `Slots.listSubTree <root>` 的 `catalog.standardProps`：会话/工作区/状态钩子常已现成，别再自造 Host 聚合 · 来源：§2 #3 · → cordis-plugin-development/references/practices.md
- [尺子] 三态验收：`npm test` + `live-probe 8/8` + `plugin_manager list_bundles`/`Slots` 注册；人眼项单列成清单，不混进「通过」 · 来源：§1 · → work-record/SKILL.md
- [坑] 一次性实例造不出非空会话时不要硬凑截图：把「填充态可视」单列成债，逻辑用纯函数单测兜 · 来源：§5 #5 · → assistant-demo-verify/SKILL.md

## 9. 下一步

### 9.1 要一起拍的

#### 待拍

| 是/否问题 | 默认值 | 不拍的后果 |
|---|---|---|
| 侧边栏全局面板入口作为长期位置？ | 是 | 位置一直悬着；想换标题栏时才知道 B/C 的维护代价 |
| v1.1 做不做活动量 + 文件改动 + 评分排序？ | 先做活动量，评分再看 | 活跃度停在「最近在动」，长任务被低估 |
| 面板命名/图标语言用中文「活跃度」？ | 是（zh/en 双语资源已备） | 改名要动 locale 与文档 |

#### 已拍待确认（§2 里「上升-已执行」的决定；只进这张表，不再当问题重问）

| 决定 | 授权出处（对话原话 / 卡） | 撤销成本 |
|---|---|---|
| v1 纯 Client 半边（去掉 Host 端点/RPC/轮询） | 用户：「按照顺序将 S0 到 S5 依次做完，中间不问我」→ 执行中按插槽 standardProps 实测决定 | 加回 Host 端点约 0.5 天；功能无损失 |

### 9.2 下一张卡

1. 用户按 S4 的 12 条清单看一眼真机（10 分钟）；有偏差我改。
2. v1.1：活动量（会话日志计数，`sessionPersistence.stat` revision 增量缓存）+ 可选文件改动；先量 `sessionController.list` 与日志读取耗时。
3. 位置评估：如果用户确认要标题栏第 4 个图标，再单开一张卡评 B（浮层）与 C（替换浏览器）。

### 9.3 交接备注（如换会话）

- 插件已装进本机 desktop profile；卸装都用 `plugin_manager`，不要手改 profile 文件。
- 改 `client/panel.js`/`shared/activity.js` 后必须 `npm run build`，否则宿主加载的还是旧 `client.js`；`index.js` 改动要重装或触发 profile 重组。
- 本仓没有打包器；`scripts/build-client.mjs` 的 import 约束（只允许 shared 那一行）别绕过。
- 一次性实例探针不碰用户 profile；**不要**为了截图去嗅桌面 App 的 token。

## M-代码

### 1. 接口表（公开接口；“破坏”类自动进 §9 要一起拍的）

| 名称 | 签名 | 输入约束 | 输出 / 副作用 | 错误行为 | 调用方 | 变更类型 | 对应测试 |
|---|---|---|---|---|---|---|---|
| `dsh-workspace-activity` 包 | `exports: { ".": "./index.js", "./client": "./client.js", "./locale/*.json", "./icon" }` | `dsh.client.platform === "web"`、`immediately: true` | 装包后 Loader 起一行、客户端加载 bundle | 缺 `client.js` 时宿主报构建设错 | `plugin_manager install_bundle` / Loader | 新增 | live-probe P1/P5/P6 |
| bundle 行 `workspace-activity` | `{ id, name: 'dsh-workspace-activity' }`（无 config） | 唯一 id | Host 半边 `apply()`（空） | 行名不存在则 Loader 跳过 | Loader | 新增 | live-probe P1 |
| client bundle | `window.__ModuleLoader__.load({ id: 'dsh-workspace-activity', factory })` | `inject: ['slots','locale']` | 注册两个插槽；无写副作用 | 组件抛错 → 宿主 console `slot entry crashed` | 客户端模块系统 | 新增 | live-probe P5；一次性实例可视 |
| `sidebar.panellist#workspace-activity` | `register({ name, id, order: 30, locale, label: () => t('panel') }, ActivityIcon)` | 入口图标 16/18px | 侧边栏一行「活跃度」 | 插槽声明消失时自动卸载 | ui-sidebar | 新增 | S4 Slots 证据 |
| `main#workspace-activity` | `register({ name, key: 'workspace-activity', locale, inject: () => ({ openSession }) }, PanelPage)` | key 与入口 id 同名 | 主区面板；无 Session 绑定 | key 冲突会替换既有条目（本 key 独占） | ui-layout | 新增 | S4 Slots 证据；一次性实例可视 |
| `build.stamp.json` | `{ id, at, git, version }` | 构建脚本写 | 面板页脚显示构建章；`client.js` 内嵌同一 id | 缺文件时 `BUILD` 为生成时的常量 | Client | 新增 | live-probe P7 |

### 2. 数据与状态变更

| 对象 | 变更 | 迁移或版本 | 可逆吗 | 谁读它 |
|---|---|---|---|---|
| `~/.dsh/profiles/desktop/package.json` | 加 link 依赖 + bundle 列表项 | 无 | 可逆（`remove_bundle`） | DSH Loader |
| localStorage `dsh-workspace-activity:view` | 新增，存 `{mode, windowMs, runningOnly, hidden}` | 无 | 可逆（清键） | 面板自己 |
| Host 会话/工作区 | 无写入（只读 selector hooks） | — | — | — |

### 3. 关键实现选择

| 位置 | 这样写 | 没这样写 | 原因 |
|---|---|---|---|
| `client/panel.js` 数据入口 | 插槽标准 props `useSessions`/`useSessionStatus`/`useWorkspaces`/`usePanelInfo` | 自己起 Host 端点 + 轮询 | 技能要求从插槽 selector hooks 读；实时订阅、少两层风险 |
| 构建 | 无打包器：`shared/activity.js` + `client/panel.js` 内联成 `client.js`，两半同构建章 | esbuild/tsdown | 第三方 bundle 只认宿主 `require`；无打包器依赖，构建 33 KB；代价是 client 源码只能 import shared 一行，脚本断言防绕过 |
| 纯函数位置 | `shared/activity.js` 同时给 Host/Client/Node 测试用 | 只放 client 里 | 单测直接 import；构建时 strip `export` 内联 |
| 构建章 | `build.stamp.json` 落盘、`client.js` 内嵌同一 id | 各自盖时间戳 | 面板页脚能对出「我看到的客户端与服务端构建是不是同一次」 |
| 打开会话 | `ctx.get('uiWorkspace')?.openSession(id)`，服务不在时行仍可点但不导航 | 直接改 `mainView`/写 store | 不碰别的插件的内部状态；缺服务时不假装成功 |
| 视图偏好 | localStorage + try/catch | 只存内存 | 一天里反复开；坏数据回默认 |

### 4. 测试覆盖

| 用例 | 测的不变量 | 负向用例自证会红？（怎么证的） | 没覆盖的路径 |
|---|---|---|---|
| `normalizeWindow` | 非法窗口回默认 | — | — |
| subagent / blank / archived | 这三类不进模型 | 删归档过滤 → `归档会话不出现在模型里` 红 | — |
| running/waiting 窗外保留 | 运行中/等待不因窗口被藏 | — | — |
| 分节与排序 | 本地 00:00 切、跨月昨天、节内倒序 | `startOfLocalDay` 改 UTC → 两条分节用例红 | 夏令时切换日的边界（本机 TZ 无 DST） |
| 工作区归属 | 只认注册表 `sessionIds`，不按 cwd | — | 注册表快照过期时的旧成员 |
| 模式 A 排序 | 等待 → 运行 → 最近活动 | — | 同分并列的展示 |
| `applyRunningFilter` | 过滤后总数/工作区同步收缩 | — | — |
| 端到端 | 装包→boot graph→bundle→构建章→认证边界 | 无 | 真机人眼项（见 §6.2） |

### 5. 依赖与副作用

- 新增依赖：无（运行时零第三方依赖；`react` 由宿主模块表提供）。
- 对外调用：无网络、无文件写入、无模型请求；只读插槽 hooks；`uiWorkspace.openSession` 只在点击时调用。
- 时间：面板每 30 秒只在本面板被选中时刷新一次 `now`（给相对时间与跨日分节），不请求数据。

### 6. 运行方式

```bash
cd /Users/taishuo/projects/dsh-workspace-activity
npm test           # 17 条纯函数单测
npm run build      # 生成 client.js + build.stamp.json
node scripts/live-probe.mjs        # 一次性 profile 8 项
node scripts/live-probe.mjs --keep --state /tmp/wsa-probe/state.json   # 留着做浏览器可视验证
```

## M-测试编写

### 1. 测的是什么不变量

| 不变量（一句话，能被违反的陈述） | 对应用例 | 层级 |
|---|---|---|
| 只有非 blank、非 subagent、未归档、且在窗口内或运行/等待中的会话进入模型 | 前 7 条 | 单元 |
| 分节边界用浏览器本地 00:00，跨月仍是昨天 | `分节用本地 00:00 切`、`跨月边界` | 单元 |
| 会话归属只由 `workspace.sessionIds` 决定，未归属进 `ungrouped` | `工作区归属只认注册表 sessionIds` | 单元 |
| 模式 A 的工作区排序是 等待数 → 运行数 → 最近活动 | `模式 A 排序` | 单元 |
| `applyRunningFilter` 只留运行中且总数同步 | `只看运行中` | 单元 |
| 相对时间分段：现在/分钟/小时/天 | `relativeParts` | 单元 |

### 2. 负向自证

| 用例 | 喂的坏输入 | 红在哪（命令 / 输出） |
|---|---|---|
| `归档会话不出现在模型里` | 删掉 `if (archived.has(summary.id)) continue` | `node --test tests/activity.test.mjs` → `✖ 归档会话不出现在模型里`，`fail 1` |
| `分节用本地 00:00 切` + `跨月边界` | `startOfLocalDay` 的 `setHours` 改成 `setUTCHours` | `node --test` → `✖ 分节用本地 00:00 切`、`✖ 跨月边界…`，`fail 2`；还原后 17 pass |

### 3. 对着坏形状查过

| 坏形状 | 查了吗 | 发现 |
|---|---|---|
| 同义反复断言 | 是 | 没有用 buildModel 的输出反算期望；期望值写死 |
| 无差别 fixture | 是 | 每条用不同的 id/时间，排序与分节用例都依赖具体值 |
| 死分支 | 是 | `applyRunningFilter` 的 ungrouped 分支有专门用例 |
| 豁免范围过宽 | 是 | 无 skip/xfail |
| 无断言的属性测试 | 是 | 无属性测试；全部精确断言 |
| 手造夹具状态 | 是 | 测试不写任何标记文件；时间用 `new Date(y,m,d)` 本地构造 |

### 4. 故意没测的

| 什么 | 为什么 |
|---|---|
| React 组件渲染 | 没有 DOM/React 测试运行时；用一次性实例的可视验证替代（S3） |
| 真机标准 props 的接入 | 属宿主内部契约；由 S4 的 Slots 注册与一次性实例可视验证兜 |
| 卸载后的客户端清退 | 实测需要刷新页面；写进 §6.2 债 |

### 5. 怎么跑

```bash
cd /Users/taishuo/projects/dsh-workspace-activity
node --test tests/*.test.mjs      # 17 条；改 shared/activity.js 后先跑这个
```
