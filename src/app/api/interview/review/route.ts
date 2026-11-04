import { NextResponse } from "next/server";
import { connection } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { interviewReview } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { NO_STORE } from "@/app/api/_shared/no-store";

/** GET /api/interview/review：返回当前用户的错误复盘队列。 */
export async function GET() {
  await connection();
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ signedIn: false, items: [] }, { headers: NO_STORE });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ signedIn: true, items: [] }, { headers: NO_STORE });
  }

  try {
    const rows = await db
      .select({ slug: interviewReview.slug, reason: interviewReview.reason, createdAt: interviewReview.createdAt })
      .from(interviewReview)
      .where(eq(interviewReview.userId, user.id))
      .orderBy(desc(interviewReview.createdAt));

    return NextResponse.json({ signedIn: true, items: rows }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ signedIn: true, items: [] }, { headers: NO_STORE });
  }
}

/** POST /api/interview/review：把题目加入错误复盘队列。 */
export async function POST(request: Request) {
  await connection();
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "需要登录" }, { status: 401, headers: NO_STORE });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "数据库不可用" }, { status: 503, headers: NO_STORE });
  }

  const body = await request.json().catch(() => null);
  const slug = String(body?.slug ?? "").trim();
  if (!slug || slug.length > 120) {
    return NextResponse.json({ error: "slug 不合法" }, { status: 400, headers: NO_STORE });
  }

  try {
    await db
      .insert(interviewReview)
      .values({ userId: user.id, slug, reason: "错误后进入复习" })
      .onConflictDoUpdate({
        target: [interviewReview.userId, interviewReview.slug],
        set: { reason: "错误后进入复习", createdAt: new Date() },
      });
    return NextResponse.json({ ok: true, slug }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "写入失败" }, { status: 500, headers: NO_STORE });
  }
}
