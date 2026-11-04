import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { siteConfig } from "@/config/site";
import { getAllPosts } from "@/content";
import { projects } from "@/config/portfolio";
import { getUptimeSnapshot } from "@/lib/uptime-server";

export default async function HomePage() {
  const posts = getAllPosts().filter((p) => !p.meta.draft);
  const pinned = posts.filter((p) => p.meta.pinned).slice(0, 1);
  const rest = posts.filter((p) => !p.meta.pinned);
  const uptime = await getUptimeSnapshot();

  const firstYear = posts.length
    ? posts[posts.length - 1].meta.date.slice(0, 4)
    : siteConfig.startedAt.slice(0, 4);
  const lastYear = posts.length ? posts[0].meta.date.slice(0, 4) : firstYear;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
      <div className="grid gap-x-12 gap-y-10 py-12 md:grid-cols-[150px_minmax(0,1fr)] md:py-16">
        {/* 页边批注：真实数据，不是装饰 */}
        <aside className="md:sticky md:top-10 md:self-start">
          <dl className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-[11px] leading-relaxed text-muted-foreground md:flex-col md:gap-y-1.5">
            <dt className="sr-only">时间范围</dt>
            <dd>
              {firstYear === lastYear ? firstYear : `${firstYear} — ${lastYear}`}
            </dd>
            <dt className="sr-only">文章数</dt>
            <dd>{posts.length} 篇文章</dd>
            <dt className="sr-only">站点运行</dt>
            <dd>{uptime.daysText} 天</dd>
            <dd>
              <a href="/feed.xml" className="link-underline">
                RSS
              </a>
            </dd>
            <dd>
              <a
                href={siteConfig.links.github}
                target="_blank"
                rel="noreferrer noopener"
                className="link-underline"
              >
                GitHub
              </a>
            </dd>
          </dl>
        </aside>

        <div className="min-w-0">
          {/* 开篇：一句人话，不是一份自我介绍 */}
          <header>
            <h1 className="font-heading text-3xl font-bold leading-[1.25] tracking-[-0.02em] text-balance sm:text-4xl md:text-[2.75rem]">
              我写代码，
              <br />
              也写代码背后的东西。
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-7 text-muted-foreground">
              {siteConfig.author.bio}
            </p>
          </header>

          {/* 置顶：全站唯一使用朱砂的地方 */}
          {pinned.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group mt-12 block border-t border-border pt-6"
            >
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-vermilion">
                置顶
              </span>
              <h2 className="mt-2 font-heading text-xl font-bold leading-snug tracking-[-0.01em] text-balance transition-colors group-hover:text-primary sm:text-2xl">
                {post.meta.title}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                {post.meta.description}
              </p>
              <p className="mt-3 font-mono text-[11px] text-muted-foreground">
                {post.meta.date.replace(/-/g, ".")} · {post.readingText}
              </p>
            </Link>
          ))}

          {/* 文章：一条线一行，不是卡片墙 */}
          <section className="mt-12">
            <div className="flex items-baseline justify-between border-b border-border pb-3">
              <h2 className="font-heading text-base font-bold tracking-tight">
                文章
              </h2>
              <Link
                href="/blog"
                className="font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              >
                全部 {posts.length} 篇 →
              </Link>
            </div>

            <ul>
              {rest.map((post) => (
                <li key={post.slug}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="group grid grid-cols-[4.5rem_minmax(0,1fr)] items-baseline gap-x-4 border-b border-border/60 py-4"
                  >
                    <time
                      dateTime={post.meta.date}
                      className="font-mono text-[11px] tabular-nums text-muted-foreground"
                    >
                      {post.meta.date.slice(5).replace("-", ".")}
                    </time>
                    <div className="min-w-0">
                      <h3 className="font-heading text-[17px] font-semibold leading-snug tracking-[-0.01em] transition-colors group-hover:text-primary">
                        {post.meta.title}
                      </h3>
                      {post.meta.description && (
                        <p className="mt-1 line-clamp-1 text-[13px] leading-6 text-muted-foreground">
                          {post.meta.description}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* 项目：一行一个，能扫读 */}
          <section className="mt-14">
            <div className="flex items-baseline justify-between border-b border-border pb-3">
              <h2 className="font-heading text-base font-bold tracking-tight">
                项目
              </h2>
              <Link
                href="/projects"
                className="font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              >
                全部 →
              </Link>
            </div>

            <ul>
              {projects.map((project) => (
                <li key={project.name}>
                  <Link
                    href={project.repo ?? project.link ?? "/projects"}
                    target={project.repo || project.link ? "_blank" : undefined}
                    rel={project.repo || project.link ? "noreferrer noopener" : undefined}
                    className="group grid grid-cols-[minmax(0,1fr)] items-baseline gap-x-4 gap-y-1 border-b border-border/60 py-4 sm:grid-cols-[11rem_minmax(0,1fr)]"
                  >
                    <h3 className="font-heading text-[15px] font-semibold tracking-tight transition-colors group-hover:text-primary">
                      {project.name}
                    </h3>
                    <p className="text-[13px] leading-6 text-muted-foreground">
                      {project.tagline ?? project.description}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <p className="mt-14 font-mono text-[11px] text-muted-foreground">
            <Link href="/about" className="link-underline">
              关于这个站
            </Link>
            <span className="mx-2" aria-hidden>
              ·
            </span>
            <Link href="/archives" className="link-underline">
              按时间翻
            </Link>
            <span className="mx-2" aria-hidden>
              ·
            </span>
            <a href="/feed.xml" className="link-underline">
              订阅 RSS
            </a>
            <ArrowRight className="ml-1 inline size-3 align-[-1px]" />
          </p>
        </div>
      </div>
    </div>
  );
}
