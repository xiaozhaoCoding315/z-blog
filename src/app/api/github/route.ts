import { NextResponse } from "next/server";
import { getGithubActivity } from "@/lib/github-server";

/**
 * GET /api/github —— 最近 90 天 GitHub 公开活跃度。
 * 取数逻辑在 lib/github-server.ts，这里只负责 HTTP。
 *
 * 响应保留 days / total / available 三个旧字段（既有消费方依赖），
 * 另外补上 total90；truncated 为真时 total90 只是下限（事件接口按页截断）。
 */
export async function GET() {
  const activity = await getGithubActivity();
  return NextResponse.json({
    days: activity.days,
    total: activity.total90,
    total90: activity.total90,
    available: activity.available,
    truncated: activity.truncated,
  });
}
