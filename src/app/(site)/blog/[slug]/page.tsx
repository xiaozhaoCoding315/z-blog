import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarDays, Clock } from "lucide-react";
import { getAllPosts, getPostBySlug, getAdjacentPosts } from "@/content";
import { extractHeadings } from "@/lib/content-core";
import { RenderMDX } from "@/lib/mdx";
import { siteConfig } from "@/config/site";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ReadingProgress } from "@/components/blog/reading-progress";
import { TableOfContents } from "@/components/blog/toc";
import { ViewCounter } from "@/components/blog/view-counter";
import { SummaryFallback } from "@/components/blog/summary-fallback";
import { RelatedPosts } from "@/components/blog/related-posts";
import { Giscus } from "@/components/blog/giscus";

export function generateStaticParams() {
  return getAllPosts()
    .filter((p) => !p.meta.draft)
    .map((post) => ({ slug: post.slug }));
}

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
        p.slug !== slug &&
        p.meta.tags.some((t) => post.meta.tags.includes(t))
    )
    .slice(0, 3)
    .map((p) => ({ slug: p.slug, title: p.meta.title }));

  return (
    <>
      <ReadingProgress />
      <article className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        {/* 文章头部 */}
        <header className="mx-auto max-w-3xl">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="size-3.5" /> 返回列表
          </Link>
          <h1 className="mt-5 font-heading text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
            {post.meta.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4" />
              <time dateTime={post.meta.date}>{post.meta.date}</time>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4" />
              {post.readingText}
            </span>
            <ViewCounter slug={slug} />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {post.meta.tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="rounded-full font-normal"
              >
                {tag}
              </Badge>
            ))}
          </div>
          {!post.meta.description && <SummaryFallback slug={slug} />}
        </header>

        <Separator className="mx-auto my-10 max-w-3xl" />

        {/* 正文 + 目录 */}
        <div className="mx-auto grid max-w-4xl gap-10 xl:grid-cols-[minmax(0,1fr)_220px] xl:max-w-none xl:justify-center">
          <div className="mx-auto w-full max-w-3xl">
            <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
              <RenderMDX source={post.content} />
            </div>

            {/* 上一篇 / 下一篇 */}
            <nav className="mt-14 grid gap-3 sm:grid-cols-2">
              {prev ? (
                <Link
                  href={`/blog/${prev.slug}`}
                  className="card-hover glass group rounded-lg p-4"
                >
                  <span className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <ArrowLeft className="size-3" /> 上一篇
                  </span>
                  <p className="text-sm font-medium leading-snug group-hover:text-primary">
                    {prev.meta.title}
                  </p>
                </Link>
              ) : (
                <span />
              )}
              {next && (
                <Link
                  href={`/blog/${next.slug}`}
                  className="card-hover glass group rounded-lg p-4 sm:text-right"
                >
                  <span className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                    下一篇 <ArrowRight className="size-3" />
                  </span>
                  <p className="text-sm font-medium leading-snug group-hover:text-primary">
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

          <aside className="hidden xl:block">
            <div className="sticky top-24">
              <TableOfContents items={headings} />
            </div>
          </aside>
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
