import { NextResponse } from "next/server";
import { connection } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { interviewMastery } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { NO_STORE } from "@/app/api/_shared/no-store";

/** 与 interview-browser 里的三档定义保持一致 */
const LEVELS = [0, 1, 2, 3] as const;
type Level = (typeof LEVELS)[number];

interface MasteryItem {
  slug: string;
  level: Level;
  updatedAt: string;
}

/**
 * GET /api/interview/mastery —— 拉当前用户的全部掌握度。
 *
 * 未登录不报错，返回 `{ items: [], signedIn: false }`：
 * 前端据此决定是走云端还是退回 localStorage。
 */
export async function GET() {
  await connection();

  const user = await getSessionUser();
  const db = getDb();
  if (!user || !db) {
    return NextResponse.json(
      { items: [], signedIn: false },
      { headers: NO_STORE }
    );
  }

  try {
    const rows = await db
      .select({
        slug: interviewMastery.slug,
        level: interviewMastery.level,
        lastSeenAt: interviewMastery.lastSeenAt,
      })
      .from(interviewMastery)
      .where(eq(interviewMastery.userId, user.id));

    const items: MasteryItem[] = rows.map((r) => ({
      slug: r.slug,
      level: (LEVELS.includes(r.level as Level) ? r.level : 0) as Level,
      updatedAt: r.lastSeenAt.toISOString(),
    }));

    return NextResponse.json(
      {
        items,
        signedIn: true,
        user: { login: user.login, avatarUrl: user.avatarUrl },
      },
      { headers: NO_STORE }
    );
  } catch (err) {
    console.error("[api/interview/mastery] 读取失败：", err);
    return NextResponse.json(
      { items: [], signedIn: true, error: "read-failed" },
      { headers: NO_STORE }
    );
  }
}

/**
 * PUT /api/interview/mastery —— 设置单题掌握度。
 *
 * body: { slug: string, level: 0 | 1 | 2 | 3 }
 * level=0 表示「清除」这条记录，而不是存一个 0——
 * 这样统计「已掌握 N 题」时不必先过滤。
 */
export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "需要登录", code: "unauthenticated" },
      { status: 401, headers: NO_STORE }
    );
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json(
      { error: "数据库不可用" },
      { status: 503, headers: NO_STORE }
    );
  }

  let body: { slug?: string; level?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "请求格式错误" },
      { status: 400, headers: NO_STORE }
    );
  }

  const slug = (body.slug ?? "").trim();
  const level = Number(body.level);
  if (!slug || slug.length > 120) {
    return NextResponse.json(
      { error: "slug 不合法" },
      { status: 400, headers: NO_STORE }
    );
  }
  if (!LEVELS.includes(level as Level)) {
    return NextResponse.json(
      { error: "level 必须是 0-3" },
      { status: 400, headers: NO_STORE }
    );
  }

  try {
    if (level === 0) {
      await db
        .delete(interviewMastery)
        .where(
          and(
            eq(interviewMastery.userId, user.id),
            eq(interviewMastery.slug, slug)
          )
        );
      return NextResponse.json(
        { ok: true, slug, level: 0 },
        { headers: NO_STORE }
      );
    }

    await db
      .insert(interviewMastery)
      .values({ userId: user.id, slug, level })
      .onConflictDoUpdate({
        target: [interviewMastery.userId, interviewMastery.slug],
        set: { level, lastSeenAt: new Date() },
      });

    return NextResponse.json(
      { ok: true, slug, level },
      { headers: NO_STORE }
    );
  } catch (err) {
    console.error("[api/interview/mastery] 写入失败：", err);
    return NextResponse.json(
      { error: "写入失败" },
      { status: 500, headers: NO_STORE }
    );
  }
}
