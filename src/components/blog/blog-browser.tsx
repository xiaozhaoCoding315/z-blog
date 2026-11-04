"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { PostCard } from "@/components/blog/post-card";
import { cn } from "@/lib/utils";

export interface PostListItem {
  slug: string;
  title: string;
  date: string;
  description: string;
  tags: string[];
  pinned: boolean;
  readingText: string;
}

export function BlogBrowser({
  posts,
  allTags,
}: {
  posts: PostListItem[];
  allTags: { tag: string; count: number }[];
}) {
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter((p) => {
      if (activeTag && !p.tags.includes(activeTag)) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [posts, query, activeTag]);

  return (
    <div>
      {/* 筛选：一行输入 + 一行标签，没有胶囊按钮和卡片容器 */}
      <div className="flex flex-col gap-3 border-b border-border pb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-0 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="按关键词过滤"
            className="w-full border-b border-border bg-transparent py-1.5 pl-5 pr-6 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
          />
          {query && (
            <button
              aria-label="清空"
              onClick={() => setQuery("")}
              className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px]">
          <button
            onClick={() => setActiveTag(null)}
            className={cn(
              "transition-colors",
              !activeTag
                ? "text-foreground underline underline-offset-4"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            全部
          </button>
          {allTags.map(({ tag, count }) => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={cn(
                "transition-colors",
                activeTag === tag
                  ? "text-primary underline underline-offset-4"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tag}
              <span className="ml-0.5 opacity-50">{count}</span>
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">没有匹配的文章</p>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground/70">
            换个关键词，或按 ⌘K 用语义搜索
          </p>
        </div>
      ) : (
        <ul>
          {filtered.map((post) => (
            <li key={post.slug}>
              <PostCard post={post} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
