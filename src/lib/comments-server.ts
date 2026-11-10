import { cacheLife, cacheTag } from "next/cache";
import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  comments as commentsTable,
  posts as postsTable,
  users,
} from "@/db/schema";
import { formatDay } from "@/lib/life";
import { profileDisplayName } from "@/lib/profile-core";

export interface CommentView {
  id: number;
  author: string;
  authorId: number;
  avatarUrl: string | null;
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
        authorId: users.id,
        login: users.login,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
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
        author: profileDisplayName(row.displayName, row.login),
        authorId: row.authorId,
        avatarUrl: row.avatarUrl,
        body: row.body,
        date: formatDay(row.createdAt.toISOString()),
      })),
    };
  } catch {
    return { available: false, comments: [] };
  }
}

export interface RecentCommentView extends CommentView {
  targetType: string;
  targetTitle: string;
  href: string;
}

/**
 * 全站最近评论：留言板首页用它把「评论区」这一面露出来。
 * 只读 visible；目标笔记不存在时回退 slug，不编标题。
 */
export async function getRecentComments(limit = 8): Promise<{
  available: boolean;
  comments: RecentCommentView[];
}> {
  return getRecentCommentsCached(limit);
}

async function getRecentCommentsCached(limit: number): Promise<{
  available: boolean;
  comments: RecentCommentView[];
}> {
  "use cache";
  cacheLife("minutes");
  cacheTag("comments");

  const db = getDb();
  if (!db) return { available: false, comments: [] };

  try {
    const rows = await db
      .select({
        id: commentsTable.id,
        authorId: users.id,
        login: users.login,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        body: commentsTable.body,
        targetType: commentsTable.targetType,
        targetId: commentsTable.targetId,
        title: postsTable.title,
        createdAt: commentsTable.createdAt,
      })
      .from(commentsTable)
      .innerJoin(users, eq(users.id, commentsTable.userId))
      .leftJoin(postsTable, eq(postsTable.slug, commentsTable.targetId))
      .where(eq(commentsTable.status, "visible"))
      .orderBy(desc(commentsTable.createdAt), desc(commentsTable.id))
      .limit(limit);

    return {
      available: true,
      comments: rows.map((row) => ({
        id: row.id,
        author: profileDisplayName(row.displayName, row.login),
        authorId: row.authorId,
        avatarUrl: row.avatarUrl,
        body: row.body,
        date: formatDay(row.createdAt.toISOString()),
        targetType: row.targetType,
        targetTitle:
          row.targetType === "note"
            ? row.title ?? `笔记 / ${row.targetId}`
            : `动态 / ${row.targetId}`,
        href: row.targetType === "note" ? `/notes/${row.targetId}` : "/life",
      })),
    };
  } catch {
    return { available: false, comments: [] };
  }
}
