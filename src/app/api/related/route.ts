import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";

/**
 * GET /api/related?slug=xx：基于摘要向量的相关文章推荐。
 * 摘要向量的余弦距离最近的三篇（不含自身）。
 */
export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "missing slug" }, { status: 400 });
  }

  const db = getDb();
  if (!db) return NextResponse.json({ items: [] });

  try {
    const rows = await db.execute<{ slug: string; title: string }>(
      sql`SELECT p.slug, p.title
          FROM posts p
          WHERE p.slug != ${slug}
            AND p.summary_embedding IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM posts cur
              WHERE cur.slug = ${slug} AND cur.summary_embedding IS NOT NULL
            )
          ORDER BY p.summary_embedding <=> (
            SELECT summary_embedding FROM posts WHERE slug = ${slug}
          )
          LIMIT 3`
    );
    return NextResponse.json({ items: rows });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
