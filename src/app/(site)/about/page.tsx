import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { GithubIcon } from "@/components/icons/github";
import { siteConfig } from "@/config/site";
import { now } from "@/config/portfolio";
import { skillGroups } from "@/config/skills";
import { getUptimeSnapshot } from "@/lib/uptime-server";
import { getChangelogStats } from "@/config/changelog";

export const metadata: Metadata = {
  title: "关于",
  description: `关于 ${siteConfig.author.name}：全栈 / AI 应用开发者。`,
};

export default async function AboutPage() {
  const uptime = await getUptimeSnapshot();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <header>
        <div className="flex items-end gap-5">
          {/* 印章式字母标，不是照片：它不假装是一张人像。
              它本身画的就是「Z」，所以不再并排重复一遍名字。
              unoptimized：next/image 的优化器默认拒绝 SVG（返回 400），
              而这个标是矢量，没必要也不该走优化管线。 */}
          <Image
            src={siteConfig.author.avatar}
            alt={siteConfig.author.name}
            width={64}
            height={64}
            unoptimized
            className="shrink-0"
          />
          <p className="pb-1 font-mono text-[11px] text-muted-foreground">
            全栈 · AI 应用
          </p>
        </div>
        <p className="mt-3 text-[15px] leading-7 text-muted-foreground">
          {siteConfig.author.bio}
        </p>
        <p className="mt-4 flex flex-wrap items-center gap-x-3 font-mono text-[11px] text-muted-foreground">
          <a
            href={siteConfig.links.github}
            target="_blank"
            rel="noreferrer noopener"
            className="link-underline inline-flex items-center gap-1.5"
          >
            <GithubIcon className="size-3.5" /> GitHub
          </a>
          {siteConfig.author.email && (
            <>
              <span aria-hidden>·</span>
              <a
                href={`mailto:${siteConfig.author.email}`}
                className="link-underline"
              >
                邮箱
              </a>
            </>
          )}
          <span aria-hidden>·</span>
          <span>
            更新 {uptime.daysText} 天 · {getChangelogStats().entries} 次迭代
          </span>
        </p>
      </header>

      {/* 现在：一段话，不是四宫格 */}
      <section className="mt-12">
        <h2 className="font-heading text-lg font-bold tracking-tight">现在</h2>
        <div className="mt-3 space-y-2 text-[15px] leading-7">
          <p>
            <span className="text-muted-foreground">在做 </span>
            {now.building.join("、")}
          </p>
          <p>
            <span className="text-muted-foreground">在学 </span>
            {now.learning.join("、")}
          </p>
          <p>
            <span className="text-muted-foreground">在读 </span>
            {now.reading.join("、")}
          </p>
        </div>
        <p className="mt-3 font-mono text-[11px] text-muted-foreground">
          更新于 {now.updatedAt}
        </p>
      </section>

      {/* 能力：从 /skills 合并进来，只留能力名，不留等级点阵 */}
      <section className="mt-12">
        <h2 className="font-heading text-lg font-bold tracking-tight">能力</h2>
        <div className="mt-4 space-y-6">
          {skillGroups.map((group) => (
            <div key={group.title}>
              <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                {group.title}
              </h3>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                {group.summary}
              </p>
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
                {group.skills.map((skill) => (
                  <li key={skill.name} className="inline-flex items-baseline gap-1.5">
                    <span className="font-medium">{skill.name}</span>
                    {skill.items && skill.items.length > 0 && (
                      <span className="text-muted-foreground">
                        {skill.items.slice(0, 3).join(" · ")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* 关于本站：一段实话 */}
      <section className="mt-12">
        <h2 className="font-heading text-lg font-bold tracking-tight">关于本站</h2>
        <div className="mt-3 space-y-3 text-[15px] leading-7 text-muted-foreground">
          <p>
            这个站是我从零手写的：文章用 MDX + Git 管理，构建时静态生成；
            数据库承载浏览量与文章向量索引。⌘K 搜索能理解意思相近的查询，
            右下角的助手回答问题时会标注引用来源。
          </p>
          <p>
            实现细节都写在文章里，从
            <Link href="/blog/build-blog-with-nextjs" className="link-underline mx-1">
              建站过程
            </Link>
            到
            <Link href="/blog/rag-powered-blog" className="link-underline mx-1">
              RAG 检索
            </Link>
            都有拆解。
          </p>
        </div>
      </section>

      <p className="mt-12 border-t border-border pt-4 font-mono text-[11px] text-muted-foreground">
        <Link href="/changelog" className="link-underline">
          开发日志
        </Link>
        <span className="mx-2" aria-hidden>
          ·
        </span>
        <Link href="/guestbook" className="link-underline">
          留言板
        </Link>
        <span className="mx-2" aria-hidden>
          ·
        </span>
        <Link href="/interview" className="link-underline">
          面试题库
        </Link>
      </p>
    </div>
  );
}
