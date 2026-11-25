import Link from "next/link";
import { GithubIcon } from "@/components/icons/github";
import { siteConfig } from "@/config/site";
import { now } from "@/config/portfolio";
import { skillGroups } from "@/config/skills";
import { getAllNotes } from "@/content";
import { getStatusSentence } from "@/lib/settings-server";

interface AboutProfileProps {
  /** page：档案 + 现在/能力/关于本站；window：紧凑档案 + 完整页入口。 */
  variant?: "page" | "window";
}

/**
 * 关于：`/about` 与首页「关于」窗口共用同一份档案。
 *
 * 这里不再放 neofetch 读数（OS / Shell / Theme / Commits）。访客来读的是
 * 这个人是谁、在做什么、能力到哪，而不是这台机器的构建参数；那些读数
 * 只在终端里对站长自己有意义。
 */
export async function AboutProfile({ variant = "page" }: AboutProfileProps) {
  const status = await getStatusSentence();
  const notesCount = getAllNotes().length;

  const isPage = variant === "page";

  const profile = (
    <>
      <header>
        <p className="reading-label">关于</p>
        <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-2">
          {isPage ? (
            <h1 className="about-title">{siteConfig.author.name}</h1>
          ) : (
            <h2 className="font-heading text-[17px] font-bold">
              {siteConfig.author.name}
            </h2>
          )}
          <p className="reading-secondary">全栈 · AI 应用</p>
        </div>
        <p className="mt-4 reading-body">{status}</p>
        {isPage && (
          <p className="mt-4 max-w-[64ch] reading-body text-ink-dim">
            {siteConfig.author.bio}
          </p>
        )}
        <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 reading-meta">
          <a
            href={siteConfig.links.github}
            target="_blank"
            rel="noreferrer noopener"
            className="link-underline inline-flex items-center gap-1.5"
          >
            <GithubIcon className="size-4" /> GitHub
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
          <span>{siteConfig.weather.city}</span>
          <span aria-hidden>·</span>
          <span>{notesCount} 篇笔记</span>
        </p>
      </header>
    </>
  );

  if (!isPage) {
    return (
      <div className="os-window-pane">
        {profile}
        <Link href="/about" className="os-pane-link">
          <span>打开完整关于页</span>
          <span aria-hidden>→</span>
        </Link>
      </div>
    );
  }

  return (
    <>
      {profile}

      {/* 现在：一段话，不是四宫格；「手动」说明这不是自动观测值 */}
      <section className="mt-12 border-t border-rule pt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2>现在</h2>
          <p className="reading-meta">手动 · 更新于 {now.updatedAt}</p>
        </div>
        <div className="mt-4 space-y-3 reading-body">
          <p>
            <span className="text-ink-dim">在做 </span>
            {now.building.join("、")}
          </p>
          <p>
            <span className="text-ink-dim">在学 </span>
            {now.learning.join("、")}
          </p>
          <p>
            <span className="text-ink-dim">在读 </span>
            {now.reading.join("、")}
          </p>
        </div>
      </section>

      {/* 能力：从 /skills 合并进来，只留能力名，不留等级点阵 */}
      <section className="mt-12 border-t border-rule pt-8">
        <h2>能力</h2>
        <div className="mt-5 space-y-6">
          {skillGroups.map((group) => (
            <div key={group.title}>
              <h3 className="reading-label">{group.title}</h3>
              <p className="mt-2 reading-secondary">{group.summary}</p>
              <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 reading-body">
                {group.skills.map((skill) => (
                  <li
                    key={skill.name}
                    className="inline-flex items-baseline gap-2"
                  >
                    <span className="font-semibold">{skill.name}</span>
                    {skill.items && skill.items.length > 0 && (
                      <span className="text-ink-dim">
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
      <section className="mt-12 border-t border-rule pt-8">
        <h2>关于本站</h2>
        <div className="mt-4 space-y-4 reading-body text-ink-dim">
          <p>
            这个站是我从零手写的：笔记用 MDX + Git 管理，预渲染，评论按请求补齐；
            数据库承载浏览量与笔记向量索引。⌘K 搜索能理解意思相近的查询，
            右下角的助手回答问题时会标注引用来源。
          </p>
          <p>
            实现细节都写在笔记里，从
            <Link
              href="/notes/build-blog-with-nextjs"
              className="link-underline mx-1"
            >
              建站过程
            </Link>
            到
            <Link
              href="/notes/rag-powered-blog"
              className="link-underline mx-1"
            >
              RAG 检索
            </Link>
            都有拆解。
          </p>
        </div>
      </section>

      <p className="mt-12 border-t border-rule pt-4 reading-meta">
        <Link href="/journal" className="link-underline">
          开发日志
        </Link>
        <span className="mx-2" aria-hidden>
          ·
        </span>
        <Link href="/letters" className="link-underline">
          留言板
        </Link>
      </p>
    </>
  );
}
