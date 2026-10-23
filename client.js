// 由 scripts/build-client.mjs 生成，不要手改。构建 2026-10-23T07:49:17.778Z（56b365ad · git a1f7f3b+）
window.__ModuleLoader__.load({
	id: "dsh-workspace-activity",
	factory: (require) => {
		'use strict';
		const React = require('react');
		const h = React.createElement;
		const BUILD = {"id":"56b365ad","at":"2026-10-23T07:49:17.778Z","git":"a1f7f3b+","version":"0.1.0"};
		/**
		 * 两半共用的纯函数（S0 占位；S1 起放筛选/归属/截断/排序）。
		 *
		 * 约束：这个文件**不许 import 任何东西**——构建脚本会把它整段内联进 client bundle，
		 * 同时 Node 单测直接 `import` 它。
		 */
		const SHARED_VERSION = 1

		/**
		 * Client 半边源码（S0 骨架）。
		 *
		 * **不要直接改 client.js**：它由 `scripts/build-client.mjs` 从本文件 + `shared/activity.js` 生成。
		 * 本文件的约束：
		 * - 只允许一行 `import ... from '../shared/activity.js'`（构建时删掉、shared 内联进来）；
		 * - 不能用 JSX；用宿主给的 `h = React.createElement`；
		 * - `apply` 里注册的资源都要通过 `ctx.effect` / `ctx.slots.inject` 挂，返回清理函数。
		 */

		const PANEL_ID = 'workspace-activity'
		const NS = 'workspaceActivity'

		const zh = {
		  panel: '活跃度',
		  title: '工作区活跃度',
		  build: '构建',
		  placeholder: 'S0 骨架已挂上：侧边栏入口与面板座位通了，数据端点还没接。',
		  shared: '共用逻辑版本',
		}

		const en = {
		  panel: 'Activity',
		  title: 'Workspace activity',
		  build: 'build',
		  placeholder: 'S0 skeleton mounted: the sidebar entry and panel seat work; the data endpoint is not wired yet.',
		  shared: 'shared version',
		}

		const css = `
		.wsa-root {
		  box-sizing: border-box;
		  display: flex;
		  flex-direction: column;
		  gap: 16px;
		  min-height: 100%;
		  padding: 24px 28px;
		  color: var(--dsw-alias-label-primary);
		  background: var(--dsw-alias-bg-base);
		  font-size: 14px;
		  line-height: 22px;
		}
		.wsa-head { display: flex; align-items: baseline; gap: 12px; }
		.wsa-title { margin: 0; font-size: 18px; font-weight: 600; line-height: 26px; }
		.wsa-meta { color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; }
		.wsa-body {
		  box-sizing: border-box;
		  padding: 28px 24px;
		  border: 1px solid var(--dsw-alias-border-l1);
		  border-radius: 12px;
		  background: var(--dsw-alias-bg-layer-1);
		  color: var(--dsw-alias-label-secondary);
		  max-width: 720px;
		}
		`

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

		/** 主面板（S0 占位页）。 */
		function PanelPage(props) {
		  const t = (props && props.t) || ((key) => key)
		  const stamp = [BUILD.id, BUILD.git].filter(Boolean).join(' · ')
		  return h(
		    'div',
		    { className: 'wsa-root' },
		    h('style', null, css),
		    h(
		      'header',
		      { className: 'wsa-head' },
		      h('h1', { className: 'wsa-title' }, t('title')),
		      h('span', { className: 'wsa-meta' }, `${t('build')} ${stamp}`),
		    ),
		    h('section', { className: 'wsa-body' }, t('placeholder')),
		    h('span', { className: 'wsa-meta' }, `${t('shared')} ${SHARED_VERSION}`),
		  )
		}

		const inject = ['slots', 'locale']

		function apply(ctx) {
		  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'workspace-activity: dictionaries')
		  const t = ctx.locale.bind(NS)

		  // 侧边栏全局面板入口：官方插槽，点它选中的是 `main` 里同 id 的条目。
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
		      },
		      PanelPage,
		    ),
		  )
		}
		return { inject, apply };
	},
});
