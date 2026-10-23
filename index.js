/**
 * Host 半边（S0 占位）。
 *
 * S1 才接实现：`inject: ['connection']`、`ws-activity/ping`、`ws-activity/snapshot`。
 * 这一版先只让包能被装进 profile、让 Client 半边把入口挂出来。
 */
export function apply() {}
