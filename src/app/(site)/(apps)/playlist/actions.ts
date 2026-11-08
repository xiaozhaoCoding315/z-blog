"use server";

import { refresh, updateTag } from "next/cache";
import { and, eq, gt } from "drizzle-orm";
import { getDb } from "@/db/client";
import { songs as songsTable } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { parseSongInput } from "@/lib/community-input";

export interface SongFormState {
  error?: string;
  ok?: boolean;
}

/** 同一用户 24 小时内最多推荐 3 首，防刷屏；不靠页面藏按钮 */
const DAILY_LIMIT = 3;

/**
 * 推荐一首歌。
 *
 * Action 是公开的 POST 入口，登录态必须在服务端重新查一遍——
 * 页面里藏掉表单不算权限。访客推荐一律 pending，站长审核后才公开；
 * 写入后 `updateTag("songs")` 让读层立刻失效，`refresh()` 把作者自己的
 * 待审推荐刷新出来（read-your-own-writes）。
 */
export async function submitSong(
  _prev: SongFormState,
  formData: FormData
): Promise<SongFormState> {
  const user = await getSessionUser();
  if (!user) return { error: "先登录再推荐歌" };

  const parsed = parseSongInput(formData);
  if (!parsed.ok) return { error: parsed.error };

  const db = getDb();
  if (!db) return { error: "数据库暂时不可用，稍后再试" };

  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = await db
      .select({ id: songsTable.id })
      .from(songsTable)
      .where(
        and(
          eq(songsTable.userId, user.id),
          eq(songsTable.source, "visitor"),
          gt(songsTable.createdAt, since)
        )
      );
    if (recent.length >= DAILY_LIMIT) {
      return { error: "今天已经推荐三首了，明天再来" };
    }

    await db.insert(songsTable).values({
      ...parsed.value,
      source: "visitor",
      userId: user.id,
      status: "pending",
    });

    updateTag("songs");
    refresh();
    return { ok: true };
  } catch (err) {
    console.error("[songs] 保存失败：", err);
    return { error: "保存失败，稍后再试" };
  }
}
