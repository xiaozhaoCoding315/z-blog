/**
 * 实时接口共用的响应头。
 * Next 16 的 Cache Components 会把「未访问请求期 API」的 GET 处理器在构建期预渲染，
 * 计数值类接口必须显式声明 no-store，否则线上会一直返回构建那一刻的快照。
 */
export const NO_STORE = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
} as const;
