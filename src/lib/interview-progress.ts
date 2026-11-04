import { connection } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { interviewMastery, interviewReview } from "@/db/schema";
import { getSessionUser } from "@/lib/session";

export type ProgressItem = {
  slug: string;
  level: 0 | 1 | 2 | 3;
  updatedAt: string;
};

/** 读取当前登录用户的题库掌握度；未登录返回空记录。 */
export async function readProgress(userId?: number) {
  await connection();
  if (!userId) return { signedIn: false, items: [] as ProgressItem[] };

  const db = getDb();
  if (!db) return { signedIn: false, items: [] };

  const rows = await db
    .select({
      slug: interviewMastery.slug,
      level: interviewMastery.level,
      updatedAt: interviewMastery.lastSeenAt,
    })
    .from(interviewMastery)
    .where(eq(interviewMastery.userId, userId));

  return {
    signedIn: true,
    items: rows.map((row) => ({
      slug: row.slug,
      level: Math.max(0, Math.min(3, Number(row.level))) as 0 | 1 | 2 | 3,
      updatedAt: row.updatedAt.toISOString(),
    })),
  };
}

/** 保存单题掌握度；未登录时直接拒绝，避免把登录用户进度写到游客身份。 */
export async function saveProgress(slug: string, level: 0 | 1 | 2 | 3) {
  await connection();
  const user = await getSessionUser();
  const db = getDb();
  if (!user || !db) return { ok: false as const };

  if (level === 0) {
    await db
      .delete(interviewMastery)
      .where(
        and(
          eq(interviewMastery.userId, user.id),
          eq(interviewMastery.slug, slug)
        )
      );
    return { ok: true as const };
  }

  await db
    .insert(interviewMastery)
    .values({ userId: user.id, slug, level })
    .onConflictDoUpdate({
      target: [interviewMastery.userId, interviewMastery.slug],
      set: { level, lastSeenAt: new Date() },
    });

  return { ok: true as const };
}

/** 保存题目复习状态：进入复习列表需要错误后标记。 */
export async function markWrongForReview(slug: string, tag?: string) {
  await connection();
  const user = await getSessionUser();
  const db = getDb();
  if (!user || !db) return { ok: false as const };

  const normalizedTag = (tag ?? "").trim();
  await db
    .insert(interviewReview)
    .values({
      userId: user.id,
      slug,
      reason: "错误后进入复习",
      tag: normalizedTag || null,
    })
    .onConflictDoUpdate({
      target: [interviewReview.userId, interviewReview.slug],
      set: { reason: "错误后进入复习", tag: normalizedTag || null },
    });

  return { ok: true as const };
}
