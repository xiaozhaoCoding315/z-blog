"use server";

import { refresh, updateTag } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  comments as commentsTable,
  letters as lettersTable,
  shelfItems,
  siteSettings,
  songs as songsTable,
} from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import {
  parseShelfInput,
  parseSongInput,
  parseStatusInput,
} from "@/lib/community-input";
import { STATUS_KEY } from "@/lib/settings-server";

/**
 * Action 是公开的 POST 入口，页面里藏掉按钮不算权限。
 * 每个 Action 都要在服务端重新确认站长身份，再决定写不写。
 */
async function requireOwner() {
  const user = await getSessionUser();
  return user?.role === "owner" ? user : null;
}

/** id 只接受正的安全整数；"", null, NaN, 1e30 一律不写 */
function idFrom(formData: FormData): number | null {
  const id = Number(formData.get("id"));
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/**
 * 改首页页头的状态句。
 * 写入 site_settings 后让 settings 缓存失效，并刷新当前页，
 * 站长保存完立刻能看到新值。
 */
export async function updateStatus(formData: FormData): Promise<void> {
  if (!(await requireOwner())) return;
  const parsed = parseStatusInput(formData);
  if (!parsed.ok) return;
  const db = getDb();
  if (!db) return;
  await db
    .insert(siteSettings)
    .values({ key: STATUS_KEY, value: parsed.value.status })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { value: parsed.value.status, updatedAt: sql`now()` },
    });
  updateTag("settings");
  refresh();
}

/** 通过 / 驳回一封留言；只认 approved / rejected 两个值。 */
export async function moderateLetter(formData: FormData): Promise<void> {
  if (!(await requireOwner())) return;
  const id = idFrom(formData);
  const status = formData.get("status");
  if (!id || (status !== "approved" && status !== "rejected")) return;
  const db = getDb();
  if (!db) return;
  await db.update(lettersTable).set({ status }).where(eq(lettersTable.id, id));
  updateTag("letters");
  refresh();
}

/** 通过 / 驳回一首访客推荐的歌；只认 approved / rejected 两个值。 */
export async function moderateSong(formData: FormData): Promise<void> {
  if (!(await requireOwner())) return;
  const id = idFrom(formData);
  const status = formData.get("status");
  if (!id || (status !== "approved" && status !== "rejected")) return;
  const db = getDb();
  if (!db) return;
  // 驳回「此刻循环」时同时取消置顶，避免公开页残留占位
  await db
    .update(songsTable)
    .set(status === "rejected" ? { status, pinned: false } : { status })
    .where(eq(songsTable.id, id));
  updateTag("songs");
  refresh();
}

/** 站长添加一首歌：直接通过，来源固定 owner，userId 记站长本人。 */
export async function addSong(formData: FormData): Promise<void> {
  const owner = await requireOwner();
  if (!owner) return;
  const parsed = parseSongInput(formData);
  if (!parsed.ok) return;
  const db = getDb();
  if (!db) return;
  await db.insert(songsTable).values({
    ...parsed.value,
    source: "owner",
    status: "approved",
    userId: owner.id,
  });
  updateTag("songs");
  refresh();
}

/**
 * 设为此刻循环：只认已通过、且由站长添加的歌。
 * 公开页只展示 owner 歌曲，pin 访客歌曲会让它从所有列表里消失。
 */
export async function pinSong(formData: FormData): Promise<void> {
  if (!(await requireOwner())) return;
  const id = idFrom(formData);
  if (!id) return;
  const db = getDb();
  if (!db) return;

  const [song] = await db
    .select({ id: songsTable.id })
    .from(songsTable)
    .where(
      and(
        eq(songsTable.id, id),
        eq(songsTable.status, "approved"),
        eq(songsTable.source, "owner")
      )
    )
    .limit(1);
  if (!song) return;

  await db.transaction(async (tx) => {
    await tx.update(songsTable).set({ pinned: false });
    await tx.update(songsTable).set({ pinned: true }).where(eq(songsTable.id, id));
  });
  updateTag("songs");
  refresh();
}

/** 删除一首歌；id 必须是正的安全整数。 */
export async function deleteSong(formData: FormData): Promise<void> {
  if (!(await requireOwner())) return;
  const id = idFrom(formData);
  if (!id) return;
  const db = getDb();
  if (!db) return;
  await db.delete(songsTable).where(eq(songsTable.id, id));
  updateTag("songs");
  refresh();
}

/** 隐藏 / 恢复一条评论；只认 visible / hidden 两个值。 */
export async function moderateComment(formData: FormData): Promise<void> {
  if (!(await requireOwner())) return;
  const id = idFrom(formData);
  const status = formData.get("status");
  if (!id || (status !== "visible" && status !== "hidden")) return;
  const db = getDb();
  if (!db) return;
  await db.update(commentsTable).set({ status }).where(eq(commentsTable.id, id));
  updateTag("comments");
  refresh();
}

/** 收录一条书影音；校验与站内其它表单共用纯函数层。 */
export async function addShelfItem(formData: FormData): Promise<void> {
  if (!(await requireOwner())) return;
  const parsed = parseShelfInput(formData);
  if (!parsed.ok) return;
  const db = getDb();
  if (!db) return;
  await db.insert(shelfItems).values(parsed.value);
  updateTag("shelf");
  refresh();
}

/** 删除一条书架条目；id 必须是正的安全整数。 */
export async function deleteShelfItem(formData: FormData): Promise<void> {
  if (!(await requireOwner())) return;
  const id = idFrom(formData);
  if (!id) return;
  const db = getDb();
  if (!db) return;
  await db.delete(shelfItems).where(eq(shelfItems.id, id));
  updateTag("shelf");
  refresh();
}
