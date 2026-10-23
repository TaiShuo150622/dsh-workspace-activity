/**
 * Host 半边（v0.1 空实现）。
 *
 * v0.1 是**纯 Client 半边**：会话、状态、工作区全部来自插槽标准 hooks
 * （`useSessions` / `useSessionStatus` / `useWorkspaces` / `usePanelInfo`），
 * 不注册 Host 端点、不读会话日志、不写任何状态。
 *
 * Host 行留着有两个原因：bundle 要能被 Loader 装载；v1.1 的「活动量 / 文件改动」
 * 如果要读会话日志，从这一半加端点最干净（届时再补 implementation 稿里的契约）。
 */
export function apply() {}
