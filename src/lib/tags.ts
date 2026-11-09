import type { Moment } from "./life";

export const MAX_TAGS = 5;
export const MAX_TAG_LENGTH = 16;

const segmenter = new Intl.Segmenter("zh-CN", { granularity: "grapheme" });

function graphemes(value: string): string[] {
  return Array.from(segmenter.segment(value), (x) => x.segment);
}

function normalize(raw: string): string {
  return raw.trim().replace(/^#+/, "").trim();
}

export function readTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const tags: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const tag = normalize(item);
    if (!tag || graphemes(tag).length > MAX_TAG_LENGTH) continue;
    if (!tags.includes(tag)) tags.push(tag);
    if (tags.length === MAX_TAGS) break;
  }
  return tags;
}

export function parseTagInput(
  input: string
): { ok: true; tags: string[] } | { ok: false; error: string } {
  const tags: string[] = [];
  for (const part of input.split(/[\s,，]+/)) {
    const tag = normalize(part);
    if (!tag) continue;
    if (graphemes(tag).length > MAX_TAG_LENGTH) {
      return { ok: false, error: `单个标签最多 ${MAX_TAG_LENGTH} 个字符` };
    }
    if (!tags.includes(tag)) tags.push(tag);
  }
  if (tags.length > MAX_TAGS) {
    return { ok: false, error: `最多 ${MAX_TAGS} 个标签` };
  }
  return { ok: true, tags };
}

/** 筛选与计数只需要 id/tags；桌面筛选岛不把整条 Moment 带进客户端。 */
export type Taggable = Pick<Moment, "id" | "tags">;

export function filterByTags<T extends Taggable>(
  moments: T[],
  tags: string[]
): T[] {
  if (tags.length === 0) return moments;
  return moments.filter((moment) =>
    tags.every((tag) => (moment.tags ?? []).includes(tag))
  );
}

export function collectTags<T extends Pick<Moment, "tags">>(
  moments: T[]
): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const moment of moments) {
    for (const tag of moment.tags ?? []) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "zh-CN"));
}
