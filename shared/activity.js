/**
 * 两半共用的纯函数（v0.1 只被 Client 半边用，Node 单测直接 import）。
 *
 * 约束：这个文件**不许 import 任何东西**——构建脚本会把它整段内联进 client bundle。
 * 纯函数也不许读 `Date.now()`：`now` 一律由调用方传进来，测试才好写。
 *
 * 数据来源（由 Client 半边的插槽标准 hooks 提供）：
 * - sessions：`useSessions` 的 `SessionListState`（byId 里的 SessionSummary：id/title/displayTitle/updatedAt/running/blank/origin）
 * - statuses：`useSessionStatus` 的 Map（running / pendingInteraction / completionUnread）
 * - workspaces：`useWorkspaces` 的 `WorkspaceSnapshot`（items：workspaceId/title/path/sessionIds）
 * - archived：WorkspaceSnapshot.archivedSessionIds
 */

export const SHARED_VERSION = 2

/** 面板里可选的时间窗（毫秒）。 */
export const WINDOW_OPTIONS = [60 * 60 * 1000, 6 * 60 * 60 * 1000, 24 * 60 * 60 * 1000, 7 * 24 * 60 * 60 * 1000]
export const DEFAULT_WINDOW_MS = 24 * 60 * 60 * 1000

/** 模式 B 的分节顺序：等待你 → 进行中 → 今天 → 昨天 → 更早。 */
export const SECTION_IDS = ['waiting', 'running', 'today', 'yesterday', 'earlier']

/** 非法/缺失的时间窗回到默认值（本地存储被改坏时也走这里）。 */
export function normalizeWindow(value) {
  const n = Number(value)
  return WINDOW_OPTIONS.includes(n) ? n : DEFAULT_WINDOW_MS
}

/** 本地时区的当天 00:00（毫秒）。 */
export function startOfLocalDay(now) {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** updatedAt 落在本地哪一天：today / yesterday / earlier。 */
export function dayBucket(updatedAt, now) {
  const todayStart = startOfLocalDay(now)
  if (updatedAt >= todayStart) return 'today'
  const yesterdayStart = startOfLocalDay(todayStart - 1)
  if (updatedAt >= yesterdayStart) return 'yesterday'
  return 'earlier'
}

/** 相对时间的语言无关部分：now / minute / hour / day + n。 */
export function relativeParts(now, ts) {
  const delta = Math.max(0, Number(now) - Number(ts))
  const minutes = Math.floor(delta / 60000)
  if (minutes < 1) return { unit: 'now', n: 0 }
  if (minutes < 60) return { unit: 'minute', n: minutes }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return { unit: 'hour', n: hours }
  return { unit: 'day', n: Math.floor(hours / 24) }
}

/** 会话 id 的短形式（拿不到标题时兜底显示）。 */
export function shortId(id) {
  const s = String(id ?? '')
  return s.length <= 10 ? s : s.slice(-8)
}

/**
 * 一条会话的当前状态：status 覆盖 summary（status 更实时）。
 * @returns {{running: boolean, waiting: boolean, unread: boolean}}
 */
export function effectiveStatus(status, summary) {
  const running = status && status.running !== undefined ? status.running === true : summary?.running === true
  const waiting = Boolean(status && status.pendingInteraction !== undefined && status.pendingInteraction !== null)
  const unread = Boolean(status && status.completionUnread === true)
  return { running, waiting, unread }
}

/** 分节排序：等待/进行中的排在前面，再按最近活动。 */
function compareRows(a, b) {
  if (a.section !== b.section) return SECTION_IDS.indexOf(a.section) - SECTION_IDS.indexOf(b.section)
  return b.updatedAt - a.updatedAt || String(a.id).localeCompare(String(b.id))
}

/** 工作区排序：等待数 → 运行数 → 最近活动 → 会话数 → 标题。 */
function compareGroups(a, b) {
  return (
    b.waitingCount - a.waitingCount ||
    b.runningCount - a.runningCount ||
    b.lastActivityAt - a.lastActivityAt ||
    b.sessionCount - a.sessionCount ||
    String(a.title ?? '').localeCompare(String(b.title ?? '')) ||
    String(a.id).localeCompare(String(b.id))
  )
}

/**
 * 把插槽 hooks 给的快照折成面板要的模型。纯函数，`now` 由调用方传入。
 *
 * @param {object} input
 * @param {Array} input.sessions - SessionSummary[]
 * @param {Map|object} [input.statuses] - sessionId → SessionStatus
 * @param {Array} [input.workspaces] - WorkspaceView[]
 * @param {Iterable|Array} [input.archived] - 归档会话 id
 * @param {number} [input.windowMs]
 * @param {number} input.now
 * @returns {object} 面板模型
 */
export function buildModel(input) {
  const now = Number(input.now)
  const windowMs = normalizeWindow(input.windowMs)
  const statuses = input.statuses instanceof Map ? input.statuses : null
  const archived = input.archived instanceof Set ? input.archived : new Set(input.archived ?? [])

  const rows = []
  for (const summary of input.sessions ?? []) {
    if (!summary || !summary.id) continue
    if (summary.blank) continue
    if (summary.origin === 'subagent') continue
    if (archived.has(summary.id)) continue
    const status = statuses ? statuses.get(summary.id) : input.statuses?.[summary.id]
    const state = effectiveStatus(status, summary)
    const updatedAt = Number(summary.updatedAt) || 0
    if (!state.running && !state.waiting && updatedAt < now - windowMs) continue
    rows.push({
      id: summary.id,
      title: summary.displayTitle || summary.title || shortId(summary.id),
      updatedAt,
      running: state.running,
      waiting: state.waiting,
      unread: state.unread,
      section: state.waiting ? 'waiting' : state.running ? 'running' : dayBucket(updatedAt, now),
      workspaceId: null,
    })
  }

  const workspaceList = Array.isArray(input.workspaces) ? input.workspaces : []
  const workspaceBySession = new Map()
  for (const workspace of workspaceList) {
    for (const sessionId of workspace.sessionIds ?? []) workspaceBySession.set(sessionId, workspace.workspaceId)
  }
  for (const row of rows) row.workspaceId = workspaceBySession.get(row.id) ?? null

  const sections = { waiting: [], running: [], today: [], yesterday: [], earlier: [] }
  for (const row of rows) sections[row.section].push(row)
  for (const key of SECTION_IDS) sections[key].sort(compareRows)

  const groups = new Map()
  for (const workspace of workspaceList) {
    groups.set(workspace.workspaceId, {
      id: workspace.workspaceId,
      title: workspace.title || workspace.path || shortId(workspace.workspaceId),
      path: workspace.path ?? '',
      sessions: [],
      sessionCount: 0,
      runningCount: 0,
      waitingCount: 0,
      todayCount: 0,
      lastActivityAt: 0,
    })
  }
  const ungrouped = {
    id: '__ungrouped__',
    title: null,
    path: '',
    sessions: [],
    sessionCount: 0,
    runningCount: 0,
    waitingCount: 0,
    todayCount: 0,
    lastActivityAt: 0,
  }
  let ungroupedUsed = false
  for (const row of rows) {
    const group = row.workspaceId ? groups.get(row.workspaceId) : ungrouped
    if (!group) continue
    if (group === ungrouped) ungroupedUsed = true
    group.sessions.push(row)
    group.sessionCount += 1
    if (row.running) group.runningCount += 1
    if (row.waiting) group.waitingCount += 1
    if (row.section === 'today') group.todayCount += 1
    if (row.updatedAt > group.lastActivityAt) group.lastActivityAt = row.updatedAt
  }
  for (const group of groups.values()) group.sessions.sort(compareRows)
  ungrouped.sessions.sort(compareRows)

  const workspaces = [...groups.values()].filter((group) => group.sessionCount > 0).sort(compareGroups)
  const totals = {
    sessions: rows.length,
    workspaces: workspaces.length + (ungroupedUsed ? 1 : 0),
    running: rows.filter((row) => row.running).length,
    waiting: rows.filter((row) => row.waiting).length,
  }

  return {
    now,
    windowMs,
    sections,
    workspaces,
    ungrouped: ungroupedUsed ? ungrouped : null,
    totals,
  }
}

/**
 * 「只看运行中」过滤器：不动 model 的分节结构，只把非运行中的行与空出来的工作区拿掉。
 * @param {object} model - buildModel 的返回值
 * @returns {object} 过滤后的新 model
 */
export function applyRunningFilter(model) {
  const sections = {}
  for (const key of SECTION_IDS) sections[key] = model.sections[key].filter((row) => row.running)
  const workspaces = []
  for (const group of model.workspaces) {
    const sessions = group.sessions.filter((row) => row.running)
    if (sessions.length === 0) continue
    workspaces.push({
      ...group,
      sessions,
      sessionCount: sessions.length,
      waitingCount: 0,
      todayCount: sections.today.filter((row) => row.workspaceId === group.id).length,
    })
  }
  let ungrouped = null
  if (model.ungrouped) {
    const sessions = model.ungrouped.sessions.filter((row) => row.running)
    if (sessions.length > 0) {
      ungrouped = {
        ...model.ungrouped,
        sessions,
        sessionCount: sessions.length,
        waitingCount: 0,
        todayCount: sections.today.filter((row) => row.workspaceId === null).length,
      }
    }
  }
  const sessions = SECTION_IDS.reduce((count, key) => count + sections[key].length, 0)
  return {
    ...model,
    sections,
    workspaces,
    ungrouped,
    totals: {
      sessions,
      workspaces: workspaces.length + (ungrouped ? 1 : 0),
      running: sessions,
      waiting: 0,
    },
  }
}
