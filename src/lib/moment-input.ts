import { z } from "zod";
import type { Moment } from "./life";
import { parseTagInput } from "./tags.ts";

/**
 * 发布表单的校验。
 *
 * 服务端和客户端共用同一份规则：客户端拿它做即时提示，服务端拿它当唯一防线
 * （Server Action 能被直接 POST，界面上的 required 不算数）。
 */

export const MOMENT_KIND_VALUES = [
  "text",
  "photo",
  "song",
  "shelf",
  "quote",
  "link",
] as const;

const CARD_KINDS = new Set<string>(["song", "shelf", "quote", "link"]);

const MEDIA_PATH = /^\/media\/\d{4}\/\d{2}\/[a-f0-9]{32}\.(webp|jpg|png)$/;

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label}最多 ${max} 字`)
    .optional()
    .transform((v) => (v ? v : undefined));

export const momentInputSchema = z
  .object({
    kind: z.enum(MOMENT_KIND_VALUES, "不认识的形态"),
    body: z.string().trim().max(2000, "正文最多 2000 字").default(""),
    images: z
      .array(z.string().regex(MEDIA_PATH, "图片路径不对"))
      .max(9, "最多放 9 张图")
      .default([]),
    mood: optionalText(20, "心情"),
    weather: optionalText(20, "天气"),
    place: optionalText(40, "地点"),
    cardTitle: optionalText(120, "标题"),
    cardMeta: optionalText(120, "来源"),
    cardNote: optionalText(400, "推荐语"),
    // 外链只允许 http(s)：javascript: / data: 之类贴进来直接拒掉
    cardHref: optionalText(500, "外链").refine(
      (v) => !v || /^https?:\/\//i.test(v),
      "外链要以 http:// 或 https:// 开头"
    ),
  })
  .superRefine((value, ctx) => {
    const hasBody = value.body.length > 0;
    const hasImages = value.images.length > 0;

    if (CARD_KINDS.has(value.kind)) {
      if (!value.cardTitle || !value.cardMeta) {
        ctx.addIssue({
          code: "custom",
          message: "读数卡要有标题和来源",
          path: ["cardTitle"],
        });
      }
      return;
    }

    // 短记 / 图文：至少得有字或有图，空条目不该发出去
    if (!hasBody && !hasImages) {
      ctx.addIssue({
        code: "custom",
        message: "写点什么，或者放张图",
        path: ["body"],
      });
    }
  });

export interface MomentInput {
  kind: Moment["kind"];
  body: string;
  images: string[];
  tags: string[];
  mood?: string;
  weather?: string;
  place?: string;
  card?: { title: string; meta: string; note?: string; href?: string };
}

type ParseResult =
  | { ok: true; value: MomentInput }
  | { ok: false; error: string };

export function parseMomentInput(formData: FormData): ParseResult {
  const raw = {
    kind: String(formData.get("kind") ?? ""),
    body: String(formData.get("body") ?? ""),
    images: formData.getAll("images").map(String),
    mood: String(formData.get("mood") ?? ""),
    weather: String(formData.get("weather") ?? ""),
    place: String(formData.get("place") ?? ""),
    cardTitle: String(formData.get("cardTitle") ?? ""),
    cardMeta: String(formData.get("cardMeta") ?? ""),
    cardNote: String(formData.get("cardNote") ?? ""),
    cardHref: String(formData.get("cardHref") ?? ""),
  };

  const parsed = momentInputSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "表单内容不对" };
  }

  // 标签不走 zod：解析规则（# 前缀、字素长度）都在 lib/tags.ts，
  // 放在 zod 之后是为了让字段错误优先于标签错误。
  const tags = parseTagInput(String(formData.get("tags") ?? ""));
  if (!tags.ok) return { ok: false, error: tags.error };

  const v = parsed.data;
  const value: MomentInput = {
    kind: v.kind,
    body: v.body,
    images: v.images,
    tags: tags.tags,
  };
  if (v.mood) value.mood = v.mood;
  if (v.weather) value.weather = v.weather;
  if (v.place) value.place = v.place;

  if (CARD_KINDS.has(v.kind) && v.cardTitle && v.cardMeta) {
    value.card = { title: v.cardTitle, meta: v.cardMeta };
    if (v.cardNote) value.card.note = v.cardNote;
    if (v.cardHref) value.card.href = v.cardHref;
  }

  return { ok: true, value };
}
