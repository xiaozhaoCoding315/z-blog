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
import { isDirectAudioUrl } from "@/lib/playlist-core";
import { profileDisplayName } from "@/lib/profile-core";
import type { PetMusicCandidate } from "@/lib/pet-music";

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
  /** 非空 = 来自访客建议，站长采纳后导入 */
  suggestedBy: {
    id: number;
    name: string;
    avatarUrl: string | null;
  } | null;
  suggestionNote: string;
}

export interface PlaylistSuggestionView {
  id: number;
  platform: PlaylistPlatform;
  externalId: string;
  title: string;
  coverUrl: string | null;
  note: string;
  status: "pending" | "approved" | "rejected";
  playlistId: number | null;
  date: string;
  suggester: {
    id: number;
    name: string;
    avatarUrl: string | null;
  };
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

function toSuggester(
  userId: number | null,
  login: string | null,
  displayName: string | null,
  avatarUrl: string | null
): PlaylistView["suggestedBy"] {
  if (!userId || !login) return null;
  return {
    id: userId,
    name: profileDisplayName(displayName, login),
    avatarUrl,
  };
}

/**
 * 公开单曲：只读 approved，且只看 playlistId 为空的单曲。
 * 导入歌单里的曲目跟着歌单走，不能把几十首倒进推荐列表。
 */
export async function getApprovedSongs(): Promise<{
  available: boolean;
  songs: SongView[];
}> {
  try {
    return await getApprovedSongsCached();
  } catch {
    return { available: false, songs: [] };
  }
}

async function getApprovedSongsCached(): Promise<{
  available: boolean;
  songs: SongView[];
}> {
  "use cache";
  cacheLife("minutes");
  cacheTag("songs");

  const db = getDb();
  if (!db) throw new Error("DATABASE_URL 未配置，无法读取单曲");

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
  try {
    return await getApprovedPlaylistsCached();
  } catch {
    return { available: false, playlists: [] };
  }
}

async function getApprovedPlaylistsCached(): Promise<{
  available: boolean;
  playlists: PlaylistView[];
}> {
  "use cache";
  cacheLife("minutes");
  cacheTag("songs");

  const db = getDb();
  if (!db) throw new Error("DATABASE_URL 未配置，无法读取歌单列表");

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
        suggestedBy: playlistsTable.suggestedBy,
        suggestionNote: playlistsTable.suggestionNote,
        createdAt: playlistsTable.createdAt,
        suggesterLogin: users.login,
        suggesterName: users.displayName,
        suggesterAvatarUrl: users.avatarUrl,
      })
      .from(playlistsTable)
      .leftJoin(users, eq(users.id, playlistsTable.suggestedBy))
      // 站长自己导入的永远排在访客建议前面，推荐位仍然最前
      .orderBy(
        desc(playlistsTable.pinned),
        desc(sql`${playlistsTable.suggestedBy} IS NULL`),
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
      suggestedBy: toSuggester(
        row.suggestedBy,
        row.suggesterLogin,
        row.suggesterName,
        row.suggesterAvatarUrl
      ),
      suggestionNote: row.suggestionNote,
    })),
  };
}

/**
 * 单张歌单及其曲目；可用性单独返回，页面不把故障说成「歌单不存在」。
 *
 * `use cache` 只缓存成功结果：数据库故障时让缓存函数直接抛错，
 * 由这一层转成 `{ available: false }`。旧实现把失败对象也缓存数分钟，
 * 库恢复后页面仍会继续显示「暂时读不到」，直到缓存自然过期。
 */
export async function getPlaylistDetail(id: number): Promise<{
  available: boolean;
  playlist: PlaylistDetail | null;
}> {
  try {
    return await getPlaylistDetailCached(id);
  } catch {
    return { available: false, playlist: null };
  }
}

async function getPlaylistDetailCached(id: number): Promise<{
  available: boolean;
  playlist: PlaylistDetail | null;
}> {
  "use cache";
  cacheLife("minutes");
  cacheTag("songs");

  const db = getDb();
  if (!db) throw new Error("DATABASE_URL 未配置，无法读取歌单");

  const [playlist] = await db
    .select({
      id: playlistsTable.id,
      title: playlistsTable.title,
      description: playlistsTable.description,
      coverUrl: playlistsTable.coverUrl,
      platform: playlistsTable.platform,
      externalUrl: playlistsTable.externalUrl,
      pinned: playlistsTable.pinned,
      suggestedBy: playlistsTable.suggestedBy,
      suggestionNote: playlistsTable.suggestionNote,
      createdAt: playlistsTable.createdAt,
      suggesterLogin: users.login,
      suggesterName: users.displayName,
      suggesterAvatarUrl: users.avatarUrl,
    })
    .from(playlistsTable)
    .leftJoin(users, eq(users.id, playlistsTable.suggestedBy))
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
      suggestedBy: toSuggester(
        playlist.suggestedBy,
        playlist.suggesterLogin,
        playlist.suggesterName,
        playlist.suggesterAvatarUrl
      ),
      suggestionNote: playlist.suggestionNote,
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
}

/**
 * 小元点歌候选：所有「点开就能在站内出声」的已通过曲目。
 *
 * 只收有播放路径的曲目：网易云曲目要有 externalId（外链音频），其余平台
 * 要有直链音频。评论区里那些只有平台页面的歌不进来，否则推荐完只能跳出去，
 * 而不是像用户要求的那样直接在播放器里响起来。
 */
export async function getPetMusicCandidates(): Promise<{
  available: boolean;
  candidates: PetMusicCandidate[];
}> {
  try {
    return await getPetMusicCandidatesCached();
  } catch {
    return { available: false, candidates: [] };
  }
}

async function getPetMusicCandidatesCached(): Promise<{
  available: boolean;
  candidates: PetMusicCandidate[];
}> {
  "use cache";
  cacheLife("minutes");
  cacheTag("songs");

  const db = getDb();
  if (!db) throw new Error("DATABASE_URL 未配置，无法读取点歌候选");

  const rows = await db
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
      playlistId: songsTable.playlistId,
      playlistTitle: playlistsTable.title,
      playlistCoverUrl: playlistsTable.coverUrl,
    })
    .from(songsTable)
    .leftJoin(playlistsTable, eq(playlistsTable.id, songsTable.playlistId))
    .where(eq(songsTable.status, "approved"))
    .orderBy(
      desc(songsTable.pinned),
      desc(songsTable.createdAt),
      desc(songsTable.id)
    );

  const candidates = rows
    .filter((row) =>
      row.platform === "netease"
        ? Boolean(row.externalId)
        : isDirectAudioUrl(row.url)
    )
    .map(
      (row): PetMusicCandidate => ({
        track: {
          id: row.id,
          title: row.title,
          artist: row.artist,
          url: row.url,
          platform: toPlaylistPlatform(row.platform),
          externalId: row.externalId,
          coverUrl: row.coverUrl,
          duration: row.duration,
          note: row.note,
        },
        playlistId: row.playlistId,
        playlistTitle: row.playlistTitle ?? "小元推荐",
        playlistCover: row.playlistCoverUrl ?? row.coverUrl,
      })
    );

  return { available: true, candidates };
}