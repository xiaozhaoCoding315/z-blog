import type { Metadata } from "next";
import { GitCommitHorizontal, Sparkles, Timer, Zap } from "lucide-react";
import { getAllPosts } from "@/content";
import { getChangelog, getChangelogStats, changeTypeMeta } from "@/config/changelog";
import { siteConfig } from "@/config/site";
import { ActivityHeatmap } from "@/components/changelog/activity-heatmap";
import { Reveal } from "@/components/site/reveal";
import { buildActivityDays } from "@/lib/activity";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "开发日志",
  description: `这个博客从 ${siteConfig.startedAt} 开始，每一行代码都有据可查：功能迭代、修复与设计决策的完整时间线。`,
};

export default function ChangelogPage() {
  const entries = getChangelog();
  const stats = getChangelogStats();
  const posts = getAllPosts();

  // 按年月分组
  const groups = new Map<string, typeof entries>();
  for (const entry of entries) {
    const key = entry.date.slice(0, 7);
    const list = groups.get(key) ?? [];
    list.push(entry);
    groups.set(key, list);
  }

  const overview = [
    { label: "记录迭代", value: stats.entries, unit: "次", icon: GitCommitHorizontal },
    { label: "活跃天数", value: stats.activeDays, unit: "天", icon: Timer },
    { label: "沉淀文章", value: posts.length, unit: "篇", icon: Sparkles },
    {
      label: "最近更新",
      value: stats.lastUpdated?.slice(5).replace("-", "/") ?? "—",
      unit: "",
      icon: Zap,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
      <header className="mb-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
              开发日志
            </h1>
            <p className="mt-2 max-w-xl leading-relaxed text-muted-foreground">
              这个站不是一次写完的。从 {siteConfig.startedAt} 的第一行代码开始，
              每次改动都在这里留档——功能、修复、踩过的坑和做过的取舍。
            </p>
          </div>
          <div className="font-mono text-xs text-muted-foreground">
            <span className="rounded-md border border-border/70 bg-secondary/40 px-2 py-1">
              git log --oneline
            </span>
          </div>
        </div>
      </header>

      <Reveal>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {overview.map((item) => (
            <div key={item.label} className="glass rounded-xl p-4">
              <item.icon className="mb-2.5 size-4 text-primary" />
              <dd className="font-heading text-2xl font-extrabold tracking-tight">
                {item.value}
                {item.unit && (
                  <span className="ml-0.5 text-xs font-medium text-muted-foreground">
                    {item.unit}
                  </span>
                )}
              </dd>
              <dt className="mt-0.5 text-[11px] text-muted-foreground">{item.label}</dt>
            </div>
          ))}
        </dl>
      </Reveal>

      <Reveal className="mt-4">
        <ActivityHeatmap days={buildActivityDays()} />
      </Reveal>

      {/* 时间线 */}
      <div className="relative mt-12">
        <div
          aria-hidden
          className="absolute bottom-4 left-[7px] top-2 w-px bg-gradient-to-b from-primary/50 via-border to-transparent sm:left-[calc(6rem+7px)]"
        />

        <div className="space-y-10">
          {[...groups.entries()].map(([month, list]) => (
            <section key={month}>
              <h2 className="mb-4 flex items-center gap-3 font-mono text-sm font-semibold text-muted-foreground">
                <span className="font-heading text-base font-bold text-foreground">
                  {month.replace("-", " / ")}
                </span>
                <span className="text-[11px]">{list.length} 条</span>
                <span className="h-px flex-1 bg-border/70" />
              </h2>

              <ol className="space-y-5">
                {list.map((entry) => {
                  const meta = changeTypeMeta[entry.type];
                  return (
                    <li key={`${entry.date}-${entry.title}`} className="group relative">
                      <div className="flex gap-4 sm:gap-6">
                        {/* 日期 */}
                        <span className="hidden w-24 shrink-0 pt-2 text-right font-mono text-xs text-muted-foreground sm:block">
                          {entry.date.slice(5).replace("-", "/")}
                        </span>

                        {/* 节点 */}
                        <span className="relative z-10 mt-2.5 flex size-3.5 shrink-0 items-center justify-center">
                          <span
                            className={cn(
                              "size-2.5 rounded-full ring-4 ring-background transition-transform group-hover:scale-125",
                              meta.dot
                            )}
                          />
                        </span>

                        {/* 内容 */}
                        <div className="min-w-0 flex-1 pb-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                "rounded-full border px-2 py-0.5 text-[10px] font-medium leading-none",
                                meta.className
                              )}
                            >
                              {meta.label}
                            </span>
                            <span className="font-mono text-[11px] text-muted-foreground sm:hidden">
                              {entry.date}
                            </span>
                          </div>

                          <h3 className="mt-1.5 font-heading text-[0.975rem] font-bold leading-snug tracking-tight transition-colors group-hover:text-primary">
                            {entry.title}
                          </h3>

                          {entry.detail && (
                            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                              {entry.detail}
                            </p>
                          )}

                          {entry.items && entry.items.length > 0 && (
                            <ul className="mt-2.5 space-y-1">
                              {entry.items.map((item) => (
                                <li
                                  key={item}
                                  className="flex items-start gap-2 text-[13px] leading-relaxed text-muted-foreground"
                                >
                                  <span className="mt-[7px] size-1 shrink-0 rounded-full bg-primary/60" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          )}

                          {entry.tags && entry.tags.length > 0 && (
                            <div className="mt-2.5 flex flex-wrap gap-1.5">
                              {entry.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded border border-border/60 px-1.5 py-px font-mono text-[10px] text-muted-foreground"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      </div>

      <p className="mt-12 text-center text-xs text-muted-foreground">
        时间线的最新一条是 {stats.lastUpdated}，最早一条追溯到 {stats.firstUpdated}。
        <br className="sm:hidden" />
        完整提交历史见{" "}
        <a
          href={`${siteConfig.links.github}/commits`}
          target="_blank"
          rel="noreferrer noopener"
          className="text-primary hover:underline"
        >
          GitHub 仓库
        </a>
        。
      </p>
    </div>
  );
}
