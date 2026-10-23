# dsh-workspace-activity

DSH Web GUI 的工作区活跃度面板：**只读**，在侧边栏「活跃度」里按活跃程度看工作区与会话。

> 状态：**v0.1 完成并已装进 desktop profile**（2026-10-23）。可自动化的验收已过；真机上的人眼/行为验收待用户（清单见 [S4 证据](docs/implementation/S4-真机安装与验收-2026-10-23.md)）。
> 版本：0.1.0 · 单测 17/17 · 一次性 profile 探针 8/8。

![面板（一次性实例，空数据）](docs/implementation/assets/s3-panel-empty.png)

## 它做什么

- 侧边栏多一个「活跃度」入口（在「插件」「自动化任务」下面），点开主区是面板。
- **按工作区**（默认）：工作区按「等待你 → 有运行中 → 最近活动」排序；行上给等待/进行中/今日/会话数，展开看会话。
- **按时间**：等待你 / 进行中 / 今天 / 昨天 / 更早 五个分节，分节可单独隐藏、可恢复默认。
- 时间窗 1 小时 / 6 小时 / 24 小时 / 7 天（默认 24 小时）；「只看运行中」过滤。
- 点会话行跳到该会话；视图选择记在 localStorage。
- 空态、加载骨架、工作区列表读失败的错误态；页脚显示构建章。
- **只读**：不写会话、不写工作区、不发模型请求。

数据全部来自插槽标准 props（`useSessions` / `useSessionStatus` / `useWorkspaces` / `usePanelInfo`），所以是**实时订阅**：没有轮询、没有 Host 端点、没有 `/api` 路由。

## 安装 / 卸载

安装（本机已装；换机器或重装时）：

```text
plugin_manager install_bundle target=/Users/taishuo/projects/dsh-workspace-activity
```

卸载：

```text
plugin_manager remove_bundle target=dsh-workspace-activity
```

**卸载后 Host 行立即消失，但已经打开的页面里入口要刷新页面才清**（S4 实测）。重装后 Host 行回来。

## 开发循环

| 改什么 | 怎么生效 |
| --- | --- |
| `shared/activity.js`、`client/panel.js` | `npm run build`（即 `node scripts/build-client.mjs`）→ 宿主客户端模块扫描到 `client.js` 变化后热更；没动就刷新页面 |
| `index.js`（Host 半边，目前是空 `apply()`） | 改 profile 的 `cordis.patch.yml` 触发重组，或重跑一次 `install_bundle` |
| `cordis.patch.yml` / 新增文件 | 重跑 `install_bundle`；新增文件记得进 `package.json` 的 `files` |
| 逻辑 | `npm test`（17 条纯函数单测） |
| 端到端 | `node scripts/live-probe.mjs`（一次性 `DSH_HOME`，8 项断言，不碰用户 profile） |

本仓**没有打包器**：`scripts/build-client.mjs` 按固定顺序把 `shared/activity.js` + `client/panel.js` 拼成 `client.js`，剥掉 `export` 与那条允许的 import，并给两半盖同一个构建章（`build.stamp.json`）。`client/panel.js` 里除了 `../shared/activity.js` 不许有别的 import——脚本会拦。

## 升级 DSH 后的回归清单

1. `sidebar.panellist` / `main` 两个插槽 key 与注册选项还在不在（`Slots.listSubTree`）。
2. `main` 插槽的 standardProps 还有没有 `useSessions` / `useSessionStatus` / `useWorkspaces` / `usePanelInfo`（Slots 的 catalog）。
3. `dsh.client.platform === 'web'` 与 `exports["./client"]` 的扫描规则有没有变（`node scripts/live-probe.mjs` 的 P5/P6 会先报）。
4. `uiWorkspace.openSession` 服务名与签名（点会话行要用）。
5. `client/locale` 的 `register` 形态与 `registration.locale` 投影。
6. 面板 console 有没有 `slot entry crashed`。

任何一项碎掉：先 `plugin_manager set_bundle` 关掉插件，再按本清单修，别硬改宿主。

## 文档

- 讨论稿 v0.1.2：[docs/discussion/工作区活跃度显示讨论稿-v0.1.2.md](docs/discussion/工作区活跃度显示讨论稿-v0.1.2.md)
- 实施稿（含「实施中的决策修正」）：[docs/implementation/工作区活跃度插件-实施稿-2026-10-23.md](docs/implementation/工作区活跃度插件-实施稿-2026-10-23.md)
- 一次性实例验证（探针 8/8 + 截图）：[docs/implementation/S3-一次性实例验证-2026-10-23.md](docs/implementation/S3-一次性实例验证-2026-10-23.md)
- 真机安装与验收（三态 + 待用户清单）：[docs/implementation/S4-真机安装与验收-2026-10-23.md](docs/implementation/S4-真机安装与验收-2026-10-23.md)
- 工作记录：[docs/records/2026-10-23-code-workspace-activity-v01/record.md](docs/records/2026-10-23-code-workspace-activity-v01/record.md)

## 还没做（v1.1 起）

活动量（消息/工具调用/token）与文件改动、综合评分与「按活跃度」排序、侧边栏行内指示、已读/等待动作（如「清理已读」）、标题栏第 4 个图标的位置方案。见实施稿 §八、§九。
