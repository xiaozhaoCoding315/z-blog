import { cacheLife, cacheTag } from "next/cache";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  playlists as playlistsTable,
  songs as songsTable,
  users,
} from "@/db/schema";
import { formatDay } from "@/lib/life";
import type { Platform } from "@/lib/community-input";
import { profileDisplayName } from "@/lib/profile-core";

export interface SongView {
  id: number;
  title: string;
  artist: string;
  url: string;
  platform: Platform;
  note: string;
  source: "owner" | "visitor";
  recommender: string | null;
  recommenderId: number | null;
  recommenderAvatarUrl: string | null;
  pinned: boolean;
  date: string;
  pending: boolean;
}

export type PlaylistPlatform = "netease" | "qq" | "other";

export interface PlaylistView {
  id: number;
  title: string;
  description: string;
  coverUrl: string | null;
  platform: PlaylistPlatform;
  externalUrl: string | null;
  pinned: boolean;
  songCount: number;
  date: string;
}

export interface TrackView {
  id: number;
  title: string;
  artist: string;
  url: string;
  platform: PlaylistPlatform;
  externalId: string | null;
  coverUrl: string | null;
  duration: number | null;
  note: string;
}

export interface PlaylistDetail extends PlaylistView {
  songs: TrackView[];
}

function toPlatform(value: string): Platform {
  return value === "netease" || value === "qq" ? value : "other";
}

function toPlaylistPlatform(value: string): PlaylistPlatform {
  return value === "netease" || value === "qq" ? value : "other";
}

/**
 * 公开单曲：只读 approved，且只看 playlistId 为空的单曲。
 * 导入歌单里的曲目跟着歌单走，不能把几十首倒进推荐列表。
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
        userId: songsTable.userId,
        login: users.login,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        createdAt: songsTable.createdAt,
      })
      .from(songsTable)
      .leftJoin(users, eq(users.id, songsTable.userId))
      .where(and(eq(songsTable.status, "approved"), isNull(songsTable.playlistId)))
      .orderBy(desc(songsTable.createdAt), desc(songsTable.id));

    return { available: true, songs: rows.map((row) => toSongView(row)) };
  } catch {
    return { available: false, songs: [] };
  }
}

/**
 * 当前用户视角：公开单曲 + 自己待审的推荐。
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
        userId: songsTable.userId,
        login: users.login,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        createdAt: songsTable.createdAt,
        status: songsTable.status,
      })
      .from(songsTable)
      .leftJoin(users, eq(users.id, songsTable.userId))
      .where(eq(songsTable.userId, userId))
      .orderBy(desc(songsTable.createdAt), desc(songsTable.id));

    const existingIds = new Set(publicResult.songs.map((song) => song.id));
    const extra = own
      .filter((row) => row.status === "pending" && !existingIds.has(row.id))
      .map((row) => toSongView(row, true));

    return {
      available: publicResult.available,
      songs: [...publicResult.songs, ...extra],
    };
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
    userId: number | null;
    login: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    createdAt: Date;
  },
  pending = false
): SongView {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    url: row.url,
    platform: toPlatform(row.platform),
    note: row.note,
    source: row.source === "visitor" ? "visitor" : "owner",
    recommender: row.login
      ? profileDisplayName(row.displayName, row.login)
      : null,
    recommenderId: row.userId,
    recommenderAvatarUrl: row.avatarUrl,
    pinned: row.pinned,
    date: formatDay(row.createdAt.toISOString()),
    pending,
  };
}

/**
 * 公开歌单索引：歌单 + 已通过曲目数。
 * 连不上时 available: false，页面显示 NOT AVAILABLE，不拿空数组冒充「还没有歌单」。
 */
export async function getApprovedPlaylists(): Promise<{
  available: boolean;
  playlists: PlaylistView[];
}> {
  return getApprovedPlaylistsCached();
}

async function getApprovedPlaylistsCached(): Promise<{
  available: boolean;
  playlists: PlaylistView[];
}> {
  "use cache";
  cacheLife("minutes");
  cacheTag("songs");

  const db = getDb();
  if (!db) return { available: false, playlists: [] };

  try {
    const [rows, counts] = await Promise.all([
      db
        .select({
          id: playlistsTable.id,
          title: playlistsTable.title,
          description: playlistsTable.description,
          coverUrl: playlistsTable.coverUrl,
          platform: playlistsTable.platform,
          externalUrl: playlistsTable.externalUrl,
          pinned: playlistsTable.pinned,
          createdAt: playlistsTable.createdAt,
        })
        .from(playlistsTable)
        .orderBy(
          desc(playlistsTable.pinned),
          desc(playlistsTable.createdAt),
          desc(playlistsTable.id)
        ),
      db
        .select({
          playlistId: songsTable.playlistId,
          count: sql<number>`count(*)::int`,
        })
        .from(songsTable)
        .where(
          and(
            eq(songsTable.status, "approved"),
            sql`${songsTable.playlistId} IS NOT NULL`
          )
        )
        .groupBy(songsTable.playlistId),
    ]);

    const countMap = new Map(
      counts
        .filter((row): row is { playlistId: number; count: number } =>
          typeof row.playlistId === "number"
        )
        .map((row) => [row.playlistId, row.count])
    );

    return {
      available: true,
      playlists: rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        coverUrl: row.coverUrl,
        platform: toPlaylistPlatform(row.platform),
        externalUrl: row.externalUrl,
        pinned: row.pinned,
        songCount: countMap.get(row.id) ?? 0,
        date: formatDay(row.createdAt.toISOString()),
      })),
    };
  } catch {
    return { available: false, playlists: [] };
  }
}

/** 单张歌单及其曲目；可用性单独返回，页面不把故障说成「歌单不存在」。 */
export async function getPlaylistDetail(id: number): Promise<{
  available: boolean;
  playlist: PlaylistDetail | null;
}> {
  return getPlaylistDetailCached(id);
}

async function getPlaylistDetailCached(id: number): Promise<{
  available: boolean;
  playlist: PlaylistDetail | null;
}> {
  "use cache";
  cacheLife("minutes");
  cacheTag("songs");

  const db = getDb();
  if (!db) return { available: false, playlist: null };

  try {
    const [playlist] = await db
      .select({
        id: playlistsTable.id,
        title: playlistsTable.title,
        description: playlistsTable.description,
        coverUrl: playlistsTable.coverUrl,
        platform: playlistsTable.platform,
        externalUrl: playlistsTable.externalUrl,
        pinned: playlistsTable.pinned,
        createdAt: playlistsTable.createdAt,
      })
      .from(playlistsTable)
      .where(eq(playlistsTable.id, id))
      .limit(1);
    if (!playlist) return { available: true, playlist: null };

    const tracks = await db
      .select({
        id: songsTable.id,
        title: songsTable.title,
        artist: songsTable.artist,
        url: songsTable.url,
        platform: songsTable.platform,
        externalId: songsTable.externalId,
        coverUrl: songsTable.coverUrl,
        duration: songsTable.duration,
        note: songsTable.note,
      })
      .from(songsTable)
      .where(
        and(
          eq(songsTable.playlistId, id),
          inArray(songsTable.status, ["approved"])
        )
      )
      .orderBy(asc(songsTable.sortOrder), asc(songsTable.id));

    return {
      available: true,
      playlist: {
        id: playlist.id,
        title: playlist.title,
        description: playlist.description,
        coverUrl: playlist.coverUrl,
        platform: toPlaylistPlatform(playlist.platform),
        externalUrl: playlist.externalUrl,
        pinned: playlist.pinned,
        songCount: tracks.length,
        date: formatDay(playlist.createdAt.toISOString()),
        songs: tracks.map((track) => ({
          id: track.id,
          title: track.title,
          artist: track.artist,
          url: track.url,
          platform: toPlaylistPlatform(track.platform),
          externalId: track.externalId,
          coverUrl: track.coverUrl,
          duration: track.duration,
          note: track.note,
        })),
      },
    };
  } catch {
    return { available: false, playlist: null };
  }
}