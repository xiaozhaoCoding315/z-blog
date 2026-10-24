import Link from "next/link";
import { Pin } from "lucide-react";
import type { Post } from "@/lib/content-core";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ViewBadge } from "@/components/blog/view-badge";

/** 卡片所需的轻量数据（可序列化，可跨服务端/客户端边界） */
export interface PostCardData {
  slug: string;
  title: string;
  date: string;
  description: string;
  tags: string[];
  pinned: boolean;
  readingText: string;
}

/** 服务端：把完整 Post 映射为卡片数据 */
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

export function PostCard({
  post,
  variant = "default",
}: {
  post: PostCardData;
  variant?: "default" | "featured";
}) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className={cn(
        "card-hover group glass relative flex flex-col rounded-xl p-5 sm:p-6",
        variant === "featured" && "sm:p-7"
      )}
    >
      <div className="mb-3 flex items-center gap-3 text-xs text-muted-foreground">
        <time className="font-mono" dateTime={post.date}>
          {post.date}
        </time>
        <span aria-hidden>·</span>
        <span>{post.readingText}</span>
        {post.pinned && (
          <span className="inline-flex items-center gap-1 text-primary">
            <Pin className="size-3" /> 置顶
          </span>
        )}
        <span className="ml-auto">
          <ViewBadge slug={post.slug} />
        </span>
      </div>

      <h3
        className={cn(
          "font-heading font-bold leading-snug tracking-tight transition-colors group-hover:text-primary",
          variant === "featured" ? "text-xl sm:text-2xl" : "text-lg"
        )}
      >
        {post.title}
      </h3>

      <p
        className={cn(
          "mt-2.5 flex-1 text-sm leading-relaxed text-muted-foreground",
          variant === "featured" ? "line-clamp-3" : "line-clamp-2"
        )}
      >
        {post.description}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {post.tags.slice(0, variant === "featured" ? 4 : 3).map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="rounded-full px-2.5 py-0 text-[11px] font-normal text-muted-foreground"
          >
            {tag}
          </Badge>
        ))}
      </div>
    </Link>
  );
}
