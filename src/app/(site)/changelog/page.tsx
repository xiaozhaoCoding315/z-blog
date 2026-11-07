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
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <header className="mb-10">
        <h1 className="font-heading text-3xl font-bold tracking-[-0.02em]">
          开发日志
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          这个站不是一次写完的。从 {siteConfig.startedAt} 的第一行代码开始，
          每次改动都在这里留档。
        </p>
      </header>

      <Reveal>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-y border-border py-4 sm:grid-cols-4">
          {overview.map((item) => (
            <div key={item.label}>
              <dd className="font-heading text-xl font-bold tabular-nums tracking-tight">
                {item.value}
                {item.unit && (
                  <span className="ml-0.5 font-mono text-[11px] font-normal text-muted-foreground">
                    {item.unit}
                  </span>
                )}
              </dd>
              <dt className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                {item.label}
              </dt>
            </div>
          ))}
        </dl>
      </Reveal>

      <Reveal className="mt-8">
        <ActivityHeatmap days={buildActivityDays()} />
      </Reveal>

      {/* 时间线：细线 + 日期列，不做发光节点 */}
      <div className="mt-12">
        <div className="space-y-10">
          {[...groups.entries()].map(([month, list]) => (
            <section key={month}>
              <h2 className="mb-2 flex items-baseline gap-3 border-b border-border pb-2">
                <span className="font-heading text-lg font-bold tracking-tight tabular-nums">
                  {month.replace("-", ".")}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {list.length} 条
                </span>
              </h2>

              <ol>
                {list.map((entry) => {
                  const meta = changeTypeMeta[entry.type];
                  return (
                    <li
                      key={`${entry.date}-${entry.title}`}
                      className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-4 border-b border-border/60 py-3"
                    >
                      <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                        {entry.date.slice(5).replace("-", ".")}
                      </span>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-2">
                          <span className={cn("size-1.5 shrink-0 rounded-full", meta.dot)} />
                          <h3 className="font-heading text-[15px] font-semibold leading-snug tracking-[-0.01em]">
                            {entry.title}
                          </h3>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {meta.label}
                          </span>
                        </div>

                        {entry.detail && (
                          <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
                            {entry.detail}
                          </p>
                        )}

                        {entry.items && entry.items.length > 0 && (
                          <ul className="mt-1.5 space-y-0.5">
                            {entry.items.map((item) => (
                              <li
                                key={item}
                                className="grid grid-cols-[0.75rem_minmax(0,1fr)] text-[13px] leading-6 text-muted-foreground"
                              >
                                <span aria-hidden>·</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        )}

                        {entry.tags && entry.tags.length > 0 && (
                          <p className="mt-1.5 flex flex-wrap gap-x-2 font-mono text-[10px] text-muted-foreground">
                            {entry.tags.map((tag) => (
                              <span key={tag}>#{tag}</span>
                            ))}
                          </p>
                        )}
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
