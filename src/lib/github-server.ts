import { cacheLife } from "next/cache";
import { siteConfig } from "@/config/site";
import { countCommitsByDay, type GithubEvent } from "@/lib/github-activity";

export interface GithubActivity {
  days: { date: string; count: number }[];
  total90: number;
  available: boolean;
  /**
   * 事件接口按页返回，最多 100 条；拿满一页说明后面可能还有事件没取到，
   * 此时 total90 是下限而不是精确总数。
   */
  truncated: boolean;
}

/**
 * 最近 90 天的 GitHub 提交数。
 * 和 /api/github 共用这一份逻辑：那个路由只是它的 HTTP 外壳。
 * 1 小时一档——匿名 Events API 每小时只给 60 次。
 *
 * 数的是提交（PushEvent 的 payload.size），不是全部公开事件；
 * IssuesEvent、WatchEvent 之类的活动不算进来。
 *
 * Events API 每页最多 100 条事件，所以活跃账号的 90 天数字是下限而非精确总数。
 * `truncated` 标记这件事：事件响应正好 100 条（撞上分页上限）时为 true，
 * 调用方应在读数前加「≥」；其余情况（含所有失败路径）为 false。
 *
 * 取不到就返回 available: false、total90: 0；
 * 调用方必须看 available 决定显示读数还是 NOT AVAILABLE，不许把 0 当读数。
 */
export async function getGithubActivity(): Promise<GithubActivity> {
  "use cache";
  cacheLife("hours");

  const username = /github\.com\/([^/]+)/.exec(siteConfig.links.github)?.[1];
  if (!username) {
    return { days: [], total90: 0, available: false, truncated: false };
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
      // 拿满一页（100 条）说明可能还有更早的事件没返回，总数只能算下限
      truncated: events.length === 100,
    };
  } catch {
    return { days: [], total90: 0, available: false, truncated: false };
  }
}
