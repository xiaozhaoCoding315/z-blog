import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { playlists as playlistsTable, songs as songsTable } from "@/db/schema";
import type { ImportedPlaylist } from "@/lib/playlist-core";

export interface SavePlaylistInput {
  /** 歌单归属（当前站长） */
  userId: number;
  imported: ImportedPlaylist;
  title?: string;
  description?: string;
  coverUrl?: string | null;
  /** 来自访客建议时填写；站长自己导入为 null */
  suggestedBy?: number | null;
  suggestionNote?: string;
  pin?: boolean;
}

/**
 * 把归一化后的歌单写进库。
 *
 * 平台歌单按 (platform, external_id) 唯一：重复导入整张替换曲目，
 * 不会在页面上叠出副本；手动歌单没有平台 id，每次新建。
 */
export async function saveImportedPlaylist(
  input: SavePlaylistInput
): Promise<{ ok: true; playlistId: number } | { ok: false; error: string }> {
  const db = getDb();
  if (!db) return { ok: false, error: "数据库暂时不可用，稍后再试" };

  const { imported } = input;
  const title = (input.title ?? imported.title).trim().slice(0, 120);
  if (!title) return { ok: false, error: "歌单需要一个标题" };

  const description = (
    input.description ?? imported.description
  )
    .trim()
    .slice(0, 500);
  const coverUrl = input.coverUrl ?? imported.coverUrl ?? null;
  const externalId = imported.externalId || null;
  const platform = imported.platform;

  try {
    const playlistId = await db.transaction(async (tx) => {
      let id: number;

      if (externalId) {
        const [row] = await tx
          .insert(playlistsTable)
          .values({
            title,
            description,
            coverUrl,
            platform,
            externalId,
            externalUrl: imported.externalUrl || null,
            userId: input.userId,
            suggestedBy: input.suggestedBy ?? null,
            suggestionNote: input.suggestionNote?.slice(0, 300) ?? "",
            pinned: input.pin ?? false,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [playlistsTable.platform, playlistsTable.externalId],
            set: {
              title,
              description,
              coverUrl,
              externalUrl: imported.externalUrl || null,
              userId: input.userId,
              suggestedBy: input.suggestedBy ?? null,
              suggestionNote: input.suggestionNote?.slice(0, 300) ?? "",
              updatedAt: new Date(),
            },
          })
          .returning({ id: playlistsTable.id });
        if (!row) throw new Error("playlist insert returned no row");
        id = row.id;
        // 重新导入等于整张替换曲目：平台上的排序可能已经变了
        await tx.delete(songsTable).where(eq(songsTable.playlistId, id));
      } else {
        const [row] = await tx
          .insert(playlistsTable)
          .values({
            title,
            description,
            coverUrl,
            platform,
            userId: input.userId,
            suggestedBy: input.suggestedBy ?? null,
            suggestionNote: input.suggestionNote?.slice(0, 300) ?? "",
            pinned: input.pin ?? false,
            updatedAt: new Date(),
          })
          .returning({ id: playlistsTable.id });
        if (!row) throw new Error("playlist insert returned no row");
        id = row.id;
      }

      await tx.insert(songsTable).values(
        imported.tracks.map((track, index) => ({
          title: track.title,
          artist: track.artist,
          url: track.url,
          platform: track.platform,
          note: "",
          source: "owner",
          userId: input.userId,
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

    return { ok: true, playlistId };
  } catch (err) {
    console.error("[playlist-save] 保存失败：", err);
    return { ok: false, error: "保存失败，稍后再试" };
  }
}