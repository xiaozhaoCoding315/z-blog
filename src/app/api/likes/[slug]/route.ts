import { NextResponse } from "next/server";
import { connection } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { NO_STORE } from "@/app/api/_shared/no-store";

/** GET：查询点赞数 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  // 计数类接口禁止被构建期预渲染（Cache Components 下 GET 默认会预渲染）
  await connection();
  const { slug } = await params;
  const db = getDb();
  if (!db) return NextResponse.json({ count: null }, { headers: NO_STORE });

  try {
    const rows = await db.execute<{ count: number }>(
      sql`SELECT count FROM likes WHERE slug = ${slug}`
    );
    return NextResponse.json(
      { count: rows[0]?.count ?? 0 },
      { headers: NO_STORE }
    );
  } catch {
    return NextResponse.json({ count: null }, { headers: NO_STORE });
  }
}

/** POST：点赞 +1（同一浏览器由前端 localStorage 去重） */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const db = getDb();
  if (!db) return NextResponse.json({ count: null }, { headers: NO_STORE });

  try {
    const rows = await db.execute<{ count: number }>(
      sql`INSERT INTO likes (slug, count) VALUES (${slug}, 1)
          ON CONFLICT (slug) DO UPDATE SET count = likes.count + 1
          RETURNING count`
    );
    return NextResponse.json({ count: rows[0]?.count ?? 1 }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ count: null }, { headers: NO_STORE });
  }
}
