"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Search, Sparkles } from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export interface SearchablePost {
  slug: string;
  title: string;
  tags: string[];
}

interface SemanticItem {
  post_slug: string;
  title: string;
  heading: string | null;
  snippet: string;
  similarity: number;
}

export function SearchPalette({ posts }: { posts: SearchablePost[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [semantic, setSemantic] = useState<SemanticItem[]>([]);
  const [searching, setSearching] = useState(false);
  const router = useRouter();

  // ⌘K / Ctrl+K 唤起，Esc 关闭由 Dialog 自带
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    function onOpenEvent() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("blog:open-search", onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("blog:open-search", onOpenEvent);
    };
  }, []);

  // 输入防抖后请求语义搜索；过短查询在回调里重置状态
  useEffect(() => {
    const q = query.trim();
    const delay = q.length >= 2 ? 350 : 0;
    const timer = setTimeout(() => {
      if (q.length < 2) {
        setSemantic([]);
        setSearching(false);
        return;
      }
      setSearching(true);
      fetch(`/api/search?q=${encodeURIComponent(q)}`)
        .then((r) => (r.ok ? r.json() : { items: [] }))
        .then((d) => setSemantic(Array.isArray(d.items) ? d.items : []))
        .catch(() => setSemantic([]))
        .finally(() => setSearching(false));
    }, delay);
    return () => clearTimeout(timer);
  }, [query]);

  // 本地关键词匹配（标题/标签）
  const localMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return posts.slice(0, 6);
    return posts
      .filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      )
      .slice(0, 6);
  }, [posts, query]);

  const navigate = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery("");
      router.push(href);
    },
    [router]
  );

  return (
    <CommandDialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setQuery("");
      }}
      className="sm:max-w-xl"
    >
      <Command shouldFilter={false}>
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="搜索文章：关键词或自然语言（语义搜索）…"
        />
        <CommandList>
        <CommandEmpty>
          {searching ? "语义搜索中…" : "没有找到相关内容"}
        </CommandEmpty>

        {semantic.length > 0 && (
          <CommandGroup heading="语义搜索（向量检索）">
            {semantic.map((item) => (
              <CommandItem
                key={`s-${item.post_slug}`}
                value={`semantic-${item.post_slug}`}
                onSelect={() => navigate(`/blog/${item.post_slug}`)}
              >
                <Sparkles className="size-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.heading ? `${item.heading} · ` : ""}
                    {item.snippet}
                  </p>
                </div>
                <span className="ml-2 shrink-0 font-mono text-[10px] text-muted-foreground">
                  {(item.similarity * 100).toFixed(0)}%
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandGroup heading="文章">
          {localMatches.map((post) => (
            <CommandItem
              key={post.slug}
              value={`local-${post.slug}`}
              onSelect={() => navigate(`/blog/${post.slug}`)}
            >
              <FileText className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{post.title}</p>
                {post.tags.length > 0 && (
                  <p className="truncate text-xs text-muted-foreground">
                    {post.tags.join(" · ")}
                  </p>
                )}
              </div>
            </CommandItem>
          ))}
        </CommandGroup>

        {query.trim().length >= 2 && !searching && semantic.length === 0 && (
          <p className="flex items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground">
            <Search className="size-3" />
            语义搜索无结果——AI 可能未启用，或文章尚未同步
          </p>
        )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
