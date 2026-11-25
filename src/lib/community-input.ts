/**
 * 社群写入的纯校验层（留言 / 评论 / 推荐歌 / 状态句）。
 *
 * 只 import zod，不 import 任何 `@/` 模块——`node --test` 解析不了路径别名，
 * 这个文件要能被 `scripts/community-input.test.mjs` 直接跑。
 */
import { z } from "zod";

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };
export type Platform = "netease" | "qq" | "other";
export type TargetType = "moment" | "note";

const httpUrl = z
  .string()
  .trim()
  .max(500, "链接太长了")
  .refine((v) => {
    try {
      const u = new URL(v);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }, "链接必须是 http(s) 地址");

const letterSchema = z
  .object({
    body: z.string().trim().min(2, "至少写两个字").max(1000, "最多 1000 字"),
    songTitle: z.string().trim().max(120, "歌名太长").optional(),
    songArtist: z.string().trim().max(120, "艺人名太长").optional(),
    songUrl: z.string().trim().optional(),
  })
  .superRefine((v, ctx) => {
    const hasSong = Boolean(v.songTitle || v.songArtist || v.songUrl);
    if (!hasSong) return;
    if (!v.songTitle) ctx.addIssue({ code: "custom", message: "推荐歌需要歌名" });
    if (!v.songArtist) ctx.addIssue({ code: "custom", message: "推荐歌需要艺人" });
    if (v.songUrl) {
      const parsed = httpUrl.safeParse(v.songUrl);
      if (!parsed.success) {
        ctx.addIssue({ code: "custom", message: "推荐链接必须是 http(s) 地址" });
      }
    }
  });

export interface LetterInput {
  body: string;
  songTitle?: string;
  songArtist?: string;
  songUrl?: string;
}

/** FormData 里空字符串按「没填」处理，避免 zod 把 "" 当成有值 */
function optional(fd: FormData, key: string): string | undefined {
  const value = fd.get(key);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function fail(error: z.ZodError): { ok: false; error: string } {
  return { ok: false, error: error.issues[0]?.message ?? "内容不合法" };
}

export function parseLetterInput(fd: FormData): ParseResult<LetterInput> {
  const parsed = letterSchema.safeParse({
    body: fd.get("body") ?? "",
    songTitle: optional(fd, "songTitle"),
    songArtist: optional(fd, "songArtist"),
    songUrl: optional(fd, "songUrl"),
  });
  if (!parsed.success) return fail(parsed.error);
  return { ok: true, value: parsed.data };
}

const targetTypeSchema = z.enum(["moment", "note"]);

export interface CommentInput {
  targetType: TargetType;
  targetId: string;
  body: string;
}

export function parseCommentInput(fd: FormData): ParseResult<CommentInput> {
  const targetType = targetTypeSchema.safeParse(fd.get("targetType"));
  if (!targetType.success) return { ok: false, error: "评论目标不合法" };
  const rawTarget = String(fd.get("targetId") ?? "");
  const targetId =
    targetType.data === "moment"
      ? /^[1-9]\d{0,15}$/.test(rawTarget)
        ? rawTarget
        : null
      : /^[a-z0-9-]{1,120}$/.test(rawTarget)
        ? rawTarget
        : null;
  if (!targetId) return { ok: false, error: "评论目标不合法" };

  const body = String(fd.get("body") ?? "").trim();
  if (body.length < 1) return { ok: false, error: "评论不能为空" };
  if ([...body].length > 500) return { ok: false, error: "最多 500 字" };
  return { ok: true, value: { targetType: targetType.data, targetId, body } };
}

export interface SongInput {
  title: string;
  artist: string;
  url: string;
  platform: Platform;
  note: string;
}

export function inferPlatform(url: string): Platform {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host === "music.163.com" || host.endsWith(".music.163.com")) return "netease";
    if (host === "y.qq.com" || host.endsWith(".y.qq.com")) return "qq";
    return "other";
  } catch {
    return "other";
  }
}

export function parseSongInput(fd: FormData): ParseResult<SongInput> {
  const title = String(fd.get("title") ?? "").trim();
  const artist = String(fd.get("artist") ?? "").trim();
  const url = String(fd.get("url") ?? "").trim();
  const note = String(fd.get("note") ?? "").trim();
  if (!title || [...title].length > 120) return { ok: false, error: "歌名要填，最多 120 字" };
  if (!artist || [...artist].length > 120) return { ok: false, error: "艺人要填，最多 120 字" };
  if (!httpUrl.safeParse(url).success) return { ok: false, error: "链接必须是 http(s) 地址" };
  if ([...note].length > 200) return { ok: false, error: "推荐语最多 200 字" };
  return { ok: true, value: { title, artist, url, platform: inferPlatform(url), note } };
}

export function parseStatusInput(fd: FormData): ParseResult<{ status: string }> {
  const status = String(fd.get("status") ?? "").trim();
  if (!status) return { ok: false, error: "状态句不能为空" };
  if ([...status].length > 40) return { ok: false, error: "状态句最多 40 字" };
  return { ok: true, value: { status } };
}

export type ShelfType = "book" | "film" | "music";

export interface ShelfInput {
  type: ShelfType;
  title: string;
  creator: string;
  rating: number | null;
  note: string;
  coverUrl: string | null;
  finishedAt: string | null;
}

const shelfTypeSchema = z.enum(["book", "film", "music"]);

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式应为 YYYY-MM-DD")
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, "日期不存在");

const coverSchema = z
  .string()
  .max(500, "封面地址太长")
  .refine(
    (v) => v.startsWith("/images/") || /^https?:\/\//i.test(v),
    "封面必须是 http(s) 地址或 /images/ 下的路径"
  );

export function parseShelfInput(fd: FormData): ParseResult<ShelfInput> {
  const type = shelfTypeSchema.safeParse(fd.get("type"));
  if (!type.success) return { ok: false, error: "类型只能是书、影、音" };

  const title = String(fd.get("title") ?? "").trim();
  const creator = String(fd.get("creator") ?? "").trim();
  if (!title || [...title].length > 120) {
    return { ok: false, error: "标题要填，最多 120 字" };
  }
  if ([...creator].length > 120) return { ok: false, error: "作者/艺人最多 120 字" };

  const rawRating = String(fd.get("rating") ?? "").trim();
  const rating = rawRating ? Number(rawRating) : null;
  if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
    return { ok: false, error: "评分只能是 1 到 5" };
  }

  const note = String(fd.get("note") ?? "").trim();
  if ([...note].length > 200) return { ok: false, error: "短评最多 200 字" };

  const rawCover = String(fd.get("coverUrl") ?? "").trim();
  if (rawCover && !coverSchema.safeParse(rawCover).success) {
    return { ok: false, error: "封面必须是 http(s) 地址或 /images/ 下的路径" };
  }

  const rawDate = String(fd.get("finishedAt") ?? "").trim();
  if (rawDate && !dateOnly.safeParse(rawDate).success) {
    return { ok: false, error: "完成日期格式应为 YYYY-MM-DD" };
  }

  return {
    ok: true,
    value: {
      type: type.data,
      title,
      creator,
      rating,
      note,
      coverUrl: rawCover || null,
      finishedAt: rawDate || null,
    },
  };
}
