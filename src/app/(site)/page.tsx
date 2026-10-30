import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Braces,
  Database,
  GitCommitHorizontal,
  Layers3,
  Sparkles,
  Terminal,
} from "lucide-react";
import { siteConfig } from "@/config/site";
import { getAllPosts, getTags } from "@/content";
import { getChangelog, getChangelogStats } from "@/config/changelog";
import { PostCard, toCardData } from "@/components/blog/post-card";
import { TypeRotate } from "@/components/home/type-rotate";
import { Starfield } from "@/components/home/starfield";
import { CountUp } from "@/components/home/count-up";
import { LiveMetrics } from "@/components/home/live-metrics";
import { Reveal, StaggerGrid, StaggerItem } from "@/components/site/reveal";
import { getUptimeSnapshot } from "@/lib/uptime-server";
import { OpenChatButton } from "@/components/chat/open-chat-button";
import { changeTypeMeta } from "@/config/changelog";
import { buildActivityDays } from "@/lib/activity";
import { ActivityHeatmap } from "@/components/changelog/activity-heatmap";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/** 技术栈按职责分组——比一条水平的标签墙更能说明「这个站怎么搭的」 */
const stackGroups = [
  {
    title: "框架与渲染",
    icon: Layers3,
    items: ["Next.js 16 App Router", "React 19", "TypeScript", "RSC + PPR"],
  },
  {
    title: "样式与动效",
    icon: Braces,
    items: ["TailwindCSS v4", "shadcn/ui", "OKLCH 设计令牌", "Framer Motion"],
  },
  {
    title: "内容与数据",
    icon: Database,
    items: ["MDX", "PostgreSQL 17", "pgvector + HNSW", "Drizzle ORM"],
  },
  {
    title: "AI 与交付",
    icon: Terminal,
    items: ["Vercel AI SDK v7", "GLM-4.6 / 百炼", "Docker Compose", "阿里云 ECS"],
  },
];

export default async function HomePage() {
  const posts = getAllPosts();
  const tags = getTags();
  const pinned = posts.filter((p) => p.meta.pinned).slice(0, 2);
  const latest = posts.filter((p) => !p.meta.pinned).slice(0, 4);
  const changelog = getChangelog().slice(0, 5);
  const changelogStats = getChangelogStats();
  const uptime = await getUptimeSnapshot();
  const activityDays = buildActivityDays();

  const heroStats = [
    { value: <CountUp to={posts.length} />, label: "篇文章" },
    { value: <CountUp to={tags.length} />, label: "个标签" },
    { value: uptime.daysText, label: "天持续迭代" },
    { value: <CountUp to={changelogStats.entries} />, label: "次版本记录" },
  ];

  return (
    <div className="w-full">
      {/* ============ Hero ============ */}
      <section className="bg-noise relative overflow-hidden">
        <Starfield />
        <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_40%,black,transparent)]" />
        <div
          className="glow-orb animate-float-slow left-[-10%] top-[-15%] size-[480px]"
          style={{ background: "var(--glow-1)" }}
        />
        <div
          className="glow-orb animate-float-slow right-[-8%] top-[20%] size-[380px]"
          style={{ background: "var(--glow-2)", animationDelay: "-7s" }}
        />

        <div className="relative mx-auto flex max-w-6xl flex-col items-center px-4 pb-16 pt-16 text-center sm:px-6 sm:pt-24">
          {/* 状态条：一眼看出这站是活的 */}
          <Reveal>
            <div className="glass mb-8 inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 rounded-full px-4 py-1.5 text-xs">
              <span className="inline-flex items-center gap-1.5 text-emerald-500">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
                </span>
                ONLINE
              </span>
              <span className="h-3 w-px bg-border" />
              <span className="font-mono text-muted-foreground">
                uptime {uptime.daysText}d
              </span>
              <span className="h-3 w-px bg-border" />
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <GitCommitHorizontal className="size-3.5 text-primary" />
                {changelogStats.entries} 次迭代
              </span>
            </div>
          </Reveal>

          {/* Z 字标 */}
          <Reveal delay={0.06}>
            <div className="group relative mb-8">
              <div className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-[oklch(0.62_0.23_285)] to-[oklch(0.72_0.16_215)] opacity-40 blur-xl transition-opacity duration-500 group-hover:opacity-70" />
              <div className="glass relative flex size-20 items-center justify-center rounded-3xl">
                <span className="text-gradient font-heading text-5xl font-black leading-none">
                  Z
                </span>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.12}>
            <h1 className="max-w-3xl font-heading text-4xl font-extrabold leading-[1.15] tracking-tight sm:text-5xl md:text-6xl">
              你好，我是 {siteConfig.author.name}
              <br />
              <span className="text-muted-foreground">一个</span>{" "}
              <TypeRotate
                words={[
                  "热爱编程的程序员",
                  "喜欢造轮子的工程师",
                  "把想法写进代码的人",
                  "边踩坑边记录的人",
                ]}
              />
            </h1>
          </Reveal>

          <Reveal delay={0.18}>
            <p className="mt-6 max-w-xl text-balance leading-relaxed text-muted-foreground sm:text-lg">
              {siteConfig.author.bio}
            </p>
          </Reveal>

          <Reveal delay={0.24}>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="group rounded-full px-6">
                <Link href="/blog">
                  浏览博客
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full px-6"
              >
                <Link href="/changelog">
                  <GitCommitHorizontal className="size-4" />
                  看开发日志
                </Link>
              </Button>
              <OpenChatButton />
            </div>
          </Reveal>

          {/* 站点统计（静态 HTML 就是真实数字，水合后再滚动） */}
          <Reveal delay={0.3} className="mt-14 w-full max-w-2xl">
            <dl className="grid grid-cols-2 divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card/40 backdrop-blur sm:grid-cols-4 sm:divide-x">
              {heroStats.map((stat) => (
                <div
                  key={stat.label}
                  className="flex flex-col items-center gap-1 border-b border-border/40 px-2 py-5 last:border-b-0 sm:border-b-0"
                >
                  <dd className="font-heading text-3xl font-extrabold tracking-tight">
                    {stat.value}
                  </dd>
                  <dt className="text-[11px] text-muted-foreground">{stat.label}</dt>
                </div>
              ))}
            </dl>
          </Reveal>

          <LiveMetrics />
        </div>
      </section>

      {/* ============ 精选 ============ */}
      {pinned.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
          <Reveal>
            <SectionHeading title="精选文章" hint="值得从这开始" />
          </Reveal>
          <StaggerGrid className="grid gap-4 sm:grid-cols-2">
            {pinned.map((post) => (
              <StaggerItem key={post.slug}>
                <PostCard post={toCardData(post)} variant="featured" />
              </StaggerItem>
            ))}
          </StaggerGrid>
        </section>
      )}

      {/* ============ 最新文章 ============ */}
      <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-6">
        <Reveal>
          <SectionHeading title="最新文章" hint="刚出炉的" href="/blog" />
        </Reveal>
        <StaggerGrid className="grid gap-4 sm:grid-cols-2">
          {latest.map((post) => (
            <StaggerItem key={post.slug}>
              <PostCard post={toCardData(post)} />
            </StaggerItem>
          ))}
        </StaggerGrid>
      </section>

      {/* ============ 迭代日志 + 技术栈 ============ */}
      <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
        <div className="grid gap-4 lg:grid-cols-[1.05fr_1fr]">
          {/* 最近迭代 */}
          <Reveal>
            <div className="glass h-full rounded-xl p-5 sm:p-6">
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <h2 className="inline-flex items-center gap-2 font-heading text-base font-bold">
                    <GitCommitHorizontal className="size-4 text-primary" />
                    最近在改什么
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    每条都能在仓库里找到对应提交
                  </p>
                </div>
                <Link
                  href="/changelog"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary"
                >
                  全部 <ArrowRight className="size-3" />
                </Link>
              </div>

              <ol className="space-y-3.5">
                {changelog.map((entry) => {
                  const meta = changeTypeMeta[entry.type];
                  return (
                    <li key={`${entry.date}-${entry.title}`} className="flex gap-3">
                      <span className="mt-0.5 shrink-0 font-mono text-[11px] text-muted-foreground/70">
                        {entry.date.slice(5).replace("-", "/")}
                      </span>
                      <span
                        className={cn(
                          "mt-1.5 size-1.5 shrink-0 rounded-full",
                          meta.dot
                        )}
                      />
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium leading-snug">
                          {entry.title}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </Reveal>

          {/* 技术栈 */}
          <Reveal delay={0.08}>
            <div className="glass h-full rounded-xl p-5 sm:p-6">
              <div className="mb-4">
                <h2 className="inline-flex items-center gap-2 font-heading text-base font-bold">
                  <Layers3 className="size-4 text-primary" />
                  本站由这些技术驱动
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  按职责分层，不是一堆标签墙
                </p>
              </div>

              <div className="space-y-3.5">
                {stackGroups.map((group) => (
                  <div key={group.title}>
                    <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                      <group.icon className="size-3" />
                      {group.title}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {group.items.map((tech) => (
                        <span
                          key={tech}
                          className="rounded-md border border-border/60 bg-secondary/40 px-2 py-0.5 font-mono text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-4 border-t border-border/50 pt-3 text-xs leading-relaxed text-muted-foreground">
                这个站点是我一行一行亲手搭起来的：写样式、写服务端、自己折腾部署。
                右下角的 AI 助手读过站里的每一篇文章，任何问题都可以直接问它。
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ 行动区 ============ */}
      <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
        <Reveal>
          <ActivityHeatmap days={activityDays} />
        </Reveal>

        <Reveal delay={0.06}>
          <div className="glass relative mt-4 overflow-hidden rounded-2xl px-6 py-10 text-center sm:px-10">
            <div
              className="glow-orb left-1/4 top-0 size-64"
              style={{ background: "var(--glow-1)", opacity: 0.5 }}
            />
            <div className="relative">
              <Sparkles className="mx-auto mb-3 size-5 text-primary" />
              <h2 className="font-heading text-xl font-bold tracking-tight sm:text-2xl">
                想看看这个站是怎么一步步长出来的？
              </h2>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
                架构拆解、部署踩坑、RAG 落地——写成文章的都不只是结论，还有当时为什么这么选。
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button asChild className="rounded-full">
                  <Link href="/changelog">
                    开发日志 <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="rounded-full">
                  <Link href="/projects">
                    看项目 <ArrowUpRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild variant="ghost" className="rounded-full">
                  <Link href="/stats">站点数据</Link>
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

function SectionHeading({
  title,
  hint,
  href,
}: {
  title: string;
  hint?: string;
  href?: string;
}) {
  return (
    <div className="mb-5 flex items-end justify-between">
      <div>
        <h2 className="font-heading text-xl font-bold tracking-tight sm:text-2xl">
          {title}
        </h2>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          查看全部 <ArrowRight className="size-3.5" />
        </Link>
      )}
    </div>
  );
}
