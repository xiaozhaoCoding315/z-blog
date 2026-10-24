import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { aiEnabled, chatEnabled, embeddingEnabled } from "@/lib/ai";
import { siteConfig } from "@/config/site";

/** GET /api/stats —— 站点数据看板（/stats 页面用） */
export async function GET() {
  const db = getDb();
  const base = {
    startedAt: siteConfig.startedAt,
    chatEnabled,
    embeddingEnabled,
    aiEnabled,
  };

  if (!db) {
    return NextResponse.json({ ...base, db: false, posts: 0, chunks: 0, totalViews: 0, topPosts: [] });
  }

  try {
    const [counts] = await db.execute<{
      posts: number;
      chunks: number;
      total_views: number;
    }>(sql`SELECT
        (SELECT count(*) FROM posts)::int AS posts,
        (SELECT count(*) FROM chunks)::int AS chunks,
        (SELECT coalesce(sum(count), 0) FROM views)::int AS total_views`);

    const topPosts = await db.execute<{
      slug: string;
      title: string | null;
      count: number;
    }>(sql`SELECT v.slug, p.title, v.count
        FROM views v LEFT JOIN posts p ON p.slug = v.slug
        ORDER BY v.count DESC
        LIMIT 5`);

    return NextResponse.json({
      ...base,
      db: true,
      posts: counts?.posts ?? 0,
      chunks: counts?.chunks ?? 0,
      totalViews: counts?.total_views ?? 0,
      topPosts: topPosts.filter((row) => row.count > 0),
    });
  } catch {
    return NextResponse.json({ ...base, db: false, posts: 0, chunks: 0, totalViews: 0, topPosts: [] });
  }
}
