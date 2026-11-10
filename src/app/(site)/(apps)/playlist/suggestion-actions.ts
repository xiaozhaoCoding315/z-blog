"use server";

import { refresh, updateTag } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  playlistSuggestions as suggestionsTable,
  playlists as playlistsTable,
} from "@/db/schema";
import { getSessionUser, type SessionUser } from "@/lib/session";
import {
  parseSuggestionInput,
  type PlaylistPlatform,
} from "@/lib/playlist-core";
import { fetchPlaylistImport } from "@/lib/playlist-import";
import { saveImportedPlaylist } from "@/lib/playlist-save";
import { searchNeteasePlaylists, type NeteasePlaylistSummary } from "@/lib/music-auth";
import { getLinkedNeteaseAccount } from "@/lib/music-server";

export interface SuggestionSearchState {
  ok?: boolean;
  error?: string;
  query?: string;
  candidates?: NeteasePlaylistSummary[];
}

export interface SuggestionSubmitState {
  ok?: boolean;
  error?: string;
  message?: string;
}

const MAX_PENDING_PER_USER = 5;

function ownerOnly(user: SessionUser | null): SessionUser | null {
  return user?.role === "owner" ? user : null;
}

function limited(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function safeCover(value: unknown): string | null {
  const raw = limited(value, 500);
  return /^https?:\/\//i.test(raw) ? raw.replace(/^http:\/\//i, "https://") : null;
}

function playlistUrl(platform: PlaylistPlatform, externalId: string): string | null {
  if (!/^\d{1,20}$/.test(externalId)) return null;
  if (platform === "netease") {
    return `https://music.163.com/playlist?id=${externalId}`;
  }
  if (platform === "qq") {
    return `https://y.qq.com/n/ryqq/playlist/${externalId}`;
  }
  return null;
}

/** 按歌单名搜索网易云；访客不必先复制一条链接。 */
export async function searchSuggestionPlaylists(
  _prev: SuggestionSearchState,
  formData: FormData
): Promise<SuggestionSearchState> {
  const user = await getSessionUser();
  if (!user) return { error: "推荐需要先登录" };

  const parsed = parseSuggestionInput(limited(formData.get("query"), 200));
  if (!parsed.ok) return { error: parsed.error };
  if (parsed.value.kind === "url") {
    return { error: "这是一条链接，直接点「推荐这张」提交即可" };
  }

  const candidates = await searchNeteasePlaylists(parsed.value.query);
  if (candidates.length === 0) {
    return {
      error: "没搜到同名歌单。可以换个关键词，或直接粘贴分享文案。",
      query: parsed.value.query,
    };
  }
  return { ok: true, query: parsed.value.query, candidates };
}

/**
 * 提交推荐：可以粘分享文案（自动取链接），也可以传搜索结果里的候选。
 * 采纳前只存元数据，不抓曲目——错误的建议不该占用一次完整导入。
 */
export async function submitPlaylistSuggestion(
  _prev: SuggestionSubmitState,
  formData: FormData
): Promise<SuggestionSubmitState> {
  const user = await getSessionUser();
  if (!user) return { error: "推荐需要先登录" };

  const note = limited(formData.get("note"), 300);
  const raw = limited(formData.get("query"), 1000);
  const candidateId = limited(formData.get("externalId"), 20);
  const candidatePlatform = limited(formData.get("platform"), 20);

  const db = getDb();
  if (!db) return { error: "数据库暂时不可用，稍后再试" };

  const pending = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(suggestionsTable)
    .where(
      and(
        eq(suggestionsTable.userId, user.id),
        eq(suggestionsTable.status, "pending")
      )
    );
  if ((pending[0]?.count ?? 0) >= MAX_PENDING_PER_USER) {
    return { error: "待审的推荐已经够多了，等站长处理完再推新的" };
  }

  let platform: PlaylistPlatform = candidatePlatform === "qq" ? "qq" : "netease";
  let externalId = candidateId;
  let title = limited(formData.get("title"), 120);
  let coverUrl = safeCover(formData.get("coverUrl"));

  if (externalId) {
    if (!/^\d{1,20}$/.test(externalId)) return { error: "歌单 id 无效" };
    if (!title) return { error: "这张歌单缺少标题，请重新搜索" };
  } else {
    const parsed = parseSuggestionInput(raw);
    if (!parsed.ok) return { error: parsed.error };
    if (parsed.value.kind !== "url") {
      return {
        error: "先在下面搜到歌单再点「推荐这张」，或者直接粘贴分享文案",
      };
    }

    const result = await fetchPlaylistImport(parsed.value.url);
    if (!result.ok) {
      return {
        error: `${result.error}。可以换一条分享文案，或只填歌单名让站长手动找。`,
      };
    }
    platform = result.playlist.platform;
    externalId = result.playlist.externalId;
    title = result.playlist.title;
    coverUrl = result.playlist.coverUrl;
  }

  if (platform === "other" || !playlistUrl(platform, externalId)) {
    return { error: "这张歌单没有可识别的平台 id，暂时推荐不了" };
  }

  try {
    await db
      .insert(suggestionsTable)
      .values({
        userId: user.id,
        platform,
        externalId,
        title,
        coverUrl,
        note,
        status: "pending",
      })
      .onConflictDoUpdate({
        target: [
          suggestionsTable.userId,
          suggestionsTable.platform,
          suggestionsTable.externalId,
        ],
        set: {
          title,
          coverUrl,
          note,
          status: "pending",
          playlistId: null,
          createdAt: new Date(),
        },
      });
  } catch (err) {
    console.error("[playlist-suggestion] 保存失败：", err);
    return { error: "保存失败，稍后再试" };
  }

  updateTag("songs");
  refresh();
  return {
    ok: true,
    message: `《${title}》已经交到站长手里，采纳后会出现在「大家推荐」里`,
  };
}

/** 站长采纳：真正导入曲目；平台里已经存在的歌单只建立关联，不覆盖来源。 */
export async function approvePlaylistSuggestion(formData: FormData): Promise<void> {
  const user = ownerOnly(await getSessionUser());
  if (!user) return;

  const id = Number(formData.get("id"));
  if (!Number.isSafeInteger(id) || id <= 0) return;

  const db = getDb();
  if (!db) return;

  const [suggestion] = await db
    .select()
    .from(suggestionsTable)
    .where(eq(suggestionsTable.id, id))
    .limit(1);
  if (!suggestion || suggestion.status !== "pending") return;

  const platform: PlaylistPlatform =
    suggestion.platform === "qq" ? "qq" : "netease";
  const url = playlistUrl(platform, suggestion.externalId);
  if (!url) return;

  const [existing] = await db
    .select({ id: playlistsTable.id })
    .from(playlistsTable)
    .where(
      and(
        eq(playlistsTable.platform, platform),
        eq(playlistsTable.externalId, suggestion.externalId)
      )
    )
    .limit(1);

  if (existing) {
    await db
      .update(suggestionsTable)
      .set({ status: "approved", playlistId: existing.id })
      .where(eq(suggestionsTable.id, id));
    updateTag("songs");
    refresh();
    return;
  }

  const linked =
    platform === "netease" ? await getLinkedNeteaseAccount(user.id) : null;
  const result = await fetchPlaylistImport(url, {
    neteaseCookie: linked?.cookie,
  });
  if (!result.ok) {
    console.warn("[playlist-suggestion] 采纳时导入失败：", result.error);
    return;
  }

  const saved = await saveImportedPlaylist({
    userId: user.id,
    imported: result.playlist,
    suggestedBy: suggestion.userId,
    suggestionNote: suggestion.note,
  });
  if (!saved.ok) return;

  await db
    .update(suggestionsTable)
    .set({ status: "approved", playlistId: saved.playlistId })
    .where(eq(suggestionsTable.id, id));

  updateTag("songs");
  refresh();
}

/** 站长拒绝：保留记录，访客能看到自己的推荐被处理过。 */
export async function rejectPlaylistSuggestion(formData: FormData): Promise<void> {
  const user = ownerOnly(await getSessionUser());
  if (!user) return;

  const id = Number(formData.get("id"));
  if (!Number.isSafeInteger(id) || id <= 0) return;

  const db = getDb();
  if (!db) return;

  await db
    .update(suggestionsTable)
    .set({ status: "rejected" })
    .where(
      and(eq(suggestionsTable.id, id), eq(suggestionsTable.status, "pending"))
    );
  updateTag("songs");
  refresh();
}