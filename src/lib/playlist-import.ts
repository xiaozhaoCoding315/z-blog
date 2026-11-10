import {
  normalizeNeteasePlaylist,
  normalizeQqPlaylist,
  parsePlaylistUrl,
  type ImportedPlaylist,
  type PlaylistRef,
} from "@/lib/playlist-core";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export type ImportResult =
  | { ok: true; playlist: ImportedPlaylist }
  | { ok: false; error: string; ref: PlaylistRef | null };

/**
 * 网易云 / QQ 音乐的公开歌单接口。
 *
 * 这两组端点来自网页端本身，不是官方开放 API：随时可能改字段或直接关闭。
 * 因此所有失败都带明确原因返回，导入表单同时提供手动曲目作为退路；
 * 不在服务端伪造歌单，也不把解析失败说成「歌单为空」。
 */
export async function fetchPlaylistImport(rawUrl: string): Promise<ImportResult> {
  const parsed = parsePlaylistUrl(rawUrl);
  if (!parsed.ok) return { ok: false, error: parsed.error, ref: null };

  let ref = parsed.value;
  try {
    let externalId = ref.externalId;
    if (!externalId) {
      const resolved = await resolveShortLink(ref.url);
      if (!resolved) {
        return {
          ok: false,
          error: "短链没有跳转到歌单页；请从歌单页复制完整分享链接",
          ref,
        };
      }
      const reparsed = parsePlaylistUrl(resolved);
      if (!reparsed.ok || !reparsed.value.externalId) {
        return {
          ok: false,
          error: "短链跳转后仍认不出歌单 id；请复制歌单页地址",
          ref,
        };
      }
      ref = reparsed.value;
      externalId = ref.externalId;
    }
    if (!externalId) {
      return { ok: false, error: "没有解析出歌单 id", ref };
    }

    const payload =
      ref.provider === "netease"
        ? await fetchNetease(externalId)
        : await fetchQq(externalId);

    const normalized =
      ref.provider === "netease"
        ? normalizeNeteasePlaylist(payload, externalId)
        : normalizeQqPlaylist(payload, externalId);

    if (!normalized.ok) return { ok: false, error: normalized.error, ref };
    return { ok: true, playlist: normalized.value };
  } catch (err) {
    const reason = err instanceof Error && err.name === "TimeoutError"
      ? "平台响应超时"
      : "平台暂时没有响应";
    console.warn("[playlist-import] 导入失败：", err);
    return {
      ok: false,
      error: `${reason}。可以改用下方的手动曲目导入。`,
      ref,
    };
  }
}

async function resolveShortLink(url: string): Promise<string | null> {
  const res = await fetch(url, {
    method: "GET",
    redirect: "follow",
    cache: "no-store",
    headers: { "User-Agent": UA, Accept: "text/html,*/*" },
    signal: AbortSignal.timeout(10_000),
  });
  return res.url || null;
}

async function fetchNetease(id: string): Promise<unknown> {
  const res = await fetch(
    `https://music.163.com/api/playlist/detail?id=${encodeURIComponent(id)}`,
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
  if (!res.ok) throw new Error(`netease ${res.status}`);
  return res.json();
}

/**
 * QQ 音乐：旧版 fcg_ucc_getcdinfo_byids_cp 现在对匿名请求返回
 * 「check privacy error」，改用网页端仍在使用的 musicu.fcg 聚合接口。
 *
 * 匿名请求每页最多给 30 首，靠 song_begin / hasmore 翻页；
 * 这里只收集到归一化层需要的上限（300 首再多一点），并设总体时限，
 * 不为了一个歌单在服务端无限翻页。
 */
async function fetchQq(id: string): Promise<unknown> {
  const numericId = Number(id);
  if (!Number.isSafeInteger(numericId) || numericId <= 0) {
    throw new Error("qq invalid id");
  }

  const PAGE = 30;
  const COLLECT = 330;
  const deadline = Date.now() + 12_000;
  let dirinfo: Record<string, unknown> = {};
  let songs: unknown[] = [];

  for (let begin = 0; begin < COLLECT && Date.now() < deadline; begin += PAGE) {
    const page = await requestQqPage(numericId, begin, PAGE);
    if (!dirinfo || Object.keys(dirinfo).length === 0) {
      dirinfo = objectValue(page.dirinfo) ?? {};
    }
    const list = Array.isArray(page.songlist) ? page.songlist : [];
    songs = songs.concat(list);
    const more = page.hasmore === 1 || page.hasmore === "1" || page.hasmore === true;
    if (!more || list.length < PAGE) break;
  }

  return { req_0: { data: { dirinfo, songlist: songs } } };
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

async function requestQqPage(
  disstid: number,
  songBegin: number,
  songNum: number
): Promise<Record<string, unknown>> {
  const res = await fetch("https://u.y.qq.com/cgi-bin/musicu.fcg", {
    method: "POST",
    cache: "no-store",
    headers: {
      "User-Agent": UA,
      Referer: "https://y.qq.com/",
      "Content-Type": "application/json",
      Accept: "application/json,text/plain,*/*",
    },
    body: JSON.stringify({
      req_0: {
        module: "music.srfDissInfo.aiDissInfo",
        method: "uniform_get_Dissinfo",
        param: {
          disstid,
          enc_host_uin: "",
          tag: 1,
          userinfo: 1,
          song_begin: songBegin,
          song_num: songNum,
        },
      },
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`qq ${res.status}`);
  const body = objectValue(await res.json());
  const data = objectValue(objectValue(body?.req_0)?.data);
  if (!data) throw new Error("qq empty response");
  return data;
}