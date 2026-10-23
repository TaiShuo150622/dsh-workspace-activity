/**
 * 两半共用的纯函数（S0 占位；S1 起放筛选/归属/截断/排序）。
 *
 * 约束：这个文件**不许 import 任何东西**——构建脚本会把它整段内联进 client bundle，
 * 同时 Node 单测直接 `import` 它。
 */
export const SHARED_VERSION = 1
