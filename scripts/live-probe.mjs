#!/usr/bin/env node
/**
 * 一次性 profile 端到端探针（S3）。不碰用户 profile、不嗅桌面 App 的 token。
 *
 * 1. 在 /tmp 下建一次性 DSH_HOME，用 App 内置 CLI 把本仓装成 web profile 的 bundle；
 * 2. 起 `web --no-open --port 0`，从它自己打印的 URL 里拿 token；
 * 3. 用 Node fetch 换 cookie，逐项断言 boot graph / client bundle / 认证边界 / 构建章；
 * 4. 清理（`--keep` 时留着给浏览器做可视验证，状态写到 --state 指定的 JSON）。
 *
 * 用法：
 *   node scripts/live-probe.mjs
 *   node scripts/live-probe.mjs --keep --state /tmp/wsa-probe/state.json
 *
 * 退出码：0 全过；1 有失败；2 环境起不来。
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const APP = '/Applications/DeepSeek Harness.app/Contents/MacOS/DeepSeek Harness'
const CLI = '/Applications/DeepSeek Harness.app/Contents/Resources/app.asar/dsh/node_modules/@deepseek-ai/dsh-desktop-host/lib/cli.js'
const PACKAGE = 'dsh-workspace-activity'

const argv = process.argv.slice(2)
const keep = argv.includes('--keep')
const stateIdx = argv.indexOf('--state')
const statePath = stateIdx >= 0 ? argv[stateIdx + 1] : ''

const checks = []
const record = (name, ok, detail) => {
  checks.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

/** 跑一次 CLI 并等它退出。 */
function runCli(cliArgs, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(APP, ['--expose-internals', CLI, ...cliArgs], {
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let out = ''
    let err = ''
    child.stdout.on('data', (chunk) => { out += chunk.toString() })
    child.stderr.on('data', (chunk) => { err += chunk.toString() })
    child.on('error', reject)
    child.on('exit', (code, signal) => {
      if (code === 0) resolve({ out, err })
      else reject(new Error(`CLI ${cliArgs.join(' ')} exited ${code ?? signal}: ${(err || out).slice(-1500)}`))
    })
  })
}

/** 起宿主子进程（detached：方便整组杀）。 */
function startHost(env) {
  const child = spawn(APP, ['--expose-internals', CLI, 'web', '--no-open', '--port', '0'], {
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  })
  let out = ''
  let err = ''
  child.stdout.on('data', (chunk) => { out += chunk.toString() })
  child.stderr.on('data', (chunk) => { err += chunk.toString() })
  child.unref()
  return { child, text: () => out + err }
}

function waitForUrl(getText, timeoutMs = 90000) {
  return new Promise((resolve, reject) => {
    const started = Date.now()
    const timer = setInterval(() => {
      const text = getText()
      const match = text.match(/http:\/\/127\.0\.0\.1:(\d+)\/\?token=[^\s'"]+/)
      if (match) {
        clearInterval(timer)
        resolve(match[0].replace(/[.,;]+$/, ''))
      } else if (Date.now() - started > timeoutMs) {
        clearInterval(timer)
        reject(new Error(`90s 内没等到 web URL；输出尾部：${text.slice(-1500)}`))
      }
    }, 200)
  })
}

function cookieOf(response) {
  const cookies = typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : [response.headers.get('set-cookie')].filter(Boolean)
  return cookies.map((line) => line.split(';', 1)[0]).join('; ')
}

async function stopHost(child) {
  if (!child || !child.pid) return
  try {
    process.kill(-child.pid, 'SIGTERM')
  } catch {
    try { child.kill('SIGTERM') } catch { /* 已退出 */ }
  }
  await new Promise((resolve) => setTimeout(resolve, 2000))
  try {
    process.kill(-child.pid, 'SIGKILL')
  } catch {
    /* 已退出 */
  }
}

async function main() {
  // CLI 在 app.asar 里，普通 node 的 existsSync 看不见它；这里只查 App 二进制。
  if (!existsSync(APP)) {
    console.error(`找不到 App 二进制：${APP}`)
    process.exit(2)
  }
  const home = mkdtempSync(join(tmpdir(), 'dsh-wsa-probe-'))
  const env = { DSH_HOME: home, ELECTRON_RUN_AS_NODE: '1' }
  console.log(`[probe] DSH_HOME=${home}`)

  let host = null
  let ok = false
  try {
    // P1：装 bundle
    const installed = await runCli(['plugin', '--profile', 'web', 'add', ROOT], env)
    const installLine = installed.out.split('\n').filter((line) => line.includes(PACKAGE)).slice(-1)[0] ?? ''
    record('P1 App 内置 CLI 把本仓装进一次性 web profile', installed.out.includes(PACKAGE), installLine.trim())

    // P2：起宿主、拿它自己打印的 URL
    host = startHost(env)
    let url = null
    try {
      url = await waitForUrl(host.text)
    } catch (error) {
      record('P2 一次性宿主启动并打印带 token 的 URL', false, String(error.message).slice(0, 400))
      throw error
    }
    const origin = new URL(url).origin
    record('P2 一次性宿主启动并打印带 token 的 URL', true, origin)
    record('P3 host 只监听 127.0.0.1', new URL(url).hostname === '127.0.0.1', new URL(url).hostname)

    if (statePath) {
      mkdirSync(dirname(statePath), { recursive: true })
      writeFileSync(statePath, JSON.stringify({ home, pid: host.child.pid, url, origin, startedAt: new Date().toISOString() }, null, 2))
      console.log(`[probe] state → ${statePath}`)
    }

    // 换 cookie：token URL 只用来换 HttpOnly cookie
    const tokenResponse = await fetch(url, { redirect: 'manual' })
    const cookie = cookieOf(tokenResponse)
    record('P4 token URL 换到登录 cookie', Boolean(cookie), `status ${tokenResponse.status}`)

    // P5：boot graph 里有本插件的 client 行
    const index = await fetch(origin + '/', { headers: { cookie } })
    const html = await index.text()
    const bootHasPlugin = html.includes(PACKAGE)
    record('P5 boot graph 里有本插件的 client 行', index.status === 200 && bootHasPlugin, `status ${index.status} · ${bootHasPlugin ? '在' : '不在'}`)

    // P6：client bundle 被服务，形状正确
    // 本包的 bundle 在 boot graph 的 combo URL 里（`plugins/??a/client.js,b/client.js&rev=…`），
    // 不是 `/plugins/<pkg>/client.js` 那条单资源 URL。从 HTML 里把包含本包的那条 combo 抠出来。
    const comboMatch = html.match(/plugins\/\?\?[^"'<>]*dsh-workspace-activity\/client\.js[^"'<>]*/)
    const comboPath = comboMatch ? '/' + comboMatch[0].replace(/&amp;/g, '&') : null
    const bundleResponse = comboPath ? await fetch(origin + comboPath, { headers: { cookie } }) : null
    const bundleText = bundleResponse ? await bundleResponse.text() : ''
    const shapeOk = Boolean(bundleResponse) && bundleResponse.status === 200 &&
      bundleText.includes('__ModuleLoader__.load') && bundleText.includes(PACKAGE)
    record('P6 client bundle 被服务且形状正确', shapeOk,
      bundleResponse ? `status ${bundleResponse.status} · ${bundleText.length} bytes · combo ${comboMatch ? '命中' : '没命中'}` : 'boot graph 里没找到本包的 combo URL')
    if (!shapeOk) {
      const at = html.indexOf(PACKAGE)
      console.log('[debug boot slice]', at >= 0 ? html.slice(Math.max(0, at - 500), at + 500) : 'package not in html')
    }

    // P7：bundle 里的构建章与服务端 build.stamp.json 一致
    let stamp = null
    try { stamp = JSON.parse(readFileSync(join(ROOT, 'build.stamp.json'), 'utf8')) } catch { stamp = null }
    record('P7 client bundle 带同一个构建章', Boolean(stamp) && bundleText.includes(stamp.id), stamp ? `id ${stamp.id}` : '读不到 build.stamp.json')

    // P8：无 cookie 打开页面被认证拦住（token 只用来换 cookie；页面本身要 cookie）。
    // 注意：client bundle 是公开静态资源，无 cookie 也能 GET 到 200——它不是信任边界。
    const anonymousPage = await fetch(origin + '/')
    const anonymousBody = await anonymousPage.text().catch(() => '')
    const guarded = anonymousPage.status === 401 || anonymousPage.status === 403 || /authentication required/i.test(anonymousBody)
    record('P8 无 cookie 打开页面被认证拦住', guarded, `status ${anonymousPage.status}`)

    ok = checks.every((item) => item.ok)
  } finally {
    if (keep) {
      console.log('[probe] --keep：宿主留着做浏览器验证；用 state 里的 pid 杀')
      const failed = checks.filter((item) => !item.ok)
      console.log(`\n[probe] ${checks.length - failed.length}/${checks.length} 项通过（保留宿主）`)
      // 子进程 pipe 还挂着，显式退出；宿主已 detached 继续跑
      setTimeout(() => process.exit(failed.length === 0 ? 0 : 1), 50)
      return
    }
    await stopHost(host && host.child)
    try { rmSync(home, { recursive: true, force: true }) } catch { /* 删不掉不影响结论 */ }
    const failed = checks.filter((item) => !item.ok)
    console.log(`\n[probe] ${checks.length - failed.length}/${checks.length} 项通过`)
    process.exit(failed.length === 0 ? 0 : 1)
  }
  if (!ok) process.exit(1)
}

main().catch((error) => {
  console.error('[probe] 失败：', error && error.message ? error.message : error)
  process.exit(1)
})
