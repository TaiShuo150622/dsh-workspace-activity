# 日志 · 2026-10-23-code-workspace-activity-v01

mode: live
<!-- live = 边做边记；backfilled = 收尾时按对话回填（要在下面说明为什么、时间的可信度）。时间记法：精确 HH:MM，估计 HH:M~ -->

<!-- 追加式，不删不改。写一切，不筛选——筛选在编 record 时做。一行一条：`- HH:MM [tag] 内容`。 -->

tag 速查（前四个最重要）：

- `[decision]` 在 A 和 B 之间选了 A，因为 __（当下的理由）。例：`- 10:12 [decision] hash 输入用规范化 JSON 而非原始体，因为键序不同会得不同 hash`
- `[deviation]` 哪里和计划不一样，为什么。例：`- 11:03 [deviation] 计划只加闸不改调用方；实际改了 3 个调用方，闸一开它们直接 500`
- `[problem]` 现象 → 当时以为 → 后来发现。例：`- 14:20 [problem] CI 红本地绿 → 以为是缓存 → 是时区，naive datetime`
- `[correction]` 人纠正你的话原文 + 你原来怎么做。例：`- 15:01 [correction] 人说：“不要写成功，写命令。” 我原来在变更表只列了文件名`
- `[cmd]` 跑了什么命令，结果一句话
- `[file]` 新建 / 修改 / 删除了什么文件，一句话为什么
- `[read]` 读了仓库里哪个文件，为了什么
- `[source]` 外部来源（链接、日期、一手/二手）
- `[question]` 想问人但没问（或问了）的问题，和你当时用的默认值
- `[deadend]` 走错的路：试了什么，为什么放弃
- `[note]` 其他

---

- 00:12 [note] 回填说明：log 在收尾时按本轮对话与产物回填（mode 应为 backfilled；时间按本轮事件粗记，分钟级可信、秒级不可信）。
- 00:12 [read] 读 dsh 插件技能 references（practices/ui-plugin/host-plugin/verification）与模板，确认 bundle 形状、插槽访问方式、验证边界。
- 00:14 [read] 读本机 ui-workspace/ui-sidebar/ui-layout/客户端模块源码，核实「工作区标题栏三个图标是内部 JSX，没有插槽」。
- 00:16 [decision] 入口位置 A/B/C 里先按 A（sidebar.panellist + main），因为标题栏无插槽；B/C 写进讨论稿等拍。
- 00:20 [read] 读 dsh-chrome 的 A0/风险表/CODE-REVIEW-SELF/HARDENING 与 dag-panel README，抽 14 条浏览器插件教训。
- 00:22 [file] 写 discussion v0.1.0 → v0.1.1/v0.1.2（Codex Activity 设计、两种视图模式），build 实施稿。
- 00:30 [source] Codex 桌面应用 26.1016.61520 的 app.asar 文案（priorityThreads/unreads/showSection/sortMenu 等），作为「状态分节而不是评分」的依据。
- 00:44 [decision] 用户要求先看实施稿→改成"按 S0–S5 做完、中间不问"；用 create_goal 建目标，todo 跟踪五片。
- 00:49 [cmd] `plugin_manager install_bundle target=/Users/taishuo/projects/dsh-workspace-activity` → stage enable、application applied；profile 里生成 link 依赖 + bundle 列表项。
- 00:49 [cmd] `Slots.listSubTree root=sidebar.panellist` → occupants 含 workspace-activity(active)；`root=main` → 含 key workspace-activity。S0 通过。
- 00:51 [decision] S1 改口径：v1 不做 Host 端点，改纯 Client 半边。理由：插槽标准 props 直接有 useSessions/useSessionStatus/useWorkspaces（技能要求从插槽 selector hooks 读会话数据）；订阅实时、无 /api 信任边界、无 Host 热重载。
- 00:52 [file] 写 shared/activity.js 纯函数（窗口/分节/归属/排序/过滤）与 tests/activity.test.mjs（17 条）。
- 00:52 [cmd] `node --test tests/activity.test.mjs` → 17 pass。
- 00:53 [cmd] 变异自证：删归档过滤→`归档会话不出现在模型里` 红；startOfLocalDay 改 UTC→两条分节用例红；还原后 17 pass。
- 00:53 [file] 写 client/panel.js（两种模式/控件/空态/错误态/主题令牌/构建号）与 scripts/build-client.mjs（无打包器，拼 shared+client）。
- 00:53 [problem] build 报「不允许的 import」→ 原因：import 跨行写，脚本按单行匹配；改成整块匹配并断言恰好一条。
- 00:56 [file] 写 scripts/live-probe.mjs（一次性 DSH_HOME + App 内置 CLI + Node 探针）。
- 00:56 [problem] 探针报「找不到 App 或 CLI」→ 原因：CLI 在 app.asar 里，普通 node 的 existsSync 看不见；改成只查 App 二进制。
- 00:56 [problem] 探针 P6 404 → 原因：本包 bundle 在 combo URL（plugins/??a/client.js,b/client.js&rev=…），不是 /plugins/<pkg>/client.js；从 boot HTML 抠 combo 后 200。
- 00:56 [problem] 探针 P8 预期 401 实际 200 → 原因：无 cookie 打开页面才是 401；client bundle 是公开静态资源。口径改成「无 cookie 打开页面被拦」→ 8/8 PASS。
- 00:57 [cmd] `node scripts/live-probe.mjs` → 8/8 PASS（combo 1,949,436 bytes；build id a3123961）。
- 00:58 [cmd] `--keep` 起一次性实例，Chrome 打开 token URL：侧边栏出现「活跃度」，面板渲染、模式切换、时间窗、只看运行中、刷新后偏好保留；console 无条目。
- 00:59 [deadend] 想给一次性实例造一条非空会话：UI 里无法给 contenteditable 输入（chrome_type 不收 div，chrome_press 单键不插入）；拷真实冷会话日志后 updatedAt 回落到 createdAt(9 天前) 被窗口滤掉 → 放弃填充态可视，仅留纯函数覆盖。
- 01:04 [cmd] 真机卸载重装：`remove_bundle` → Host Config 行消失（0 条）；但已打开页面的 Slots 仍显示 occupant；`install_bundle` 后 Host 行回来。
- 01:04 [problem] 卸载后 client 半边不立刻消失 → 结论：页面侧要刷新；写进 README 卸载步骤与 E8 口径。
- 01:05 [cmd] 元数据校验：locale meta 可解析、icon.svg XML 合法（324B）、client.js 与 build.stamp.json 同 id a3123961、node --check ×3、node --test 17/17。
- 01:06 [file] 写 S3/S4 证据文件与截图；更新 README/CHANGELOG/实施稿进度。
- 01:07 [decision] 记录 commit_range 从首笔提交起算；本仓是本会话从空仓建起的，无更早父提交。
- 01:06 [decision] 加「等待你」分节而不是只做进行中/今天/昨天/更早，因为 useSessionStatus.pendingInteraction 就是等待状态（审批/提问/计划审阅），已有数据不用白不用。
- 01:06 [decision] 时间窗/过滤/分节选择存 localStorage 而不是只存内存，因为用户一天里会反复开面板，Codex 也记视图选择。
- 01:07 [deviation] 计划 S1 做 Host 端点 + /api；实际改成 shared 纯函数 + Client 标准 props——插槽 standardProps 已给全部数据，再写 Host 聚合是重复且多两层风险。
- 01:07 [deviation] 计划 S3 探针打 /api 200/401/403；实际改成 boot graph/bundle/构建章/认证边界——v1 没有 /api。
- 01:07 [deviation] 计划 S2 完成即验面板可视；实际只验了空态与交互，填充态没在浏览器看过——一次性实例造不出非空数据。
- 01:07 [deviation] 计划 S4 人工验收 12 条；实际只做可自动化项，12 条人眼清单留给用户——桌面 App 页面不能在不打扰的前提下驱动。
