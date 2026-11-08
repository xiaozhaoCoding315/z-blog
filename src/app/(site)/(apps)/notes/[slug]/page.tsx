import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getAllNotes, getNoteBySlug, getAdjacentNotes } from "@/content";
import { extractHeadings } from "@/lib/content-core";
import { RenderMDX } from "@/lib/mdx";
import { siteConfig } from "@/config/site";
import { getVisibleComments } from "@/lib/comments-server";
import { getSessionUser } from "@/lib/session";
import { loginReady } from "@/lib/login-status";
import { Separator } from "@/components/ui/separator";
import { ReadingProgress } from "@/components/blog/reading-progress";
import { TableOfContents } from "@/components/blog/toc";
import { ViewCounter } from "@/components/blog/view-counter";
import { LikeButton } from "@/components/blog/like-button";
import { SummaryFallback } from "@/components/blog/summary-fallback";
import { RelatedPosts } from "@/components/blog/related-posts";
import { ArticleTools } from "@/components/blog/article-tools";
import { CommentList } from "@/components/life/comment-list";
import { CommentForm } from "@/components/life/comment-form";

export function generateStaticParams() {
  return getAllNotes()
    .filter((note) => !note.meta.draft)
    .map((note) => ({ slug: note.slug }));
}

// 笔记正文与评论都依赖 params 生成，禁用 instant shell 以换取完整首屏
export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const note = getNoteBySlug(slug);
  // 草稿也在磁盘上：没发布的内容不能把标题写进 <head> 或搜索引擎
  if (!note || note.meta.draft) {
    return { robots: { index: false, follow: false } };
  }
  return {
    title: note.meta.title,
    description: note.meta.description,
    keywords: note.meta.tags,
    openGraph: {
      type: "article",
      title: note.meta.title,
      description: note.meta.description,
      publishedTime: note.meta.date,
      tags: note.meta.tags,
    },
  };
}

export default async function NotePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  // connection() 必须在任何 cookies 读取或时间计算之前
  await connection();
  const { slug } = await params;
  const note = getNoteBySlug(slug);
  if (!note || note.meta.draft) notFound();

  const [comments, user] = await Promise.all([
    getVisibleComments("note", slug),
    getSessionUser(),
  ]);
  const ready = loginReady();

  const headings = extractHeadings(note.content);
  const { prev, next } = getAdjacentNotes(slug);
  const relatedFallback = getAllNotes()
    .filter(
      (n) =>
        n.slug !== slug && n.meta.tags.some((t) => note.meta.tags.includes(t)),
    )
    .slice(0, 3)
    .map((n) => ({ slug: n.slug, title: n.meta.title }));

  // 中文字数：正文去掉代码块后的字符数，比「字数」更能反映阅读量
  const charCount = note.content.replace(/\s+/g, "").length;

  return (
    <>
      <ReadingProgress />
      <ArticleTools />
      <article className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {/* 页边目录 + 正文：标题与正文同栏，目录挂在左侧页边 */}
        <div className="mx-auto grid max-w-5xl gap-10 xl:grid-cols-[180px_minmax(0,1fr)] xl:gap-12">
          <aside className="hidden xl:block">
            <div className="sticky top-10">
              <TableOfContents items={headings} />
            </div>
          </aside>

          <div className="mx-auto w-full max-w-3xl">
            {/* 笔记头部 */}
            <header>
              <Link
                href="/notes"
                className="font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              >
                ← 笔记
              </Link>
              <h1 className="mt-4 font-heading text-2xl font-bold leading-tight tracking-[-0.02em] text-balance sm:text-3xl">
                {note.meta.title}
              </h1>

              {/* 元信息栏：一行等宽小字，不画盒子 */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border pb-3 font-mono text-[11px] text-muted-foreground">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <time dateTime={note.meta.date}>
                    {note.meta.date.replace(/-/g, ".")}
                  </time>
                  <span aria-hidden>·</span>
                  <span>{note.readingText}</span>
                  <span aria-hidden>·</span>
                  <span className="tabular-nums">
                    {charCount.toLocaleString()} 字
                  </span>
                  <span aria-hidden>·</span>
                  <ViewCounter slug={slug} />
                  {note.meta.tags.map((tag) => (
                    <span key={tag} className="text-foreground/60">
                      {tag}
                    </span>
                  ))}
                </div>
                <LikeButton slug={slug} />
              </div>

              {note.meta.cover && (
                <figure className="mt-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={note.meta.cover}
                    alt=""
                    className="w-full rounded-sm border border-border object-cover"
                  />
                </figure>
              )}

              {!note.meta.description && <SummaryFallback slug={slug} />}
            </header>

            <div className="my-8">
              <Separator />
            </div>

            <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
              <RenderMDX source={note.content} />
            </div>

            {/* 上一篇 / 下一篇 */}
            <nav className="mt-14 grid gap-x-6 border-t border-border pt-4 sm:grid-cols-2">
              {prev ? (
                <Link href={`/notes/${prev.slug}`} className="group py-2">
                  <span className="font-mono text-[11px] text-muted-foreground">
                    ← 上一篇
                  </span>
                  <p className="mt-1 font-heading text-sm font-semibold leading-snug transition-colors group-hover:text-primary">
                    {prev.meta.title}
                  </p>
                </Link>
              ) : (
                <span />
              )}
              {next && (
                <Link
                  href={`/notes/${next.slug}`}
                  className="group py-2 sm:text-right"
                >
                  <span className="font-mono text-[11px] text-muted-foreground">
                    下一篇 →
                  </span>
                  <p className="mt-1 font-heading text-sm font-semibold leading-snug transition-colors group-hover:text-primary">
                    {next.meta.title}
                  </p>
                </Link>
              )}
            </nav>

            <RelatedPosts slug={slug} fallback={relatedFallback} />

            {/* 评论：复用阶段 3 的站内评论系统，目标类型为 note */}
            <section className="mt-14 border-t border-border pt-8">
              <h2 className="font-heading text-lg font-bold tracking-tight">
                评论
              </h2>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {comments.available
                  ? `${comments.comments.length} 条`
                  : "Not Available"}
              </p>
              <div className="mt-4">
                <CommentList
                  comments={comments.comments}
                  available={comments.available}
                />
              </div>
              <div className="mt-8">
                {user ? (
                  <CommentForm targetType="note" targetId={slug} />
                ) : ready ? (
                  <p className="text-[14px] leading-relaxed text-muted-foreground">
                    登录后可以评论。
                    <Link
                      href="/login"
                      className="ml-1 border border-data px-2 py-0.5 font-mono text-[11px] text-data transition-colors hover:text-foreground"
                    >
                      去登录
                    </Link>
                  </p>
                ) : (
                  <p className="text-[14px] leading-relaxed text-muted-foreground">
                    登录暂未开放（服务器还没配好发信），浏览不受影响。
                  </p>
                )}
              </div>
            </section>
          </div>
        </div>
      </article>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: note.meta.title,
            datePublished: note.meta.date,
            author: { "@type": "Person", name: siteConfig.author.name },
            keywords: note.meta.tags.join(", "),
          }),
        }}
      />
    </>
  );
}
