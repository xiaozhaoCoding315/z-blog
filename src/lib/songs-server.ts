import { cacheLife, cacheTag } from "next/cache";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { songs as songsTable, users } from "@/db/schema";
import { formatDay } from "@/lib/life";
import type { Platform } from "@/lib/community-input";

export interface SongView {
  id: number;
  title: string;
  artist: string;
  url: string;
  platform: Platform;
  note: string;
  source: "owner" | "visitor";
  recommender: string | null;
  pinned: boolean;
  date: string;
  pending: boolean;
}

/**
 * 公开歌单：只读 approved。连不上时 available: false，
 * 页面显示 NOT AVAILABLE，不拿空数组冒充「歌单还空着」。
 */
export async function getApprovedSongs(): Promise<{
  available: boolean;
  songs: SongView[];
}> {
  return getApprovedSongsCached();
}

async function getApprovedSongsCached(): Promise<{
  available: boolean;
  songs: SongView[];
}> {
  "use cache";
  cacheLife("minutes");
  cacheTag("songs");

  const db = getDb();
  if (!db) return { available: false, songs: [] };

  try {
    const rows = await db
      .select({
        id: songsTable.id,
        title: songsTable.title,
        artist: songsTable.artist,
        url: songsTable.url,
        platform: songsTable.platform,
        note: songsTable.note,
        source: songsTable.source,
        pinned: songsTable.pinned,
        login: users.login,
        createdAt: songsTable.createdAt,
      })
      .from(songsTable)
      .leftJoin(users, eq(users.id, songsTable.userId))
      .where(eq(songsTable.status, "approved"))
      .orderBy(desc(songsTable.createdAt), desc(songsTable.id));

    return { available: true, songs: rows.map((row) => toSongView(row)) };
  } catch {
    return { available: false, songs: [] };
  }
}

/**
 * 当前用户视角：公开歌单 + 自己待审的推荐。
 * 待审查询不走缓存；已通过的自家歌曲已包含在公开列表里，不重复追加。
 */
export async function getSongsForViewer(userId: number | null): Promise<{
  available: boolean;
  songs: SongView[];
}> {
  const publicResult = await getApprovedSongs();
  if (!userId) return publicResult;

  const db = getDb();
  if (!db) return publicResult;

  try {
    const own = await db
      .select({
        id: songsTable.id,
        title: songsTable.title,
        artist: songsTable.artist,
        url: songsTable.url,
        platform: songsTable.platform,
        note: songsTable.note,
        source: songsTable.source,
        pinned: songsTable.pinned,
        login: users.login,
        createdAt: songsTable.createdAt,
        status: songsTable.status,
      })
      .from(songsTable)
      .leftJoin(users, eq(users.id, songsTable.userId))
      .where(eq(songsTable.userId, userId))
      .orderBy(desc(songsTable.createdAt), desc(songsTable.id));

    const existingIds = new Set(publicResult.songs.map((s) => s.id));
    const extra = own
      .filter((row) => row.status === "pending" && !existingIds.has(row.id))
      .map((row) => toSongView(row, true));

    return { available: publicResult.available, songs: [...publicResult.songs, ...extra] };
  } catch {
    return publicResult;
  }
}

function toSongView(
  row: {
    id: number;
    title: string;
    artist: string;
    url: string;
    platform: string;
    note: string;
    source: string;
    pinned: boolean;
    login: string | null;
    createdAt: Date;
  },
  pending = false
): SongView {
  const platform: Platform =
    row.platform === "netease" || row.platform === "qq" ? row.platform : "other";
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    url: row.url,
    platform,
    note: row.note,
    source: row.source === "visitor" ? "visitor" : "owner",
    recommender: row.login,
    pinned: row.pinned,
    date: formatDay(row.createdAt.toISOString()),
    pending,
  };
}
