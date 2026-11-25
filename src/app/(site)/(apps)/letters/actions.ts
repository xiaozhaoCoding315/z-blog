"use server";

import { refresh, updateTag } from "next/cache";
import { getDb } from "@/db/client";
import { letters as lettersTable } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { parseLetterInput } from "@/lib/community-input";
import { and, eq, gt } from "drizzle-orm";

export interface LetterFormState {
  error?: string;
  ok?: boolean;
}

/** 同一用户 24 小时内最多 5 封，防刷屏；不靠页面藏按钮 */
const DAILY_LIMIT = 5;

/**
 * 投一封留言。
 *
 * Action 是公开的 POST 入口，登录态必须在服务端重新查一遍——
 * 页面里藏掉表单不算权限。写入后 `updateTag("letters")` 让读层立刻失效，
 * `refresh()` 把作者自己的待审留言刷新出来（read-your-own-writes）。
 */
export async function submitLetter(
  _prev: LetterFormState,
  formData: FormData
): Promise<LetterFormState> {
  const user = await getSessionUser();
  if (!user) return { error: "先登录再留言" };

  const parsed = parseLetterInput(formData);
  if (!parsed.ok) return { error: parsed.error };

  const db = getDb();
  if (!db) return { error: "数据库暂时不可用，稍后再试" };

  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = await db
      .select({ id: lettersTable.id })
      .from(lettersTable)
      .where(and(eq(lettersTable.userId, user.id), gt(lettersTable.createdAt, since)));
    if (recent.length >= DAILY_LIMIT) {
      return { error: "今天留得有点多了，明天再来" };
    }

    await db.insert(lettersTable).values({
      userId: user.id,
      body: parsed.value.body,
      songTitle: parsed.value.songTitle ?? null,
      songArtist: parsed.value.songArtist ?? null,
      songUrl: parsed.value.songUrl ?? null,
      status: "pending",
    });

    updateTag("letters");
    refresh();
    return { ok: true };
  } catch (err) {
    console.error("[letters] 保存失败：", err);
    return { error: "保存失败，稍后再试" };
  }
}
