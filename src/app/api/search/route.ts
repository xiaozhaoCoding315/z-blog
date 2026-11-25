import { NextResponse } from "next/server";
import { embed } from "ai";
import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { embeddingEnabled, embeddingModel } from "@/lib/ai";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

interface SearchRow {
  [key: string]: unknown;
  post_slug: string;
  title: string;
  heading: string | null;
  snippet: string;
  similarity: number;
}

/**
 * GET /api/search?q=xx —— 语义搜索：
 * 查询词向量化后与全部分块做余弦相似度检索，按文章去重取最佳命中。
 */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ items: [] });

  const db = getDb();
  if (!db || !embeddingEnabled) return NextResponse.json({ items: [] });

  // 限频：单 IP 每分钟 20 次（搜索每次消耗一次 embedding 调用）
  if (!rateLimit(`search:${getClientIp(request)}`, 20, 60_000)) {
    return NextResponse.json({ items: [], error: "too many requests" }, { status: 429 });
  }

  try {
    const { embedding } = await embed({ model: embeddingModel, value: q });
    const vectorStr = `[${embedding.join(",")}]`;
    // 先取每篇文章的最佳分块，再按相似度取全局前 8。
    // 旧写法把 DISTINCT ON 和 LIMIT 放在同层，ORDER BY 必须先是 post_slug，
    // 结果等于「按字母序挑 8 篇文章」，相似度只负责挑中哪一块。
    const rows = await db.execute<SearchRow>(
      sql`WITH best AS (
            SELECT DISTINCT ON (c.post_slug)
              c.post_slug, p.title, c.heading,
              left(c.content, 120) AS snippet,
              1 - (c.embedding <=> ${vectorStr}::vector) AS similarity
            FROM chunks c JOIN posts p ON p.slug = c.post_slug
            ORDER BY c.post_slug, c.embedding <=> ${vectorStr}::vector
          )
          SELECT * FROM best
          ORDER BY similarity DESC
          LIMIT 8`
    );
    return NextResponse.json({
      items: rows
        .filter((row) => row.similarity > 0.3)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 6),
    });
  } catch (err) {
    console.error("[api/search] 语义搜索失败：", err);
    return NextResponse.json({ items: [] });
  }
}
