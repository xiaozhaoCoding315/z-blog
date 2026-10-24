import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { posts } from "@/db/schema";

/** GET /api/summary?slug=xx：返回同步阶段生成的 AI 摘要 */
export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "missing slug" }, { status: 400 });
  }

  const db = getDb();
  if (!db) return NextResponse.json({ summary: null });

  try {
    const rows = await db
      .select({ summary: posts.summary })
      .from(posts)
      .where(eq(posts.slug, slug))
      .limit(1);
    return NextResponse.json({ summary: rows[0]?.summary ?? null });
  } catch {
    return NextResponse.json({ summary: null });
  }
}
