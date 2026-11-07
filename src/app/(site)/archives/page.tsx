import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts } from "@/content";
import { siteConfig } from "@/config/site";
import { getUptimeSnapshot } from "@/lib/uptime-server";

export const metadata: Metadata = {
  title: "归档",
  description: "全部文章的时间线视图：先看写作节奏，再按月翻。",
};

/** 月份键：YYYY-MM，用于分组与锚点 */
function monthKey(date: string) {
  return date.slice(0, 7);
}

/** 「07」这种两位数月份标签，窄屏下 12 列也放得下 */
function monthLabel(month: number) {
  return String(month).padStart(2, "0");
}

export default async function ArchivesPage() {
  const posts = getAllPosts();
  const uptime = await getUptimeSnapshot();

  // 年份 → 12 个月的篇数。空月份保留为 0：空白本身也是信息，
  // 「哪几个月没写东西」和「写了多少」一样值得看。
  const byYear = new Map<number, number[]>();
  for (const post of posts) {
    const year = new Date(`${post.meta.date}T00:00:00+08:00`).getFullYear();
    const month = Number(post.meta.date.slice(5, 7)) - 1;
    if (!byYear.has(year)) byYear.set(year, Array(12).fill(0) as number[]);
    const counts = byYear.get(year) as number[];
    counts[month] += 1;
  }
  const years = [...byYear.keys()].sort((a, b) => b - a);
  const peak = Math.max(1, ...years.flatMap((y) => byYear.get(y) as number[]));

  // 文章按月份分组（保持置顶优先的传入顺序）
  const byMonth = new Map<string, typeof posts>();
  for (const post of posts) {
    const key = monthKey(post.meta.date);
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key)?.push(post);
  }
  const months = [...byMonth.keys()].sort((a, b) => b.localeCompare(a));

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

      {/* 写作节奏：每月一根细条，高度即当月篇数。
          点条跳到该月文章，所以它不只是图表，也是导航。 */}
      <section aria-labelledby="rhythm" className="mb-12">
        <div className="flex items-baseline justify-between border-b border-border pb-2">
          <h2
            id="rhythm"
            className="font-heading text-lg font-bold tracking-tight"
          >
            写作节奏
          </h2>
          <span className="font-mono text-[11px] text-muted-foreground">
            最高 {peak} 篇 / 月
          </span>
        </div>

        <div className="mt-5 space-y-4">
          {years.map((year) => {
            const counts = byYear.get(year) as number[];
            // 今年只画到当前月份：往后的月份属于「还没到」，不是「没写」。
            // 画出来的空白月份才是真实发生的空白——九月没写，就该看见九月是空的。
            const isCurrentYear = String(year) === uptime.year;
            const visible = isCurrentYear ? uptime.month : 12;
            // 建站那年从建站月份开始画：它之前的月份还没有这个站，
            // 用 1px 细线画出来会被误读成「那个月没写」。
            const startMonth = isCurrentYear ? uptime.startMonth : 1;
            return (
              <div key={year}>
                {/* 始终 12 列：月份刻度在年份之间对得齐，空着的月份留白而不是拉宽 */}
                <div className="grid grid-cols-12 items-end gap-1 sm:gap-2">
                  {counts.slice(startMonth - 1, visible).map((count, index) => {
                    const month = startMonth + index;
                    const key = `${year}-${monthLabel(month)}`;
                    const hasPosts = count > 0;
                    // 高度按峰值归一：零篇留一条 1px 细线，有文章的月份最低 8px
                    const height = hasPosts
                      ? Math.max(8, Math.round((count / peak) * 56))
                      : 1;
                    const bar = (
                      <span
                        className={
                          hasPosts
                            ? "block w-full rounded-t-[1px] bg-primary transition-colors group-hover:bg-primary/80"
                            : "block w-full bg-border"
                        }
                        style={{ height }}
                      />
                    );
                    // 同页锚点用原生 <a>：Link 会把 hash 当路由处理，点了不跳
                    return hasPosts ? (
                      <a
                        key={key}
                        href={`#month-${key}`}
                        title={`${year} 年 ${month} 月 · ${count} 篇`}
                        className="group flex flex-col justify-end"
                      >
                        {bar}
                      </a>
                    ) : (
                      <span key={key} className="flex flex-col justify-end">
                        {bar}
                      </span>
                    );
                  })}
                </div>

                {/* 刻度行与柱行同样是 12 列，未画到的月份自然空着，对齐不跑偏 */}
                <div className="mt-1 grid grid-cols-12 gap-1 border-t border-border/60 pt-1 font-mono text-[10px] tabular-nums text-muted-foreground/70 sm:gap-2">
                  {counts.slice(startMonth - 1, visible).map((count, index) => (
                    <span
                      key={index}
                      className={count > 0 ? "text-muted-foreground" : undefined}
                    >
                      {monthLabel(startMonth + index)}
                    </span>
                  ))}
                </div>

                <p className="mt-2 font-mono text-[11px] tabular-nums text-muted-foreground">
                  {year} · {counts.reduce((a, b) => a + b, 0)} 篇
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 按月翻：每个月一栏，标题带上月份和篇数 */}
      <div className="space-y-10">
        {months.map((key) => {
          const [year, month] = key.split("-");
          const list = byMonth.get(key) ?? [];
          return (
            <section key={key} id={`month-${key}`} className="scroll-mt-8">
              <div className="mb-2 flex items-baseline gap-3 border-b border-border pb-2">
                <h2 className="font-heading text-lg font-bold tracking-tight tabular-nums">
                  {year}
                  <span className="mx-1 text-muted-foreground/60">/</span>
                  {month}
                </h2>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {list.length} 篇
                </span>
              </div>

              <ul>
                {list.map((post) => (
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
                          <span className="ml-2 font-mono text-[10px] text-alert">
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
          );
        })}
      </div>
    </div>
  );
}
