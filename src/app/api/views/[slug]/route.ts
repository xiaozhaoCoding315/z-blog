import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";

/** GET：查询浏览量（不计数） */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const db = getDb();
  if (!db) return NextResponse.json({ count: null });

  try {
    const rows = await db.execute<{ count: number }>(
      sql`SELECT count FROM views WHERE slug = ${slug}`
    );
    const count = rows[0]?.count ?? 0;
    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ count: null });
  }
}

/** POST：浏览量 +1（upsert），同一浏览器由前端 localStorage 去重 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const db = getDb();
  if (!db) return NextResponse.json({ count: null });

  try {
    const rows = await db.execute<{ count: number }>(
      sql`INSERT INTO views (slug, count) VALUES (${slug}, 1)
          ON CONFLICT (slug) DO UPDATE SET count = views.count + 1
          RETURNING count`
    );
    return NextResponse.json({ count: rows[0]?.count ?? 1 });
  } catch {
    return NextResponse.json({ count: null });
  }
}
