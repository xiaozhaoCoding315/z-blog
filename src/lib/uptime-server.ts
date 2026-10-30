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
  return {
    days,
    daysText: days === null ? "—" : String(days),
    startedAt: siteConfig.startedAt,
    year: String(new Date().getFullYear()),
  };
}
