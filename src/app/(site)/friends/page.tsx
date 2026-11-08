import type { Metadata } from "next";
import Link from "next/link";
import { GithubIcon } from "@/components/icons/github";
import { friends } from "@/config/portfolio";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "友链",
  description: "我常读的一些站点，欢迎交换友链。",
};

export default function FriendsPage() {
  const hasFriends = friends.length > 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <header className="mb-10">
        <h1 className="font-heading text-3xl font-bold tracking-[-0.02em]">
          友链
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {hasFriends
            ? "我常读的一些站点，都是自己会点开的"
            : "暂时还是空的 —— 不摆占位数据凑数"}
        </p>
      </header>

      {hasFriends ? (
        <ul>
          {friends.map((friend) => (
            <li key={friend.name}>
              <a
                href={friend.url}
                target="_blank"
                rel="noreferrer noopener"
                className="group grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] items-baseline gap-x-4 border-b border-border/60 py-3"
              >
                <span className="font-heading text-[15px] font-semibold transition-colors group-hover:text-primary">
                  {friend.name}
                </span>
                <span className="text-[13px] leading-6 text-muted-foreground">
                  {friend.description}
                </span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <div className="border-y border-border py-10 text-sm leading-6 text-muted-foreground">
          <p>还没有收录友链。</p>
          <p className="mt-1">
            不想用示例链接占位——等遇到真正值得推荐的站点，会一个个加进来。
          </p>
        </div>
      )}

      <section className="mt-10 border-t border-border pt-6">
        <h2 className="font-heading text-lg font-bold tracking-tight">
          交换友链
        </h2>

        <div className="mt-3 grid gap-x-8 gap-y-3 text-[13px] leading-6 sm:grid-cols-2">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
              我的站点
            </p>
            <p className="mt-1">{siteConfig.name}</p>
            <p className="break-all font-mono text-[11px] text-muted-foreground">
              {siteConfig.url}
            </p>
          </div>

          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
              怎么联系
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-x-3">
              <a
                href={siteConfig.links.github}
                target="_blank"
                rel="noreferrer noopener"
                className="link-underline inline-flex items-center gap-1.5"
              >
                <GithubIcon className="size-3.5" /> GitHub Issue
              </a>
              <Link href="/letters" className="link-underline">
                信箱
              </Link>
            </p>
          </div>
        </div>

        <p className="mt-4 font-mono text-[11px] leading-5 text-muted-foreground">
          申请请附站点名称、链接和一句话介绍。我会先自己读几篇——
          只加我确实会点开的站。
        </p>
      </section>
    </div>
  );
}
