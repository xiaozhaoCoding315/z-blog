/**
 * 代码片段——只放这个站里真正跑过的代码。
 *
 * 每条 `code` 都是从 `source` 指向的文件原样摘录（不做逻辑改写）；
 * 改源文件时记得同步这里。`snippetSummaries` 是给终端 / Spotlight 的
 * 轻量投影，不把完整代码带进这些客户端索引。
 */

export interface Snippet {
  id: string;
  title: string;
  language: string;
  description: string;
  code: string;
  /** 文件:行号 */
  source: string;
  tags: string[];
}

export const snippets: Snippet[] = [
  {
    id: "window-reducer",
    title: "窗口矩形收敛",
    language: "ts",
    description:
      "拖拽或缩放后把窗口矩形限制在桌面范围内：保留最小宽高，并至少留 80px 标题栏可抓。",
    code: String.raw`export function clampRect(
  rect: Rect,
  bounds: DesktopBounds,
  minWidth: number,
  minHeight: number
): Rect {
  const w = Math.min(Math.max(rect.w, minWidth), bounds.width);
  const h = Math.min(Math.max(rect.h, minHeight), bounds.height);
  const x = Math.min(Math.max(rect.x, 80 - w), bounds.width - 80);
  const y = Math.min(Math.max(rect.y, 0), bounds.height - 34);
  return { x, y, w, h };
}`,
    source: "src/components/desktop/window-state.ts:43",
    tags: ["desktop", "window", "geometry"],
  },
  {
    id: "commit-count",
    title: "提交按天聚合",
    language: "ts",
    description:
      "只数 PushEvent，一条推送按 payload.size 计；size 缺失或非法时按 1 计，不抹掉真实活动。",
    code: String.raw`export function countCommitsByDay(events: GithubEvent[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const event of events) {
    if (event.type !== "PushEvent") continue;
    const day = event.created_at.slice(0, 10);
    const size = event.payload?.size;
    const commits =
      typeof size === "number" && Number.isFinite(size) && size >= 1 ? size : 1;
    counts.set(day, (counts.get(day) ?? 0) + commits);
  }
  return counts;
}`,
    source: "src/lib/github-activity.ts:14",
    tags: ["github", "activity", "aggregate"],
  },
  {
    id: "moment-id",
    title: "动态 id 校验",
    language: "ts",
    description:
      "单条动态的 id 只认规范十进制：05、0x10、1e3 都是同一行的别名，必须拒绝。",
    code: String.raw`export function parseMomentId(raw: string): number | null {
  if (!/^[1-9]\d{0,15}$/.test(raw)) return null;
  const n = Number(raw);
  if (!Number.isSafeInteger(n) || String(n) !== raw) return null;
  return n;
}`,
    source: "src/lib/moment-core.ts:35",
    tags: ["life", "id", "validation"],
  },
  {
    id: "rate-limit",
    title: "滑动窗口限频",
    language: "ts",
    description:
      "单实例部署够用的内存限频：状态挂在 globalThis，避免打包后被拆成多份；过期桶定期清理。",
    code: String.raw`export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const times = (buckets.get(key)?.times ?? []).filter(
    (t) => now - t < windowMs
  );
  if (times.length >= limit) {
    buckets.set(key, { times, windowMs });
    return false;
  }
  times.push(now);
  buckets.set(key, { times, windowMs });
  return true;
}`,
    source: "src/lib/rate-limit.ts:36",
    tags: ["api", "rate-limit", "memory"],
  },
  {
    id: "semantic-search",
    title: "语义搜索去重",
    language: "sql",
    description:
      "pgvector 余弦相似度召回，每篇文章只保留最佳分块（DISTINCT ON），先取 8 条再由接口筛选。",
    code: `SELECT DISTINCT ON (c.post_slug)
  c.post_slug, p.title, c.heading,
  left(c.content, 120) AS snippet,
  1 - (c.embedding <=> \${vectorStr}::vector) AS similarity
FROM chunks c JOIN posts p ON p.slug = c.post_slug
ORDER BY c.post_slug, c.embedding <=> \${vectorStr}::vector
LIMIT 8`,
    source: "src/app/api/search/route.ts:39",
    tags: ["postgres", "pgvector", "search"],
  },
  {
    id: "tag-parse",
    title: "标签输入解析",
    language: "ts",
    description:
      "按空白或中英文逗号切分标签，去掉 # 前缀、去重，并守住单个长度与总数上限。",
    code: `export function parseTagInput(
  input: string
): { ok: true; tags: string[] } | { ok: false; error: string } {
  const tags: string[] = [];
  for (const part of input.split(/[\\s,，]+/)) {
    const tag = normalize(part);
    if (!tag) continue;
    if (graphemes(tag).length > MAX_TAG_LENGTH) {
      return { ok: false, error: \`单个标签最多 \${MAX_TAG_LENGTH} 个字符\` };
    }
    if (!tags.includes(tag)) tags.push(tag);
  }
  if (tags.length > MAX_TAGS) {
    return { ok: false, error: \`最多 \${MAX_TAGS} 个标签\` };
  }
  return { ok: true, tags };
}`,
    source: "src/lib/tags.ts:29",
    tags: ["life", "tags", "input"],
  },
];

/** 终端 / Spotlight / 列表页用的轻量投影：不含完整代码。 */
export interface SnippetSummary {
  id: string;
  title: string;
  language: string;
  description: string;
  source: string;
  tags: string[];
}

export const snippetSummaries: SnippetSummary[] = snippets.map((snippet) => ({
  id: snippet.id,
  title: snippet.title,
  language: snippet.language,
  description: snippet.description,
  source: snippet.source,
  tags: snippet.tags,
}));
