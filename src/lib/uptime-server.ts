import { cacheLife } from "next/cache";
import { siteConfig } from "@/config/site";
import { daysSince } from "@/lib/uptime";

/**
 * 站点运行快照（服务端）。
 *
 * 为什么不用「客户端算、SSR 占位」的老写法：那样静态 HTML 里是一个 —，
 * 禁 JS 的访客和爬虫永远看到占位符。
 *
 * 为什么不直接 Date.now()：Cache Components 下预渲染期读取当前时间是错误。
 * 正确做法是把它包进 `use cache` + `cacheLife`——值在缓存填充时确定，
 * 之后按 profile 定期重算，既稳定又不会真的过期。
 *
 * 「已运行 120 天」这类信息按小时级更新完全够用。
 */
export async function getUptimeSnapshot() {
  "use cache";
  cacheLife("hours");

  const days = daysSince(siteConfig.startedAt);
  const now = new Date();
  return {
    days,
    daysText: days === null ? "—" : String(days),
    startedAt: siteConfig.startedAt,
    year: String(now.getFullYear()),
    /**
     * 当前月份（1–12）。归档页的月度密度条只画到本月：
     * 九月没写就是没写，不该因为「还没到」而藏起来。
     * 同样不能在预渲染期直接读时间，所以和天数一起放进这份缓存快照。
     */
    month: now.getMonth() + 1,
    /**
     * 建站那一年从第几个月开始。往年是 1 月；建站当年之前的月份属于
     * 「还没有这个站」，不该画成「没写」——空白的含义必须是真的没写。
     */
    startMonth:
      Number(siteConfig.startedAt.slice(0, 4)) === now.getFullYear()
        ? Number(siteConfig.startedAt.slice(5, 7))
        : 1,
  };
}
