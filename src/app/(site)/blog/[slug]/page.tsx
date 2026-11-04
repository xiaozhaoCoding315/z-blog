import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPosts, getPostBySlug, getAdjacentPosts } from "@/content";
import { extractHeadings } from "@/lib/content-core";
import { RenderMDX } from "@/lib/mdx";
import { siteConfig } from "@/config/site";
import { Separator } from "@/components/ui/separator";
import { ReadingProgress } from "@/components/blog/reading-progress";
import { TableOfContents } from "@/components/blog/toc";
import { ViewCounter } from "@/components/blog/view-counter";
import { LikeButton } from "@/components/blog/like-button";
import { SummaryFallback } from "@/components/blog/summary-fallback";
import { RelatedPosts } from "@/components/blog/related-posts";
import { Giscus } from "@/components/blog/giscus";
import { ArticleTools } from "@/components/blog/article-tools";

export function generateStaticParams() {
  return getAllPosts()
    .filter((p) => !p.meta.draft)
    .map((post) => ({ slug: post.slug }));
}

// 文章内容依赖 params 生成，禁用 instant shell 以换取完整首屏
export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  return {
    title: post.meta.title,
    description: post.meta.description,
    keywords: post.meta.tags,
    openGraph: {
      type: "article",
      title: post.meta.title,
      description: post.meta.description,
      publishedTime: post.meta.date,
      tags: post.meta.tags,
    },
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post || post.meta.draft) notFound();

  const headings = extractHeadings(post.content);
  const { prev, next } = getAdjacentPosts(slug);
  const relatedFallback = getAllPosts()
    .filter(
      (p) =>
        p.slug !== slug && p.meta.tags.some((t) => post.meta.tags.includes(t)),
    )
    .slice(0, 3)
    .map((p) => ({ slug: p.slug, title: p.meta.title }));

  // 中文字数：正文去掉代码块后的字符数，比「字数」更能反映阅读量
  const charCount = post.content.replace(/\s+/g, "").length;

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
            {/* 文章头部 */}
            <header>
              <Link
                href="/blog"
                className="font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              >
                ← 文章
              </Link>
              <h1 className="mt-4 font-heading text-2xl font-bold leading-tight tracking-[-0.02em] text-balance sm:text-3xl">
                {post.meta.title}
              </h1>

              {/* 元信息栏：一行等宽小字，不画盒子 */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border pb-3 font-mono text-[11px] text-muted-foreground">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <time dateTime={post.meta.date}>
                    {post.meta.date.replace(/-/g, ".")}
                  </time>
                  <span aria-hidden>·</span>
                  <span>{post.readingText}</span>
                  <span aria-hidden>·</span>
                  <span className="tabular-nums">
                    {charCount.toLocaleString()} 字
                  </span>
                  <span aria-hidden>·</span>
                  <ViewCounter slug={slug} />
                  {post.meta.tags.map((tag) => (
                    <Link
                      key={tag}
                      href={`/blog/tag/${encodeURIComponent(tag)}`}
                      className="text-foreground/60 transition-colors hover:text-primary hover:underline hover:underline-offset-4"
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
                <LikeButton slug={slug} />
              </div>

              {post.meta.cover && (
                <figure className="mt-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.meta.cover}
                    alt=""
                    className="w-full rounded-sm border border-border object-cover"
                  />
                </figure>
              )}

              {!post.meta.description && <SummaryFallback slug={slug} />}
            </header>

            <div className="my-8">
              <Separator />
            </div>

            <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
              <RenderMDX source={post.content} />
            </div>

            {/* 上一篇 / 下一篇 */}
            <nav className="mt-14 grid gap-x-6 border-t border-border pt-4 sm:grid-cols-2">
              {prev ? (
                <Link href={`/blog/${prev.slug}`} className="group py-2">
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
                  href={`/blog/${next.slug}`}
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

            {/* 评论 */}
            <section className="mt-14">
              <h2 className="mb-5 font-heading text-lg font-bold tracking-tight">
                评论
              </h2>
              <Giscus />
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
            headline: post.meta.title,
            datePublished: post.meta.date,
            author: { "@type": "Person", name: siteConfig.author.name },
            keywords: post.meta.tags.join(", "),
          }),
        }}
      />
    </>
  );
}
