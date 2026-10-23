#!/usr/bin/env node
/**
 * 无打包器构建：把 shared/activity.js 与 client/panel.js 拼成 client.js。
 *
 * 为什么不用打包器：client bundle 的 factory 只认宿主给的 require；相对 ESM import 解析不了。
 * 纯函数又要能被 Node 单测直接 import，所以两边各退一步：
 *   shared/activity.js 用 ESM 写（单测直接 import）；
 *   client/panel.js 只允许 import 那一行 shared（构建时删掉，shared 内联）；
 *   构建脚本生成 client.js，同时写 build.stamp.json 给 Host 半边盖同一个章。
 *
 * 加文件时记住：client 源码除了 `../shared/activity.js` 不允许任何 import。
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { execSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
const sharedPath = join(ROOT, 'shared', 'activity.js')
const clientPath = join(ROOT, 'client', 'panel.js')
const shared = readFileSync(sharedPath, 'utf8')
const client = readFileSync(clientPath, 'utf8')

// 允许且只允许**一条** import：指向 shared（可以跨行写成 { a, b, c } 的形式）。
const importBlockRe = /^[ \t]*import\s*\{[\s\S]*?\}\s*from\s*['"]\.\.\/shared\/activity\.js['"]\s*;?[ \t]*\n?/gm
const importBlocks = client.match(importBlockRe) ?? []
if (importBlocks.length !== 1) {
  console.error(`[build] client/panel.js 必须恰好有一条 import（指向 ../shared/activity.js），实际 ${importBlocks.length} 条`)
  process.exit(1)
}
const strippedClient = client.replace(importBlockRe, '')
if (/^[ \t]*import\b/m.test(strippedClient)) {
  const leftover = strippedClient.match(/^[ \t]*import\b[^\n]*/m)
  console.error(`[build] client/panel.js 还有不允许的 import：${leftover ? leftover[0].trim() : ''}`)
  process.exit(1)
}

const stripExports = (src) => src.replace(/^export\s+/gm, '')

const id = createHash('sha256').update(shared).update('\n').update(client).digest('hex').slice(0, 8)
const at = new Date().toISOString()
let git = ''
try {
  git = execSync('git rev-parse --short HEAD', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
} catch {
  git = ''
}
let dirty = false
try {
  dirty = execSync('git status --porcelain', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim().length > 0
} catch {
  dirty = false
}
if (dirty && git) git += '+'

const body = [stripExports(shared.trim()), stripExports(strippedClient.trim())].join('\n\n')
const indented = body
  .split('\n')
  .map((line) => (line ? `\t\t${line}` : ''))
  .join('\n')

const bundle = `// 由 scripts/build-client.mjs 生成，不要手改。构建 ${at}（${id}${git ? ` · git ${git}` : ''}）
window.__ModuleLoader__.load({
\tid: ${JSON.stringify(pkg.name)},
\tfactory: (require) => {
\t\t'use strict';
\t\tconst React = require('react');
\t\tconst h = React.createElement;
\t\tconst BUILD = ${JSON.stringify({ id, at, git, version: pkg.version })};
${indented}
\t\treturn { inject, apply };
\t},
});
`

writeFileSync(join(ROOT, 'client.js'), bundle)
writeFileSync(
  join(ROOT, 'build.stamp.json'),
  `${JSON.stringify({ id, at, git, version: pkg.version }, null, 2)}\n`,
)

console.log(`[build] client.js ${Buffer.byteLength(bundle)} bytes · id ${id}${git ? ` · git ${git}` : ''} · ${at}`)
