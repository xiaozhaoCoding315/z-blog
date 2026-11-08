"use server";

import { refresh, updateTag } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  comments as commentsTable,
  letters as lettersTable,
  shelfItems,
  siteSettings,
  songs as songsTable,
} from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { parseShelfInput, parseStatusInput } from "@/lib/community-input";
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
  await db.update(songsTable).set({ status }).where(eq(songsTable.id, id));
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
