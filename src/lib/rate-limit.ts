/**
 * 极简内存限频（单实例部署足够；容器重启即清零，可接受）。
 * 状态挂在 globalThis 上：Turbopack/webpack 会把模块内联成多份副本，
 * 模块级变量在副本间不共享，而 globalThis 在同进程内唯一。
 */

interface RateLimitBucket {
  times: number[];
  /** 该桶自己的窗口，清理时按它算过期，而不是统一用某个固定值 */
  windowMs: number;
}

interface RateLimitState {
  buckets: Map<string, RateLimitBucket>;
  cleanup?: ReturnType<typeof setInterval>;
}

const g = globalThis as typeof globalThis & { __rateLimitState?: RateLimitState };
const state: RateLimitState = (g.__rateLimitState ??= { buckets: new Map() });
const buckets = state.buckets;

/**
 * 是否信任反向代理写入的转发头。
 *
 * 默认关闭：应用端口一旦被直接暴露，任何人都能自带 `X-Forwarded-For` 自报 IP，
 * 按 IP 限频就形同虚设。只有确认流量经过我们自己的单层/受信代理时才打开。
 */
function trustsProxy(): boolean {
  const value = process.env.TRUST_PROXY?.trim().toLowerCase();
  return value === "1" || value === "true";
}

/**
 * 取限频用的客户端标识。
 *
 * 不信任转发头时统一返回 `direct`：所有直连请求共用一个桶，宁可误伤也不让伪造头
 * 绕开限额。启用 `TRUST_PROXY=1` 后取 XFF 的**最后一跳**：代理覆盖写入时它就是真实
 * 客户端；用 `$proxy_add_x_forwarded_for` 追加时，访客伪造的条目在左侧，最后一跳
 * 仍是代理看到的地址。
 */
export function getClientIp(request: Request): string {
  if (!trustsProxy()) return "direct";

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded
      .split(",")
      .map((hop) => hop.trim())
      .filter(Boolean);
    const client = hops[hops.length - 1];
    if (client) return client;
  }

  return request.headers.get("x-real-ip")?.trim() || "proxy";
}

/**
 * 滑动窗口限频：返回 true 表示放行。
 * @param key   维度键（如 `${ip}:chat`）
 * @param limit 窗口内允许的最大次数
 * @param windowMs 窗口毫秒
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const times = (buckets.get(key)?.times ?? []).filter(
    (t) => now - t < windowMs
  );
  if (times.length >= limit) {
    buckets.set(key, { times, windowMs });
    return false;
  }
  times.push(now);
  buckets.set(key, { times, windowMs });
  return true;
}

/** 定期清理过期桶，防内存缓慢增长（同进程只启动一次） */
if (typeof setInterval !== "undefined" && !state.cleanup) {
  state.cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      const alive = bucket.times.filter((t) => now - t < bucket.windowMs);
      if (alive.length === 0) buckets.delete(key);
      else buckets.set(key, { times: alive, windowMs: bucket.windowMs });
    }
  }, 10 * 60_000);
  // Node 环境下不阻止进程退出
  (state.cleanup as unknown as { unref?: () => void }).unref?.();
}
