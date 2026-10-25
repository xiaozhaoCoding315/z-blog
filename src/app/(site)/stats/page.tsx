import type { Metadata } from "next";
import { getAllPosts, getTags } from "@/content";
import { StatsBoard } from "@/components/stats/stats-board";

export const metadata: Metadata = {
  title: "统计",
  description: "站点数据看板：阅读统计、热门文章与系统状态。",
};

export default function StatsPage() {
  const posts = getAllPosts();
  const tags = getTags();
  const max = tags[0]?.count ?? 1;
  const totalChars = posts.reduce((sum, p) => sum + p.content.length, 0);
  const wan = (totalChars / 10000).toFixed(1);

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <header className="mb-10">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
          统计
        </h1>
        <p className="mt-2 text-muted-foreground">
          共 {posts.length} 篇文章 · 约 {wan} 万字 · 这个小站的一举一动，都记录在这里
        </p>
      </header>

      <StatsBoard />

      {/* 标签云 */}
      {tags.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 font-semibold">标签云</h2>
          <div className="glass rounded-xl p-6">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
              {tags.map(({ tag, count }) => (
                <span
                  key={tag}
                  className="font-medium text-muted-foreground transition-colors hover:text-primary"
                  style={{
                    fontSize: `${0.8 + (count / max) * 0.9}rem`,
                  }}
                >
                  {tag}
                  <sup className="ml-0.5 text-[0.65em] opacity-60">{count}</sup>
                </span>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
