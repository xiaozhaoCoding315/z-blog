import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts } from "@/content";
import { siteConfig } from "@/config/site";
import { getUptimeSnapshot } from "@/lib/uptime-server";

export const metadata: Metadata = {
  title: "归档",
  description: "全部文章的时间线视图，按年份归档。",
};

export default async function ArchivesPage() {
  const posts = getAllPosts();
  const uptime = await getUptimeSnapshot();

  // 按年份分组（保持置顶优先的传入顺序按日期排）
  const byYear = new Map<number, typeof posts>();
  for (const post of posts) {
    const year = new Date(`${post.meta.date}T00:00:00+08:00`).getFullYear();
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year)?.push(post);
  }
  const years = [...byYear.keys()].sort((a, b) => b - a);
  const total = posts.length;
  const totalWords = posts.reduce(
    (sum, p) => sum + p.content.replace(/\s+/g, "").length,
    0
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <header className="mb-10">
        <h1 className="font-heading text-3xl font-bold tracking-[-0.02em]">
          归档
        </h1>
        <p className="mt-2 font-mono text-[11px] text-muted-foreground">
          {total} 篇 · 约 {(totalWords / 10000).toFixed(1)} 万字 · 始于{" "}
          {siteConfig.startedAt} · {uptime.daysText} 天
        </p>
      </header>

      <div className="space-y-10">
        {years.map((year) => (
          <section key={year}>
            <div className="mb-2 flex items-baseline gap-3 border-b border-border pb-2">
              <h2 className="font-heading text-lg font-bold tracking-tight tabular-nums">
                {year}
              </h2>
              <span className="font-mono text-[11px] text-muted-foreground">
                {byYear.get(year)?.length} 篇
              </span>
            </div>

            <ul>
              {byYear.get(year)?.map((post) => (
                <li key={post.slug}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="group grid grid-cols-[4rem_minmax(0,1fr)_auto] items-baseline gap-x-4 border-b border-border/60 py-3"
                  >
                    <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                      {post.meta.date.slice(5).replace("-", ".")}
                    </span>
                    <span className="min-w-0 truncate text-[15px] transition-colors group-hover:text-primary">
                      {post.meta.title}
                      {post.meta.pinned && (
                        <span className="ml-2 font-mono text-[10px] text-vermilion">
                          置顶
                        </span>
                      )}
                    </span>
                    <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">
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
