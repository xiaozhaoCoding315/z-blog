import { NextResponse } from "next/server";
import { siteConfig } from "@/config/site";

/**
 * GET /api/github —— 最近 90 天 GitHub 公开活跃度（热力图数据）。
 * 匿名调用 GitHub Events API（60 次/小时），模块级缓存 1 小时；
 * 国内服务器访问不稳定时返回空数据，前端优雅降级。
 */

interface CacheEntry {
  data: unknown;
  at: number;
}

let cache: CacheEntry | null = null;
const TTL_MS = 60 * 60 * 1000;

function githubUsername(): string | null {
  const url = siteConfig.links.github;
  const match = /github\.com\/([^/]+)/.exec(url ?? "");
  return match?.[1] ?? null;
}

export async function GET() {
  const username = githubUsername();
  if (!username) {
    return NextResponse.json({ days: [], total: 0, available: false });
  }

  if (cache && Date.now() - cache.at < TTL_MS) {
    return NextResponse.json(cache.data);
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

    const events: { created_at: string }[] = await res.json();
    const counts = new Map<string, number>();
    for (const event of events) {
      const day = event.created_at.slice(0, 10);
      counts.set(day, (counts.get(day) ?? 0) + 1);
    }

    // 补齐最近 90 天（含空白天）
    const days: { date: string; count: number }[] = [];
    const today = new Date();
    for (let i = 89; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000);
      const date = d.toISOString().slice(0, 10);
      days.push({ date, count: counts.get(date) ?? 0 });
    }

    const data = {
      username,
      days,
      total: events.length,
      available: true,
    };
    cache = { data, at: Date.now() };
    return NextResponse.json(data);
  } catch {
    // 失败时也缓存，避免每次请求都打超时
    const data = { username, days: [], total: 0, available: false };
    cache = { data, at: Date.now() };
    return NextResponse.json(data);
  }
}
