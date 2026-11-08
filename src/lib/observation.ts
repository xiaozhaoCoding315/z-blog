import { cacheLife } from "next/cache";
import { siteConfig } from "@/config/site";
import { daysSince } from "@/lib/uptime";
import { getGithubActivity } from "@/lib/github-server";

export interface Observation {
  days: string | null;
  commits90: number | null;
  city: string;
  /** 北京时间当前年 / 月：分组与「本月条数」共用这一份口径 */
  year: number;
  month: number;
}

/**
 * 观测条里不依赖生活流的那三条读数（建站天数、90 天提交、城市），
 * 外加一个北京时间年月——天气仍单独走 5 分钟一档，不放进这里。
 *
 * 动态条数与本月条数**不在这里算**：它们必须和首页正在渲染的那一份生活流
 * 用同一份数据，否则两个缓存各自过期时会互相打架（条数说 27，列表只有 26）。
 * 调用方拿 `year` / `month` 配 `countThisMonth()` 自己算。
 *
 * 「建站第 N 天」读的是 siteConfig.startedAt，不是服务器存活时间——
 * 所以面板上不许出现「在线 / 心跳」这类字样。
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
  const days = daysSince(siteConfig.startedAt);

  return {
    days: days === null ? null : String(days),
    commits90: github.available ? github.total90 : null,
    city: siteConfig.weather.city,
    year,
    month,
  };
}
