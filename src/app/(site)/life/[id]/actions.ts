"use server";

import { refresh, updateTag } from "next/cache";
import { getDb } from "@/db/client";
import { comments as commentsTable } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { parseCommentInput } from "@/lib/community-input";
import { rateLimit } from "@/lib/rate-limit";
import { getMomentById } from "@/lib/moments-server";
import { getPostBySlug } from "@/content";

export interface CommentFormState {
  error?: string;
  ok?: boolean;
}

/**
 * 发一条评论。
 *
 * Action 是公开的 POST 入口，登录态必须在服务端重新查一遍——
 * 页面里藏掉表单不算权限。目标是否存在也要在这里重新确认，
 * 否则任何人都能往任意 id 上灌评论。
 */
export async function submitComment(
  _prev: CommentFormState,
  formData: FormData
): Promise<CommentFormState> {
  const user = await getSessionUser();
  if (!user) return { error: "先登录再评论" };

  const parsed = parseCommentInput(formData);
  if (!parsed.ok) return { error: parsed.error };
  const { targetType, targetId, body } = parsed.value;

  // 目标必须真实存在，避免往任意 id 上灌评论
  if (targetType === "moment") {
    const target = await getMomentById(targetId);
    if (!target.available) return { error: "动态暂时读不到，稍后再试" };
    if (!target.moment) return { error: "这条动态不存在" };
  } else {
    // 阶段 5 会改名为 getNoteBySlug，本阶段先用现有接口
    const note = getPostBySlug(targetId);
    // 草稿也在磁盘上，但草稿不能成为评论目标
    if (!note || note.meta.draft) return { error: "这篇笔记不存在" };
  }

  if (!rateLimit(`comment:${user.id}`, 20, 24 * 60 * 60 * 1000)) {
    return { error: "今天评论得有点多，明天再来" };
  }

  const db = getDb();
  if (!db) return { error: "数据库暂时不可用，稍后再试" };

  try {
    await db.insert(commentsTable).values({
      targetType,
      targetId,
      userId: user.id,
      body,
      status: "visible",
    });
    updateTag("comments");
    refresh();
    return { ok: true };
  } catch (err) {
    console.error("[comments] 保存失败：", err);
    return { error: "保存失败，稍后再试" };
  }
}
