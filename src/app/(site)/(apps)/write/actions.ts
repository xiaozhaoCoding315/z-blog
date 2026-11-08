"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { moments as momentsTable } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { parseMomentInput } from "@/lib/moment-input";

export interface MomentFormState {
  error?: string;
}

/**
 * 发一条动态。
 *
 * 三道关必须都在服务端：Action 是公开的 POST 入口，页面上藏掉表单不算数。
 * 写成功后 `updateTag("moments")`——这是 read-your-own-writes 场景，
 * 站长发完立刻要在首页看到它，不能等缓存自然过期。
 */
export async function createMoment(
  _prev: MomentFormState,
  formData: FormData
): Promise<MomentFormState> {
  const user = await getSessionUser();
  if (!user) return { error: "先登录" };
  if (user.role !== "owner") return { error: "只有站长能发动态" };

  const parsed = parseMomentInput(formData);
  if (!parsed.ok) return { error: parsed.error };

  const db = getDb();
  if (!db) return { error: "数据库暂时不可用" };

  const { kind, body, images, tags, mood, weather, place, card } =
    parsed.value;

  let id: number;
  try {
    const [row] = await db
      .insert(momentsTable)
      .values({
        kind,
        body,
        images,
        tags,
        mood: mood ?? null,
        weather: weather ?? null,
        place: place ?? null,
        card: card ?? null,
        publishedAt: new Date(),
      })
      .returning({ id: momentsTable.id });
    if (!row) return { error: "保存失败" };
    id = row.id;
  } catch (err) {
    console.error("[write] 保存动态失败：", err);
    return { error: "保存失败，稍后再试" };
  }

  updateTag("moments");
  redirect(`/life/${id}`);
}
