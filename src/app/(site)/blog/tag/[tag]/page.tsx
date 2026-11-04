import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPosts, getTags } from "@/content";
import { PostCard, toCardData } from "@/components/blog/post-card";

// 标签页由 params 决定内容，和文章页一样禁用 instant shell 换取完整首屏
export const instant = false;

export function generateStaticParams() {
  return getTags().map(({ tag }) => ({ tag }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}): Promise<Metadata> {
  const { tag } = await params;
  const decoded = decodeTag(tag);
  const count = postsWithTag(decoded).length;
  if (count === 0) return {};
  return {
    title: `标签：${decoded}`,
    description: `带「${decoded}」标签的 ${count} 篇文章。`,
  };
}

/** 路径里的中文标签是百分号编码的，取出来要还原 */
function decodeTag(raw: string) {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function postsWithTag(tag: string) {
  return getAllPosts().filter((post) => post.meta.tags.includes(tag));
}

export default async function TagPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;
  const decoded = decodeTag(tag);
  const posts = postsWithTag(decoded);
  if (posts.length === 0) notFound();

  const allTags = getTags();

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <header className="mb-8">
        <Link
          href="/blog"
          className="font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          ← 全部文章
        </Link>
        <h1 className="mt-3 font-heading text-3xl font-bold tracking-[-0.02em]">
          {decoded}
        </h1>
        <p className="mt-2 font-mono text-[11px] text-muted-foreground">
          {posts.length} 篇 · 标签
        </p>
      </header>

      <ul>
        {posts.map((post) => (
          <li key={post.slug}>
            <PostCard post={toCardData(post)} />
          </li>
        ))}
      </ul>

      {/* 横切入口：从这里能跳到别的标签，不至于走进死胡同 */}
      <nav className="mt-12 border-t border-border pt-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
          其他标签
        </p>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px]">
          {allTags
            .filter(({ tag: t }) => t !== decoded)
            .map(({ tag: t, count }) => (
              <Link
                key={t}
                href={`/blog/tag/${encodeURIComponent(t)}`}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {t}
                <span className="ml-0.5 opacity-50">{count}</span>
              </Link>
            ))}
        </div>
      </nav>
    </div>
  );
}
