import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Clock3 } from "lucide-react";
import { getAllPosts } from "@/content";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "归档",
  description: "全部文章的时间线视图，按年份归档。",
};

export default function ArchivesPage() {
  const posts = getAllPosts();

  // 按年份分组（保持置顶优先的传入顺序按日期排）
  const byYear = new Map<number, typeof posts>();
  for (const post of posts) {
    const year = new Date(`${post.meta.date}T00:00:00+08:00`).getFullYear();
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year)?.push(post);
  }
  const years = [...byYear.keys()].sort((a, b) => b - a);
  const total = posts.length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <header className="mb-12">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
          归档
        </h1>
        <p className="mt-2 text-muted-foreground">
          共 {total} 篇文章 · 始于 {siteConfig.startedAt.slice(0, 4)} 年
        </p>
      </header>

      <div className="relative space-y-14">
        {/* 时间线竖线 */}
        <div
          aria-hidden
          className="absolute bottom-2 left-[3.25rem] top-2 w-px bg-gradient-to-b from-primary/50 via-border to-transparent"
        />

        {years.map((year) => (
          <section key={year}>
            <div className="mb-5 flex items-center gap-4">
              <span className="glass rounded-xl px-3 py-1.5 font-heading text-xl font-extrabold tracking-tight">
                {year}
              </span>
              <span className="text-xs text-muted-foreground">
                {byYear.get(year)?.length} 篇
              </span>
              <span className="h-px flex-1 bg-border/70" />
            </div>

            <ul className="space-y-1">
              {byYear.get(year)?.map((post) => (
                <li key={post.slug}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="group relative flex items-center gap-4 rounded-lg px-3 py-2.5 transition-colors hover:bg-accent/50"
                  >
                    {/* 时间线节点 */}
                    <span className="relative z-10 size-2 shrink-0 rounded-full border-2 border-primary/60 bg-background transition-colors group-hover:bg-primary" />
                    <span className="hidden w-20 shrink-0 items-center gap-1 font-mono text-xs text-muted-foreground sm:inline-flex">
                      <CalendarDays className="size-3" />
                      {post.meta.date.slice(5).replace("-", "/")}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium transition-colors group-hover:text-primary">
                      {post.meta.title}
                      {post.meta.pinned && (
                        <span className="ml-2 rounded border border-primary/40 px-1 py-px text-[10px] font-normal text-primary">
                          置顶
                        </span>
                      )}
                    </span>
                    <span className="hidden shrink-0 items-center gap-1 text-xs text-muted-foreground sm:inline-flex">
                      <Clock3 className="size-3" />
                      {post.readingText}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
