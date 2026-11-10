"use server";

import { refresh, updateTag } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { playlists as playlistsTable, songs as songsTable } from "@/db/schema";
import { getSessionUser } from "@/lib/session";
import { fetchPlaylistImport } from "@/lib/playlist-import";
import {
  MAX_IMPORT_TRACKS,
  parseManualTracks,
  parsePlaylistUrl,
  type ImportedPlaylist,
  type ImportedTrack,
  type PlaylistPlatform,
} from "@/lib/playlist-core";

export interface PlaylistImportState {
  error?: string;
  ok?: boolean;
  playlistId?: number;
}

function ownerOnly(user: Awaited<ReturnType<typeof getSessionUser>>) {
  return user?.role === "owner" ? user : null;
}

function limited(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function playlistPlatform(value: unknown): PlaylistPlatform {
  return value === "netease" || value === "qq" ? value : "other";
}

/** 封面只收站内 /media 或 http(s)，避免 javascript: 之类混进 img[src]。 */
function coverUrl(value: string): string | null | undefined {
  if (!value) return null;
  if (value.startsWith("/media/")) return value;
  if (/^https?:\/\//i.test(value)) return value;
  return undefined;
}

/**
 * 站长导入歌单。
 *
 * 先把分享链接交给平台公开接口解析；接口失败时，只要表单里还有手动曲目，
 * 就退回手动导入——这条退路是刻意保留的，因为那两个端点并不保证长期可用。
 * 不接收表单里的 userId，歌单归属只认会话里的站长。
 */
export async function importPlaylist(
  _prev: PlaylistImportState,
  formData: FormData
): Promise<PlaylistImportState> {
  const user = ownerOnly(await getSessionUser());
  if (!user) return { error: "只有站长能导入歌单，请先登录站长账号" };

  const url = limited(formData.get("url"), 1000);
  const manualText = limited(formData.get("manualTracks"), 200_000);
  const manualPlatform = playlistPlatform(formData.get("platform"));
  const rawTitle = limited(formData.get("title"), 120);
  const rawDescription = limited(formData.get("description"), 500);
  const rawCover = limited(formData.get("coverUrl"), 500);
  const cover = coverUrl(rawCover);
  if (cover === undefined) {
    return { error: "封面必须是 http(s) 地址或站内 /media/ 路径" };
  }

  let imported: ImportedPlaylist | null = null;
  let fetchError: string | null = null;
  let refProvider: PlaylistPlatform = manualPlatform;

  if (url) {
    const parsed = parsePlaylistUrl(url);
    if (parsed.ok) refProvider = parsed.value.provider;
    const result = await fetchPlaylistImport(url);
    if (result.ok) {
      imported = result.playlist;
    } else {
      fetchError = result.error;
      if (result.ref) refProvider = result.ref.provider;
    }
  }

  let tracks: ImportedTrack[] = [];
  if (imported) {
    tracks = imported.tracks;
  } else if (manualText) {
    tracks = parseManualTracks(manualText, refProvider);
  }

  if (tracks.length === 0) {
    return {
      error:
        fetchError ??
        (url
          ? "没有从链接里读到曲目；可以在下方粘贴「歌名 - 歌手」手动导入"
          : "先粘贴歌单分享链接，或至少粘贴一首「歌名 - 歌手」"),
    };
  }
  if (tracks.length > MAX_IMPORT_TRACKS) {
    tracks = tracks.slice(0, MAX_IMPORT_TRACKS);
  }

  const title =
    rawTitle || imported?.title || (manualText ? "手动导入的歌单" : "");
  if (!title) return { error: "歌单需要一个标题" };

  const db = getDb();
  if (!db) return { error: "数据库暂时不可用，稍后再试" };

  const externalId = imported?.externalId ?? null;
  const platform: PlaylistPlatform = imported?.platform ?? refProvider;

  try {
    const playlistId = await db.transaction(async (tx) => {
      let id: number;

      if (externalId) {
        const [row] = await tx
          .insert(playlistsTable)
          .values({
            title,
            description: rawDescription || imported?.description || "",
            coverUrl: cover ?? imported?.coverUrl ?? null,
            platform,
            externalId,
            externalUrl: imported?.externalUrl ?? null,
            userId: user.id,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [playlistsTable.platform, playlistsTable.externalId],
            set: {
              title,
              description: rawDescription || imported?.description || "",
              coverUrl: cover ?? imported?.coverUrl ?? null,
              externalUrl: imported?.externalUrl ?? null,
              userId: user.id,
              updatedAt: new Date(),
            },
          })
          .returning({ id: playlistsTable.id });
        if (!row) throw new Error("playlist insert returned no row");
        id = row.id;
        // 重新导入等于整张替换曲目：平台上的排序可能已经变了
        await tx.delete(songsTable).where(eq(songsTable.playlistId, id));
      } else {
        // 手动歌单没有平台 id；同名同平台的手动歌单仍然可重复，交给站长删除
        const [row] = await tx
          .insert(playlistsTable)
          .values({
            title,
            description: rawDescription,
            coverUrl: cover ?? null,
            platform,
            userId: user.id,
            updatedAt: new Date(),
          })
          .returning({ id: playlistsTable.id });
        if (!row) throw new Error("playlist insert returned no row");
        id = row.id;
      }

      await tx.insert(songsTable).values(
        tracks.map((track, index) => ({
          title: track.title,
          artist: track.artist,
          url: track.url,
          platform: track.platform,
          note: "",
          source: "owner",
          userId: user.id,
          status: "approved",
          pinned: false,
          playlistId: id,
          externalId: track.externalId,
          coverUrl: track.coverUrl,
          duration: track.duration,
          sortOrder: index,
        }))
      );

      return id;
    });

    updateTag("songs");
    refresh();
    return { ok: true, playlistId };
  } catch (err) {
    console.error("[playlist-import] 保存失败：", err);
    return { error: "保存失败，稍后再试" };
  }
}

/** 删除一张歌单；曲目由外键级联删除。 */
export async function deletePlaylist(formData: FormData): Promise<void> {
  const user = ownerOnly(await getSessionUser());
  if (!user) return;
  const id = Number(formData.get("id"));
  if (!Number.isSafeInteger(id) || id <= 0) return;
  const db = getDb();
  if (!db) return;
  await db.delete(playlistsTable).where(eq(playlistsTable.id, id));
  updateTag("songs");
  refresh();
}

/** 设为首页推荐歌单：同一时间只留一张，和「此刻循环」单曲互不干扰。 */
export async function pinPlaylist(formData: FormData): Promise<void> {
  const user = ownerOnly(await getSessionUser());
  if (!user) return;
  const id = Number(formData.get("id"));
  if (!Number.isSafeInteger(id) || id <= 0) return;
  const db = getDb();
  if (!db) return;
  await db.transaction(async (tx) => {
    await tx.update(playlistsTable).set({ pinned: false });
    await tx
      .update(playlistsTable)
      .set({ pinned: true })
      .where(eq(playlistsTable.id, id));
  });
  updateTag("songs");
  refresh();
}

/** 取消推荐位；只动 playlists，不影响单曲的「此刻循环」。 */
export async function unpinPlaylist(formData: FormData): Promise<void> {
  const user = ownerOnly(await getSessionUser());
  if (!user) return;
  const id = Number(formData.get("id"));
  if (!Number.isSafeInteger(id) || id <= 0) return;
  const db = getDb();
  if (!db) return;
  await db
    .update(playlistsTable)
    .set({ pinned: false })
    .where(and(eq(playlistsTable.id, id), eq(playlistsTable.pinned, true)));
  updateTag("songs");
  refresh();
}