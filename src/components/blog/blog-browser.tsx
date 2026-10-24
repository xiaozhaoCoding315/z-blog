"use client";

import { useMemo, useState } from "react";
import { Search, Tags, X } from "lucide-react";
import { PostCard } from "@/components/blog/post-card";
import { Input } from "@/components/ui/input";
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
      <div className="mb-6 flex flex-col gap-3">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="按关键词过滤…（语义搜索请按 ⌘K）"
            className="rounded-full bg-card/60 pl-9"
          />
          {query && (
            <button
              aria-label="清空"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Tags className="mr-1 size-4 text-muted-foreground" />
          <button
            onClick={() => setActiveTag(null)}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
              !activeTag
                ? "border-primary/60 bg-primary/10 text-primary"
                : "border-border/70 text-muted-foreground hover:text-foreground"
            )}
          >
            全部
          </button>
          {allTags.map(({ tag, count }) => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                activeTag === tag
                  ? "border-primary/60 bg-primary/10 text-primary"
                  : "border-border/70 text-muted-foreground hover:text-foreground"
              )}
            >
              {tag}
              <span className="ml-1 opacity-60">{count}</span>
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="glass flex flex-col items-center gap-2 rounded-xl py-16 text-center text-muted-foreground">
          <Search className="size-8 opacity-40" />
          <p className="text-sm">没有匹配的文章</p>
          <p className="text-xs opacity-70">
            试试 ⌘K 语义搜索——它能理解「意思相近」的查询
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((post, i) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
