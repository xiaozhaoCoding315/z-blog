/**
 * 歌单导入的纯函数层：分享链接解析、平台响应归一化、手动曲目解析。
 *
 * 不 import 任何 `@/` 模块，`node --test` 直接跑。
 * 平台接口是公开页面背后的非官方端点，随时可能变；这里只负责把「能认出来
 * 的数据」变成站内结构，取不到时由上层退回手动导入——绝不静默伪造曲目。
 */

export type PlaylistPlatform = "netease" | "qq" | "other";

export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export interface PlaylistRef {
  provider: "netease" | "qq";
  /** 短链（163cn.tv / c6.y.qq.com）解析不出 id，由服务端跟随跳转后再解析 */
  externalId: string | null;
  url: string;
}

export interface ImportedTrack {
  title: string;
  artist: string;
  url: string;
  platform: PlaylistPlatform;
  externalId: string | null;
  coverUrl: string | null;
  /** 秒；未知为 null */
  duration: number | null;
}

export interface ImportedPlaylist {
  title: string;
  description: string;
  coverUrl: string | null;
  platform: PlaylistPlatform;
  externalId: string;
  externalUrl: string;
  tracks: ImportedTrack[];
}

/** 一张歌单最多导入多少首：不是版权限制，是防止一次请求把页面拖垮 */
export const MAX_IMPORT_TRACKS = 300;
const MAX_TITLE = 120;
const MAX_ARTIST = 120;
const MAX_DESCRIPTION = 500;

function text(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function positiveInt(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** 平台自带的封面常是 http；页面本身是 https 时会被浏览器拦成混合内容。 */
function httpsUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  return trimmed.replace(/^http:\/\//i, "https://");
}

function idFromQuery(query: string): string | null {
  const params = new URLSearchParams(query.replace(/^\?/, ""));
  const id = params.get("id") ?? params.get("disstid") ?? params.get("playlistId");
  return id && /^\d{1,20}$/.test(id) ? id : null;
}

function idFromHash(hash: string): string | null {
  const raw = hash.replace(/^#\/?/, "");
  const queryIndex = raw.indexOf("?");
  if (queryIndex === -1) return null;
  return idFromQuery(raw.slice(queryIndex + 1));
}

/**
 * 从分享链接认出平台与歌单 id。
 * 认不出就明确报错，不拿「随便抓一个数字」去请求平台。
 */
export function parsePlaylistUrl(raw: string): ParseResult<PlaylistRef> {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, error: "先粘贴歌单分享链接" };

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false, error: "这不像一个链接" };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, error: "链接必须是 http(s) 地址" };
  }

  const host = url.hostname.toLowerCase();

  if (host === "music.163.com" || host.endsWith(".music.163.com")) {
    const hash = url.hash ? idFromHash(url.hash) : null;
    const query = idFromQuery(url.search);
    const path = /\/playlist\/(\d{1,20})(?:\/|$)/.exec(url.pathname)?.[1] ?? null;
    const externalId = query ?? hash ?? path;
    if (!externalId) {
      return { ok: false, error: "这条网易云链接里没有歌单 id" };
    }
    return { ok: true, value: { provider: "netease", externalId, url: trimmed } };
  }

  // 网易云分享短链：需要服务端跟随 302 后才能拿到真实地址
  if (host === "163cn.tv" || host.endsWith(".163cn.tv")) {
    return { ok: true, value: { provider: "netease", externalId: null, url: trimmed } };
  }

  if (host === "y.qq.com" || host.endsWith(".y.qq.com") || host === "qq.com" || host.endsWith(".qq.com")) {
    const query = idFromQuery(url.search);
    const path =
      /\/playlist\/(\d{1,20})(?:\.html)?(?:\/|$)/.exec(url.pathname)?.[1] ??
      /\/taoge\/(\d{1,20})(?:\/|$)/.exec(url.pathname)?.[1] ??
      null;
    const externalId = query ?? path;
    if (externalId) {
      return { ok: true, value: { provider: "qq", externalId, url: trimmed } };
    }
    // c6.y.qq.com/base/fcgi-bin/u 这类短链同样是跟随跳转后再解析
    if (host === "c6.y.qq.com" || host === "c.y.qq.com") {
      return { ok: true, value: { provider: "qq", externalId: null, url: trimmed } };
    }
    return { ok: false, error: "这条 QQ 音乐链接里没有歌单 id" };
  }

  return {
    ok: false,
    error: "暂只支持网易云音乐 / QQ 音乐的歌单分享链接",
  };
}

function qqCover(albumMid: string): string {
  return `https://y.qq.com/music/photo_new/T002R300x300M000${albumMid}.jpg`;
}

function neteaseTrack(raw: unknown): ImportedTrack | null {
  const track = objectValue(raw);
  if (!track) return null;
  const id = positiveInt(track.id);
  const title = text(track.name, MAX_TITLE);
  if (!id || !title) return null;

  const artists = arrayValue(track.ar ?? track.artists)
    .map((artist) => text(objectValue(artist)?.name, MAX_ARTIST))
    .filter(Boolean);
  const album = objectValue(track.al ?? track.album);
  const durationMs = positiveInt(track.dt ?? track.duration);

  return {
    title,
    artist: artists.join(" / ").slice(0, MAX_ARTIST) || "未知艺人",
    url: `https://music.163.com/#/song?id=${id}`,
    platform: "netease",
    externalId: String(id),
    coverUrl: httpsUrl(album?.picUrl),
    duration: durationMs ? Math.round(durationMs / 1000) : null,
  };
}

function qqTrack(raw: unknown): ImportedTrack | null {
  const track = objectValue(raw);
  if (!track) return null;
  const songmid = text(track.songmid, 40);
  const title = text(track.songname ?? track.name, MAX_TITLE);
  if (!songmid || !title) return null;

  const artists = arrayValue(track.singer)
    .map((artist) => text(objectValue(artist)?.name, MAX_ARTIST))
    .filter(Boolean);
  const interval = positiveInt(track.interval);

  return {
    title,
    artist: artists.join(" / ").slice(0, MAX_ARTIST) || "未知艺人",
    url: `https://y.qq.com/n/ryqq/songDetail/${songmid}`,
    platform: "qq",
    externalId: songmid,
    coverUrl: httpsUrl(
      track.albummid ? qqCover(text(track.albummid, 40)) : undefined
    ),
    duration: interval ?? null,
  };
}

/**
 * musicu.fcg 的曲目字段与旧版 fcg_ucc_getcdinfo 不同：
 * 歌曲 id 在 `mid`，专辑 id 在 `album.mid`。字段缺失就跳过，不拼假条目。
 */
function qqModernTrack(raw: unknown): ImportedTrack | null {
  const track = objectValue(raw);
  if (!track) return null;
  const songmid = text(track.mid, 40);
  const title = text(track.name ?? track.title, MAX_TITLE);
  if (!songmid || !title) return null;

  const artists = arrayValue(track.singer)
    .map((artist) => text(objectValue(artist)?.name, MAX_ARTIST))
    .filter(Boolean);
  const interval = positiveInt(track.interval);
  const albumMid = text(objectValue(track.album)?.mid, 40);

  return {
    title,
    artist: artists.join(" / ").slice(0, MAX_ARTIST) || "未知艺人",
    url: `https://y.qq.com/n/ryqq/songDetail/${songmid}`,
    platform: "qq",
    externalId: songmid,
    coverUrl: albumMid ? qqCover(albumMid) : null,
    duration: interval ?? null,
  };
}

function capTracks(tracks: ImportedTrack[]): ImportedTrack[] {
  return tracks.slice(0, MAX_IMPORT_TRACKS);
}

/** 网易云 `api/playlist/detail` 响应 → 站内歌单结构。 */
export function normalizeNeteasePlaylist(
  raw: unknown,
  fallbackId: string
): ParseResult<ImportedPlaylist> {
  const root = objectValue(raw);
  const playlist = objectValue(root?.result ?? root?.playlist);
  if (!playlist) return { ok: false, error: "网易云没有返回这张歌单" };

  const tracks = capTracks(
    arrayValue(playlist.tracks ?? playlist.songs)
      .map(neteaseTrack)
      .filter((track): track is ImportedTrack => track !== null)
  );
  if (tracks.length === 0) {
    return {
      ok: false,
      error: "网易云没有返回可导入的曲目（歌单可能是空的或已下架）",
    };
  }

  const externalId = String(positiveInt(playlist.id) ?? fallbackId);
  return {
    ok: true,
    value: {
      title: text(playlist.name, MAX_TITLE) || "网易云歌单",
      description: text(playlist.description, MAX_DESCRIPTION),
      coverUrl: httpsUrl(playlist.coverImgUrl ?? playlist.picUrl),
      platform: "netease",
      externalId,
      externalUrl: `https://music.163.com/#/playlist?id=${externalId}`,
      tracks,
    },
  };
}

/**
 * QQ 音乐响应 → 站内歌单结构。
 *
 * 优先读 `musicu.fcg` 的新结构（req_0.data.dirinfo + songlist）：
 * 旧版 `fcg_ucc_getcdinfo_byids_cp` 已对匿名请求返回
 * 「check privacy error」，新结构是目前可用的入口。
 * 旧结构保留给历史响应与回归测试。
 */
export function normalizeQqPlaylist(
  raw: unknown,
  fallbackId: string
): ParseResult<ImportedPlaylist> {
  const root = objectValue(raw);
  const modern = objectValue(objectValue(root?.req_0)?.data);
  if (modern) {
    const dir = objectValue(modern.dirinfo);
    const tracks = capTracks(
      arrayValue(modern.songlist)
        .map(qqModernTrack)
        .filter((track): track is ImportedTrack => track !== null)
    );
    if (tracks.length === 0) {
      return {
        ok: false,
        error: "QQ 音乐没有返回可导入的曲目（歌单可能是空的或已下架）",
      };
    }
    const externalId = String(
      positiveInt(dir?.id) ?? positiveInt(modern.disstid) ?? fallbackId
    );
    return {
      ok: true,
      value: {
        title: text(dir?.title ?? modern.title, MAX_TITLE) || "QQ 音乐歌单",
        description: text(dir?.desc ?? modern.desc, MAX_DESCRIPTION),
        coverUrl: httpsUrl(dir?.cover ?? dir?.picurl ?? modern.cover),
        platform: "qq",
        externalId,
        externalUrl: `https://y.qq.com/n/ryqq/playlist/${externalId}`,
        tracks,
      },
    };
  }

  const cdlist = arrayValue(root?.cdlist);
  const cd = objectValue(cdlist[0]) ?? objectValue(objectValue(root?.data)?.cdlist);
  if (!cd) return { ok: false, error: "QQ 音乐没有返回这张歌单" };

  const tracks = capTracks(
    arrayValue(cd.songlist)
      .map(qqTrack)
      .filter((track): track is ImportedTrack => track !== null)
  );
  if (tracks.length === 0) {
    return {
      ok: false,
      error: "QQ 音乐没有返回可导入的曲目（歌单可能是空的或已下架）",
    };
  }

  const externalId = String(positiveInt(cd.disstid ?? cd.dissid) ?? fallbackId);
  return {
    ok: true,
    value: {
      title: text(cd.dissname, MAX_TITLE) || "QQ 音乐歌单",
      description: text(cd.desc, MAX_DESCRIPTION),
      coverUrl: httpsUrl(cd.logo ?? cd.cover),
      platform: "qq",
      externalId,
      externalUrl: `https://y.qq.com/n/ryqq/playlist/${externalId}`,
      tracks,
    },
  };
}

/**
 * 手动导入：一行一首，`歌名 - 歌手` / `歌名 | 歌手` / 制表符分隔。
 * 这是平台接口失效时的退路，也是自建歌单的入口。
 */
export function parseManualTracks(
  raw: string,
  platform: PlaylistPlatform
): ImportedTrack[] {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, MAX_IMPORT_TRACKS);

  const tracks: ImportedTrack[] = [];
  for (const line of lines) {
    // 只认「两侧有空白」的短横线，避免把 Lo-fi、A-Lin 这类名字切开
    const parts = line.split(/\s+[-—–]\s+|\s*\|\s*|\t+/);
    const title = text(parts[0], MAX_TITLE);
    const artist = text(parts.slice(1).join(" / "), MAX_ARTIST) || "未知艺人";
    if (!title) continue;
    tracks.push({
      title,
      artist,
      url: trackSearchUrl(platform, title, artist),
      platform,
      externalId: null,
      coverUrl: null,
      duration: null,
    });
  }
  return tracks;
}

/** 手动条目没有真实播放 id，只能给一个平台搜索页。 */
export function trackSearchUrl(
  platform: PlaylistPlatform,
  title: string,
  artist: string
): string {
  const query = encodeURIComponent(`${title} ${artist}`.trim());
  if (platform === "netease") {
    return `https://music.163.com/#/search/m/?s=${query}&type=1`;
  }
  if (platform === "qq") {
    return `https://y.qq.com/n/ryqq/search?w=${query}`;
  }
  return `https://www.bing.com/search?q=${query}`;
}

/** 官方外链播放器；没有 X-Frame-Options，可以直接嵌进站内。 */
export function neteaseEmbedUrl(externalId: string, auto = true): string {
  return `https://music.163.com/outchain/player?type=2&id=${encodeURIComponent(
    externalId
  )}&auto=${auto ? 1 : 0}&height=66`;
}

/** 直接音频（mp3/m4a/ogg）才能用原生 <audio> 播放 */
export function isDirectAudioUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return /\.(mp3|m4a|aac|ogg|oga|wav|flac)$/i.test(parsed.pathname);
  } catch {
    return false;
  }
}

export function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "--:--";
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}