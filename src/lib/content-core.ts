/**
 * 内容层核心：读取与解析 content/posts 下的 MDX 文章。
 * 纯 Node 模块，RSC 与同步脚本（scripts/sync.ts）共用。
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import matter from "gray-matter";
import { z } from "zod";

export const POSTS_DIR = path.join(process.cwd(), "content", "posts");

/** 兼容加引号的字符串日期与 YAML 原生 Date 两种写法 */
const dateSchema = z
  .union([z.string(), z.date()])
  .transform((v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v))
  .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v), {
    message: "日期格式应为 YYYY-MM-DD",
  });

export const postMetaSchema = z.object({
  title: z.string().min(1),
  date: dateSchema,
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
  pinned: z.boolean().default(false),
  draft: z.boolean().default(false),
});

export type PostMeta = z.infer<typeof postMetaSchema>;

export interface Post {
  slug: string;
  meta: PostMeta;
  content: string;
  /** 原始 markdown 字符数（用于同步时的内容哈希） */
  readingMinutes: number;
  readingText: string;
  /** 内容哈希：同步脚本用它跳过未变更的文章 */
  hash: string;
}

/**
 * 中英混排阅读时长估算：
 * 中文按每分钟 300 字、英文按每分钟 200 词计算。
 */
function estimateReading(raw: string) {
  const plain = raw
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*`\-|]/g, " ");
  const cjk = (plain.match(/[\u4e00-\u9fff\u3040-\u30ff]/g) ?? []).length;
  const words = plain
    .replace(/[\u4e00-\u9fff\u3040-\u30ff]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  const minutes = Math.max(1, Math.round(cjk / 300 + words / 200));
  return { minutes, text: `${minutes} min read` };
}

export function contentHash(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function parseFile(filepath: string): Post | null {
  const slug = path.basename(filepath, ".mdx");
  const raw = fs.readFileSync(filepath, "utf-8");
  const { data, content } = matter(raw);
  const parsed = postMetaSchema.safeParse(data);
  if (!parsed.success) {
    console.warn(
      `[content] 文章 ${slug} 的 frontmatter 不合法，已跳过：`,
      parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
    );
    return null;
  }
  const { minutes, text } = estimateReading(content);
  return {
    slug,
    meta: parsed.data,
    content,
    readingMinutes: minutes,
    readingText: text,
    hash: contentHash(raw),
  };
}

/** 列出所有文章（含草稿），按日期倒序 */
export function listRawPosts(): Post[] {
  if (!fs.existsSync(POSTS_DIR)) return [];
  return fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => parseFile(path.join(POSTS_DIR, f)))
    .filter((p): p is Post => p !== null)
    .sort(
      (a, b) =>
        new Date(b.meta.date).getTime() - new Date(a.meta.date).getTime()
    );
}

export function getRawPost(slug: string): Post | null {
  const filepath = path.join(POSTS_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filepath)) return null;
  return parseFile(filepath);
}

export function getAllTags(posts: Post[]): { tag: string; count: number }[] {
  const map = new Map<string, number>();
  for (const p of posts) {
    for (const t of p.meta.tags) map.set(t, (map.get(t) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

/** 从 markdown 提取二级/三级标题，用于文章目录 TOC */
export function extractHeadings(markdown: string): {
  level: 2 | 3;
  text: string;
  id: string;
}[] {
  const headings: { level: 2 | 3; text: string; id: string }[] = [];
  const lines = markdown.split("\n");
  let inCode = false;
  for (const line of lines) {
    if (line.trimStart().startsWith("```")) inCode = !inCode;
    if (inCode) continue;
    const m = /^(#{2,3})\s+(.+)$/.exec(line.trim());
    if (m) {
      const text = m[2]
        .replace(/`([^`]*)`/g, "$1")
        .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
        .trim();
      // 与 rehype-slug 相同的 GitHub slugify 规则
      const id = text
        .toLowerCase()
        .trim()
        .replace(/[^\p{L}\p{N}\s-]/gu, "")
        .replace(/\s+/g, "-");
      headings.push({ level: m[1].length as 2 | 3, text, id });
    }
  }
  return headings;
}
