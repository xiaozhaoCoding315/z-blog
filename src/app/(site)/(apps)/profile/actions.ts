"use server";

import { refresh } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { parseProfileInput } from "@/lib/profile-core";

export interface ProfileFormState {
  error?: string;
  ok?: boolean;
}

/**
 * 保存自己的公开资料。
 *
 * Action 是公开 POST 入口，必须重新读会话；更新只按会话里的 id，
 * 不接收表单里的 userId，避免改到别人的资料。
 */
export async function updateProfile(
  _prev: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const user = await getSessionUser();
  if (!user) return { error: "登录已过期，重新登录后再保存" };

  const parsed = parseProfileInput(formData);
  if (!parsed.ok) return { error: parsed.error };

  const db = getDb();
  if (!db) return { error: "数据库暂时不可用，稍后再试" };

  try {
    await db
      .update(users)
      .set({
        displayName: parsed.value.displayName,
        bio: parsed.value.bio,
        gender: parsed.value.gender,
        birthday: parsed.value.birthday,
        location: parsed.value.location,
        website: parsed.value.website,
        githubUrl: parsed.value.githubUrl,
        avatarUrl: parsed.value.avatarUrl,
        showBirthday: parsed.value.showBirthday,
        showGender: parsed.value.showGender,
      })
      .where(eq(users.id, user.id));

    // 会话里的昵称/头像来自数据库，刷新一次让顶栏与页面立即读到新值。
    refresh();
    return { ok: true };
  } catch (err) {
    console.error("[profile] 保存失败：", err);
    return { error: "保存失败，稍后再试" };
  }
}