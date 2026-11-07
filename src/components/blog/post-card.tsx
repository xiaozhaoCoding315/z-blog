import Link from "next/link";
import { Pin } from "lucide-react";
import type { Post } from "@/lib/content-core";
import { cn } from "@/lib/utils";

export interface PostCardData {
  slug: string;
  title: string;
  date: string;
  description: string;
  tags: string[];
  pinned: boolean;
  readingText: string;
}

export function toCardData(post: Post): PostCardData {
  return {
    slug: post.slug,
    title: post.meta.title,
    date: post.meta.date,
    description: post.meta.description ?? excerptOf(post.content),
    tags: post.meta.tags,
    pinned: post.meta.pinned,
    readingText: post.readingText,
  };
}

export function excerptOf(content: string, max = 110) {
  const plain = content
    .replace(/^---[\s\S]*?---\s*/, "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#>*`|~[\]()!-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > max ? `${plain.slice(0, max)}…` : plain;
}

/**
 * 文章条目：一条细线一行，日期在左、标题在右。
 * 不用卡片——列表页要的是能快速扫读的目录，不是一墙盒子。
 *
 * 整行可点用的是「拉伸链接」：标题的锚点铺满整行（after:inset-0），
 * 标签再以 z-10 抬到上层。这样行内可以有多个真正的 <a>，
 * 而不是在 <a> 里塞假的 role="link"。
 */
export function PostCard({
  post,
  variant = "default",
}: {
  post: PostCardData;
  variant?: "default" | "featured";
}) {
  return (
    <div
      className={cn(
        "group relative grid grid-cols-[4.5rem_minmax(0,1fr)] items-baseline gap-x-4 border-b border-border/60 py-4",
        variant === "featured" && "py-5"
      )}
    >
      <time
        dateTime={post.date}
        className="font-mono text-[11px] tabular-nums text-muted-foreground"
      >
        {post.date.slice(5).replace("-", ".")}
      </time>

      <div className="min-w-0">
        <h3
          className={cn(
            "font-heading font-semibold leading-snug tracking-[-0.01em]",
            variant === "featured" ? "text-xl" : "text-[17px]"
          )}
        >
          <Link
            href={`/blog/${post.slug}`}
            className="transition-colors after:absolute after:inset-0 after:content-[''] group-hover:text-primary"
          >
            {post.title}
          </Link>
        </h3>

        {post.description && (
          <p
            className={cn(
              "mt-1 text-[13px] leading-6 text-muted-foreground",
              variant === "featured" ? "line-clamp-2" : "line-clamp-1"
            )}
          >
            {post.description}
          </p>
        )}

        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 font-mono text-[11px] text-muted-foreground">
          <span>{post.readingText}</span>
          {/* 标签可点击：列表里的标签是横切的入口，不只是装饰 */}
          {post.tags.slice(0, 3).map((tag) => (
            <Link
              key={tag}
              href={`/blog/tag/${encodeURIComponent(tag)}`}
              className="relative z-10 transition-colors hover:text-primary hover:underline hover:underline-offset-4"
            >
              {tag}
            </Link>
          ))}
          {post.pinned && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Pin className="size-3" /> 置顶
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
