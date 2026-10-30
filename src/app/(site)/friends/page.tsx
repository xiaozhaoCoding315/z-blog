import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Link2 } from "lucide-react";
import { friends } from "@/config/portfolio";
import { siteConfig } from "@/config/site";
import { GithubIcon } from "@/components/icons/github";

export const metadata: Metadata = {
  title: "友链",
  description: "我常读的一些站点，欢迎交换友链。",
};

export default function FriendsPage() {
  const hasFriends = friends.length > 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
      <header className="mb-10">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
          友链
        </h1>
        <p className="mt-2 text-muted-foreground">
          {hasFriends
            ? "我常读的一些站点，都是自己会点开的"
            : "这里暂时还是空的 —— 不摆占位数据凑数"}
        </p>
      </header>

      {hasFriends ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {friends.map((friend) => (
            <a
              key={friend.name}
              href={friend.url}
              target="_blank"
              rel="noreferrer noopener"
              className="card-hover glass group flex items-center gap-4 rounded-xl p-5"
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[oklch(0.62_0.23_285)] to-[oklch(0.72_0.16_215)] text-lg font-bold text-white">
                {friend.name.charAt(0)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 font-semibold">
                  {friend.name}
                  <ArrowUpRight className="size-3.5 text-muted-foreground/0 transition-colors group-hover:text-primary" />
                </span>
                <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                  {friend.description}
                </span>
              </span>
            </a>
          ))}
        </div>
      ) : (
        /* 空状态：不摆假数据，但也不留一个光秃秃的页面 */
        <div className="glass flex flex-col items-center gap-4 rounded-2xl px-6 py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-full border border-border/70 bg-secondary/40">
            <Link2 className="size-5 text-muted-foreground" />
          </span>
          <div>
            <p className="font-medium">还没有收录友链</p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
              我不想用示例链接占位。等遇到真正值得推荐的站点，
              会一个个加进来 —— 而不是凑够一屏。
            </p>
          </div>
        </div>
      )}

      {/* 交换友链：始终展示，这是页面真正的用途 */}
      <div className="glass mt-6 rounded-xl p-6">
        <h2 className="mb-4 font-semibold">交换友链</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border/60 bg-card/40 p-4">
            <p className="mb-1 text-[11px] font-medium text-muted-foreground">
              我的站点信息
            </p>
            <p className="font-mono text-sm">{siteConfig.name}</p>
            <p className="mt-0.5 break-all font-mono text-xs text-muted-foreground">
              {siteConfig.url}
            </p>
            <Link
              href="/"
              className="mt-2 inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
            >
              访问首页 <ArrowUpRight className="size-3" />
            </Link>
          </div>

          <div className="rounded-lg border border-border/60 bg-card/40 p-4">
            <p className="mb-1 text-[11px] font-medium text-muted-foreground">
              怎么联系我
            </p>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li className="flex items-center gap-1.5">
                <GithubIcon className="size-3.5 shrink-0" />
                <a
                  href={siteConfig.links.github}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="transition-colors hover:text-foreground"
                >
                  GitHub 提 Issue
                </a>
              </li>
              <li className="flex items-center gap-1.5">
                <Link2 className="size-3.5 shrink-0" />
                <Link
                  href="/guestbook"
                  className="transition-colors hover:text-foreground"
                >
                  留言板留个言
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <p className="mt-4 border-t border-border/50 pt-3 text-xs leading-relaxed text-muted-foreground">
          申请友链请附上站点名称、链接和一句话介绍。我会先自己读几篇 —
          <span className="text-foreground/80">只加我确实会点开的站</span>。
        </p>
      </div>
    </div>
  );
}
