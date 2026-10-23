import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_WINDOW_MS,
  WINDOW_OPTIONS,
  applyRunningFilter,
  buildModel,
  dayBucket,
  effectiveStatus,
  normalizeWindow,
  relativeParts,
  shortId,
} from '../shared/activity.js'

/** 本地时间构造（测试不依赖机器时区）。 */
const at = (y, m, d, hh = 0, mm = 0) => new Date(y, m - 1, d, hh, mm, 0, 0).getTime()
const NOW = at(2026, 10, 23, 10, 0)

const summary = (id, patch = {}) => ({
  id,
  displayTitle: `会话 ${id}`,
  title: undefined,
  updatedAt: NOW - 5 * 60 * 1000,
  running: false,
  blank: false,
  origin: undefined,
  ...patch,
})

const workspace = (workspaceId, title, sessionIds = []) => ({ workspaceId, title, path: `/tmp/${workspaceId}`, sessionIds })

test('normalizeWindow: 合法值原样返回，非法值回默认', () => {
  for (const value of WINDOW_OPTIONS) assert.equal(normalizeWindow(value), value)
  assert.equal(normalizeWindow(12345), DEFAULT_WINDOW_MS)
  assert.equal(normalizeWindow(undefined), DEFAULT_WINDOW_MS)
  assert.equal(normalizeWindow('abc'), DEFAULT_WINDOW_MS)
})

test('subagent 会话不出现在模型里', () => {
  const model = buildModel({
    sessions: [summary('a', { origin: 'subagent' }), summary('b')],
    now: NOW,
  })
  assert.deepEqual(model.sections.today.map((row) => row.id), ['b'])
  assert.equal(model.totals.sessions, 1)
})

test('blank 会话不出现在模型里', () => {
  const model = buildModel({ sessions: [summary('a', { blank: true }), summary('b')], now: NOW })
  assert.deepEqual(model.sections.today.map((row) => row.id), ['b'])
})

test('归档会话不出现在模型里', () => {
  const model = buildModel({ sessions: [summary('a'), summary('b')], archived: ['a'], now: NOW })
  assert.deepEqual(model.sections.today.map((row) => row.id), ['b'])
})

test('运行中的会话在时间窗外也保留', () => {
  const old = summary('a', { updatedAt: NOW - 30 * 24 * 3600 * 1000 })
  const statuses = new Map([['a', { running: true, pendingInteraction: undefined, completionUnread: false }]])
  const model = buildModel({ sessions: [old], statuses, now: NOW })
  assert.deepEqual(model.sections.running.map((row) => row.id), ['a'])
})

test('等待回复的会话在时间窗外也保留，并进 waiting 分节', () => {
  const old = summary('a', { updatedAt: NOW - 30 * 24 * 3600 * 1000 })
  const statuses = new Map([['a', { running: false, pendingInteraction: { kind: 'approval' }, completionUnread: false }]])
  const model = buildModel({ sessions: [old], statuses, now: NOW })
  assert.deepEqual(model.sections.waiting.map((row) => row.id), ['a'])
  assert.deepEqual(model.sections.running, [])
})

test('空闲且时间窗外的会话被丢掉', () => {
  const old = summary('a', { updatedAt: NOW - 2 * 24 * 3600 * 1000 })
  const model = buildModel({ sessions: [old], now: NOW })
  assert.equal(model.totals.sessions, 0)
})

test('同一分节内按最近活动倒序', () => {
  const model = buildModel({
    sessions: [
      summary('old', { updatedAt: NOW - 3 * 3600 * 1000 }),
      summary('new', { updatedAt: NOW - 60 * 1000 }),
      summary('mid', { updatedAt: NOW - 30 * 60 * 1000 }),
    ],
    now: NOW,
  })
  assert.deepEqual(model.sections.today.map((row) => row.id), ['new', 'mid', 'old'])
})

test('工作区归属只认注册表 sessionIds，不按 cwd 猜', () => {
  const model = buildModel({
    sessions: [summary('a'), summary('b')],
    workspaces: [workspace('w1', '工作区一', ['a'])],
    now: NOW,
  })
  assert.equal(model.workspaces.length, 1)
  assert.deepEqual(model.workspaces[0].sessions.map((row) => row.id), ['a'])
  assert.ok(model.ungrouped)
  assert.deepEqual(model.ungrouped.sessions.map((row) => row.id), ['b'])
})

test('模式 A 排序：等待 → 运行 → 最近活动', () => {
  const statuses = new Map([
    ['w-run', { running: true, pendingInteraction: undefined, completionUnread: false }],
    ['w-wait', { running: false, pendingInteraction: { kind: 'question' }, completionUnread: false }],
  ])
  const model = buildModel({
    sessions: [
      summary('w-idle', { updatedAt: NOW - 60 * 1000 }),
      summary('w-run'),
      summary('w-wait'),
    ],
    statuses,
    workspaces: [
      workspace('w1', '旧工作区', ['w-idle']),
      workspace('w2', '运行中工作区', ['w-run']),
      workspace('w3', '等待工作区', ['w-wait']),
    ],
    now: NOW,
  })
  assert.deepEqual(model.workspaces.map((group) => group.id), ['w3', 'w2', 'w1'])
})

test('分节用本地 00:00 切，不碰 UTC', () => {
  const todayEarly = at(2026, 10, 23, 0, 1)
  const yesterdayLate = at(2026, 10, 22, 23, 59)
  assert.equal(dayBucket(todayEarly, NOW), 'today')
  assert.equal(dayBucket(yesterdayLate, NOW), 'yesterday')
  assert.equal(dayBucket(at(2026, 10, 21, 23, 59), NOW), 'earlier')
})

test('跨月边界：11 月 1 日看 10 月 31 日是昨天', () => {
  const monthNow = at(2026, 11, 1, 10, 0)
  assert.equal(dayBucket(at(2026, 10, 31, 23, 0), monthNow), 'yesterday')
  assert.equal(dayBucket(at(2026, 10, 31, 0, 0), monthNow), 'yesterday')
  assert.equal(dayBucket(at(2026, 10, 30, 23, 0), monthNow), 'earlier')
})

test('空范围产出全零与空分节', () => {
  const model = buildModel({ sessions: [], now: NOW })
  assert.deepEqual(model.totals, { sessions: 0, workspaces: 0, running: 0, waiting: 0 })
  assert.equal(model.workspaces.length, 0)
  assert.equal(model.ungrouped, null)
  for (const key of Object.keys(model.sections)) assert.deepEqual(model.sections[key], [])
})

test('标题兜底顺序 displayTitle → title → 短 id', () => {
  const model = buildModel({
    sessions: [
      summary('a', { displayTitle: '显式标题' }),
      summary('b', { displayTitle: '', title: '持久标题' }),
      summary('c', { displayTitle: undefined, title: undefined }),
    ],
    now: NOW,
  })
  const byId = Object.fromEntries(model.sections.today.map((row) => [row.id, row.title]))
  assert.equal(byId.a, '显式标题')
  assert.equal(byId.b, '持久标题')
  assert.equal(byId.c, shortId('c'))
})

test('effectiveStatus：status 覆盖 summary', () => {
  assert.deepEqual(effectiveStatus({ running: true }, { running: false }), { running: true, waiting: false, unread: false })
  assert.deepEqual(effectiveStatus(undefined, { running: true }), { running: true, waiting: false, unread: false })
  assert.equal(effectiveStatus({ pendingInteraction: { kind: 'plan' } }, {}).waiting, true)
  assert.equal(effectiveStatus({ completionUnread: true }, {}).unread, true)
})

test('relativeParts：刚刚 / 分钟 / 小时 / 天', () => {
  assert.deepEqual(relativeParts(NOW, NOW - 10 * 1000), { unit: 'now', n: 0 })
  assert.deepEqual(relativeParts(NOW, NOW - 5 * 60 * 1000), { unit: 'minute', n: 5 })
  assert.deepEqual(relativeParts(NOW, NOW - 3 * 3600 * 1000), { unit: 'hour', n: 3 })
  assert.deepEqual(relativeParts(NOW, NOW - 2 * 24 * 3600 * 1000), { unit: 'day', n: 2 })
})

test('只看运行中：留下运行中的行与工作区，总数改成运行数', () => {
  const statuses = new Map([['w-run', { running: true, pendingInteraction: undefined, completionUnread: false }]])
  const model = buildModel({
    sessions: [summary('w-run'), summary('w-idle')],
    statuses,
    workspaces: [workspace('w1', '有运行', ['w-run']), workspace('w2', '只有空闲', ['w-idle'])],
    now: NOW,
  })
  const filtered = applyRunningFilter(model)
  assert.deepEqual(filtered.workspaces.map((group) => group.id), ['w1'])
  assert.deepEqual(filtered.workspaces[0].sessions.map((row) => row.id), ['w-run'])
  assert.deepEqual(filtered.totals, { sessions: 1, workspaces: 1, running: 1, waiting: 0 })
  assert.deepEqual(filtered.sections.today, [])
  assert.equal(filtered.ungrouped, null)
})
