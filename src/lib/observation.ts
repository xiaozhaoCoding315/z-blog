import { cacheLife } from "next/cache";
import { siteConfig } from "@/config/site";
import { daysSince } from "@/lib/uptime";
import { countThisMonth } from "@/lib/life";
import { getGithubActivity } from "@/lib/github-server";
import { mockMoments } from "@/config/mock-moments";

export interface Observation {
  days: string | null;
  moments: number;
  thisMonth: number;
  commits90: number | null;
  city: string;
}

/**
 * 观测条的四条读数（天气单独 5 分钟一档，不放进这里）。
 *
 * 「建站第 N 天」读的是 siteConfig.startedAt，不是服务器存活时间——
 * 所以面板上不许出现「在线 / 心跳」这类字样。
 *
 * 每个读数都可能无源：days 为 null（起始日期非法）、commits90 为 null
 * （GitHub 取不到）。调用方据此显示 NOT AVAILABLE，不许拿 0 顶替。
 */
export async function getObservation(): Promise<Observation> {
  "use cache";
  cacheLife("hours");

  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);

  const github = await getGithubActivity();

  return {
    days: (() => {
      const d = daysSince(siteConfig.startedAt);
      return d === null ? null : String(d);
    })(),
    moments: mockMoments.length,
    thisMonth: countThisMonth(mockMoments, year, month),
    commits90: github.available ? github.total90 : null,
    city: siteConfig.weather.city,
  };
}
