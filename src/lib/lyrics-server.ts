import { buildLyrics, type ParsedLyrics } from "@/lib/lyrics-core";

/**
 * 网易云歌词读取。
 *
 * 走网页端公开的 /api/song/lyric，不需要账号 cookie：歌词是公开内容，
 * 访客和站长看到的一样。平台不承诺这个接口，失败就明确说读不到，
 * 歌词页仍然可用（只是没有滚动高亮），不伪造歌词。
 */

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const TTL = 6 * 60 * 60 * 1000;
const MAX_ENTRIES = 200;
const cache = new Map<string, { at: number; lyrics: ParsedLyrics }>();

export type LyricsLoad =
  | { ok: true; lyrics: ParsedLyrics }
  | { ok: false; error: string };

function pruneCache(now: number): void {
  for (const [key, entry] of cache) {
    if (now - entry.at >= TTL) cache.delete(key);
  }
  while (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

export async function fetchNeteaseLyrics(externalId: string): Promise<LyricsLoad> {
  if (!/^\d{1,20}$/.test(externalId)) {
    return { ok: false, error: "这首歌没有可读取的歌词" };
  }

  const now = Date.now();
  const cached = cache.get(externalId);
  if (cached && now - cached.at < TTL) {
    return { ok: true, lyrics: cached.lyrics };
  }

  try {
    const res = await fetch(
      `https://music.163.com/api/song/lyric?id=${externalId}&lv=1&kv=1&tv=-1`,
      {
        cache: "no-store",
        headers: {
          "User-Agent": UA,
          Referer: "https://music.163.com/",
          Accept: "application/json,text/plain,*/*",
        },
        signal: AbortSignal.timeout(12_000),
      }
    );
    if (!res.ok) return { ok: false, error: "歌词暂时读不到，稍后再试" };

    const body: unknown = await res.json();
    const data = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
    const lrc = data.lrc && typeof data.lrc === "object" ? (data.lrc as Record<string, unknown>) : {};
    const tlyric =
      data.tlyric && typeof data.tlyric === "object"
        ? (data.tlyric as Record<string, unknown>)
        : {};
    const lyrics = buildLyrics(
      typeof lrc.lyric === "string" ? lrc.lyric : "",
      typeof tlyric.lyric === "string" ? tlyric.lyric : ""
    );

    cache.set(externalId, { at: now, lyrics });
    pruneCache(now);
    return { ok: true, lyrics };
  } catch {
    return { ok: false, error: "歌词暂时读不到，稍后再试" };
  }
}