import { cacheLife, cacheTag } from "next/cache";
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { comments as commentsTable, users } from "@/db/schema";
import { formatDay } from "@/lib/life";

export interface CommentView {
  id: number;
  author: string;
  body: string;
  date: string;
}

/**
 * 动态 / 笔记下可见的评论。
 *
 * 评论先公开、站长事后隐藏，所以这里只读 visible：
 * hidden 的评论不能出现在任何访客眼前。连不上时 available: false，
 * 调用方显示 NOT AVAILABLE，不拿空数组冒充「还没有评论」。
 */
export async function getVisibleComments(
  targetType: "moment" | "note",
  targetId: string
): Promise<{ available: boolean; comments: CommentView[] }> {
  return getVisibleCommentsCached(targetType, targetId);
}

async function getVisibleCommentsCached(
  targetType: "moment" | "note",
  targetId: string
): Promise<{ available: boolean; comments: CommentView[] }> {
  "use cache";
  cacheLife("minutes");
  cacheTag("comments");

  const db = getDb();
  if (!db) return { available: false, comments: [] };

  try {
    const rows = await db
      .select({
        id: commentsTable.id,
        author: users.login,
        body: commentsTable.body,
        createdAt: commentsTable.createdAt,
      })
      .from(commentsTable)
      .innerJoin(users, eq(users.id, commentsTable.userId))
      .where(
        and(
          eq(commentsTable.targetType, targetType),
          eq(commentsTable.targetId, targetId),
          eq(commentsTable.status, "visible")
        )
      )
      .orderBy(asc(commentsTable.createdAt), asc(commentsTable.id));

    return {
      available: true,
      comments: rows.map((row) => ({
        id: row.id,
        author: row.author,
        body: row.body,
        date: formatDay(row.createdAt.toISOString()),
      })),
    };
  } catch {
    return { available: false, comments: [] };
  }
}
