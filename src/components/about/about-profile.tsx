import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeValue } from "@/components/about/theme-value";
import { GithubIcon } from "@/components/icons/github";
import { siteConfig } from "@/config/site";
import { now } from "@/config/portfolio";
import { skillGroups } from "@/config/skills";
import { getAllNotes } from "@/content";
import { aiEnabled } from "@/lib/ai";
import {
  getGithubActivity,
  type GithubActivity,
} from "@/lib/github-server";
import { getStatusSentence } from "@/lib/settings-server";
import { getUptimeSnapshot } from "@/lib/uptime-server";

/**
 * 8 行 ASCII Z 标：纯文本，不假装是照片，也不额外请求一张图片。
 * 它是装饰（aria-hidden）——姓名由旁边可见的标题承载，读屏器不再重复朗读。
 */
const ASCII_Z = [
  "╔══════════╗",
  "║ ██████╗  ║",
  "║ ╚══███╔╝ ║",
  "║   ███╔╝  ║",
  "║  ███╔╝   ║",
  "║ ██████╗  ║",
  "║ ╚═════╝  ║",
  "╚══════════╝",
].join("\n");

const STACK = "Next.js 16 / React 19 / PostgreSQL";

interface AboutProfileProps {
  /** page：档案 + 现在/能力/关于本站；window：紧凑档案 + 完整页入口。 */
  variant?: "page" | "window";
  /**
   * 首页已经取过 GitHub 读数，直接传下来，避免同一请求再走一次网络。
   * /about 不传，由组件自己取。
   */
  activity?: GithubActivity;
}

/**
 * 关于本机：`/about` 与首页「关于本机」窗口共用同一份档案。
 * 服务端渲染真实值；Theme 是唯一的客户端读数，单独放在 theme-value。
 */
export async function AboutProfile({
  variant = "page",
  activity,
}: AboutProfileProps) {
  const [status, uptime, activityData] = await Promise.all([
    getStatusSentence(),
    getUptimeSnapshot(),
    activity ?? getGithubActivity(),
  ]);
  const notesCount = getAllNotes().length;

  const commitsValue = activityData.available
    ? `${activityData.truncated ? "≥" : ""}${activityData.total90}`
    : null;

  const rows: { label: string; value: ReactNode }[] = [
    { label: "OS", value: "Z·OS" },
    { label: "Host", value: siteConfig.weather.city },
    {
      label: "Uptime",
      value:
        uptime.days === null
          ? "建站 —（起始日期未配置）"
          : `建站 ${uptime.daysText} 天`,
    },
    { label: "Shell", value: "zsh (simulated)" },
    { label: "Stack", value: STACK },
    { label: "Notes", value: String(notesCount) },
    {
      label: "Commits·90D",
      value: commitsValue ?? (
        <span className="text-wait">NOT AVAILABLE</span>
      ),
    },
    { label: "AI", value: aiEnabled ? "已配置" : "未配置" },
    { label: "Theme", value: <ThemeValue /> },
  ];

  const Heading = variant === "page" ? "h1" : "h2";
  const isPage = variant === "page";

  const profile = (
    <>
      <header>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          关于本机
        </p>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <Heading
            className={
              isPage
                ? "font-heading text-3xl font-bold tracking-[-0.02em]"
                : "font-heading text-[17px] font-bold"
            }
          >
            {siteConfig.author.name}
          </Heading>
          <p className="font-mono text-[11px] text-muted-foreground">
            全栈 · AI 应用
          </p>
        </div>
        <p className="mt-3 text-[14px] leading-6 text-ink">{status}</p>
        {isPage && (
          <p className="mt-3 max-w-[42rem] text-[15px] leading-7 text-muted-foreground">
            {siteConfig.author.bio}
          </p>
        )}
        <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground">
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
        </p>
      </header>

      <div className="os-about-neofetch">
        <div className="os-about-mark-wrap">
          <pre aria-hidden className="os-about-mark">
            {ASCII_Z}
          </pre>
        </div>
        <dl className="os-about-rows">
          {rows.map((row) => (
            <div key={row.label} className="os-about-row">
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>
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
          <h2 className="font-heading text-lg font-bold tracking-tight">现在</h2>
          <p className="font-mono text-[10px] text-muted-foreground">
            手动 · 更新于 {now.updatedAt}
          </p>
        </div>
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
      </section>

      {/* 能力：从 /skills 合并进来，只留能力名，不留等级点阵 */}
      <section className="mt-12 border-t border-rule pt-8">
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
                  <li
                    key={skill.name}
                    className="inline-flex items-baseline gap-1.5"
                  >
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
      <section className="mt-12 border-t border-rule pt-8">
        <h2 className="font-heading text-lg font-bold tracking-tight">
          关于本站
        </h2>
        <div className="mt-3 space-y-3 text-[15px] leading-7 text-muted-foreground">
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

      <p className="mt-12 border-t border-rule pt-4 font-mono text-[11px] text-muted-foreground">
        <Link href="/journal" className="link-underline">
          开发日志
        </Link>
        <span className="mx-2" aria-hidden>
          ·
        </span>
        <Link href="/letters" className="link-underline">
          信箱
        </Link>
      </p>
    </>
  );
}
