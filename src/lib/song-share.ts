/**
 * 单曲推荐的第一道输入：把平台分享文案认成「歌名 + 艺人 + 链接」。
 *
 * 网易云 / QQ 音乐的分享文案格式稳定，能确定地取出标题与歌手；
 * 认不出就明确返回错误，让访客退回手填，不猜、不伪造。
 * 不 import 任何 `@/` 模块，`node --test` 直接跑。
 */
import { extractUrlFromText } from "./share-text.ts";

export type SongSharePlatform = "netease" | "qq" | "other";
export type ShareKind = "song" | "playlist" | "unknown";

export interface SongShareGuess {
  url: string;
  platform: SongSharePlatform;
  kind: ShareKind;
  title: string | null;
  artist: string | null;
}

export type ShareParse =
  | { ok: true; value: SongShareGuess }
  | { ok: false; error: string };

const MAX_RAW = 1000;
const MAX_FIELD = 120;

function clean(value: string): string | null {
  const trimmed = value
    // 分享文案里的链接经常紧跟在艺人名后面，不能算进字段
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/\s+/g, " ")
    .replace(/^[来自\s]+/u, "")
    .replace(/[，。！？、；：,.!?;:\s]+$/u, "")
    .trim();
  if (!trimmed) return null;
  return [...trimmed].slice(0, MAX_FIELD).join("");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function platformOf(url: string): SongSharePlatform {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host === "music.163.com" || host.endsWith(".music.163.com")) return "netease";
    if (host === "y.qq.com" || host.endsWith(".y.qq.com")) return "qq";
    return "other";
  } catch {
    return "other";
  }
}

/** 认链接指向单曲页还是歌单页；短链与第三方站点一律算 unknown。 */
export function shareKindOf(url: string): ShareKind {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "unknown";
  }
  const host = parsed.hostname.toLowerCase();
  const path = parsed.pathname.toLowerCase();
  const hash = parsed.hash.toLowerCase();

  if (host === "music.163.com" || host.endsWith(".music.163.com")) {
    if (/\/playlist(?:\/|\?|$)/.test(path) || hash.includes("playlist")) return "playlist";
    if (/\/song(?:\/|\?|$)/.test(path) || hash.includes("song")) return "song";
    return "unknown";
  }
  if (host === "y.qq.com" || host.endsWith(".y.qq.com")) {
    if (path.includes("/playlist/") || path.includes("/taoge/")) return "playlist";
    if (path.includes("/songdetail/")) return "song";
    return "unknown";
  }
  return "unknown";
}

/** 分享文案里的曲名几乎总在《》或「」里。 */
function titleFromText(raw: string): string | null {
  const match = raw.match(/[《「]([^》」]{1,120})[》」]/u);
  return match ? clean(match[1]) : null;
}

function artistFromText(raw: string, title: string | null): string | null {
  // 「分享吴若希的单曲《越难越爱》」
  const shared = raw.match(/分享(.{1,60}?)的(?:单曲|歌曲|新歌|原声)/u);
  if (shared) {
    const artist = clean(shared[1]);
    if (artist) return artist;
  }
  if (!title) return null;

  // 「《越难越爱》 - 吴若希 https://…」
  const after = raw.match(/[》」]\s*[-—–]\s*([^\n（(]{1,60})/u);
  if (after) {
    const artist = clean(after[1]);
    if (artist) return artist;
  }

  // 「吴若希 - 《越难越爱》」
  const before = raw.match(
    new RegExp(`^([^\\n《「]{1,60}?)\\s*[-—–]\\s*[《「]${escapeRegExp(title)}`, "u")
  );
  if (before) return clean(before[1]);
  return null;
}

/**
 * 解析一条单曲分享文案。
 * 歌单链接也返回 ok，但 `kind` 标成 playlist，由界面提示切到歌单入口。
 */
export function parseSongShareText(raw: string): ShareParse {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, error: "把平台的分享文案整段粘进来" };
  if (trimmed.length > MAX_RAW) {
    return { ok: false, error: "输入太长了，只粘一条分享文案就好" };
  }

  const url = extractUrlFromText(trimmed);
  if (!url) {
    return { ok: false, error: "没找到链接：把分享文案整段粘进来，或手动填歌名和艺人" };
  }

  const kind = shareKindOf(url);
  const title = titleFromText(trimmed);
  return {
    ok: true,
    value: {
      url,
      platform: platformOf(url),
      kind,
      title,
      artist: kind === "playlist" ? null : artistFromText(trimmed, title),
    },
  };
}
