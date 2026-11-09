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

export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "local"
  );
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
