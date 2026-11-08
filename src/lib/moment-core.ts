import type { Moment, MomentKind } from "./life";

/**
 * 数据库行 → 生活流条目。
 *
 * 这里只做形状转换，不做业务判断：哪些能发、发出去长什么样，由发布表单的
 * 校验（lib/moment-input.ts）负责。读取侧要宽松——库里已有的数据永远要读得出来，
 * 一个不认识的 kind 不该让整页 500。
 */

export const MOMENT_KINDS = [
  "text",
  "photo",
  "song",
  "shelf",
  "quote",
  "link",
] as const;

export function isMomentKind(value: unknown): value is MomentKind {
  return (
    typeof value === "string" &&
    (MOMENT_KINDS as readonly string[]).includes(value)
  );
}

/** 卡片形态只认这四种，其余 kind 即使库里带了 card 也不渲染 */
const CARD_KINDS = new Set<MomentKind>(["song", "shelf", "quote", "link"]);

export interface MomentDbRowLike {
  id: number;
  kind: string;
  body: string;
  images: unknown;
  mood: string | null;
  weather: string | null;
  place: string | null;
  card: unknown;
  publishedAt: Date | string;
}

function text(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** 只接受站内 /media/ 路径：外链和脏数据都丢掉，不让它们进 <img src> */
function mediaPaths(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (x): x is string => typeof x === "string" && x.startsWith("/media/")
  );
}

function cardOf(value: unknown): Moment["card"] | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  if (typeof raw.title !== "string" || typeof raw.meta !== "string") {
    return undefined;
  }
  const title = raw.title.trim();
  const meta = raw.meta.trim();
  if (!title || !meta) return undefined;
  return {
    title,
    meta,
    note: text(typeof raw.note === "string" ? raw.note : null),
    href: text(typeof raw.href === "string" ? raw.href : null),
  };
}

export function toMoment(row: MomentDbRowLike): Moment {
  const kind: MomentKind = isMomentKind(row.kind) ? row.kind : "text";
  const images = mediaPaths(row.images);
  const moment: Moment = {
    id: String(row.id),
    kind,
    publishedAt:
      row.publishedAt instanceof Date
        ? row.publishedAt.toISOString()
        : row.publishedAt,
    body: row.body ?? "",
  };

  if (images.length > 0) moment.images = images;
  const mood = text(row.mood);
  const weather = text(row.weather);
  const place = text(row.place);
  if (mood) moment.mood = mood;
  if (weather) moment.weather = weather;
  if (place) moment.place = place;

  if (CARD_KINDS.has(kind)) {
    const card = cardOf(row.card);
    if (card) moment.card = card;
  }

  return moment;
}
