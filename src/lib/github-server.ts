import { cacheLife } from "next/cache";
import { siteConfig } from "@/config/site";
import { countCommitsByDay, type GithubEvent } from "@/lib/github-activity";

export interface GithubActivity {
  days: { date: string; count: number }[];
  total90: number;
  available: boolean;
}

/**
 * 最近 90 天的 GitHub 提交数。
 * 和 /api/github 共用这一份逻辑：那个路由只是它的 HTTP 外壳。
 * 1 小时一档——匿名 Events API 每小时只给 60 次。
 *
 * 数的是提交（PushEvent 的 payload.size），不是全部公开事件；
 * IssuesEvent、WatchEvent 之类的活动不算进来。
 * Events API 最多返回 100 条事件，所以活跃账号的 90 天数字是下限而非精确总数。
 *
 * 取不到就返回 available: false、total90: 0；
 * 调用方必须看 available 决定显示读数还是 NOT AVAILABLE，不许把 0 当读数。
 */
export async function getGithubActivity(): Promise<GithubActivity> {
  "use cache";
  cacheLife("hours");

  const username = /github\.com\/([^/]+)/.exec(siteConfig.links.github)?.[1];
  if (!username) {
    return { days: [], total90: 0, available: false };
  }

  try {
    const res = await fetch(
      `https://api.github.com/users/${username}/events/public?per_page=100`,
      {
        headers: { Accept: "application/vnd.github+json" },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);

    const events: GithubEvent[] = await res.json();
    const counts = countCommitsByDay(events);

    // 补齐最近 90 天（含空白天）
    const days: { date: string; count: number }[] = [];
    const today = new Date();
    for (let i = 89; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000);
      const date = d.toISOString().slice(0, 10);
      days.push({ date, count: counts.get(date) ?? 0 });
    }

    return {
      days,
      total90: days.reduce((sum, d) => sum + d.count, 0),
      available: true,
    };
  } catch {
    return { days: [], total90: 0, available: false };
  }
}
