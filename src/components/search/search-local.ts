/**
 * Spotlight 的本地过滤与合并：纯函数，不碰 React / DOM。
 *
 * 本地结果负责「立刻有反馈」，`/api/search` 的语义结果只做增量；
 * 两边用 slug 去重，标签始终来自本地笔记索引（服务端只返回标题与片段）。
 */

export interface SearchableNote {
  slug: string;
  title: string;
  tags: string[];
}

export interface SearchableApp {
  id: string;
  title: string;
  keywords: string[];
}

export interface SemanticNoteHit {
  post_slug: string;
  title: string;
  heading: string | null;
  snippet: string;
}

export interface NoteHit extends SearchableNote {
  /** 语义命中没有本地标签可展示时，用标题小节 / 摘要补一行说明 */
  detail?: string;
}

/** 空查询时 Spotlight 只列一小段，避免把整个注册表铺满面板 */
const EMPTY_APP_LIMIT = 6;
const EMPTY_NOTE_LIMIT = 6;

function needleOf(query: string) {
  return query.trim().toLowerCase();
}

export function filterLocalApps<T extends SearchableApp>(
  apps: readonly T[],
  query: string
): T[] {
  const needle = needleOf(query);
  if (!needle) return apps.slice(0, EMPTY_APP_LIMIT);
  return apps.filter((app) =>
    [app.id, app.title, ...app.keywords].some((value) =>
      value.toLowerCase().includes(needle)
    )
  );
}

export function filterLocalNotes<T extends SearchableNote>(
  notes: readonly T[],
  query: string
): T[] {
  const needle = needleOf(query);
  if (!needle) return notes.slice(0, EMPTY_NOTE_LIMIT);
  return notes.filter(
    (note) =>
      note.title.toLowerCase().includes(needle) ||
      note.tags.some((tag) => tag.toLowerCase().includes(needle))
  );
}

/**
 * 本地命中的笔记在前，语义命中按顺序补在后面；同一个 slug 只出现一次。
 * `index` 是完整笔记索引，用来给语义命中补真实标签。
 */
export function mergeNoteHits(
  local: readonly SearchableNote[],
  semantic: readonly SemanticNoteHit[],
  index: readonly SearchableNote[]
): NoteHit[] {
  const tagsBySlug = new Map(index.map((note) => [note.slug, note.tags]));
  const seen = new Set<string>();
  const hits: NoteHit[] = [];

  for (const note of local) {
    if (seen.has(note.slug)) continue;
    seen.add(note.slug);
    hits.push({ slug: note.slug, title: note.title, tags: note.tags });
  }

  for (const item of semantic) {
    if (!item.post_slug || seen.has(item.post_slug)) continue;
    seen.add(item.post_slug);
    const detail = item.heading ?? item.snippet;
    hits.push({
      slug: item.post_slug,
      title: item.title,
      tags: tagsBySlug.get(item.post_slug) ?? [],
      ...(detail ? { detail } : {}),
    });
  }

  return hits;
}
