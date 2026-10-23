# Changelog

## [0.1.0] - 2026-10-23

### Added

- 侧边栏全局面板入口「活跃度」（`sidebar.panellist`）+ 主区面板（`main` key `workspace-activity`）。
- 两种视图：**按工作区**（默认）与**按时间**；后者分「等待你 / 进行中 / 今天 / 昨天 / 更早」五节。
- 时间窗（1h / 6h / 24h / 7d，默认 24h）、只看运行中、分节开关与恢复默认。
- 空态、加载骨架、工作区列表错误态；页脚构建章；视图偏好存 localStorage。
- 点会话行跳到该会话（`uiWorkspace.openSession`，服务不在时行可点但不导航）。
- 纯函数层 `shared/activity.js`（窗口/分节/归属/排序/过滤）+ `tests/activity.test.mjs` 17 条单测；两处变异自证能红。
- 无打包器构建 `scripts/build-client.mjs`（shared + client 内联，两半同构建章 `build.stamp.json`）。
- 一次性 profile 端到端探针 `scripts/live-probe.mjs`（8 项：装包、启动、loopback、cookie、boot graph、bundle、构建章、认证边界）。

### Notes

- **只读**：不写会话/工作区、不发模型请求；Host 半边是空 `apply()`。
- 数据来自插槽标准 props（`useSessions` / `useSessionStatus` / `useWorkspaces` / `usePanelInfo`），实时订阅，无轮询、无 Host 端点。
- 卸载后已打开页面的入口要刷新页面才清（实测）。
- 真机上的人眼/行为验收待用户；一次性实例里填充态未覆盖（缺可造的非空数据）。
