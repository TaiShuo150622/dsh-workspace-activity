# 证据 · 2026-10-23-code-workspace-activity-v01

起点 `6a163c0939f8` → 终点 `5b570fa14bf1`（回填过去会话）（只比较已提交：起点..终点）

已排除记录目录下的 0 个文件（`docs/records/`，不进变更表；与提交文件数对账时加回去）

## commit

```
5b570fa TaiShuo · S4+S5：真机安装/验收证据、实施稿决策修正与进度、README/CHANGELOG
4f7d1f2 TaiShuo · S3：探针原始输出改名 .txt 以便入库
b31fe7c TaiShuo · S3：一次性 profile 探针 8/8 通过 + 一次性实例浏览器可视验证（空态/模式切换/持久化）
8ad9a2f TaiShuo · S1+S2：纯 Client 半边（17 条纯函数单测，2 条变异能红）+ 按工作区/按时间两种模式的活跃度面板
2cc4551 TaiShuo · S0：bundle 骨架（侧边栏入口 + main 面板座位 + 无打包器构建 + 构建章）
a1f7f3b TaiShuo · 实施稿 v0.1：v0.1 切片、端点契约与验证计划（含浏览器插件 14 条教训的规避动作）
d8e045e TaiShuo · 讨论稿 v0.1.1：据 Codex 桌面应用的设计改成状态分节视图（入口先按 A，待人拍位置）
```

## git diff --stat

```
.gitignore                                         |   4 +
 CHANGELOG.md                                       |  21 +
 README.md                                          |  75 +-
 build.stamp.json                                   |   6 +
 client.js                                          | 881 +++++++++++++++++++++
 client/panel.js                                    | 633 +++++++++++++++
 cordis.patch.yml                                   |   5 +
 ...\350\256\250\350\256\272\347\250\277-v0.1.0.md" | 247 ------
 ...\350\256\250\350\256\272\347\250\277-v0.1.2.md" | 296 +++++++
 ...\276\213\351\252\214\350\257\201-2026-10-23.md" |  57 ++
 ...\270\216\351\252\214\346\224\266-2026-10-23.md" |  58 ++
 docs/implementation/assets/s3-panel-empty.png      | Bin 0 -> 101405 bytes
 docs/implementation/assets/s3-panel-time-mode.png  | Bin 0 -> 120385 bytes
 docs/implementation/probe-2026-10-23.txt           |  11 +
 ...\256\236\346\226\275\347\250\277-2026-10-23.md" | 368 +++++++++
 icon.svg                                           |   5 +
 index.js                                           |  11 +
 locale/en.json                                     |   6 +
 locale/zh.json                                     |   6 +
 package.json                                       |  37 +
 scripts/build-client.mjs                           |  84 ++
 scripts/live-probe.mjs                             | 209 +++++
 shared/activity.js                                 | 246 ++++++
 tests/activity.test.mjs                            | 191 +++++
 24 files changed, 3197 insertions(+), 260 deletions(-)
```

## 改动文件（按目录）

### "docs
- 删除 `"docs/discussion/\345\267\245\344\275\234\345\214\272\346\264\273\350\267\203\345\272\246\346\230\276\347\244\272\350\256\250\350\256\272\347\250\277-v0.1.0.md"`
- 新增 `"docs/discussion/\345\267\245\344\275\234\345\214\272\346\264\273\350\267\203\345\272\246\346\230\276\347\244\272\350\256\250\350\256\272\347\250\277-v0.1.2.md"`
- 新增 `"docs/implementation/S3-\344\270\200\346\254\241\346\200\247\345\256\236\344\276\213\351\252\214\350\257\201-2026-10-23.md"`
- 新增 `"docs/implementation/S4-\347\234\237\346\234\272\345\256\211\350\243\205\344\270\216\351\252\214\346\224\266-2026-10-23.md"`
- 新增 `"docs/implementation/\345\267\245\344\275\234\345\214\272\346\264\273\350\267\203\345\272\246\346\217\222\344\273\266-\345\256\236\346\226\275\347\250\277-2026-10-23.md"`

### (根目录)
- 新增 `.gitignore`
- 新增 `CHANGELOG.md`
- 修改 `README.md`
- 新增 `build.stamp.json`
- 新增 `client.js`
- 新增 `cordis.patch.yml`
- 新增 `icon.svg`
- 新增 `index.js`
- 新增 `package.json`

### client
- 新增 `client/panel.js`

### docs
- 新增 `docs/implementation/assets/s3-panel-empty.png`
- 新增 `docs/implementation/assets/s3-panel-time-mode.png`
- 新增 `docs/implementation/probe-2026-10-23.txt`

### locale
- 新增 `locale/en.json`
- 新增 `locale/zh.json`

### scripts
- 新增 `scripts/build-client.mjs`
- 新增 `scripts/live-probe.mjs`

### shared
- 新增 `shared/activity.js`

### tests
- 新增 `tests/activity.test.mjs`

## 模块建议（按路径推断，以 references/triggers.md 为准）

- M-代码（4 个文件命中）
- M-环境运维（1 个文件命中）
- M-测试编写（1 个文件命中）

## §4.1 文件表骨架（补“为什么”“影响谁”后粘进 record）

| 路径 | 类型 | 为什么 | 影响谁 |
|---|---|---|---|
| .gitignore | 新增 |  |  |
| CHANGELOG.md | 新增 |  |  |
| README.md | 修改 |  |  |
| build.stamp.json | 新增 |  |  |
| client.js | 新增 |  |  |
| client/panel.js | 新增 |  |  |
| cordis.patch.yml | 新增 |  |  |
| "docs/discussion/\345\267\245\344\275\234\345\214\272\346\264\273\350\267\203\345\272\246\346\230\276\347\244\272\350\256\250\350\256\272\347\250\277-v0.1.0.md" | 删除 |  |  |
| "docs/discussion/\345\267\245\344\275\234\345\214\272\346\264\273\350\267\203\345\272\246\346\230\276\347\244\272\350\256\250\350\256\272\347\250\277-v0.1.2.md" | 新增 |  |  |
| "docs/implementation/S3-\344\270\200\346\254\241\346\200\247\345\256\236\344\276\213\351\252\214\350\257\201-2026-10-23.md" | 新增 |  |  |
| "docs/implementation/S4-\347\234\237\346\234\272\345\256\211\350\243\205\344\270\216\351\252\214\346\224\266-2026-10-23.md" | 新增 |  |  |
| docs/implementation/assets/s3-panel-empty.png | 新增 |  |  |
| docs/implementation/assets/s3-panel-time-mode.png | 新增 |  |  |
| docs/implementation/probe-2026-10-23.txt | 新增 |  |  |
| "docs/implementation/\345\267\245\344\275\234\345\214\272\346\264\273\350\267\203\345\272\246\346\217\222\344\273\266-\345\256\236\346\226\275\347\250\277-2026-10-23.md" | 新增 |  |  |
| icon.svg | 新增 |  |  |
| index.js | 新增 |  |  |
| locale/en.json | 新增 |  |  |
| locale/zh.json | 新增 |  |  |
| package.json | 新增 |  |  |
| scripts/build-client.mjs | 新增 |  |  |
| scripts/live-probe.mjs | 新增 |  |  |
| shared/activity.js | 新增 |  |  |
| tests/activity.test.mjs | 新增 |  |  |

## §4.3 配置表候选

- `build.stamp.json`
- `cordis.patch.yml`
- `locale/en.json`
- `locale/zh.json`
- `package.json`
