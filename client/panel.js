/**
 * Client 半边源码（v0.1）。
 *
 * **不要直接改 client.js**：它由 `scripts/build-client.mjs` 从本文件 + `shared/activity.js` 生成。
 *
 * 数据来源是插槽标准 props（不是自己去翻别的插件 store）：`useSessions` / `useSessionStatus` /
 * `useWorkspaces` / `usePanelInfo`。所以这一版**没有 Host 端点、没有 RPC、没有轮询**，
 * 数据跟着宿主订阅实时更新。[判断] 这比原实施稿的 Host 聚合 + 30s 轮询更小、更实时，
 * 也消掉 /api 信任闸门与热重载那两层风险；改动记在实施稿「决策修正」。
 *
 * 约束：
 * - 只允许一行 `import ... from '../shared/activity.js'`（构建时删掉、shared 内联进来）；
 * - 不能用 JSX；用宿主给的 `h = React.createElement`；
 * - `apply` 里注册的资源都通过 `ctx.effect` / `ctx.slots.inject` 挂。
 */
import {
  DEFAULT_WINDOW_MS,
  SECTION_IDS,
  WINDOW_OPTIONS,
  applyRunningFilter,
  buildModel,
  normalizeWindow,
  relativeParts,
} from '../shared/activity.js'

const PANEL_ID = 'workspace-activity'
const NS = 'workspaceActivity'
const STORAGE_KEY = 'dsh-workspace-activity:view'
const EMPTY_SESSIONS = { ids: [], byId: {}, phase: 'pending', projectionsBySession: {} }
const EMPTY_WORKSPACES = { items: [], archivedSessionIds: [], pinnedSessionIds: [], state: 'idle', phase: 'pending', error: null }
const EMPTY_PANEL_INFO = { activePanelId: null }

const zh = {
  panel: '活跃度',
  title: '工作区活跃度',
  build: '构建',
  'mode.workspace': '按工作区',
  'mode.time': '按时间',
  'window.label': '时间窗',
  'window.hour': '1 小时',
  'window.6hour': '6 小时',
  'window.day': '24 小时',
  'window.week': '7 天',
  'filter.running': '只看运行中',
  'sections.label': '显示分节',
  'sections.restore': '恢复默认',
  loading: '正在读取会话…',
  'error.workspaces': '工作区列表读取失败；面板会在数据恢复后自动更新。',
  empty: '没有需要关注的工作区。',
  'empty.hint': '窗口内没有会话；可以切到 7 天看看。',
  totals: '{workspaces} 个工作区 · {sessions} 个会话 · {running} 个进行中 · {waiting} 个等待',
  'totals.filtered': '只看运行中：{running} 个会话',
  'section.waiting': '等待你',
  'section.running': '进行中',
  'section.today': '今天',
  'section.yesterday': '昨天',
  'section.earlier': '更早',
  'row.sessions': '{n} 个会话',
  'row.running': '进行中 {n}',
  'row.waiting': '等待 {n}',
  'row.today': '今日 {n}',
  ungrouped: '未分组',
  'time.now': '刚刚',
  'time.minute': '{n} 分钟前',
  'time.hour': '{n} 小时前',
  'time.day': '{n} 天前',
  'a11y.expand': '展开会话',
  'a11y.collapse': '收起会话',
}

const en = {
  panel: 'Activity',
  title: 'Workspace activity',
  build: 'build',
  'mode.workspace': 'By workspace',
  'mode.time': 'By time',
  'window.label': 'Window',
  'window.hour': '1 hour',
  'window.6hour': '6 hours',
  'window.day': '24 hours',
  'window.week': '7 days',
  'filter.running': 'Running only',
  'sections.label': 'Sections',
  'sections.restore': 'Restore defaults',
  loading: 'Reading sessions…',
  'error.workspaces': 'Could not read the workspace list; the panel updates again when data recovers.',
  empty: 'Nothing needs attention.',
  'empty.hint': 'No sessions in this window; try 7 days.',
  totals: '{workspaces} workspaces · {sessions} sessions · {running} running · {waiting} waiting',
  'totals.filtered': 'Running only: {running} sessions',
  'section.waiting': 'Waiting on you',
  'section.running': 'Running',
  'section.today': 'Today',
  'section.yesterday': 'Yesterday',
  'section.earlier': 'Earlier',
  'row.sessions': '{n} sessions',
  'row.running': '{n} running',
  'row.waiting': '{n} waiting',
  'row.today': '{n} today',
  ungrouped: 'Ungrouped',
  'time.now': 'just now',
  'time.minute': '{n} min ago',
  'time.hour': '{n} h ago',
  'time.day': '{n} d ago',
  'a11y.expand': 'Expand sessions',
  'a11y.collapse': 'Collapse sessions',
}

const WINDOW_LABEL = new Map([
  [WINDOW_OPTIONS[0], 'window.hour'],
  [WINDOW_OPTIONS[1], 'window.6hour'],
  [WINDOW_OPTIONS[2], 'window.day'],
  [WINDOW_OPTIONS[3], 'window.week'],
])

const SECTION_LABEL = {
  waiting: 'section.waiting',
  running: 'section.running',
  today: 'section.today',
  yesterday: 'section.yesterday',
  earlier: 'section.earlier',
}

const css = `
.wsa-root {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-base);
  font-size: 13px;
  line-height: 20px;
}
.wsa-header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px 12px;
  padding: 14px 20px 12px;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  flex: none;
}
.wsa-titles { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.wsa-title { margin: 0; font-size: 16px; font-weight: 600; line-height: 24px; }
.wsa-sub { color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; }
.wsa-controls { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-left: auto; }
.wsa-seg { display: inline-flex; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; overflow: hidden; }
.wsa-seg button {
  border: 0; margin: 0; padding: 5px 10px; font: inherit; cursor: pointer;
  color: var(--dsw-alias-label-secondary); background: transparent;
}
.wsa-seg button:hover { background: var(--dsw-alias-bg-layer-2); }
.wsa-seg button[aria-pressed='true'] { color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-layer-2); }
.wsa-select {
  font: inherit; color: var(--dsw-alias-label-primary); background: transparent;
  border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; padding: 4px 6px;
}
.wsa-toggle {
  font: inherit; cursor: pointer; padding: 5px 10px; border-radius: 8px;
  border: 1px solid var(--dsw-alias-border-l1); background: transparent; color: var(--dsw-alias-label-secondary);
}
.wsa-toggle:hover { background: var(--dsw-alias-bg-layer-2); }
.wsa-toggle[aria-pressed='true'] { color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-layer-2); }
.wsa-build { color: var(--dsw-alias-label-secondary); font-size: 11px; line-height: 16px; white-space: nowrap; }
.wsa-chips { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; padding: 10px 20px 0; flex: none; }
.wsa-chip {
  font: inherit; font-size: 12px; cursor: pointer; padding: 3px 9px; border-radius: 999px;
  border: 1px solid var(--dsw-alias-border-l1); background: transparent; color: var(--dsw-alias-label-secondary);
}
.wsa-chip[aria-pressed='true'] { color: var(--dsw-alias-label-primary); border-color: var(--dsw-alias-border-l2); }
.wsa-chip:hover { background: var(--dsw-alias-bg-layer-2); }
.wsa-chip-label { color: var(--dsw-alias-label-secondary); font-size: 12px; }
.wsa-body { flex: 1; min-height: 0; overflow-y: auto; padding: 10px 20px 24px; }
.wsa-list { display: flex; flex-direction: column; gap: 2px; }
.wsa-group { border-radius: 10px; }
.wsa-group:hover { background: var(--dsw-alias-bg-layer-1); }
.wsa-group-head {
  box-sizing: border-box; display: flex; align-items: center; gap: 8px; width: 100%;
  padding: 8px 10px; border: 0; border-radius: 10px; background: transparent;
  color: inherit; font: inherit; text-align: left; cursor: pointer;
}
.wsa-caret { flex: none; width: 12px; color: var(--dsw-alias-label-secondary); font-size: 10px; }
.wsa-group-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }
.wsa-badge { flex: none; font-size: 11px; color: var(--dsw-alias-label-secondary); }
.wsa-badge-run { color: var(--dsw-alias-state-success-primary); }
.wsa-badge-wait { color: var(--dsw-alias-state-warn-primary); }
.wsa-time { flex: none; margin-left: auto; color: var(--dsw-alias-label-secondary); font-size: 12px; }
.wsa-rows { list-style: none; margin: 0 0 6px; padding: 0 0 0 22px; display: flex; flex-direction: column; gap: 1px; }
.wsa-row {
  box-sizing: border-box; display: flex; align-items: center; gap: 8px; width: 100%;
  padding: 6px 10px; border: 0; border-radius: 8px; background: transparent;
  color: inherit; font: inherit; text-align: left; cursor: pointer;
}
.wsa-row:hover { background: var(--dsw-alias-bg-layer-2); }
.wsa-dot { flex: none; width: 7px; height: 7px; border-radius: 50%; background: var(--dsw-alias-state-idle-primary); }
.wsa-dot-run { background: var(--dsw-alias-state-success-primary); }
.wsa-dot-wait { background: var(--dsw-alias-state-warn-primary); }
.wsa-row-title { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wsa-row-ws { flex: none; color: var(--dsw-alias-label-secondary); font-size: 11px; }
.wsa-section-head {
  display: flex; align-items: center; gap: 8px; padding: 12px 10px 4px;
  color: var(--dsw-alias-label-secondary); font-size: 12px; font-weight: 500;
}
.wsa-section-count { font-weight: 400; }
.wsa-empty {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  margin: 56px auto 0; max-width: 520px; color: var(--dsw-alias-label-secondary); text-align: center;
}
.wsa-empty strong { color: var(--dsw-alias-label-primary); font-weight: 500; }
.wsa-error { color: var(--dsw-alias-state-error-primary); }
.wsa-skeleton { display: flex; flex-direction: column; gap: 8px; padding: 8px 0; }
.wsa-skeleton-row { height: 32px; border-radius: 8px; background: var(--dsw-alias-bg-layer-1); }
`

/** 本地存储里的视图偏好；坏数据回默认。[判断] 只存面板自己的显示选择，不写任何宿主状态。 */
function loadPrefs() {
  const fallback = { mode: 'workspace', windowMs: DEFAULT_WINDOW_MS, runningOnly: false, hidden: [] }
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    const mode = parsed && parsed.mode === 'time' ? 'time' : 'workspace'
    const windowMs = normalizeWindow(parsed && parsed.windowMs)
    const runningOnly = Boolean(parsed && parsed.runningOnly)
    const hidden = Array.isArray(parsed && parsed.hidden)
      ? parsed.hidden.filter((key) => SECTION_IDS.includes(key))
      : []
    return { mode, windowMs, runningOnly, hidden }
  } catch {
    return fallback
  }
}

function savePrefs(value) {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    /* 存不进去不影响面板；下次打开回到默认。 */
  }
}

function relText(t, now, ts) {
  const parts = relativeParts(now, ts)
  if (parts.unit === 'now') return t('time.now')
  return t(`time.${parts.unit}`, { n: parts.n })
}

/** 侧边栏入口图标：脉冲折线，跟随父级 currentColor 与 size。 */
function ActivityIcon(props) {
  const size = (props && props.size) || 16
  return h(
    'svg',
    {
      width: size,
      height: size,
      viewBox: '0 0 16 16',
      fill: 'none',
      'aria-hidden': 'true',
      style: { display: 'block' },
    },
    h('path', {
      d: 'M1.4 8.6h2.1l1.5-4.1 2.4 7.2 1.7-4.9 1.2 1.8h3.3',
      stroke: 'currentColor',
      strokeWidth: 1.4,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    }),
  )
}

function SessionRow({ t, row, now, showWorkspace, onOpen }) {
  const dotClass =
    'wsa-dot' + (row.waiting ? ' wsa-dot-wait' : row.running ? ' wsa-dot-run' : '')
  return h(
    'li',
    null,
    h(
      'button',
      {
        type: 'button',
        className: 'wsa-row',
        onClick: () => onOpen(row.id),
        title: row.title,
      },
      h('span', { className: dotClass, 'aria-hidden': 'true' }),
      h('span', { className: 'wsa-row-title' }, row.title),
      showWorkspace && row.workspaceTitle
        ? h('span', { className: 'wsa-row-ws' }, row.workspaceTitle)
        : null,
      h('span', { className: 'wsa-time' }, relText(t, now, row.updatedAt)),
    ),
  )
}

function WorkspaceGroup({ t, group, now, expanded, onToggle, onOpen }) {
  const badges = []
  if (group.waitingCount > 0) {
    badges.push(h('span', { key: 'w', className: 'wsa-badge wsa-badge-wait' }, t('row.waiting', { n: group.waitingCount })))
  }
  if (group.runningCount > 0) {
    badges.push(h('span', { key: 'r', className: 'wsa-badge wsa-badge-run' }, t('row.running', { n: group.runningCount })))
  }
  if (group.todayCount > 0) {
    badges.push(h('span', { key: 't', className: 'wsa-badge' }, t('row.today', { n: group.todayCount })))
  }
  badges.push(h('span', { key: 's', className: 'wsa-badge' }, t('row.sessions', { n: group.sessionCount })))
  return h(
    'div',
    { className: 'wsa-group' },
    h(
      'button',
      {
        type: 'button',
        className: 'wsa-group-head',
        'aria-expanded': expanded,
        onClick: () => onToggle(group.id),
        title: group.path || group.title,
      },
      h('span', { className: 'wsa-caret', 'aria-hidden': 'true' }, expanded ? '▾' : '▸'),
      h('span', { className: 'wsa-group-name' }, group.title),
      ...badges,
      h('span', { className: 'wsa-time' }, relText(t, now, group.lastActivityAt)),
    ),
    expanded
      ? h(
          'ul',
          { className: 'wsa-rows' },
          group.sessions.map((row) =>
            h(SessionRow, { key: row.id, t, row, now, showWorkspace: false, onOpen }),
          ),
        )
      : null,
  )
}

function PanelPage(props) {
  const t = typeof props.t === 'function' ? props.t : (key) => key
  const useSessions = props.useSessions || ((selector) => selector(EMPTY_SESSIONS))
  const useSessionStatus = props.useSessionStatus || ((selector) => selector(new Map()))
  const useWorkspaces = props.useWorkspaces || ((selector) => selector(EMPTY_WORKSPACES))
  const usePanelInfo = props.usePanelInfo || ((selector) => selector(EMPTY_PANEL_INFO))
  const openSession = typeof props.openSession === 'function' ? props.openSession : () => {}

  const [prefs] = React.useState(loadPrefs)
  const [mode, setMode] = React.useState(prefs.mode)
  const [windowMs, setWindowMs] = React.useState(prefs.windowMs)
  const [runningOnly, setRunningOnly] = React.useState(prefs.runningOnly)
  const [hiddenSections, setHiddenSections] = React.useState(prefs.hidden)
  const [overrides, setOverrides] = React.useState({})
  const [tick, setTick] = React.useState(() => Date.now())

  const listState = useSessions((state) => state) || EMPTY_SESSIONS
  const statusMap = useSessionStatus((map) => map) || new Map()
  const workspaceState = useWorkspaces((state) => state) || EMPTY_WORKSPACES
  const active = usePanelInfo((info) => Boolean(info && info.activePanelId === PANEL_ID))

  React.useEffect(() => {
    savePrefs({ mode, windowMs, runningOnly, hidden: hiddenSections })
  }, [mode, windowMs, runningOnly, hiddenSections])

  // 只为了让「X 分钟前」和跨日分节跟着时间走；面板选中时每 30 秒一跳，切走就停。
  React.useEffect(() => {
    if (!active) return undefined
    const timer = setInterval(() => setTick(Date.now()), 30000)
    return () => clearInterval(timer)
  }, [active])

  const sessions = React.useMemo(
    () => (listState.ids || []).map((id) => listState.byId && listState.byId[id]).filter(Boolean),
    [listState],
  )

  const model = React.useMemo(() => {
    const base = buildModel({
      sessions,
      statuses: statusMap,
      workspaces: workspaceState.items || [],
      archived: workspaceState.archivedSessionIds || [],
      windowMs,
      now: tick,
    })
    return runningOnly ? applyRunningFilter(base) : base
  }, [sessions, statusMap, workspaceState, windowMs, tick, runningOnly])

  const workspaceTitle = React.useMemo(() => {
    const map = new Map()
    for (const group of model.workspaces) map.set(group.id, group.title)
    if (model.ungrouped) map.set(model.ungrouped.id, t('ungrouped'))
    return map
  }, [model, t])

  const autoExpanded = React.useMemo(() => {
    const set = new Set()
    for (const group of model.workspaces) {
      if (group.runningCount > 0 || group.waitingCount > 0) set.add(group.id)
    }
    return set
  }, [model])

  const isExpanded = (id) => (Object.prototype.hasOwnProperty.call(overrides, id) ? overrides[id] : autoExpanded.has(id))
  const toggleGroup = (id) => setOverrides((current) => ({ ...current, [id]: !isExpanded(id) }))
  const toggleSection = (id) =>
    setHiddenSections((current) => (current.includes(id) ? current.filter((key) => key !== id) : [...current, id]))

  const loading = listState.phase !== 'ready' || workspaceState.phase === 'pending'
  const workspaceError = workspaceState.state === 'error'
  const visibleSections = SECTION_IDS.filter(
    (key) => !hiddenSections.includes(key) && model.sections[key].length > 0,
  )
  const stamp = [BUILD.id, BUILD.git].filter(Boolean).join(' · ')

  const withWorkspaceTitle = (row) =>
    row.workspaceId ? { ...row, workspaceTitle: workspaceTitle.get(row.workspaceId) || '' } : row

  const header = h(
    'header',
    { className: 'wsa-header' },
    h(
      'div',
      { className: 'wsa-titles' },
      h('h1', { className: 'wsa-title' }, t('title')),
      h(
        'span',
        { className: 'wsa-sub' },
        runningOnly
          ? t('totals.filtered', { running: model.totals.sessions })
          : t('totals', {
              workspaces: model.totals.workspaces,
              sessions: model.totals.sessions,
              running: model.totals.running,
              waiting: model.totals.waiting,
            }),
      ),
    ),
    h(
      'div',
      { className: 'wsa-controls' },
      h(
        'div',
        { className: 'wsa-seg' },
        h(
          'button',
          {
            type: 'button',
            'aria-pressed': mode === 'workspace',
            onClick: () => setMode('workspace'),
          },
          t('mode.workspace'),
        ),
        h(
          'button',
          {
            type: 'button',
            'aria-pressed': mode === 'time',
            onClick: () => setMode('time'),
          },
          t('mode.time'),
        ),
      ),
      h(
        'select',
        {
          className: 'wsa-select',
          'aria-label': t('window.label'),
          value: String(windowMs),
          onChange: (event) => setWindowMs(normalizeWindow(Number(event.target.value))),
        },
        WINDOW_OPTIONS.map((option) =>
          h('option', { key: option, value: String(option) }, t(WINDOW_LABEL.get(option))),
        ),
      ),
      h(
        'button',
        {
          type: 'button',
          className: 'wsa-toggle',
          'aria-pressed': runningOnly,
          onClick: () => setRunningOnly((value) => !value),
        },
        t('filter.running'),
      ),
      h('span', { className: 'wsa-build', title: `${t('build')} ${stamp}` }, `${t('build')} ${stamp}`),
    ),
  )

  const chips =
    mode === 'time'
      ? h(
          'div',
          { className: 'wsa-chips' },
          h('span', { className: 'wsa-chip-label' }, t('sections.label')),
          ...SECTION_IDS.map((key) =>
            h(
              'button',
              {
                key,
                type: 'button',
                className: 'wsa-chip',
                'aria-pressed': !hiddenSections.includes(key),
                onClick: () => toggleSection(key),
              },
              `${t(SECTION_LABEL[key])} ${model.sections[key].length}`,
            ),
          ),
          hiddenSections.length > 0
            ? h(
                'button',
                { type: 'button', className: 'wsa-chip', onClick: () => setHiddenSections([]) },
                t('sections.restore'),
              )
            : null,
        )
      : null

  let body
  if (loading) {
    body = h(
      'div',
      { className: 'wsa-skeleton', 'aria-busy': 'true' },
      h('div', { className: 'wsa-skeleton-row' }),
      h('div', { className: 'wsa-skeleton-row' }),
      h('div', { className: 'wsa-skeleton-row' }),
    )
  } else if (workspaceError) {
    body = h('section', { className: 'wsa-empty' }, h('strong', { className: 'wsa-error' }, t('error.workspaces')))
  } else if (model.totals.sessions === 0) {
    body = h(
      'section',
      { className: 'wsa-empty' },
      h('strong', null, t('empty')),
      h('span', null, t('empty.hint')),
    )
  } else if (mode === 'workspace') {
    const groups = [...model.workspaces]
    if (model.ungrouped) groups.push(model.ungrouped)
    body = h(
      'div',
      { className: 'wsa-list' },
      groups.map((group) =>
        h(WorkspaceGroup, {
          key: group.id,
          t,
          group: group.id === '__ungrouped__' ? { ...group, title: t('ungrouped') } : group,
          now: model.now,
          expanded: isExpanded(group.id),
          onToggle: toggleGroup,
          onOpen: openSession,
        }),
      ),
    )
  } else {
    body = h(
      'div',
      { className: 'wsa-list' },
      visibleSections.map((key) => {
        const rows = model.sections[key]
        return h(
          'section',
          { key },
          h(
            'div',
            { className: 'wsa-section-head' },
            h('span', null, t(SECTION_LABEL[key])),
            h('span', { className: 'wsa-section-count' }, String(rows.length)),
          ),
          h(
            'ul',
            { className: 'wsa-rows' },
            rows.map((row) =>
              h(SessionRow, {
                key: row.id,
                t,
                row: withWorkspaceTitle(row),
                now: model.now,
                showWorkspace: true,
                onOpen: openSession,
              }),
            ),
          ),
        )
      }),
    )
  }

  return h(
    'div',
    { className: 'wsa-root' },
    h('style', null, css),
    header,
    chips,
    h('div', { className: 'wsa-body' }, body),
  )
}

export const inject = ['slots', 'locale']

export function apply(ctx) {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'workspace-activity: dictionaries')
  const t = ctx.locale.bind(NS)

  // 会话跳转：ui-workspace 的 Client 服务；不在时行仍可点，只是不导航（不假装成功）。
  const openSession = (sessionId) => {
    const service = typeof ctx.get === 'function' ? ctx.get('uiWorkspace') : undefined
    if (service && typeof service.openSession === 'function') service.openSession(sessionId)
  }

  ctx.slots.inject('sidebar.panellist', () =>
    ctx.slots.register(
      {
        name: 'sidebar.panellist',
        id: PANEL_ID,
        order: 30,
        locale: NS,
        label: () => t('panel'),
      },
      ActivityIcon,
    ),
  )

  ctx.slots.inject('main', () =>
    ctx.slots.register(
      {
        name: 'main',
        key: PANEL_ID,
        locale: NS,
        inject: () => ({ openSession }),
      },
      PanelPage,
    ),
  )
}
